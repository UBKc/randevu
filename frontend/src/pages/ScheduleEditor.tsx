import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { TimeOff, WorkingHour } from '../types';
import { Button, Card, DAY_NAMES, formatDateTime, minutesToHHMM } from '../ui';

interface DayState {
  enabled: boolean;
  start: string; // "09:00"
  end: string;
}

const hhmmToMinutes = (s: string) => {
  const [h, m] = s.split(':').map(Number);
  return h * 60 + m;
};

const emptyWeek = (): DayState[] =>
  Array.from({ length: 7 }, () => ({ enabled: false, start: '09:00', end: '17:00' }));

export default function ScheduleEditor({ staffId }: { staffId: number }) {
  const [week, setWeek] = useState<DayState[]>(emptyWeek());
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // İzin formu
  const [offStart, setOffStart] = useState('');
  const [offEnd, setOffEnd] = useState('');
  const [offType, setOffType] = useState<'LEAVE' | 'HOLIDAY' | 'CLOSED'>('LEAVE');
  const [offReason, setOffReason] = useState('');

  const loadWorkingHours = async () => {
    const wh = await api.get<WorkingHour[]>(`/staff/${staffId}/working-hours`);
    const w = emptyWeek();
    for (const item of wh) {
      w[item.dayOfWeek] = {
        enabled: true,
        start: minutesToHHMM(item.startMinute),
        end: minutesToHHMM(item.endMinute),
      };
    }
    setWeek(w);
  };
  const loadTimeOff = () => api.get<TimeOff[]>(`/staff/${staffId}/time-off`).then(setTimeOffs);

  useEffect(() => {
    setMessage('');
    setError('');
    loadWorkingHours();
    loadTimeOff();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId]);

  const saveHours = async () => {
    setError('');
    setMessage('');
    const workingHours = week
      .map((d, i) => ({ dayOfWeek: i, ...d }))
      .filter((d) => d.enabled)
      .map((d) => ({
        dayOfWeek: d.dayOfWeek,
        startMinute: hhmmToMinutes(d.start),
        endMinute: hhmmToMinutes(d.end),
      }));
    try {
      await api.put(`/staff/${staffId}/working-hours`, { workingHours });
      setMessage('Çalışma saatleri kaydedildi.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Kaydedilemedi');
    }
  };

  const addTimeOff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post(`/staff/${staffId}/time-off`, {
        startAt: new Date(offStart).toISOString(),
        endAt: new Date(offEnd).toISOString(),
        type: offType,
        reason: offReason || undefined,
      });
      setOffStart('');
      setOffEnd('');
      setOffReason('');
      await loadTimeOff();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İzin eklenemedi');
    }
  };

  const deleteTimeOff = async (id: number) => {
    await api.del(`/staff/${staffId}/time-off/${id}`);
    await loadTimeOff();
  };

  const TYPE_TR = { LEAVE: 'İzin', HOLIDAY: 'Tatil', CLOSED: 'Kapalı' };

  return (
    <div className="space-y-5">
      {message && <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <Card>
        <h2 className="mb-3 font-medium text-slate-700">Haftalık Çalışma Saatleri</h2>
        <div className="space-y-2">
          {week.map((d, i) => (
            <div key={i} className="flex items-center gap-3">
              <label className="flex w-32 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={d.enabled}
                  onChange={(e) => {
                    const w = [...week];
                    w[i] = { ...d, enabled: e.target.checked };
                    setWeek(w);
                  }}
                />
                <span className="font-medium text-slate-600">{DAY_NAMES[i]}</span>
              </label>
              <input
                type="time"
                value={d.start}
                disabled={!d.enabled}
                onChange={(e) => {
                  const w = [...week];
                  w[i] = { ...d, start: e.target.value };
                  setWeek(w);
                }}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100 disabled:text-slate-300"
              />
              <span className="text-slate-400">–</span>
              <input
                type="time"
                value={d.end}
                disabled={!d.enabled}
                onChange={(e) => {
                  const w = [...week];
                  w[i] = { ...d, end: e.target.value };
                  setWeek(w);
                }}
                className="rounded-md border border-slate-300 px-2 py-1 text-sm disabled:bg-slate-100 disabled:text-slate-300"
              />
            </div>
          ))}
        </div>
        <div className="mt-4">
          <Button onClick={saveHours}>Çalışma Saatlerini Kaydet</Button>
        </div>
      </Card>

      <Card>
        <h2 className="mb-3 font-medium text-slate-700">İzin / Tatil Günleri</h2>
        <form onSubmit={addTimeOff} className="mb-4 grid items-end gap-3 sm:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Başlangıç</label>
            <input
              type="datetime-local"
              value={offStart}
              onChange={(e) => setOffStart(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Bitiş</label>
            <input
              type="datetime-local"
              value={offEnd}
              onChange={(e) => setOffEnd(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Tür</label>
            <select
              value={offType}
              onChange={(e) => setOffType(e.target.value as typeof offType)}
              className="w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm"
            >
              <option value="LEAVE">İzin</option>
              <option value="HOLIDAY">Tatil</option>
              <option value="CLOSED">Kapalı</option>
            </select>
          </div>
          <div>
            <Button type="submit" variant="secondary">
              İzin Ekle
            </Button>
          </div>
        </form>

        {timeOffs.length === 0 ? (
          <p className="text-sm text-slate-400">Kayıtlı izin yok.</p>
        ) : (
          <ul className="space-y-2">
            {timeOffs.map((t) => (
              <li key={t.id} className="flex items-center justify-between rounded-md bg-slate-50 px-3 py-2 text-sm">
                <span>
                  <span className="font-medium text-slate-700">{TYPE_TR[t.type]}</span> ·{' '}
                  {formatDateTime(t.startAt)} → {formatDateTime(t.endAt)}
                  {t.reason && <span className="text-slate-400"> ({t.reason})</span>}
                </span>
                <button
                  onClick={() => deleteTimeOff(t.id)}
                  className="rounded border border-slate-300 px-2 py-0.5 text-xs text-rose-600 hover:bg-rose-50"
                >
                  Sil
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
