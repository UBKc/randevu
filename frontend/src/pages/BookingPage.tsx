import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { Service, Slot, SlotResponse, StaffSummary } from '../types';
import { Button, Card, formatPrice } from '../ui';

export default function BookingPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [staff, setStaff] = useState<StaffSummary[]>([]);
  const [serviceId, setServiceId] = useState<number | ''>('');
  const [staffId, setStaffId] = useState<number | ''>('');
  const [date, setDate] = useState('2026-09-09');
  const [result, setResult] = useState<SlotResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    api.get<Service[]>('/services').then(setServices);
    api.get<StaffSummary[]>('/staff').then(setStaff);
  }, []);

  // Seçilen hizmeti verebilen personeller
  const eligibleStaff = serviceId
    ? staff.filter((s) => s.services.some((ss) => ss.service.id === serviceId))
    : staff;

  const fetchSlots = async () => {
    if (!serviceId || !staffId || !date) return;
    setError('');
    setMessage('');
    setResult(null);
    setLoading(true);
    try {
      const res = await api.get<SlotResponse>(`/slots?staffId=${staffId}&serviceId=${serviceId}&date=${date}`);
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Slotlar alınamadı');
    } finally {
      setLoading(false);
    }
  };

  const book = async (slot: Slot) => {
    setError('');
    setMessage('');
    try {
      await api.post('/appointments', { staffId, serviceId, startAt: slot.startAt });
      await fetchSlots(); // slot listesini tazele (mesajı temizler)
      setMessage(`Randevunuz oluşturuldu: ${date} ${slot.start} (beklemede)`);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        await fetchSlots(); // dolu slot listeden düşsün
        setError(`⚠️ ${err.message}`); // tazelemeden SONRA göster ki temizlenmesin
      } else {
        setError(err instanceof ApiError ? err.message : 'Randevu oluşturulamadı');
      }
    }
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-800">Randevu Al</h1>

      <Card>
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Hizmet</label>
            <select
              id="svc"
              value={serviceId}
              onChange={(e) => {
                setServiceId(Number(e.target.value) || '');
                setStaffId('');
                setResult(null);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Seçin…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.durationMinutes} dk · {formatPrice(s.priceCents)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Personel</label>
            <select
              id="staff"
              value={staffId}
              onChange={(e) => {
                setStaffId(Number(e.target.value) || '');
                setResult(null);
              }}
              disabled={!serviceId}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
            >
              <option value="">Seçin…</option>
              {eligibleStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.user.fullName} {s.title ? `(${s.title})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Tarih</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => {
                setDate(e.target.value);
                setResult(null);
              }}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-4">
          <Button id="getSlots" onClick={fetchSlots} disabled={!serviceId || !staffId || !date || loading}>
            {loading ? 'Hesaplanıyor…' : 'Uygun Saatleri Getir'}
          </Button>
        </div>
      </Card>

      {message && <div className="rounded-md bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div>}
      {error && <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {result && (
        <Card>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="font-medium text-slate-700">
              Uygun Saatler — {result.serviceName} ({result.durationMinutes} dk)
            </h2>
            <span className="text-xs text-slate-400">{date}</span>
          </div>

          {result.slots.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 py-8 text-center text-slate-500">
              <div className="text-2xl">🗓️</div>
              <p className="mt-1 text-sm">Bu gün için uygun saat bulunmuyor.</p>
              <p className="text-xs text-slate-400">
                (Personel çalışmıyor, izinli ya da tüm saatler dolu olabilir.)
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {result.slots.map((slot) => (
                <button
                  key={slot.startAt}
                  data-slot={slot.startAt}
                  onClick={() => book(slot)}
                  className="rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100"
                >
                  {slot.start}
                </button>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-400">
            Aşama sayıları: {result.counts.candidates} aday → izin {result.counts.afterTimeOff} → dolu{' '}
            {result.counts.afterBusy} → mesai {result.counts.afterShiftFit} → geçmiş {result.counts.afterPast} (nihai)
          </p>
        </Card>
      )}
    </div>
  );
}
