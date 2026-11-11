import { AppointmentStatus, Prisma, Role } from '@prisma/client';
import { prisma } from '../../prisma';
import { config } from '../../config';
import { AppError } from '../../utils/http';
import {
  dateStrInTz,
  localMidnightUtc,
  toMinuteOfDay,
  weekdayOf,
} from '../../utils/time';
import { CreateAppointmentInput } from './appointment.schemas';

export interface Actor {
  id: number;
  role: Role;
}

/**
 * Bir randevunun alınabilirlik ön koşulları: geçmiş değil, çalışma saati
 * içinde, izin/tatile denk gelmiyor. (Çakışma kontrolü ayrı; transaction içinde.)
 */
async function assertBookable(staffId: number, startAt: Date, endAt: Date) {
  const tz = config.businessTimezone;

  if (startAt.getTime() <= Date.now()) {
    throw new AppError(400, 'Geçmiş bir zamana randevu alınamaz');
  }

  const dateStr = dateStrInTz(startAt, tz);
  const dayStart = localMidnightUtc(dateStr, tz);
  const startMin = toMinuteOfDay(startAt, dayStart);
  const endMin = toMinuteOfDay(endAt, dayStart);
  const dow = weekdayOf(dateStr);

  const wh = await prisma.workingHour.findMany({ where: { staffId, dayOfWeek: dow } });
  const fits = wh.some((w) => startMin >= w.startMinute && endMin <= w.endMinute);
  if (!fits) throw new AppError(400, 'Seçilen saat personelin çalışma saatleri dışında');

  const offs = await prisma.timeOff.findMany({
    where: { staffId, startAt: { lt: endAt }, endAt: { gt: startAt } },
  });
  if (offs.length > 0) throw new AppError(400, 'Personel bu saatte izinli/tatilde');
}

async function getAppointmentOr404(id: number) {
  const appt = await prisma.appointment.findUnique({
    where: { id },
    include: { staff: true, service: true },
  });
  if (!appt) throw new AppError(404, 'Randevu bulunamadı');
  return appt;
}

export interface CreateOpts {
  /** Eşzamanlılık testi için istek etiketi (loglarda A/B). */
  label?: string;
  /**
   * Eşzamanlılık testi için: uygulama kontrolü ile INSERT arasına yapay
   * gecikme (ms). İki isteğin de kontrolü İNSERT'ten önce geçmesini sağlar.
   * Üretimde kullanılmaz (yalnızca test başlığı ile tetiklenir).
   */
  testDelayMs?: number;
}

/**
 * PostgreSQL exclusion (23P01) ihlali mi? Prisma bu hatayı P2002 gibi tipli bir
 * kodla değil, ham/bilinmeyen hata olarak sarar; bu yüzden PG kodunu ve kısıt
 * adını elle tespit ediyoruz. (Ayrıntı: docs/proje-ozeti.md, Gün 6.)
 */
function isExclusionViolation(err: unknown): boolean {
  const e = err as { code?: string; meta?: { code?: string }; message?: string };
  const msg = String(e?.message ?? '');
  return (
    e?.code === '23P01' ||
    e?.meta?.code === '23P01' ||
    msg.includes('23P01') ||
    msg.includes('appointments_no_overlap') ||
    msg.includes('exclusion constraint')
  );
}

const now = () => new Date().toISOString();

/**
 * Randevu oluşturur. Çakışma kontrolü İKİ KATMANDA yapılır:
 *   1) Uygulama katmanı: transaction içinde "bu slot boş mu" sorgusu.
 *   2) Veritabanı katmanı: appointments_no_overlap EXCLUDE kısıtı (son garanti).
 * Eşzamanlı iki istekte 1. katmanı ikisi de geçebilir; 2. katman kaybedeni
 * reddeder ve bu, temiz bir 409'a çevrilir.
 */
