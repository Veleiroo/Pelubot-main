import type { OverviewAppointmentEntry } from './types';

export const NO_SHOW_REASONS = [
  { value: 'late', label: 'Cliente no llegó a tiempo' },
  { value: 'no-contact', label: 'No respondió a la confirmación' },
  { value: 'personal', label: 'Motivo personal del cliente' },
] as const;

export const STATUS_RING_STYLES: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
  asistida: 'bg-green-400/15 text-green-200 ring-green-400/30',
  no_asistida: 'bg-red-400/15 text-red-200 ring-red-400/30',
  cancelada: 'bg-rose-400/15 text-rose-200 ring-rose-400/30',
};

export const STATUS_TONE: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'text-emerald-300',
  asistida: 'text-green-300',
  no_asistida: 'text-red-300',
  cancelada: 'text-rose-300',
};
