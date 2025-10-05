import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import type { RetentionSegment } from '../types';

const TREND_TONE: Record<'up' | 'down' | 'steady', string> = {
  up: 'bg-emerald-500/15 text-emerald-200 ring-emerald-400/40',
  down: 'bg-rose-500/15 text-rose-200 ring-rose-400/40',
  steady: 'bg-slate-500/15 text-slate-200 ring-slate-400/40',
};

const TREND_LABEL: Record<'up' | 'down' | 'steady', string> = {
  up: 'Mejora',
  down: 'En riesgo',
  steady: 'Estable',
};

export type RetentionCardProps = {
  segments: RetentionSegment[];
  isLoading: boolean;
};

export const RetentionCard = ({ segments, isLoading }: RetentionCardProps) => {
  if (isLoading && segments.length === 0) {
    return (
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <CardHeader className="space-y-3 p-0">
          <Skeleton className="h-5 w-48 bg-white/10" />
          <Skeleton className="h-4 w-56 bg-white/10" />
        </CardHeader>
        <CardContent className="space-y-3 p-0 pt-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-full rounded-2xl bg-white/10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-white/12 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6">
      <CardHeader className="space-y-2 p-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
          <Users className="h-5 w-5 text-emerald-300" aria-hidden="true" />
          Retención de clientas
        </CardTitle>
        <CardDescription className="text-sm text-white/60">
          Revisa los grupos según su última visita y prioriza acciones de reactivación.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4 space-y-3 p-0">
        {segments.length > 0 ? (
          segments.map((segment) => (
            <div
              key={segment.id}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80 md:flex-row md:items-center md:justify-between"
            >
              <div className="space-y-1">
                <p className="text-base font-semibold text-white">{segment.label}</p>
                {segment.description ? (
                  <p className="text-xs text-white/60">{segment.description}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <div className="text-white/70">
                  <span className="font-semibold text-white">{segment.count}</span> clientas · {segment.shareLabel}
                </div>
                <Badge
                  variant="secondary"
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${TREND_TONE[segment.trend]}`}
                >
                  {TREND_LABEL[segment.trend]}
                </Badge>
              </div>
            </div>
          ))
        ) : (
          <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-white/60">
            Aún no hay suficiente historial para calcular la retención por cohortes.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