export async function createAppointment(
  customerId: number,
  input: CreateAppointmentInput,
  opts: CreateOpts = {},
) {
  const tag = opts.label ? `[${opts.label}] ` : '';

  const service = await prisma.service.findUnique({ where: { id: input.serviceId } });
  if (!service || !service.active) throw new AppError(404, 'Hizmet bulunamadı veya pasif');

  const staff = await prisma.staffProfile.findUnique({ where: { id: input.staffId } });
  if (!staff) throw new AppError(404, 'Personel bulunamadı');

  const link = await prisma.staffService.findUnique({
    where: { staffId_serviceId: { staffId: input.staffId, serviceId: input.serviceId } },
  });
  if (!link) throw new AppError(400, 'Bu personel bu hizmeti vermiyor');

  const startAt = input.startAt;
  const endAt = new Date(startAt.getTime() + service.durationMinutes * 60000);

  // Geçmiş / çalışma saati / izin ön koşulları
  await assertBookable(input.staffId, startAt, endAt);

  try {
    return await prisma.$transaction(async (tx) => {
      // --- KATMAN 1: Uygulama seviyesi çakışma kontrolü ---
      const conflict = await tx.appointment.findFirst({
        where: {
          staffId: input.staffId,
          status: { not: AppointmentStatus.CANCELLED },
          startAt: { lt: endAt },
          endAt: { gt: startAt },
        },
      });
      console.log(
        `${tag}KATMAN1 uygulama kontrolü -> ${conflict ? 'ÇAKIŞMA VAR' : 'slot BOŞ'} @ ${now()}`,
      );
      if (conflict) {
        throw new AppError(409, 'Bu saat dolu', 'APP_CONFLICT');
      }

      // Test kancası: iki isteğin de kontrolü INSERT'ten önce geçmesi için gecikme
      if (opts.testDelayMs && opts.testDelayMs > 0) {
        await new Promise((r) => setTimeout(r, opts.testDelayMs));
      }

      console.log(`${tag}KATMAN2 INSERT deneniyor @ ${now()}`);
      // --- KATMAN 2: DB EXCLUDE kısıtı (son garanti) ---
      const created = await tx.appointment.create({
        data: {
          customerId,
          staffId: input.staffId,
          serviceId: input.serviceId,
          startAt,
          endAt,
          status: AppointmentStatus.PENDING,
          note: input.note ?? null,
        },
      });
      console.log(`${tag}KATMAN2 INSERT BAŞARILI (id=${created.id}) @ ${now()}`);
      return created;
    });
  } catch (err) {
    if (isExclusionViolation(err)) {
      console.log(`${tag}KATMAN2 DB kısıtı REDDETTİ (23P01) -> 409 @ ${now()}`);
      throw new AppError(
        409,
        'Bu saat az önce başkası tarafından alındı, lütfen başka bir saat seçin',
        'SLOT_TAKEN',
      );
    }
    throw err;
  }
}

const APPT_INCLUDE = {
  service: true,
  staff: { include: { user: { select: { fullName: true } } } },
  customer: { select: { id: true, fullName: true, email: true } },
} satisfies Prisma.AppointmentInclude;

/** Oturum açan müşterinin randevuları (en yeni önce). */
export function listMyAppointments(customerId: number) {
  return prisma.appointment.findMany({
    where: { customerId },
    include: APPT_INCLUDE,
    orderBy: { startAt: 'desc' },
  });
}

export interface AppointmentFilters {
  from?: Date;
  to?: Date;
  staffId?: number;
  status?: AppointmentStatus;
}

/**
 * Role duyarlı randevu listesi:
 *  - CUSTOMER: yalnızca kendi randevuları
 *  - STAFF   : yalnızca kendisine atanmış randevular (kendi takvimi)
 *  - ADMIN   : tüm randevular (opsiyonel personel filtresi ile)
 * Ortak filtreler: tarih aralığı (from/to) ve durum.
 */
export async function listAppointments(actor: Actor, filters: AppointmentFilters) {
  const where: Prisma.AppointmentWhereInput = {};

  if (actor.role === Role.CUSTOMER) {
    where.customerId = actor.id;
  } else if (actor.role === Role.STAFF) {
    const sp = await prisma.staffProfile.findUnique({ where: { userId: actor.id } });
    where.staffId = sp?.id ?? -1;
  } else if (actor.role === Role.ADMIN && filters.staffId) {
    where.staffId = filters.staffId;
  }

  if (filters.status) where.status = filters.status;
  if (filters.from || filters.to) {
    where.startAt = {};
    if (filters.from) where.startAt.gte = filters.from;
    if (filters.to) where.startAt.lt = filters.to;
  }

  return prisma.appointment.findMany({
    where,
    include: APPT_INCLUDE,
    orderBy: { startAt: 'asc' },
  });
}

