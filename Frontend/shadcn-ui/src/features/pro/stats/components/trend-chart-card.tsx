import { LineChart } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import type { TrendPoint } from '../types';

const buildPolyline = (values: number[], height: number) => {
  if (values.length === 0) return '';
  const maxValue = Math.max(...values);
  const minValue = Math.min(...values);
  const span = maxValue - minValue || 1;
  const verticalPadding = 8;

  return values
    .map((value, index) => {
      const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
      const normalized = (value - minValue) / span;
      const y = (1 - normalized) * (height - verticalPadding * 2) + verticalPadding;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
};

export type TrendChartCardProps = {
  points: TrendPoint[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export const TrendChartCard = ({ points, isLoading, errorMessage, onRetry }: TrendChartCardProps) => {
  if (isLoading && points.length === 0) {
    return (
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <CardHeader className="space-y-3 p-0">
          <Skeleton className="h-5 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </CardHeader>
        <CardContent className="p-0 pt-6">
          <Skeleton className="h-48 w-full rounded-3xl bg-white/5" />
        </CardContent>
      </Card>
    );
  }

  if (errorMessage && points.length === 0) {
    return (
      <Card className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-50">
        <CardHeader className="p-0">
          <CardTitle className="text-base font-semibold">No pudimos cargar el histórico de ingresos.</CardTitle>
          <CardDescription className="text-sm text-rose-50/80">{errorMessage}</CardDescription>
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <button
            type="button"
            className="inline-flex items-center rounded-full border border-rose-300/60 px-3 py-1 text-xs font-semibold text-rose-50 hover:bg-rose-400/20"
            onClick={onRetry}
          >
            Reintentar
          </button>
        </CardContent>
      </Card>
    );
  }

  const revenuePolyline = buildPolyline(points.map((point) => point.revenueValue), 100);
  const appointmentPolyline = buildPolyline(points.map((point) => point.appointments), 100);
  const latest = points[points.length - 1];

  return (
    <Card className="rounded-3xl border border-white/12 bg-gradient-to-br from-slate-950/80 via-slate-900/60 to-slate-950/80 p-6">
      <CardHeader className="flex flex-col gap-3 p-0">
        <div className="flex items-center gap-2 text-white/80">
          <LineChart className="h-5 w-5" aria-hidden="true" />
          <span className="text-sm font-semibold uppercase tracking-[0.24em] text-white/55">
            Rendimiento último semestre
          </span>
        </div>
        <CardTitle className="text-2xl font-semibold text-white">
          {latest ? latest.revenueLabel : 'Sin datos'}
        </CardTitle>
        <CardDescription className="text-sm text-white/60">
          Ingresos estimados por mes. Usa esta tendencia para planificar campañas y gestionar tu capacidad.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-6">
        <div className="relative h-56 w-full">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full text-white/60">
            <defs>
              <linearGradient id="stats-revenue-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="rgba(16, 185, 129, 0.4)" />
                <stop offset="100%" stopColor="rgba(15, 118, 110, 0)" />
              </linearGradient>
            </defs>
            {revenuePolyline ? (
              <>
                <polyline
                  points={`0,100 ${revenuePolyline} 100,100`}
                  fill="url(#stats-revenue-fill)"
                  stroke="none"
                />
                <polyline
                  points={revenuePolyline}
                  fill="none"
                  stroke="rgba(16,185,129,0.85)"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </>
            ) : null}
            {appointmentPolyline ? (
              <polyline
                points={appointmentPolyline}
                fill="none"
                stroke="rgba(96,165,250,0.75)"
                strokeDasharray="3 4"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            ) : null}
          </svg>
          <div className="pointer-events-none absolute inset-0 flex items-end justify-between px-1 pb-2 text-[0.75rem] text-white/60">
            {points.map((point) => (
              <span key={point.monthIso} className="w-12 text-center">
                {point.label}
              </span>
            ))}
          </div>
        </div>
        {latest ? (
          <div className="mt-4 grid gap-3 text-sm text-white/80 md:grid-cols-2">
            <div>
              <p className="text-white/60">Ingresos estimados</p>
              <p className="text-lg font-semibold text-white">{latest.revenueLabel}</p>
            </div>
            <div>
              <p className="text-white/60">Reservas del mes</p>
              <p className="text-lg font-semibold text-white">{latest.appointments}</p>
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
};
