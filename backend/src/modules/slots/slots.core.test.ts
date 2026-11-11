import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAvailableSlots,
  overlaps,
  formatSlot,
  Interval,
} from './slots.core';

const starts = (slots: Interval[]) => slots.map((s) => s.start);

// ---------------------------------------------------------------------------
// overlaps() — yarı açık aralık mantığı
// ---------------------------------------------------------------------------

test('overlaps: arka arkaya aralıklar (09:00-09:30 ve 09:30-10:00) ÇAKIŞMAZ', () => {
  assert.equal(overlaps({ start: 540, end: 570 }, { start: 570, end: 600 }), false);
});

test('overlaps: gerçekten kesişen aralıklar çakışır', () => {
  assert.equal(overlaps({ start: 540, end: 600 }, { start: 570, end: 630 }), true);
});

test('overlaps: bir aralık diğerini kapsıyorsa çakışır', () => {
  assert.equal(overlaps({ start: 540, end: 630 }, { start: 570, end: 600 }), true);
});

// ---------------------------------------------------------------------------
// Aday üretimi ve temel akış
// ---------------------------------------------------------------------------

test('temel: 09:00-10:00, 30 dk hizmet, 30 dk adım -> 2 aday slot', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 600 }],
    timeOffIntervals: [],
    busyIntervals: [],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  assert.equal(r.trace.counts.candidates, 2);
  assert.deepEqual(starts(r.slots), [540, 570]);
});

// ---------------------------------------------------------------------------
// SINIR DURUMU 1: Tam mesai bitiminde biten slot DÂHİLDİR (yarı açık [start,end))
// ---------------------------------------------------------------------------

test('sınır: tam mesai bitiminde biten slot dâhil edilir', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 600 }], // 09:00-10:00
    timeOffIntervals: [],
    busyIntervals: [],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  // 09:30-10:00 slotu, bitişi tam 10:00 (mesai bitimi) olduğu için dâhil.
  const last = r.slots[r.slots.length - 1];
  assert.equal(formatSlot(last), '09:30-10:00');
  assert.equal(last.end, 600);
});

// ---------------------------------------------------------------------------
// SINIR DURUMU 2: Hizmet süresi mesai bitimini AŞAN slotlar elenir
// ---------------------------------------------------------------------------

test('sınır: hizmet süresi mesai bitimini aşan slot elenir', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 600 }], // 09:00-10:00
    timeOffIntervals: [],
    busyIntervals: [],
    serviceDurationMinutes: 45,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  // Adaylar: 09:00-09:45 ve 09:30-10:15. İkincisi 10:00'ı aşar -> elenir.
  assert.equal(r.trace.counts.candidates, 2);
  assert.equal(r.trace.counts.afterShiftFit, 1);
  assert.deepEqual(r.slots.map(formatSlot), ['09:00-09:45']);
});

// ---------------------------------------------------------------------------
// SINIR DURUMU 3: Arka arkaya randevu, komşu slotu ENGELLEMEZ
// ---------------------------------------------------------------------------

test('sınır: dolu randevuya bitişik slot engellenmez', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 600 }],
    timeOffIntervals: [],
    busyIntervals: [{ start: 540, end: 570 }], // 09:00-09:30 dolu
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  // 09:00-09:30 dolu ile çakışır (elenir); 09:30-10:00 bitişik, çakışmaz (kalır).
  assert.deepEqual(r.slots.map(formatSlot), ['09:30-10:00']);
});

// ---------------------------------------------------------------------------
// SINIR DURUMU 4: Tüm gün izin -> hiç slot kalmaz
// ---------------------------------------------------------------------------

test('sınır: tam gün izin, tüm slotları eler', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 1020 }], // 09:00-17:00
    timeOffIntervals: [{ start: 0, end: 1440 }], // tüm gün kapalı
    busyIntervals: [],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  assert.ok(r.trace.counts.candidates > 0);
  assert.equal(r.trace.counts.afterTimeOff, 0);
  assert.equal(r.slots.length, 0);
});

// ---------------------------------------------------------------------------
// SINIR DURUMU 5: Bugünün geçmiş saatleri elenir
// ---------------------------------------------------------------------------

test('sınır: bugünün geçmiş saatleri elenir (nowMinute)', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 660 }], // 09:00-11:00
    timeOffIntervals: [],
    busyIntervals: [],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: 600, // şu an 10:00
  });
  // Adaylar 09:00, 09:30, 10:00, 10:30 -> 10:00 ve sonrası kalır.
  assert.deepEqual(starts(r.slots), [600, 630]);
});

test('gelecek gün: nowMinute null iken geçmiş elemesi yapılmaz', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 660 }],
    timeOffIntervals: [],
    busyIntervals: [],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  assert.deepEqual(starts(r.slots), [540, 570, 600, 630]);
});

// ---------------------------------------------------------------------------
// Kapsamlı senaryo: dokümante edilen 26 Ağustos örneğiyle aynı girdiler
// (çalışma 09:00-17:00, 45 dk hizmet, 30 dk adım, öğle izni, 2 dolu randevu,
//  şu an 11:30) -> her aşama görünür iş yapar, nihai 4 slot.
// ---------------------------------------------------------------------------

test('kapsamlı: her aşama slot eler, nihai liste doğru', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 1020 }], // 09:00-17:00
    timeOffIntervals: [{ start: 720, end: 780 }], // 12:00-13:00 izin
    busyIntervals: [
      { start: 600, end: 645 }, // 10:00-10:45 dolu
      { start: 780, end: 870 }, // 13:00-14:30 dolu
    ],
    serviceDurationMinutes: 45,
    slotStepMinutes: 30,
    nowMinute: 690, // 11:30
  });
  assert.equal(r.trace.counts.candidates, 16);
  assert.equal(r.trace.counts.afterTimeOff, 13);
  assert.equal(r.trace.counts.afterBusy, 7);
  assert.equal(r.trace.counts.afterShiftFit, 6);
  assert.equal(r.trace.counts.afterPast, 4);
  assert.deepEqual(r.slots.map(formatSlot), [
    '14:30-15:15',
    '15:00-15:45',
    '15:30-16:15',
    '16:00-16:45',
  ]);
});
