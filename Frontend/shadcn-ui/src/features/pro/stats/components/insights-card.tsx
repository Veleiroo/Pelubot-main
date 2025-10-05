import { Lightbulb } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { PRIORITY_BADGE } from '../constants';
import type { InsightItem } from '../types';

export type InsightsCardProps = {
  insights: InsightItem[];
  isLoading: boolean;
};

export const InsightsCard = ({ insights, isLoading }: InsightsCardProps) => {
  if (isLoading && insights.length === 0) {
    return (
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <CardHeader className="space-y-3 p-0">
          <Skeleton className="h-5 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </CardHeader>
        <CardContent className="space-y-3 p-0 pt-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={index} className="h-20 w-full rounded-2xl bg-white/10" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-white/12 bg-gradient-to-br from-slate-950/90 via-slate-900/70 to-slate-950/90 p-6">
      <CardHeader className="space-y-2 p-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
          <Lightbulb className="h-5 w-5 text-amber-300" aria-hidden="true" />
          Recomendaciones accionables
        </CardTitle>
        <CardDescription className="text-sm text-white/60">
          Ideas basadas en tus cifras actuales para seguir creciendo.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-4 space-y-3 p-0">
        {insights.length > 0 ? (
          insights.map((insight) => {
            const badge = PRIORITY_BADGE[insight.priority];
            return (
              <div key={insight.id} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm text-white/80">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-base font-semibold text-white">{insight.title}</p>
                  <Badge
                    variant="outline"
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${badge.className}`}
                  >
                    {badge.label}
                  </Badge>
                </div>
                <p className="text-white/70">{insight.description}</p>
              </div>
            );
          })
        ) : (
          <div className="flex min-h-[120px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 text-center text-sm text-white/60">
            No hay recomendaciones específicas por ahora. Una vez acumules más reservas aparecerán aquí.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
