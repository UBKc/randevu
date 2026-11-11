import { AppointmentStatus } from '@prisma/client';
import { prisma } from '../../prisma';
import { config } from '../../config';
import { AppError } from '../../utils/http';
import {
  clampToDayMinutes,
  fromMinuteOfDay,
  localMidnightUtc,
  nowMinuteForDate,
  weekdayOf,
} from '../../utils/time';
import { computeAvailableSlots, minutesToHHMM } from './slots.core';

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface AvailableSlotsParams {
  staffId: number;
  serviceId: number;
  date: string; // YYYY-MM-DD
  stepMinutes?: number;
}

/**
 * Bir personelin belirli bir hizmet + gün için uygun slotlarını hesaplar.
 * Veritabanından girdileri toplar, TZ dönüşümünü yapar, saf çekirdeği çağırır.
 */
export async function getAvailableSlots(params: AvailableSlotsParams) {
  const { staffId, serviceId, date } = params;
  const step = params.stepMinutes ?? 30;
  const tz = config.businessTimezone;

  if (!DATE_RE.test(date)) {
    throw new AppError(400, 'Geçersiz tarih (YYYY-MM-DD bekleniyor)');
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    throw new AppError(404, 'Hizmet bulunamadı veya pasif');
  }

  const staff = await prisma.staffProfile.findUnique({ where: { id: staffId } });
  if (!staff) throw new AppError(404, 'Personel bulunamadı');

  // Personel bu hizmeti veriyor mu?
  const link = await prisma.staffService.findUnique({
    where: { staffId_serviceId: { staffId, serviceId } },
  });
  if (!link) throw new AppError(400, 'Bu personel bu hizmeti vermiyor');

  // O günkü çalışma blokları
  const dow = weekdayOf(date);
  const wh = await prisma.workingHour.findMany({
    where: { staffId, dayOfWeek: dow },
    orderBy: { startMinute: 'asc' },
  });
  const workingIntervals = wh.map((w) => ({ start: w.startMinute, end: w.endMinute }));

  // Günün mutlak sınırları (yerel gece yarısı -> +24s)
  const dayStart = localMidnightUtc(date, tz);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60000);

  // Dolu (iptal edilmemiş) randevular — güne düşen kısımları
  const appts = await prisma.appointment.findMany({
    where: {
      staffId,
      status: { not: AppointmentStatus.CANCELLED },
      startAt: { lt: dayEnd },
      endAt: { gt: dayStart },
    },
  });
  const busyIntervals = appts.map((a) => clampToDayMinutes(a.startAt, a.endAt, dayStart));

  // İzin/tatil blokları — güne düşen kısımları
  const offs = await prisma.timeOff.findMany({
    where: { staffId, startAt: { lt: dayEnd }, endAt: { gt: dayStart } },
  });
  const timeOffIntervals = offs.map((o) => clampToDayMinutes(o.startAt, o.endAt, dayStart));

  const nowMinute = nowMinuteForDate(date, tz);

  const { slots, trace } = computeAvailableSlots({
    workingIntervals,
    timeOffIntervals,
    busyIntervals,
    serviceDurationMinutes: service.durationMinutes,
    slotStepMinutes: step,
    nowMinute,
  });

  return {
    date,
    staffId,
    serviceId,
    serviceName: service.name,
    durationMinutes: service.durationMinutes,
    slots: slots.map((s) => ({
      start: minutesToHHMM(s.start),
      end: minutesToHHMM(s.end),
      startAt: fromMinuteOfDay(dayStart, s.start).toISOString(),
      endAt: fromMinuteOfDay(dayStart, s.end).toISOString(),
    })),
    counts: trace.counts,
  };
}
