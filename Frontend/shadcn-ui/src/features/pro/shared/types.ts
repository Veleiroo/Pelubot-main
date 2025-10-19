export type AppointmentStatus = 'confirmada' | 'asistida' | 'no_asistida' | 'cancelada';

export type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  endTime?: string; // HH:mm
  client: string;
  clientPhone?: string;
  clientEmail?: string;
  service: string;
  serviceId?: string;
  status: AppointmentStatus;
  durationMinutes?: number;
  notes?: string;
};

export type AgendaSummary = {
  total: number;
  confirmadas: number;
  asistidas: number;
  no_asistidas: number;
  canceladas: number;
};

export type AppointmentsByDate = Record<string, Appointment[]>;
