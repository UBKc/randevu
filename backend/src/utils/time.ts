// saat dilimi donusumleri burada, slots.core sadece dakikalarla calisiyor

// istanbul icin +180
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

export function localMidnightUtc(dateStr: string, timeZone: string): Date {
  const naiveUtc = new Date(`${dateStr}T00:00:00Z`);
  const off = tzOffsetMinutes(naiveUtc, timeZone);
  return new Date(naiveUtc.getTime() - off * 60000);
}

export function toMinuteOfDay(instant: Date, dayStartUtc: Date): number {
  return Math.round((instant.getTime() - dayStartUtc.getTime()) / 60000);
}

export function fromMinuteOfDay(dayStartUtc: Date, minute: number): Date {
  return new Date(dayStartUtc.getTime() + minute * 60000);
}

export function clampToDayMinutes(
  start: Date,
  end: Date,
  dayStartUtc: Date,
): { start: number; end: number } {
  const s = Math.max(0, toMinuteOfDay(start, dayStartUtc));
  const e = Math.min(1440, toMinuteOfDay(end, dayStartUtc));
  return { start: s, end: e };
}

export function dateStrInTz(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(instant);
}

// 0 = pazar
export function weekdayOf(dateStr: string): number {
  return new Date(`${dateStr}T00:00:00Z`).getUTCDay();
}

// gecmis gun -> 1440, gelecek gun -> null, bugun -> simdiki dakika
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
