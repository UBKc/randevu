import { useCallback, useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { useAuth } from '../auth';
import { Appointment, StaffSummary } from '../types';
import { Button, Card, StatusBadge, formatTime } from '../ui';

function isoAtStart(date: string): string {
  return `${date}T00:00:00+03:00`;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [start, setStart] = useState('2026-08-28');
  const [staffId, setStaffId] = useState<number | ''>('');
  const [staff, setStaff] = useState<StaffSummary[]>([]);
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'ADMIN') api.get<StaffSummary[]>('/staff').then(setStaff);
  }, [user]);

  const load = useCallback(async () => {
    setError('');
    const from = isoAtStart(start);
    const to = new Date(new Date(from).getTime() + 7 * 24 * 3600_000).toISOString();
    let q = `/appointments?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    if (user?.role === 'ADMIN' && staffId) q += `&staffId=${staffId}`;
    try {
      setItems(await api.get<Appointment[]>(q));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Yüklenemedi');
    }
  }, [start, staffId, user]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (id: number, status: string) => {
    try {
      await api.patch(`/appointments/${id}/status`, { status });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Güncellenemedi');
    }
  };

  // Güne göre grupla
  const days: { date: string; label: string; list: Appointment[] }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(new Date(isoAtStart(start)).getTime() + i * 24 * 3600_000);
    const dateStr = d.toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' });
    const label = d.toLocaleDateString('tr-TR', {
      timeZone: 'Europe/Istanbul',
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    });
    const list = items
      .filter((a) => a.startAt.slice(0, 10) === dateStr)
      .sort((a, b) => a.startAt.localeCompare(b.startAt));
    days.push({ date: dateStr, label, list });
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold text-slate-800">
          {user?.role === 'ADMIN' ? 'Yönetici Takvimi' : 'Takvimim'}
        </h1>
        <div className="flex items-center gap-2">
          {user?.role === 'ADMIN' && (
            <select
              value={staffId}
              onChange={(e) => setStaffId(Number(e.target.value) || '')}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Tüm personel</option>
              {staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.fullName}
                </option>
              ))}
            </select>
          )}
          <label className="text-sm text-slate-500">Hafta başı:</label>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
        {days.map((d) => (
          <Card key={d.date} className="min-h-[120px]">
            <div className="mb-2 border-b border-slate-100 pb-1 text-sm font-semibold capitalize text-slate-700">
              {d.label}
            </div>
            {d.list.length === 0 ? (
              <p className="text-xs text-slate-300">Randevu yok</p>
            ) : (
              <ul className="space-y-2">
                {d.list.map((a) => (
                  <li key={a.id} className="rounded-md bg-slate-50 p-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-slate-700">
                        {formatTime(a.startAt)}–{formatTime(a.endAt)}
                      </span>
                      <StatusBadge status={a.status} />
                    </div>
                    <div className="text-slate-600">{a.service?.name}</div>
                    <div className="text-xs text-slate-400">
                      {user?.role === 'ADMIN' && <>👤 {a.customer?.fullName} · </>}
                      {a.staff?.user.fullName}
                    </div>
                    {user?.role === 'ADMIN' && (a.status === 'PENDING' || a.status === 'CONFIRMED') && (
                      <div className="mt-1 flex gap-1">
                        {a.status === 'PENDING' && (
                          <button
                            onClick={() => setStatus(a.id, 'CONFIRMED')}
                            className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700 hover:bg-blue-200"
                          >
                            Onayla
                          </button>
                        )}
                        <button
                          onClick={() => setStatus(a.id, 'COMPLETED')}
                          className="rounded bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700 hover:bg-emerald-200"
                        >
                          Tamamla
                        </button>
                        <button
                          onClick={() => setStatus(a.id, 'CANCELLED')}
                          className="rounded bg-rose-100 px-2 py-0.5 text-xs text-rose-700 hover:bg-rose-200"
                        >
                          İptal
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
