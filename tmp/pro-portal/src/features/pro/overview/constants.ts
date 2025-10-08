import type { OverviewAppointmentEntry } from './types';

export const NO_SHOW_REASONS = [
  { value: 'late', label: 'Cliente no llegó a tiempo' },
  { value: 'no-contact', label: 'No respondió a la confirmación' },
  { value: 'personal', label: 'Motivo personal del cliente' },
] as const;

export const STATUS_RING_STYLES: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'bg-emerald-400/15 text-emerald-200 ring-emerald-400/30',
  pendiente: 'bg-amber-400/15 text-amber-200 ring-amber-400/30',
  cancelada: 'bg-rose-400/15 text-rose-200 ring-rose-400/30',
};

export const STATUS_TONE: Record<OverviewAppointmentEntry['status'], string> = {
  confirmada: 'text-emerald-300',
  pendiente: 'text-amber-300',
  cancelada: 'text-rose-300',
};
