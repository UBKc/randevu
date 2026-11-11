/**
 * Slot hesaplama algoritmasını ADIM ADIM gösteren örnek.
 * Çıktı docs/03-slot-hesaplama-ornegi.txt olarak kaydedilir.
 *
 * Senaryo (26 Ağustos 2026, Çarşamba):
 *   Personel: Ayşe (Kuaför) — Çarşamba çalışma saati 09:00–17:00
 *   Hizmet  : 45 dakikalık bir hizmet (ör. Saç Boyama'nın kısaltılmış hâli)
 *   Adım    : 30 dakika (09:00, 09:30, 10:00 ... aday başlangıçlar)
 *   İzin    : 12:00–13:00 öğle izni
 *   Dolu    : 10:00–10:45 ve 13:00–14:30 (iptal edilmemiş randevular)
 *   Şu an   : 26 Ağustos 11:30 (bu saatten önceki slotlar geçmiştir)
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  computeAvailableSlots,
  formatSlot,
  minutesToHHMM,
  Interval,
} from '../src/modules/slots/slots.core';

const HM = (h: number, m = 0) => h * 60 + m;

const input = {
  workingIntervals: [{ start: HM(9), end: HM(17) }] as Interval[],
  timeOffIntervals: [{ start: HM(12), end: HM(13) }] as Interval[],
  busyIntervals: [
    { start: HM(10), end: HM(10, 45) },
    { start: HM(13), end: HM(14, 30) },
  ] as Interval[],
  serviceDurationMinutes: 45,
  slotStepMinutes: 30,
  nowMinute: HM(11, 30),
};

const { trace } = computeAvailableSlots(input);

const lines: string[] = [];
const w = (s = '') => lines.push(s);

const listSlots = (slots: Interval[]) =>
  slots.length ? slots.map(formatSlot).join('  ') : '(boş)';

w('==================================================================');
w('  UYGUN SLOT HESAPLAMA — ADIM ADIM ÖRNEK');
w('==================================================================');
w('Tarih   : 26 Ağustos 2026 (Çarşamba)');
w('Personel: Ayşe (Kuaför), Çarşamba çalışma saati 09:00–17:00');
w(`Hizmet  : ${input.serviceDurationMinutes} dakika`);
w(`Adım    : ${input.slotStepMinutes} dakika`);
w(`İzin    : ${input.timeOffIntervals.map(formatSlot).join(', ')} (öğle izni)`);
w(`Dolu    : ${input.busyIntervals.map(formatSlot).join(', ')}`);
w(`Şu an   : ${minutesToHHMM(input.nowMinute)} (öncesi geçmiş)`);
w('Aralıklar yarı açıktır: [başlangıç, bitiş) — bitiş anı dâhil değildir.');
w('');
w('------------------------------------------------------------------');
w('  AŞAMA 1 — Çalışma saatlerinden üretilen aday slotlar');
w('------------------------------------------------------------------');
w(`Kalan slot sayısı: ${trace.counts.candidates}`);
w(listSlots(trace.candidates));
w('');
w('------------------------------------------------------------------');
w('  AŞAMA 2 — İzin/tatil ile kesişenler elendikten sonra');
w('------------------------------------------------------------------');
w(`Elenen: ${trace.counts.candidates - trace.counts.afterTimeOff}  |  Kalan: ${trace.counts.afterTimeOff}`);
w(listSlots(trace.afterTimeOff));
w('');
w('------------------------------------------------------------------');
w('  AŞAMA 3 — Dolu randevularla kesişenler elendikten sonra');
w('------------------------------------------------------------------');
w(`Elenen: ${trace.counts.afterTimeOff - trace.counts.afterBusy}  |  Kalan: ${trace.counts.afterBusy}`);
w(listSlots(trace.afterBusy));
w('');
w('------------------------------------------------------------------');
w('  AŞAMA 4 — Hizmet süresi mesai bitimini aşanlar elendikten sonra');
w('------------------------------------------------------------------');
w(`Elenen: ${trace.counts.afterBusy - trace.counts.afterShiftFit}  |  Kalan: ${trace.counts.afterShiftFit}`);
w(listSlots(trace.afterShiftFit));
w('');
w('------------------------------------------------------------------');
w('  AŞAMA 5 — Geçmiş saatler elendikten sonra (NİHAİ LİSTE)');
w('------------------------------------------------------------------');
w(`Elenen: ${trace.counts.afterShiftFit - trace.counts.afterPast}  |  Kalan: ${trace.counts.afterPast}`);
w(listSlots(trace.afterPast));
w('');
w('==================================================================');
w('  ÖZET TABLOSU');
w('==================================================================');
w('Aşama                                             | Kalan slot');
w('--------------------------------------------------+-----------');
w(`1) Çalışma saatlerinden aday slotlar              | ${String(trace.counts.candidates).padStart(9)}`);
w(`2) İzin/tatil elendikten sonra                    | ${String(trace.counts.afterTimeOff).padStart(9)}`);
w(`3) Dolu randevular elendikten sonra               | ${String(trace.counts.afterBusy).padStart(9)}`);
w(`4) Mesai bitimini aşanlar elendikten sonra        | ${String(trace.counts.afterShiftFit).padStart(9)}`);
w(`5) Geçmiş saatler elendikten sonra (nihai)        | ${String(trace.counts.afterPast).padStart(9)}`);

const outPath = resolve(__dirname, '../../docs/03-slot-hesaplama-ornegi.txt');
const text = lines.join('\r\n') + '\r\n';
writeFileSync(outPath, text, 'utf8');
console.log(text);
console.log(`\nKaydedildi: ${outPath}`);
