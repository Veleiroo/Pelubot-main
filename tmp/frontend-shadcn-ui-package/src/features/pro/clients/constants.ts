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
  emerald: 'border-emerald-400/40 bg-emerald-400/10 text-emerald-50',
  amber: 'border-amber-400/40 bg-amber-400/10 text-amber-50',
  rose: 'border-rose-400/40 bg-rose-400/10 text-rose-50',
} as const;
