import type { AppointmentStatus } from './types';

export const STATUS_STYLES: Record<AppointmentStatus, string> = {
  confirmada: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  asistida: 'border-green-200 bg-green-50 text-green-700',
  no_asistida: 'border-red-200 bg-red-50 text-red-700',
  cancelada: 'border-rose-200 bg-rose-50 text-rose-700',
};

export const MIN_APPOINTMENTS_CARD_HEIGHT = 440;

export const WEEKDAY_LABELS = ['lu', 'ma', 'mi', 'ju', 'vi', 'sá', 'do'] as const;
