/**
 * UYGUN SLOT HESAPLAMA — saf (pure), test edilebilir çekirdek.
 *
 * Bu fonksiyon veritabanı, tarih/saat dilimi ve Express'ten TAMAMEN bağımsızdır.
 * Tüm zamanlar "gün içi dakika" (minutes-of-day) olarak ifade edilir:
 *   09:00 -> 540, 17:00 -> 1020.
 * Aralıklar YARI AÇIKtır: [start, end) — yani bitiş anı aralığa dâhil DEĞİLDİR.
 * Bu sayede arka arkaya iki randevu (09:00–09:30 ve 09:30–10:00) çakışmaz.
 *
 * Tasarım gereği fonksiyon her filtre aşamasının ara sonucunu (trace) döndürür;
 * böylece algoritma adım adım anlatılabilir ve dokümante edilebilir.
 */

export interface Interval {
  /** Gün içi başlangıç dakikası (dâhil). */
  start: number;
  /** Gün içi bitiş dakikası (hariç). */
  end: number;
}

export interface SlotInput {
  /** Personelin o günkü çalışma blokları (ör. [{540,1020}] = 09:00–17:00). */
  workingIntervals: Interval[];
  /** İzin/tatil/kapalı blokları (o güne düşen kısım). */
  timeOffIntervals: Interval[];
  /** Dolu (iptal edilmemiş) randevu aralıkları. */
  busyIntervals: Interval[];
  /** Seçilen hizmetin süresi (dakika). */
  serviceDurationMinutes: number;
  /** Aday slotların üretim adımı (dakika). Ör. 30 -> 09:00, 09:30, 10:00 ... */
  slotStepMinutes: number;
  /**
   * Geçmiş saatleri elemek için "şu an"ın gün içi dakikası.
   *  - null  -> hedef gün gelecekte; geçmiş elemesi YAPILMAZ.
   *  - sayı  -> hedef gün bugünse şu anın dakikası; hedef gün tümüyle
   *             geçmişte ise 1440 (24:00) verilerek tüm slotlar elenir.
   */
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
  /** Nihai uygun slot listesi (afterPast ile aynı). */
  slots: Interval[];
  /** Her aşamanın ara sonucu ve sayıları. */
  trace: SlotTrace;
}

/**
 * İki yarı-açık aralık [a.start,a.end) ve [b.start,b.end) kesişiyor mu?
 * Bitişik aralıklar (a.end === b.start) KESİŞMEZ.
 */
export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Bir slotun, çalışma bloklarından en az birine tamamen sığıp sığmadığı. */
function fitsInAnyShift(slot: Interval, shifts: Interval[]): boolean {
  // slot.end <= shift.end olduğundan, tam mesai bitiminde biten slot DÂHİLDİR.
  return shifts.some((s) => slot.start >= s.start && slot.end <= s.end);
}

/**
 * Uygun slotları hesaplar ve her filtre aşamasının ara sonucunu döndürür.
 *
 * Aşama sırası:
 *   1) candidates     : çalışma saatlerinden üretilen aday slotlar
 *   2) afterTimeOff   : izin/tatil ile kesişenler elendikten sonra
 *   3) afterBusy      : dolu randevularla kesişenler elendikten sonra
 *   4) afterShiftFit  : hizmet süresi mesai bitimini aşanlar elendikten sonra
 *   5) afterPast      : geçmiş saatler elendikten sonra (nihai liste)
 */
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

  // --- 1) Aday slotlar: her çalışma bloğunda adım adım başlangıçlar ---
  // start < shift.end koşulu; bitişi mesaiyi aşan adaylar da üretilir,
  // bunları 4. aşama (shift-fit) eler — böylece o aşama görünür iş yapar.
  const candidates: Interval[] = [];
  const sortedShifts = [...workingIntervals].sort((a, b) => a.start - b.start);
  for (const shift of sortedShifts) {
    for (let start = shift.start; start < shift.end; start += slotStepMinutes) {
      candidates.push({ start, end: start + serviceDurationMinutes });
    }
  }

  // --- 2) İzin/tatil ile kesişenleri ele ---
  const afterTimeOff = candidates.filter(
    (slot) => !timeOffIntervals.some((off) => overlaps(slot, off)),
  );

  // --- 3) Dolu randevularla kesişenleri ele ---
  const afterBusy = afterTimeOff.filter(
    (slot) => !busyIntervals.some((busy) => overlaps(slot, busy)),
  );

  // --- 4) Hizmet süresi mesai bitimini aşanları ele ---
  const afterShiftFit = afterBusy.filter((slot) =>
    fitsInAnyShift(slot, workingIntervals),
  );

  // --- 5) Geçmiş saatleri ele ---
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

/** Gün içi dakikayı "HH:MM" biçimine çevirir (raporlama/gösterim için). */
export function minutesToHHMM(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Bir slot aralığını "09:00-09:45" biçiminde yazar. */
export function formatSlot(slot: Interval): string {
  return `${minutesToHHMM(slot.start)}-${minutesToHHMM(slot.end)}`;
}
