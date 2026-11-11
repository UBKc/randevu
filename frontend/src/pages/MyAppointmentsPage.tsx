import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { Appointment, Slot, SlotResponse } from '../types';
import { Button, Card, StatusBadge, formatDate, formatTime } from '../ui';

export default function MyAppointmentsPage() {
  const [items, setItems] = useState<Appointment[]>([]);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);

  const load = () => api.get<Appointment[]>('/appointments/mine').then(setItems);
  useEffect(() => {
    load();
  }, []);

  const cancel = async (id: number) => {
    setError('');
    setMessage('');
    try {
      await api.patch(`/appointments/${id}/cancel`);
      setMessage('Randevu iptal edildi.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'İptal edilemedi');
    }
  };

  const isActive = (s: string) => s === 'PENDING' || s === 'CONFIRMED';

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-800">Randevularım</h1>
      {message && <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {items.length === 0 && <Card>Henüz randevunuz yok.</Card>}

      <div className="space-y-3">
        {items.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-800">{a.service?.name}</span>
                  <StatusBadge status={a.status} />
                </div>
                <div className="mt-1 text-sm text-slate-500">
                  {a.staff?.user.fullName} · {formatDate(a.startAt)} · {formatTime(a.startAt)}–{formatTime(a.endAt)}
                </div>
              </div>
              {isActive(a.status) && (
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => setRescheduleId(rescheduleId === a.id ? null : a.id)}>
                    Ertele
                  </Button>
                  <Button variant="danger" onClick={() => cancel(a.id)}>
                    İptal
                  </Button>
                </div>
              )}
            </div>

            {rescheduleId === a.id && (
              <ReschedulePanel
                appointment={a}
                onDone={async (msg) => {
                  setRescheduleId(null);
                  setMessage(msg);
                  setError('');
                  await load();
                }}
                onError={(msg) => setError(msg)}
              />
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReschedulePanel({
  appointment,
  onDone,
  onError,
}: {
  appointment: Appointment;
  onDone: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [date, setDate] = useState(appointment.startAt.slice(0, 10));
  const [slots, setSlots] = useState<Slot[] | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchSlots = async () => {
    setLoading(true);
    try {
      const res = await api.get<SlotResponse>(
        `/slots?staffId=${appointment.staffId}&serviceId=${appointment.serviceId}&date=${date}`,
      );
      setSlots(res.slots);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Slotlar alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const doReschedule = async (slot: Slot) => {
    try {
      await api.patch(`/appointments/${appointment.id}/reschedule`, { startAt: slot.startAt });
      onDone(`Randevu ertelendi: ${date} ${slot.start}`);
    } catch (err) {
      onError(err instanceof ApiError ? err.message : 'Ertelenemedi');
    }
  };

  return (
    <div className="mt-4 rounded-md border border-slate-200 bg-slate-50 p-4">
      <p className="mb-2 text-sm font-medium text-slate-600">Yeni tarih seç:</p>
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <Button variant="secondary" onClick={fetchSlots} disabled={loading}>
          {loading ? '…' : 'Uygun Saatler'}
        </Button>
      </div>
      {slots && (
        <div className="mt-3 flex flex-wrap gap-2">
          {slots.length === 0 && <span className="text-sm text-slate-500">Bu gün için uygun saat yok.</span>}
          {slots.map((s) => (
            <button
              key={s.startAt}
              onClick={() => doReschedule(s)}
              className="rounded-md border border-indigo-200 bg-white px-3 py-1.5 text-sm text-indigo-700 hover:bg-indigo-50"
            >
              {s.start}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
