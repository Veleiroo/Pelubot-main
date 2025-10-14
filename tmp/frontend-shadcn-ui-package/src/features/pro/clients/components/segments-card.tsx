import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { CLIENT_SEGMENT_ACCENTS } from '../constants';
import type { ClientSegment } from '../types';

type SegmentsCardProps = {
  segments: ClientSegment[];
  isLoading: boolean;
};

const numberFormatter = new Intl.NumberFormat('es-ES');

const TrendIcon = ({ trend }: { trend: ClientSegment['trend'] }) => {
  const className = 'h-4 w-4';
  if (trend === 'up') return <TrendingUp className={className} />;
  if (trend === 'down') return <TrendingDown className={className} />;
  return <Minus className={className} />;
};

export const SegmentsCard = ({ segments, isLoading }: SegmentsCardProps) => (
  <Card className="rounded-2xl border border-white/10 bg-white/[0.06] shadow-sm backdrop-blur">
    <CardHeader>
      <CardTitle className="text-lg font-semibold text-white">Segmentos destacados</CardTitle>
      <CardDescription className="text-sm text-white/60">
        Agrupaciones automáticas según hábitos y valor histórico. Añadiremos filtros y acciones pronto.
      </CardDescription>
    </CardHeader>
    <CardContent className="space-y-3">
      {isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full rounded-2xl bg-white/10" />
          <Skeleton className="h-12 w-full rounded-2xl bg-white/10" />
          <Skeleton className="h-12 w-full rounded-2xl bg-white/10" />
        </div>
      ) : segments.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-center text-sm text-white/70">
          Todavía no hay segmentos automáticos. Comenzaremos a sugerirlos en cuanto registremos más visitas.
        </div>
      ) : (
        <ul className="space-y-3">
          {segments.map((segment) => {
            const accentClass = segment.accent ? CLIENT_SEGMENT_ACCENTS[segment.accent] : 'border-white/10 text-white';
            return (
              <li
                key={segment.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 backdrop-blur transition hover:border-white/20 hover:bg-white/10 ${accentClass}`}
              >
                <div className="flex flex-col">
                  <span className="text-sm font-semibold uppercase tracking-wide">{segment.label}</span>
                  {segment.description ? (
                    <span className="text-xs font-medium text-white/70">{segment.description}</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {numberFormatter.format(segment.count)}
                  </Badge>
                  <span className="rounded-full bg-white/10 p-2 text-white/80">
                    <TrendIcon trend={segment.trend} />
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CardContent>
  </Card>
);
