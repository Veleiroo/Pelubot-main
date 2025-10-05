export type AppointmentStatus = 'confirmada' | 'pendiente' | 'cancelada';

export type Appointment = {
  id: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  client: string;
  service: string;
  status: AppointmentStatus;
  notes?: string;
};

export type AgendaSummary = {
  total: number;
  confirmadas: number;
  pendientes: number;
  canceladas: number;
};

export type AppointmentsByDate = Record<string, Appointment[]>;