/** Randevu iptali: sahibi müşteri, ADMIN veya atanmış personel yapabilir. */
export async function cancelAppointment(id: number, actor: Actor) {
  const appt = await getAppointmentOr404(id);
  const isOwner = appt.customerId === actor.id;
  const isAdmin = actor.role === Role.ADMIN;
  const isAssignedStaff = actor.role === Role.STAFF && appt.staff.userId === actor.id;
  if (!isOwner && !isAdmin && !isAssignedStaff) {
    throw new AppError(403, 'Bu randevu üzerinde yetkiniz yok');
  }
  if (appt.status === AppointmentStatus.COMPLETED) {
    throw new AppError(400, 'Tamamlanmış randevu iptal edilemez');
  }
  if (appt.status === AppointmentStatus.CANCELLED) {
    throw new AppError(400, 'Randevu zaten iptal edilmiş');
  }
  return prisma.appointment.update({
    where: { id },
    data: { status: AppointmentStatus.CANCELLED },
    include: APPT_INCLUDE,
  });
}

/**
 * Randevu erteleme (yeni başlangıç saati): sahibi müşteri veya ADMIN yapabilir.
 * Tüm ön koşullar yeniden doğrulanır; çakışma iki katmanda kontrol edilir.
 */
export async function rescheduleAppointment(id: number, actor: Actor, newStartAt: Date) {
  const appt = await getAppointmentOr404(id);
  const isOwner = appt.customerId === actor.id;
  const isAdmin = actor.role === Role.ADMIN;
  if (!isOwner && !isAdmin) {
    throw new AppError(403, 'Bu randevu üzerinde yetkiniz yok');
  }
  if (appt.status === AppointmentStatus.COMPLETED || appt.status === AppointmentStatus.CANCELLED) {
    throw new AppError(400, 'Yalnızca aktif (beklemede/onaylı) randevular ertelenebilir');
  }

  const endAt = new Date(newStartAt.getTime() + appt.service.durationMinutes * 60000);
  await assertBookable(appt.staffId, newStartAt, endAt);

  try {
    return await prisma.$transaction(async (tx) => {
      // Uygulama katmanı: kendi kaydı hariç çakışma var mı?
      const conflict = await tx.appointment.findFirst({
        where: {
          staffId: appt.staffId,
          id: { not: id },
          status: { not: AppointmentStatus.CANCELLED },
          startAt: { lt: endAt },
          endAt: { gt: newStartAt },
        },
      });
      if (conflict) throw new AppError(409, 'Bu saat dolu', 'APP_CONFLICT');

      // DB katmanı: EXCLUDE kısıtı son garanti (satır kendisiyle çakışmaz).
      return tx.appointment.update({
        where: { id },
        data: { startAt: newStartAt, endAt },
        include: APPT_INCLUDE,
      });
    });
  } catch (err) {
    if (isExclusionViolation(err)) {
      throw new AppError(
        409,
        'Bu saat az önce başkası tarafından alındı, lütfen başka bir saat seçin',
        'SLOT_TAKEN',
      );
    }
    throw err;
  }
}

/** Durum güncelleme (onay/tamamlandı/iptal): ADMIN veya atanmış personel. */
export async function updateStatus(id: number, actor: Actor, status: AppointmentStatus) {
  const appt = await getAppointmentOr404(id);
  const isAdmin = actor.role === Role.ADMIN;
  const isAssignedStaff = actor.role === Role.STAFF && appt.staff.userId === actor.id;
  if (!isAdmin && !isAssignedStaff) {
    throw new AppError(403, 'Bu işlem için yetkiniz yok');
  }
  return prisma.appointment.update({
    where: { id },
    data: { status },
    include: APPT_INCLUDE,
  });
}
