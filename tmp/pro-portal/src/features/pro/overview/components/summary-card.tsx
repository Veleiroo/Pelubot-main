import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import type { OverviewSummary } from '../types';

interface SummaryCardProps {
  summary: OverviewSummary;
  isLoading: boolean;
}

export const SummaryCard = ({ summary, isLoading }: SummaryCardProps) => {
  return (
    <Card className="rounded-2xl ring-1 ring-white/10 bg-white/5 p-3 shadow-sm">
      <CardHeader className="p-0">
        <CardTitle className="text-sm font-semibold text-white">Resumen del día</CardTitle>
        <CardDescription className="text-[11px] text-white/70">
          Una vista rápida de cómo va tu agenda hoy.
        </CardDescription>
      </CardHeader>
      <CardContent className="mt-2 space-y-2 p-0">
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex h-16 items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-sm text-white/70">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Cargando resumen...
            </div>
            <div className="space-y-2 text-[11px]">
              <div className="h-5 rounded-full bg-white/5/70 animate-pulse" />
              <div className="h-5 rounded-full bg-white/5/70 animate-pulse" />
              <div className="h-5 rounded-full bg-white/5/70 animate-pulse" />
            </div>
          </div>
        ) : (
          <>
            <div className="rounded-2xl bg-white/5 p-2.5 text-center">
              <p className="text-[11px] text-white/60">Total de citas</p>
              <p className="text-xl font-semibold text-white tabular-nums">{summary.total}</p>
            </div>
            <div className="space-y-1.5 text-[11px] text-white/80">
              <div className="flex items-center justify-between">
                <span>Confirmadas</span>
                <span className="inline-flex items-center rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200 ring-1 ring-emerald-400/30 tabular-nums">
                  {summary.confirmadas}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Pendientes</span>
                <span className="inline-flex items-center rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-medium text-amber-200 ring-1 ring-amber-400/30 tabular-nums">
                  {summary.pendientes}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Canceladas</span>
                <span className="inline-flex items-center rounded-full bg-rose-400/15 px-2 py-0.5 text-[10px] font-medium text-rose-200 ring-1 ring-rose-400/30 tabular-nums">
                  {summary.canceladas}
                </span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default SummaryCard;
