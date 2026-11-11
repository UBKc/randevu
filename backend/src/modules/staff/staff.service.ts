import bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';
import { prisma } from '../../prisma';
import { AppError } from '../../utils/http';
import {
  CreateStaffInput,
  CreateTimeOffInput,
  SetStaffServicesInput,
  SetWorkingHoursInput,
} from './staff.schemas';

/**
 * Yetki kontrolü: ADMIN her personeli, STAFF yalnızca kendi profilini yönetir.
 * MÜŞTERİ bu işlemleri yapamaz (route seviyesinde de engellenir).
 */
export async function assertCanManageStaff(
  staffId: number,
  user: { id: number; role: Role },
) {
  if (user.role === Role.ADMIN) return;
  const staff = await prisma.staffProfile.findUnique({ where: { id: staffId } });
  if (!staff) throw new AppError(404, 'Personel bulunamadı');
  if (user.role === Role.STAFF && staff.userId === user.id) return;
  throw new AppError(403, 'Yalnızca kendi profilinizi yönetebilirsiniz');
}

/** Personel listesi: kullanıcı bilgisi + verebildiği hizmetler. */
export function listStaff() {
  return prisma.staffProfile.findMany({
    include: {
      user: { select: { id: true, email: true, fullName: true, phone: true, role: true } },
      services: { include: { service: true } },
    },
    orderBy: { id: 'asc' },
  });
}

export async function getStaff(id: number) {
  const staff = await prisma.staffProfile.findUnique({
    where: { id },
    include: {
      user: { select: { id: true, email: true, fullName: true, phone: true, role: true } },
      services: { include: { service: true } },
      workingHours: { orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }] },
    },
  });
  if (!staff) throw new AppError(404, 'Personel bulunamadı');
  return staff;
}

/** ADMIN yeni personel (STAFF rolü + StaffProfile) oluşturur. */
export async function createStaff(input: CreateStaffInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new AppError(409, 'Bu e-posta zaten kayıtlı');

  const passwordHash = await bcrypt.hash(input.password, 10);

  // Kullanıcı + profil + (varsa) hizmet eşleşmeleri tek transaction'da.
  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: input.email,
        passwordHash,
        fullName: input.fullName,
        phone: input.phone ?? null,
        role: Role.STAFF,
        staffProfile: { create: { title: input.title ?? null } },
      },
      include: { staffProfile: true },
    });

    const staffId = user.staffProfile!.id;

    if (input.serviceIds && input.serviceIds.length > 0) {
      await tx.staffService.createMany({
        data: input.serviceIds.map((serviceId) => ({ staffId, serviceId })),
        skipDuplicates: true,
      });
    }

    return tx.staffProfile.findUnique({
      where: { id: staffId },
      include: {
        user: { select: { id: true, email: true, fullName: true, phone: true, role: true } },
        services: { include: { service: true } },
      },
    });
  });
}

/** Personelin verebildiği hizmet kümesini tümüyle değiştirir. */
export async function setStaffServices(staffId: number, input: SetStaffServicesInput) {
  await getStaff(staffId); // 404 kontrolü

  // Verilen hizmetlerin gerçekten var olduğunu doğrula.
  const found = await prisma.service.count({ where: { id: { in: input.serviceIds } } });
  if (found !== input.serviceIds.length) {
    throw new AppError(400, 'Bir veya daha fazla hizmet bulunamadı');
  }

  return prisma.$transaction(async (tx) => {
    await tx.staffService.deleteMany({ where: { staffId } });
    if (input.serviceIds.length > 0) {
      await tx.staffService.createMany({
        data: input.serviceIds.map((serviceId) => ({ staffId, serviceId })),
        skipDuplicates: true,
      });
    }
    return tx.staffService.findMany({
      where: { staffId },
      include: { service: true },
    });
  });
}

// ---------------------------------------------------------------------------
// Çalışma saatleri (haftalık) — tüm kümeyi değiştirir (replace).
// ---------------------------------------------------------------------------

export async function setWorkingHours(staffId: number, input: SetWorkingHoursInput) {
  await getStaff(staffId); // 404 kontrolü

  // Aynı gün içinde çakışan çalışma bloklarını reddet.
  const byDay = new Map<number, { start: number; end: number }[]>();
  for (const w of input.workingHours) {
    const list = byDay.get(w.dayOfWeek) ?? [];
    for (const other of list) {
      if (w.startMinute < other.end && other.start < w.endMinute) {
        throw new AppError(400, `Aynı gün (${w.dayOfWeek}) içinde çakışan çalışma saatleri`);
      }
    }
    list.push({ start: w.startMinute, end: w.endMinute });
    byDay.set(w.dayOfWeek, list);
  }

  return prisma.$transaction(async (tx) => {
    await tx.workingHour.deleteMany({ where: { staffId } });
    if (input.workingHours.length > 0) {
      await tx.workingHour.createMany({
        data: input.workingHours.map((w) => ({
          staffId,
          dayOfWeek: w.dayOfWeek,
          startMinute: w.startMinute,
          endMinute: w.endMinute,
        })),
      });
    }
    return tx.workingHour.findMany({
      where: { staffId },
      orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
    });
  });
}

export async function listWorkingHours(staffId: number) {
  await getStaff(staffId);
  return prisma.workingHour.findMany({
    where: { staffId },
    orderBy: [{ dayOfWeek: 'asc' }, { startMinute: 'asc' }],
  });
}

// ---------------------------------------------------------------------------
// İzin / tatil (istisna günler)
// ---------------------------------------------------------------------------

export async function listTimeOff(staffId: number) {
  await getStaff(staffId);
  return prisma.timeOff.findMany({ where: { staffId }, orderBy: { startAt: 'asc' } });
}

export async function createTimeOff(staffId: number, input: CreateTimeOffInput) {
  await getStaff(staffId);
  return prisma.timeOff.create({
    data: {
      staffId,
      startAt: input.startAt,
      endAt: input.endAt,
      type: input.type ?? 'LEAVE',
      reason: input.reason ?? null,
    },
  });
}

export async function deleteTimeOff(staffId: number, offId: number) {
  const off = await prisma.timeOff.findUnique({ where: { id: offId } });
  if (!off || off.staffId !== staffId) {
    throw new AppError(404, 'İzin kaydı bulunamadı');
  }
  await prisma.timeOff.delete({ where: { id: offId } });
  return { id: offId, deleted: true };
}
