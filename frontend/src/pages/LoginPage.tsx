import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { ApiError } from '../api';
import { Button } from '../ui';

const DEMO = [
  { label: 'Yönetici', email: 'admin@randevu.local' },
  { label: 'Personel (Ayşe)', email: 'ayse@randevu.local' },
  { label: 'Müşteri (Ali)', email: 'ali@ornek.com' },
];

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('ali@ornek.com');
  const [password, setPassword] = useState('Parola123!');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) navigate('/');

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Giriş başarısız');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto mt-16 max-w-md">
      <div className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 text-center">
          <div className="text-3xl">📅</div>
          <h1 className="mt-2 text-2xl font-bold text-slate-800">Randevu Yönetim Sistemi</h1>
          <p className="text-sm text-slate-500">Giriş yapın</p>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">E-posta</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600">Parola</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              required
            />
          </div>
          {error && <div className="rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div>}
          <Button type="submit" disabled={busy} className="w-full">
            {busy ? 'Giriş yapılıyor…' : 'Giriş Yap'}
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-4">
          <p className="mb-2 text-center text-xs text-slate-400">Demo hesapları (parola: Parola123!)</p>
          <div className="flex flex-wrap justify-center gap-2">
            {DEMO.map((d) => (
              <button
                key={d.email}
                onClick={() => {
                  setEmail(d.email);
                  setPassword('Parola123!');
                }}
                className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
