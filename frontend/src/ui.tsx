import { AppointmentStatus } from './types';

const STATUS_TR: Record<AppointmentStatus, { label: string; cls: string }> = {
  PENDING: { label: 'Beklemede', cls: 'bg-amber-100 text-amber-800 border-amber-200' },
  CONFIRMED: { label: 'Onaylandı', cls: 'bg-blue-100 text-blue-800 border-blue-200' },
  COMPLETED: { label: 'Tamamlandı', cls: 'bg-emerald-100 text-emerald-800 border-emerald-200' },
  CANCELLED: { label: 'İptal', cls: 'bg-rose-100 text-rose-700 border-rose-200' },
};

export function StatusBadge({ status }: { status: AppointmentStatus }) {
  const s = STATUS_TR[status];
  return (
    <span className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-medium ${s.cls}`}>
      {s.label}
    </span>
  );
}

export const DAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

export function minutesToHHMM(m: number): string {
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

export function formatPrice(cents: number): string {
  return `${(cents / 100).toLocaleString('tr-TR')} ₺`;
}

/** ISO tarihi Türkiye saatiyle "11 Eyl 2026 14:30" gibi biçimler. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('tr-TR', {
    timeZone: 'Europe/Istanbul',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;
}

export function Button({
  children,
  variant = 'primary',
  className = '',
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'danger' }) {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-indigo-300',
    secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50',
    danger: 'bg-rose-600 text-white hover:bg-rose-700',
  };
  return (
    <button
      className={`rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
