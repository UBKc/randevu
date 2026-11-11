import { useEffect, useState } from 'react';
import { api, ApiError } from '../api';
import { Service } from '../types';
import { Button, Card, formatPrice } from '../ui';

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([]);
  const [name, setName] = useState('');
  const [duration, setDuration] = useState(30);
  const [price, setPrice] = useState(250);
  const [error, setError] = useState('');

  const load = () => api.get<Service[]>('/services?all=true').then(setServices);
  useEffect(() => {
    load();
  }, []);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/services', {
        name,
        durationMinutes: Number(duration),
        priceCents: Math.round(Number(price) * 100),
      });
      setName('');
      setDuration(30);
      setPrice(250);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Oluşturulamadı');
    }
  };

  const toggleActive = async (s: Service) => {
    await api.patch(`/services/${s.id}`, { active: !s.active });
    await load();
  };

  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-800">Hizmet Yönetimi</h1>

      <Card>
        <h2 className="mb-3 font-medium text-slate-700">Yeni Hizmet Tanımla</h2>
        {error && <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
        <form onSubmit={create} className="grid items-end gap-3 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-sm font-medium text-slate-600">Hizmet adı</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn. Saç Kesimi"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Süre (dk)</label>
            <input
              type="number"
              min={1}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Ücret (₺)</label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value))}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              required
            />
          </div>
          <div className="sm:col-span-4">
            <Button type="submit">Ekle</Button>
          </div>
        </form>
      </Card>

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 text-left text-slate-500">
              <th className="pb-2">Hizmet</th>
              <th className="pb-2">Süre</th>
              <th className="pb-2">Ücret</th>
              <th className="pb-2">Durum</th>
              <th className="pb-2 text-right">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id} className="border-b border-slate-100">
                <td className="py-2 font-medium text-slate-700">{s.name}</td>
                <td className="py-2 text-slate-600">{s.durationMinutes} dk</td>
                <td className="py-2 text-slate-600">{formatPrice(s.priceCents)}</td>
                <td className="py-2">
                  {s.active ? (
                    <span className="text-emerald-600">Aktif</span>
                  ) : (
                    <span className="text-slate-400">Pasif</span>
                  )}
                </td>
                <td className="py-2 text-right">
                  <button
                    onClick={() => toggleActive(s)}
                    className="rounded border border-slate-300 px-2 py-1 text-xs text-slate-600 hover:bg-slate-50"
                  >
                    {s.active ? 'Pasifleştir' : 'Aktifleştir'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
