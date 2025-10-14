import type { StatsSummaryMetricId } from './types';

export const SUMMARY_CARD_COPY: Record<StatsSummaryMetricId, { label: string; tooltip?: string; accent: 'emerald' | 'indigo' | 'amber' | 'rose' }> = {
  total_revenue: {
    label: 'Ingresos del mes',
    tooltip: 'Suma estimada de los servicios completados en el mes calendario actual.',
    accent: 'emerald',
  },
  avg_ticket: {
    label: 'Ticket medio',
    tooltip: 'Ingresos divididos entre reservas atendidas en el mes actual.',
    accent: 'indigo',
  },
  repeat_rate: {
    label: 'Repetición de clientas',
    tooltip: 'Porcentaje de clientas con visita previa al mes en curso.',
    accent: 'amber',
  },
  new_clients: {
    label: 'Nuevas clientas',
    tooltip: 'Clientas que visitan por primera vez este mes.',
    accent: 'rose',
  },
};

export const TREND_COLORS = {
  revenue: 'stroke-emerald-300',
  appointments: 'stroke-sky-300',
};

export const PRIORITY_BADGE: Record<'high' | 'medium' | 'low', { label: string; className: string }> = {
  high: { label: 'Alta prioridad', className: 'bg-rose-500/15 text-rose-200 ring-rose-400/40' },
  medium: { label: 'Media prioridad', className: 'bg-amber-500/15 text-amber-200 ring-amber-400/40' },
  low: { label: 'Idea', className: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/40' },
};
