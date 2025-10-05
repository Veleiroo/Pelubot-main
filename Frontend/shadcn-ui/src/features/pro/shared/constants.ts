import type { AppointmentStatus } from './types';

export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  confirmada: 'bg-emerald-400/15 text-emerald-200 ring-1 ring-emerald-400/30',
  pendiente: 'bg-amber-400/15 text-amber-200 ring-1 ring-amber-400/30',
  cancelada: 'bg-rose-400/15 text-rose-200 ring-1 ring-rose-400/30',
};

export const MIN_APPOINTMENTS_CARD_HEIGHT = 440;

export const WEEKDAY_LABELS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'] as const;
