/**
 * Seed verisi — Randevu / Rezervasyon Yönetim Sistemi
 *
 * TARİH KURALLARI:
 *  - Geçmiş kayıtlar (tamamlanmış/iptal randevular, kullanıcı kayıt tarihleri):
 *    20–28 Ağustos 2026 aralığında.
 *  - Gelecek randevular: 28 Ağustos – 15 Eylül 2026 aralığında.
 *  - Çalışma saatleri haftalık tekrar eden yapıda; SABİT TARİH İÇERMEZ.
 *  - Hiçbir kayıt 20 Ağustos 2026'dan öncesine tarihlenmez.
 *
 * Tüm duvar-saati (wall-clock) değerleri Türkiye saati (+03:00) ile verilir.
 * Randevu saatleri personelin çalışma saatleri içinde ve çakışmayacak
 * biçimde elle seçilmiştir (appointments_no_overlap EXCLUDE kısıtı aksini
 * reddeder).
 */
import { PrismaClient, Role, AppointmentStatus, TimeOffType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

/** Türkiye saatiyle (+03:00) mutlak bir zaman anı üretir. */
function tr(iso: string): Date {
  return new Date(`${iso}+03:00`);
}

/** Dakika bazlı gün içi süreyi "HH:MM" değerinden üretir (working_hours için). */
const HM = (h: number, m = 0) => h * 60 + m;

async function main() {
  console.log('Seed başlıyor...');

  // --- Temizlik ---
  // TRUNCATE ... RESTART IDENTITY: tabloları boşaltır VE otomatik-artan id
  // sayaçlarını sıfırlar. Böylece seed her çalıştığında id'ler 1'den başlar
  // (deterministik id'ler; Postman ve ekran görüntüleri için önemli).
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "appointments","time_offs","working_hours","staff_services","services","staff_profiles","users" RESTART IDENTITY CASCADE;',
  );

  const passwordHash = await bcrypt.hash('Parola123!', 10);

  // ---------------------------------------------------------------------
  // Kullanıcılar — createdAt açıkça 20–28 Ağustos 2026 aralığında
  // ---------------------------------------------------------------------
  const admin = await prisma.user.create({
    data: {
      email: 'admin@randevu.local',
      passwordHash,
      fullName: 'Deniz Yönetici',
      phone: '+90 555 000 0001',
      role: Role.ADMIN,
      createdAt: tr('2026-08-20T09:00:00'),
      updatedAt: tr('2026-08-20T09:00:00'),
    },
  });

  // Personeller (User + StaffProfile)
  const staffAyse = await prisma.user.create({
    data: {
      email: 'ayse@randevu.local',
      passwordHash,
      fullName: 'Ayşe Kuaför',
      phone: '+90 555 000 0002',
      role: Role.STAFF,
      createdAt: tr('2026-08-20T09:30:00'),
      updatedAt: tr('2026-08-20T09:30:00'),
      staffProfile: { create: { title: 'Kuaför', createdAt: tr('2026-08-20T09:30:00') } },
    },
    include: { staffProfile: true },
  });

  const staffMehmet = await prisma.user.create({
    data: {
      email: 'mehmet@randevu.local',
      passwordHash,
      fullName: 'Mehmet Berber',
      phone: '+90 555 000 0003',
      role: Role.STAFF,
      createdAt: tr('2026-08-20T10:00:00'),
      updatedAt: tr('2026-08-20T10:00:00'),
      staffProfile: { create: { title: 'Berber', createdAt: tr('2026-08-20T10:00:00') } },
    },
    include: { staffProfile: true },
  });

  const staffZeynep = await prisma.user.create({
    data: {
      email: 'zeynep@randevu.local',
      passwordHash,
      fullName: 'Zeynep Estetisyen',
      phone: '+90 555 000 0004',
      role: Role.STAFF,
      createdAt: tr('2026-08-21T09:00:00'),
      updatedAt: tr('2026-08-21T09:00:00'),
      staffProfile: { create: { title: 'Cilt Bakım Uzmanı', createdAt: tr('2026-08-21T09:00:00') } },
    },
    include: { staffProfile: true },
  });

  const ayseId = staffAyse.staffProfile!.id;
  const mehmetId = staffMehmet.staffProfile!.id;
  const zeynepId = staffZeynep.staffProfile!.id;

  // Müşteriler
  const [cAli, cBurcu, cCan, cDilek] = await Promise.all([
    prisma.user.create({ data: { email: 'ali@ornek.com', passwordHash, fullName: 'Ali Müşteri', phone: '+90 555 111 1001', role: Role.CUSTOMER, createdAt: tr('2026-08-21T11:00:00'), updatedAt: tr('2026-08-21T11:00:00') } }),
    prisma.user.create({ data: { email: 'burcu@ornek.com', passwordHash, fullName: 'Burcu Müşteri', phone: '+90 555 111 1002', role: Role.CUSTOMER, createdAt: tr('2026-08-22T12:00:00'), updatedAt: tr('2026-08-22T12:00:00') } }),
    prisma.user.create({ data: { email: 'can@ornek.com', passwordHash, fullName: 'Can Müşteri', phone: '+90 555 111 1003', role: Role.CUSTOMER, createdAt: tr('2026-08-24T13:00:00'), updatedAt: tr('2026-08-24T13:00:00') } }),
    prisma.user.create({ data: { email: 'dilek@ornek.com', passwordHash, fullName: 'Dilek Müşteri', phone: '+90 555 111 1004', role: Role.CUSTOMER, createdAt: tr('2026-08-25T14:00:00'), updatedAt: tr('2026-08-25T14:00:00') } }),
  ]);

  // ---------------------------------------------------------------------
  // Hizmetler (ad, süre[dk], ücret[kuruş])
  // ---------------------------------------------------------------------
  const created = tr('2026-08-20T08:00:00');
  const sKesim = await prisma.service.create({ data: { name: 'Saç Kesimi', durationMinutes: 30, priceCents: 25000, createdAt: created } });
  const sBoyama = await prisma.service.create({ data: { name: 'Saç Boyama', durationMinutes: 90, priceCents: 80000, createdAt: created } });
  const sFon = await prisma.service.create({ data: { name: 'Fön', durationMinutes: 30, priceCents: 15000, createdAt: created } });
  const sSakal = await prisma.service.create({ data: { name: 'Sakal Tıraşı', durationMinutes: 20, priceCents: 12000, createdAt: created } });
  const sCilt = await prisma.service.create({ data: { name: 'Cilt Bakımı', durationMinutes: 60, priceCents: 60000, createdAt: created } });
  const sKas = await prisma.service.create({ data: { name: 'Kaş Alımı', durationMinutes: 15, priceCents: 8000, createdAt: created } });

  // ---------------------------------------------------------------------
  // Personel <-> Hizmet eşleşmeleri
  // ---------------------------------------------------------------------
  await prisma.staffService.createMany({
    data: [
      { staffId: ayseId, serviceId: sKesim.id },
      { staffId: ayseId, serviceId: sBoyama.id },
      { staffId: ayseId, serviceId: sFon.id },
      { staffId: mehmetId, serviceId: sKesim.id },
      { staffId: mehmetId, serviceId: sSakal.id },
      { staffId: zeynepId, serviceId: sCilt.id },
      { staffId: zeynepId, serviceId: sKas.id },
    ],
  });

  // ---------------------------------------------------------------------
  // Haftalık çalışma saatleri (dayOfWeek: 0=Pazar .. 6=Cumartesi)
  // SABİT TARİH YOK — haftalık tekrar eder.
  // ---------------------------------------------------------------------
  const weekdays = [1, 2, 3, 4, 5]; // Pazartesi–Cuma
  const whData: { staffId: number; dayOfWeek: number; startMinute: number; endMinute: number }[] = [];
  for (const sid of [ayseId, mehmetId, zeynepId]) {
    for (const d of weekdays) {
      whData.push({ staffId: sid, dayOfWeek: d, startMinute: HM(9), endMinute: HM(17) });
    }
  }
  // Ayşe ek olarak Cumartesi yarım gün çalışıyor
  whData.push({ staffId: ayseId, dayOfWeek: 6, startMinute: HM(10), endMinute: HM(14) });
  await prisma.workingHour.createMany({ data: whData });

  // ---------------------------------------------------------------------
  // İstisna günler (izin/tatil/kapalı) — GELECEK aralıkta (28 Ağu–15 Eyl)
  // ---------------------------------------------------------------------
  await prisma.timeOff.createMany({
    data: [
      // Ayşe 1 Eylül 2026 (Salı) tam gün izinli
      { staffId: ayseId, startAt: tr('2026-09-01T00:00:00'), endAt: tr('2026-09-01T23:59:00'), type: TimeOffType.LEAVE, reason: 'Yıllık izin' },
      // Zeynep 5 Eylül 2026 (Cumartesi) resmi tatil (zaten çalışmıyor ama örnek)
      { staffId: zeynepId, startAt: tr('2026-09-04T00:00:00'), endAt: tr('2026-09-04T23:59:00'), type: TimeOffType.HOLIDAY, reason: 'Tatil' },
    ],
  });

  // ---------------------------------------------------------------------
  // Randevular
  //  A) GEÇMİŞ (COMPLETED / CANCELLED) — 20–27 Ağustos 2026, iş günleri
  //  B) GELECEK (CONFIRMED / PENDING) — 28 Ağustos – 15 Eylül 2026
  // Saatler çalışma saatleri içinde ve çakışmayacak biçimde seçildi.
  // ---------------------------------------------------------------------
  type Appt = {
    customerId: number; staffId: number; serviceId: number;
    start: string; durMin: number; status: AppointmentStatus; createdAt: string; note?: string;
  };
  const appts: Appt[] = [
    // --- A) GEÇMİŞ ---
    // 20 Ağu Perşembe
    { customerId: cAli.id, staffId: ayseId, serviceId: sKesim.id, start: '2026-08-20T09:00:00', durMin: 30, status: AppointmentStatus.COMPLETED, createdAt: '2026-08-20T08:30:00', note: 'Düzenli müşteri' },
    // 21 Ağu Cuma
    { customerId: cBurcu.id, staffId: ayseId, serviceId: sBoyama.id, start: '2026-08-21T10:00:00', durMin: 90, status: AppointmentStatus.COMPLETED, createdAt: '2026-08-21T09:15:00' },
    // 24 Ağu Pazartesi — Mehmet arka arkaya iki randevu (çakışmıyor)
    { customerId: cCan.id, staffId: mehmetId, serviceId: sKesim.id, start: '2026-08-24T09:00:00', durMin: 30, status: AppointmentStatus.COMPLETED, createdAt: '2026-08-24T08:40:00' },
    { customerId: cAli.id, staffId: mehmetId, serviceId: sSakal.id, start: '2026-08-24T09:30:00', durMin: 20, status: AppointmentStatus.COMPLETED, createdAt: '2026-08-24T08:45:00' },
    // 25 Ağu Salı — Zeynep
    { customerId: cDilek.id, staffId: zeynepId, serviceId: sCilt.id, start: '2026-08-25T11:00:00', durMin: 60, status: AppointmentStatus.COMPLETED, createdAt: '2026-08-25T10:00:00' },
    // 26 Ağu Çarşamba — iptal edilmiş randevu (slot yeniden satılabilir)
    { customerId: cCan.id, staffId: ayseId, serviceId: sKesim.id, start: '2026-08-26T09:00:00', durMin: 30, status: AppointmentStatus.CANCELLED, createdAt: '2026-08-25T18:00:00', note: 'Müşteri iptal etti' },

    // --- B) GELECEK ---
    // 28 Ağu Cuma
    { customerId: cAli.id, staffId: ayseId, serviceId: sFon.id, start: '2026-08-28T09:00:00', durMin: 30, status: AppointmentStatus.CONFIRMED, createdAt: '2026-08-26T20:00:00' },
    // 31 Ağu Pazartesi
    { customerId: cDilek.id, staffId: mehmetId, serviceId: sKesim.id, start: '2026-08-31T09:00:00', durMin: 30, status: AppointmentStatus.CONFIRMED, createdAt: '2026-08-26T21:00:00' },
    // 2 Eylül Çarşamba — Ayşe boyama
    { customerId: cBurcu.id, staffId: ayseId, serviceId: sBoyama.id, start: '2026-09-02T10:00:00', durMin: 90, status: AppointmentStatus.PENDING, createdAt: '2026-08-27T08:00:00' },
    // 3 Eylül Perşembe — Mehmet
    { customerId: cBurcu.id, staffId: mehmetId, serviceId: sSakal.id, start: '2026-09-03T09:30:00', durMin: 20, status: AppointmentStatus.PENDING, createdAt: '2026-08-27T08:10:00' },
    // 4 Eylül Cuma — Zeynep cilt
    { customerId: cAli.id, staffId: zeynepId, serviceId: sCilt.id, start: '2026-09-04T11:00:00', durMin: 60, status: AppointmentStatus.PENDING, createdAt: '2026-08-27T08:20:00' },
  ];

  for (const a of appts) {
    const start = tr(a.start);
    const end = new Date(start.getTime() + a.durMin * 60_000);
    await prisma.appointment.create({
      data: {
        customerId: a.customerId,
        staffId: a.staffId,
        serviceId: a.serviceId,
        startAt: start,
        endAt: end,
        status: a.status,
        note: a.note ?? null,
        createdAt: tr(a.createdAt),
        updatedAt: tr(a.createdAt),
      },
    });
  }

  console.log('Seed tamamlandı:');
  console.log(`  Kullanıcılar: 1 admin, 3 personel, 4 müşteri`);
  console.log(`  Hizmetler: 6`);
  console.log(`  Çalışma saati kaydı: ${whData.length}`);
  console.log(`  İzin/tatil: 2`);
  console.log(`  Randevular: ${appts.length} (6 geçmiş, 5 gelecek)`);
  console.log('  Giriş bilgisi (tüm hesaplar): parola = Parola123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
