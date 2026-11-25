import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeAvailableSlots,
  overlaps,
  formatSlot,
  Interval,
} from './slots.core';

const starts = (slots: Interval[]) => slots.map((s) => s.start);

// overlaps: yari acik aralik

test('overlaps: arka arkaya aralıklar (09:00-09:30 ve 09:30-10:00) ÇAKIŞMAZ', () => {
  assert.equal(overlaps({ start: 540, end: 570 }, { start: 570, end: 600 }), false);
});

test('overlaps: gerçekten kesişen aralıklar çakışır', () => {
  assert.equal(overlaps({ start: 540, end: 600 }, { start: 570, end: 630 }), true);
});

test('overlaps: bir aralık diğerini kapsıyorsa çakışır', () => {
  assert.equal(overlaps({ start: 540, end: 630 }, { start: 570, end: 600 }), true);
});

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

// mesai bitiminde biten slot dahil

test('sınır: tam mesai bitiminde biten slot dâhil edilir', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 600 }],
    timeOffIntervals: [],
    busyIntervals: [],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  const last = r.slots[r.slots.length - 1];
  assert.equal(formatSlot(last), '09:30-10:00');
  assert.equal(last.end, 600);
});

// mesaiyi asan slot eleniyor

test('sınır: hizmet süresi mesai bitimini aşan slot elenir', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 600 }],
    timeOffIntervals: [],
    busyIntervals: [],
    serviceDurationMinutes: 45,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  assert.equal(r.trace.counts.candidates, 2);
  assert.equal(r.trace.counts.afterShiftFit, 1);
  assert.deepEqual(r.slots.map(formatSlot), ['09:00-09:45']);
});

// arka arkaya randevu yandaki slotu engellemiyor

test('sınır: dolu randevuya bitişik slot engellenmez', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 600 }],
    timeOffIntervals: [],
    busyIntervals: [{ start: 540, end: 570 }],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  assert.deepEqual(r.slots.map(formatSlot), ['09:30-10:00']);
});

// tum gun izin varsa slot kalmiyor

test('sınır: tam gün izin, tüm slotları eler', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 1020 }],
    timeOffIntervals: [{ start: 0, end: 1440 }],
    busyIntervals: [],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: null,
  });
  assert.ok(r.trace.counts.candidates > 0);
  assert.equal(r.trace.counts.afterTimeOff, 0);
  assert.equal(r.slots.length, 0);
});

// bugunun gecmis saatleri eleniyor

test('sınır: bugünün geçmiş saatleri elenir (nowMinute)', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 660 }],
    timeOffIntervals: [],
    busyIntervals: [],
    serviceDurationMinutes: 30,
    slotStepMinutes: 30,
    nowMinute: 600,
  });
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

// docs'taki 26 agustos ornegiyle ayni girdiler, sonucta 4 slot

test('kapsamlı: her aşama slot eler, nihai liste doğru', () => {
  const r = computeAvailableSlots({
    workingIntervals: [{ start: 540, end: 1020 }],
    timeOffIntervals: [{ start: 720, end: 780 }],
    busyIntervals: [
      { start: 600, end: 645 },
      { start: 780, end: 870 },
    ],
    serviceDurationMinutes: 45,
    slotStepMinutes: 30,
    nowMinute: 690,
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
