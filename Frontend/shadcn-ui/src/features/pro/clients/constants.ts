import type { ProClientStatus } from '@/lib/api';

export const CLIENT_STATUS_LABELS: Record<ProClientStatus, string> = {
  activo: 'Activo',
  nuevo: 'Nuevo',
  riesgo: 'En riesgo',
  inactivo: 'Inactivo',
};

export const CLIENT_STATUS_BADGE: Record<ProClientStatus, string> = {
  activo: 'bg-emerald-500/10 text-emerald-200 ring-emerald-400/40',
  nuevo: 'bg-sky-500/10 text-sky-200 ring-sky-400/40',
  riesgo: 'bg-amber-500/10 text-amber-200 ring-amber-400/40',
  inactivo: 'bg-slate-500/10 text-slate-200 ring-slate-400/40',
};

export const CLIENT_SEGMENT_ACCENTS = {
  emerald: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  amber: 'border-amber-300 bg-amber-50 text-amber-900',
  rose: 'border-rose-300 bg-rose-50 text-rose-900',
} as const;
