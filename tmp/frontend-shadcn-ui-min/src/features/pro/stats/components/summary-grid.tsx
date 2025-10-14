import { ArrowDownRight, ArrowRight, ArrowUpRight, Info } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { SUMMARY_CARD_COPY } from '../constants';
import type { SummaryMetricCard } from '../types';

const TREND_ICON = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  steady: ArrowRight,
} as const;

const ACCENT_BG: Record<SummaryMetricCard['accent'], string> = {
  emerald: 'from-emerald-500/25 via-emerald-500/10 to-transparent border-emerald-300/30 text-emerald-50',
  indigo: 'from-indigo-500/25 via-indigo-500/10 to-transparent border-indigo-300/30 text-indigo-50',
  amber: 'from-amber-500/25 via-amber-500/10 to-transparent border-amber-300/30 text-amber-50',
  rose: 'from-rose-500/25 via-rose-500/10 to-transparent border-rose-300/30 text-rose-50',
};

export type SummaryGridProps = {
  cards: SummaryMetricCard[];
  isLoading: boolean;
  errorMessage: string | null;
  onRetry: () => void;
};

export const SummaryGrid = ({ cards, isLoading, errorMessage, onRetry }: SummaryGridProps) => {
  const content = (() => {
    if (isLoading && cards.length === 0) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <Card key={`summary-skeleton-${index}`} className="rounded-3xl border border-white/10 bg-white/5 p-6">
              <CardContent className="space-y-4 p-0">
                <Skeleton className="h-4 w-24 bg-white/10" />
                <Skeleton className="h-8 w-32 bg-white/10" />
                <Skeleton className="h-4 w-20 bg-white/10" />
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (errorMessage && cards.length === 0) {
      return (
        <Card className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-6 text-rose-50">
          <CardHeader className="p-0 text-base font-medium">No pudimos cargar tus métricas.</CardHeader>
          <CardContent className="p-0 pt-4 text-sm">
            <p className="text-rose-100/80">{errorMessage}</p>
            <button
              type="button"
              onClick={onRetry}
              className="mt-3 inline-flex items-center rounded-full border border-rose-300/60 px-3 py-1 text-xs font-semibold text-rose-50 transition hover:bg-rose-400/20"
            >
              Reintentar
            </button>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => {
          const Icon = TREND_ICON[card.trend];
          const accent = ACCENT_BG[card.accent];
          const tooltip = card.tooltip ?? SUMMARY_CARD_COPY[card.id]?.tooltip;

          return (
            <Card
              key={card.id}
              className={`rounded-3xl border bg-gradient-to-br ${accent} shadow-[0_28px_68px_-40px_rgba(15,185,129,0.55)] backdrop-blur`}
            >
              <CardHeader className="flex flex-row items-start justify-between gap-3 p-6 pb-4">
                <div className="space-y-1">
                  <CardTitle className="text-sm font-semibold uppercase tracking-[0.18em] text-white/70">
                    {card.label}
                  </CardTitle>
                  <p className="text-3xl font-semibold text-white">{card.formattedValue}</p>
                </div>
                {tooltip ? (
                  <TooltipProvider delayDuration={150}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/70 hover:bg-white/10"
                        >
                          <Info className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs border-white/15 bg-slate-950 text-xs text-white/90">
                        {tooltip}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                ) : null}
              </CardHeader>
              <CardContent className="flex items-center gap-2 p-6 pt-0 text-sm text-white/80">
                <Badge
                  variant="secondary"
                  className="inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-semibold text-white"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {card.formattedChange}
                </Badge>
                <span className="text-white/70">vs. mes anterior</span>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  })();

  return <section className="space-y-4">{content}</section>;
};
