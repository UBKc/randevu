/**
 * Saat dilimi (timezone) yardımcıları.
 *
 * Slot çekirdeği (slots.core.ts) saf ve dakika-bazlıdır; mutlak zaman (Date)
 * ile "gün içi dakika" arasındaki dönüşümü BU katman yapar. Böylece TZ
 * karmaşası tek yerde toplanır ve çekirdek test edilebilir kalır.
 *
 * İşletme saat dilimi Europe/Istanbul'dur (kalıcı +03:00, DST yok). Yine de
 * offset sabit kodlanmaz; her an için Intl ile hesaplanır (taşınabilirlik).
 */

/** Verilen an için TZ offset'i (dakika). local = utc + offset (İstanbul: +180). */
export function tzOffsetMinutes(instant: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
  const map: Record<string, number> = {};
  for (const p of dtf.formatToParts(instant)) {
    if (p.type !== 'literal') map[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(map.year, map.month - 1, map.day, map.hour, map.minute, map.second);
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/** 'YYYY-MM-DD' yerel gün başlangıcının (00:00) mutlak UTC anı. */
export function localMidnightUtc(dateStr: string, timeZone: string): Date {
  const naiveUtc = new Date(`${dateStr}T00:00:00Z`);
  const off = tzOffsetMinutes(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - off * 60000);
}

/** Bir anı, o günün başlangıcına göre gün içi dakikaya çevirir. */
export function toMinuteOfDay(instant: Date, dayStartUtc: Date): number {
  return Math.round((instant.getTime() - dayStartUtc.getTime()) / 60000);
}

/** Gün başlangıcı + dakika -> mutlak an. */
export function fromMinuteOfDay(dayStartUtc: Date, minute: number): Date {
  return new Date(dayStartUtc.getTime() + minute * 60000);
}

/** Bir [start,end) mutlak aralığını, hedef güne kırparak dakika aralığına çevirir. */
export function clampToDayMinutes(
  start: Date,
  end: Date,
  dayStartUtc: Date,
): { start: number; end: number } {
  const s = Math.max(0, toMinuteOfDay(start, dayStartUtc));
  const e = Math.min(1440, toMinuteOfDay(end, dayStartUtc));
  return { start: s, end: e };
}

/** Bir anın, verilen saat diliminde 'YYYY-MM-DD' takvim tarihi. */
export function dateStrInTz(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

/** 'YYYY-MM-DD' tarihinin haftanın günü (0=Pazar .. 6=Cumartesi). */
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

/**
 * Hedef gün için "geçmiş elemesi" dakikasını üretir:
 *  - hedef gün geçmişteyse   -> 1440 (tüm slotlar geçmiş)
 *  - hedef gün gelecekteyse  -> null (eleme yok)
 *  - hedef gün bugünse       -> şu anın gün içi dakikası
 */
export function nowMinuteForDate(
  dateStr: string,
  timeZone: string,
  now: Date = new Date(),
): number | null {
  const today = dateStrInTz(now, timeZone);
  if (dateStr < today) return 1440;
  if (dateStr > today) return null;
  const off = tzOffsetMinutes(now, timeZone);
  const localMs = now.getTime() + off * 60000;
  const local = new Date(localMs);
  return local.getUTCHours() * 60 + local.getUTCMinutes();
}
