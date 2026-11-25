// uygun slot hesabi. veritabanindan ve saat diliminden bagimsiz, test edilebilsin diye
// zamanlar gun icindeki dakika olarak (09:00 -> 540), araliklar yari acik [baslangic, bitis)

export interface Interval {
  start: number;
  end: number;
}

export interface SlotInput {
  workingIntervals: Interval[];
  timeOffIntervals: Interval[];
  busyIntervals: Interval[];
  serviceDurationMinutes: number;
  // 30 -> 09:00, 09:30, 10:00 ...
  slotStepMinutes: number;
  // null: gun gelecekte, eleme yok. bugunse simdiki dakika, gecmis gunse 1440
  nowMinute: number | null;
}

export interface SlotTrace {
  candidates: Interval[];
  afterTimeOff: Interval[];
  afterBusy: Interval[];
  afterShiftFit: Interval[];
  afterPast: Interval[];
  counts: {
    candidates: number;
    afterTimeOff: number;
    afterBusy: number;
    afterShiftFit: number;
    afterPast: number;
  };
}

export interface SlotResult {
  slots: Interval[];
  trace: SlotTrace;
}

// bitisik araliklar (a.end == b.start) kesismiyor
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

function fitsInAnyShift(slot: Interval, shifts: Interval[]): boolean {
  return shifts.some((s) => slot.start >= s.start && slot.end <= s.end);
}

// sirayla: adaylar, izinle kesisenler, dolu randevuyla kesisenler, mesaiyi asanlar, gecmis saatler
// her asamanin sonucu da donuyor, docs'taki ornek bunlardan cikiyor
export function computeAvailableSlots(input: SlotInput): SlotResult {
  const {
    workingIntervals,
    timeOffIntervals,
    busyIntervals,
    serviceDurationMinutes,
    slotStepMinutes,
    nowMinute,
  } = input;

  if (serviceDurationMinutes <= 0) {
    throw new Error('serviceDurationMinutes pozitif olmalı');
  }
  if (slotStepMinutes <= 0) {
    throw new Error('slotStepMinutes pozitif olmalı');
  }

  // 1) adaylar
  // bitisi mesaiyi asan adaylar da uretiliyor, onlari 4. adim eliyor
  const candidates: Interval[] = [];
  const sortedShifts = [...workingIntervals].sort((a, b) => a.start - b.start);
  for (const shift of sortedShifts) {
    for (let start = shift.start; start < shift.end; start += slotStepMinutes) {
      candidates.push({ start, end: start + serviceDurationMinutes });
    }
  }

  // 2) izin
  const afterTimeOff = candidates.filter(
    (slot) => !timeOffIntervals.some((off) => overlaps(slot, off)),
  );

  // 3) dolu randevular
  const afterBusy = afterTimeOff.filter(
    (slot) => !busyIntervals.some((busy) => overlaps(slot, busy)),
  );

  // 4) mesaiyi asanlar
  const afterShiftFit = afterBusy.filter((slot) =>
    fitsInAnyShift(slot, workingIntervals),
  );

  // 5) gecmis saatler
  const afterPast =
    nowMinute === null
      ? afterShiftFit
      : afterShiftFit.filter((slot) => slot.start >= nowMinute);

  return {
    slots: afterPast,
    trace: {
      candidates,
      afterTimeOff,
      afterBusy,
      afterShiftFit,
      afterPast,
      counts: {
        candidates: candidates.length,
        afterTimeOff: afterTimeOff.length,
        afterBusy: afterBusy.length,
        afterShiftFit: afterShiftFit.length,
        afterPast: afterPast.length,
      },
    },
  };
}

export function minutesToHHMM(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatSlot(slot: Interval): string {
  return `${minutesToHHMM(slot.start)}-${minutesToHHMM(slot.end)}`;
}
