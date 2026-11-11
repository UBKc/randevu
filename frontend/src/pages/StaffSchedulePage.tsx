import { useAuth } from '../auth';
import { Card } from '../ui';
import ScheduleEditor from './ScheduleEditor';

export default function StaffSchedulePage() {
  const { user } = useAuth();
  if (!user?.staffProfileId) {
    return <Card className="text-sm text-slate-400">Personel profili bulunamadı.</Card>;
  }
  return (
    <div className="space-y-5">
      <h1 className="text-xl font-semibold text-slate-800">Programım (Çalışma Saatleri ve İzinler)</h1>
      <ScheduleEditor staffId={user.staffProfileId} />
    </div>
  );
}
