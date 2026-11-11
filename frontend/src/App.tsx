import { Navigate, Route, Routes, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from './auth';
import { Role } from './types';
import LoginPage from './pages/LoginPage';
import BookingPage from './pages/BookingPage';
import MyAppointmentsPage from './pages/MyAppointmentsPage';
import CalendarPage from './pages/CalendarPage';
import ServicesPage from './pages/ServicesPage';
import StaffAdminPage from './pages/StaffAdminPage';
import StaffSchedulePage from './pages/StaffSchedulePage';

function Nav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  if (!user) return null;

  const link = (to: string, label: string) => (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `rounded-md px-3 py-2 text-sm font-medium ${
          isActive ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'
        }`
      }
    >
      {label}
    </NavLink>
  );

  const roleLabel: Record<Role, string> = { ADMIN: 'Yönetici', STAFF: 'Personel', CUSTOMER: 'Müşteri' };

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <span className="mr-3 text-lg font-bold text-indigo-700">📅 Randevu</span>
          {user.role === 'CUSTOMER' && link('/book', 'Randevu Al')}
          {user.role === 'CUSTOMER' && link('/appointments', 'Randevularım')}
          {(user.role === 'ADMIN' || user.role === 'STAFF') && link('/calendar', 'Takvim')}
          {user.role === 'STAFF' && link('/my-schedule', 'Programım')}
          {user.role === 'ADMIN' && link('/services', 'Hizmetler')}
          {user.role === 'ADMIN' && link('/staff', 'Personel')}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-slate-500">
            {user.fullName} · <span className="font-medium text-slate-700">{roleLabel[user.role]}</span>
          </span>
          <button
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-slate-600 hover:bg-slate-50"
          >
            Çıkış
          </button>
        </div>
      </div>
    </header>
  );
}

function Protected({ roles, children }: { roles?: Role[]; children: JSX.Element }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-400">Yükleniyor…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center text-slate-400">Yükleniyor…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'CUSTOMER') return <Navigate to="/book" replace />;
  return <Navigate to="/calendar" replace />;
}

export default function App() {
  return (
    <div className="min-h-screen">
      <Nav />
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Home />} />
          <Route path="/book" element={<Protected roles={['CUSTOMER']}><BookingPage /></Protected>} />
          <Route path="/appointments" element={<Protected roles={['CUSTOMER']}><MyAppointmentsPage /></Protected>} />
          <Route path="/calendar" element={<Protected roles={['ADMIN', 'STAFF']}><CalendarPage /></Protected>} />
          <Route path="/my-schedule" element={<Protected roles={['STAFF']}><StaffSchedulePage /></Protected>} />
          <Route path="/services" element={<Protected roles={['ADMIN']}><ServicesPage /></Protected>} />
          <Route path="/staff" element={<Protected roles={['ADMIN']}><StaffAdminPage /></Protected>} />
        </Routes>
      </main>
    </div>
  );
}
