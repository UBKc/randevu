export type Role = 'ADMIN' | 'STAFF' | 'CUSTOMER';
export type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'COMPLETED' | 'CANCELLED';

export interface User {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  staffProfileId?: number; // yalnızca STAFF için dolu
}

export interface Service {
  id: number;
  name: string;
  durationMinutes: number;
  priceCents: number;
  active: boolean;
}

export interface StaffSummary {
  id: number;
  title: string | null;
  user: { id: number; fullName: string; email: string };
  services: { service: Service }[];
}

export interface WorkingHour {
  id: number;
  staffId: number;
  dayOfWeek: number;
  startMinute: number;
  endMinute: number;
}

export interface TimeOff {
  id: number;
  staffId: number;
  startAt: string;
  endAt: string;
  type: 'LEAVE' | 'HOLIDAY' | 'CLOSED';
  reason: string | null;
}

export interface Slot {
  start: string; // "09:30"
  end: string; // "10:00"
  startAt: string; // ISO
  endAt: string;
}

export interface SlotResponse {
  date: string;
  serviceName: string;
  durationMinutes: number;
  slots: Slot[];
  counts: {
    candidates: number;
    afterTimeOff: number;
    afterBusy: number;
    afterShiftFit: number;
    afterPast: number;
  };
}

export interface Appointment {
  id: number;
  staffId: number;
  serviceId: number;
  startAt: string;
  endAt: string;
  status: AppointmentStatus;
  note: string | null;
  service?: Service;
  staff?: { id: number; user: { fullName: string } };
  customer?: { id: number; fullName: string; email: string };
}
