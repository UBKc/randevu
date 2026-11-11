import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { Service, StaffSummary } from '../types';
import { Button, Card } from '../ui';
import ScheduleEditor from './ScheduleEditor';

export default function StaffAdminPage() {
  const [staff, setStaff] = useState<StaffSummary[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [error, setError] = useState('');

  // Yeni personel formu
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ email: '', password: 'Parola123!', fullName: '', title: '' });

  const load = () => api.get<StaffSummary[]>('/staff').then(setStaff);
  useEffect(() => {
    load();
    api.get<Service[]>('/services?all=true').then(setServices);
  }, []);

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/staff', form);
      setShowNew(false);
      setForm({ email: '', password: 'Parola123!', fullName: '', title: '' });
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Personel oluşturulamadı');
    }
  };

  const toggleService = async (staffMember: StaffSummary, serviceId: number) => {
    const current = staffMember.services.map((ss) => ss.service.id);
    const next = current.includes(serviceId)
      ? current.filter((id) => id !== serviceId)
      : [...current, serviceId];
    await api.put(`/staff/${staffMember.id}/services`, { serviceIds: next });
    await load();
  };

  const selectedStaff = staff.find((s) => s.id === selected);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800">Personel Yönetimi</h1>
        <Button onClick={() => setShowNew(!showNew)} variant="secondary">
          {showNew ? 'Vazgeç' : '+ Yeni Personel'}
        </Button>
      </div>

      {error && <div className="rounded-md bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      {showNew && (
        <Card>
          <form onSubmit={createStaff} className="grid gap-3 sm:grid-cols-2">
            <input
              placeholder="Ad Soyad"
              value={form.fullName}
              onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Unvan (örn. Kuaför)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
            <input
              type="email"
              placeholder="E-posta"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <input
              placeholder="Parola"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
            <div className="sm:col-span-2">
              <Button type="submit">Personel Oluştur</Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <h2 className="mb-3 font-medium text-slate-700">Personeller</h2>
          <ul className="space-y-1">
            {staff.map((s) => (
              <li key={s.id}>
                <button
                  onClick={() => setSelected(s.id)}
                  className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                    selected === s.id ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-slate-50'
                  }`}
                >
                  <span className="font-medium">{s.user.fullName}</span>
                  {s.title && <span className="text-slate-400"> · {s.title}</span>}
                </button>
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-4 lg:col-span-2">
          {!selectedStaff ? (
            <Card className="text-sm text-slate-400">Düzenlemek için soldan bir personel seçin.</Card>
          ) : (
            <>
              <Card>
                <h2 className="mb-2 font-medium text-slate-700">
                  {selectedStaff.user.fullName} — Verdiği Hizmetler
                </h2>
                <div className="flex flex-wrap gap-2">
                  {services
                    .filter((sv) => sv.active)
                    .map((sv) => {
                      const on = selectedStaff.services.some((ss) => ss.service.id === sv.id);
                      return (
                        <button
                          key={sv.id}
                          onClick={() => toggleService(selectedStaff, sv.id)}
                          className={`rounded-full border px-3 py-1 text-xs ${
                            on
                              ? 'border-indigo-300 bg-indigo-100 text-indigo-700'
                              : 'border-slate-200 text-slate-500 hover:bg-slate-50'
                          }`}
                        >
                          {on ? '✓ ' : ''}
                          {sv.name}
                        </button>
                      );
                    })}
                </div>
              </Card>

              <ScheduleEditor staffId={selectedStaff.id} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
