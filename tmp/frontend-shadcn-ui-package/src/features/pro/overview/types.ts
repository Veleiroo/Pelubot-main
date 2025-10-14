import type {
  ProAppointmentStatus,
  ProOverview,
  ProOverviewAppointment,
} from '@/lib/api';

export type OverviewSummary = ProOverview['summary'] | {
  total: number;
  confirmadas: number;
  pendientes: number;
  canceladas: number;
};

export type OverviewAppointmentEntry = {
  id: string;
  time: string;
  client: string;
  service: string;
  status: ProAppointmentStatus;
  phone?: string;
  lastVisit?: string;
  notes?: string;
  raw: ProOverviewAppointment;
};

export type AppointmentActionType = 'attended' | 'no-show' | 'reschedule';
