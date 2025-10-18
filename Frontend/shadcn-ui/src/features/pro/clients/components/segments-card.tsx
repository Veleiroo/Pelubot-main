import { Users } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import { CLIENT_SEGMENT_ACCENTS } from '../constants';
import type { ClientSegment } from '../types';

type SegmentsCardProps = {
  segments: ClientSegment[];
  isLoading: boolean;
};

const numberFormatter = new Intl.NumberFormat('es-ES');

export const SegmentsCard = ({ segments, isLoading }: SegmentsCardProps) => (
  <Card className="space-y-4 rounded-2xl border border-border/60 bg-card/90 p-5 shadow-lg shadow-black/10">
    <header>
      <div className="flex items-center gap-2">
        <Users className="h-5 w-5 text-primary" aria-hidden="true" />
        <h2 className="text-lg font-semibold text-foreground">Segmentos destacados</h2>
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Agrupaciones automáticas según hábitos y valor histórico. Añadiremos filtros y acciones pronto.
      </p>
    </header>
    {isLoading ? (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-xl bg-muted/40" />
        <Skeleton className="h-16 w-full rounded-xl bg-muted/40" />
        <Skeleton className="h-16 w-full rounded-xl bg-muted/40" />
      </div>
    ) : segments.length === 0 ? (
      <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 px-4 py-6 text-center text-sm text-muted-foreground">
        Todavía no hay segmentos automáticos. Comenzaremos a sugerirlos en cuanto registremos más visitas.
      </div>
    ) : (
      <ul className="space-y-3">
        {segments.map((segment) => {
          const accentClass = segment.accent ? CLIENT_SEGMENT_ACCENTS[segment.accent] : 'border-border text-foreground';
          return (
            <li
              key={segment.id}
              className={`space-y-2 rounded-xl border bg-background/80 px-4 py-3 transition hover:border-border hover:bg-background ${accentClass}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide">{segment.label}</p>
                  {segment.description ? (
                    <p className="text-xs text-muted-foreground">{segment.description}</p>
                  ) : null}
                </div>
                <Badge variant="outline" className="border-border/60 text-sm font-semibold">
                  {numberFormatter.format(segment.count)}
                </Badge>
              </div>
            </li>
          );
        })}
      </ul>
    )}
  </Card>
);

export default SegmentsCard;
