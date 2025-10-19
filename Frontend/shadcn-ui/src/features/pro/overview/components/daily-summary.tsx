import { Card } from '@/components/ui/card';

import type { OverviewSummary } from '../types';

type DailySummaryProps = {
  summary: OverviewSummary;
  isLoading: boolean;
};

const SUMMARY_ITEMS: Array<{ key: keyof OverviewSummary; label: string; color: string }> = [
  { key: 'confirmadas', label: 'Pendientes', color: 'bg-amber-500' },
  { key: 'asistidas', label: 'Asistidas', color: 'bg-emerald-600' },
  { key: 'no_asistidas', label: 'No asistidas', color: 'bg-red-500' },
];

export const DailySummary = ({ summary, isLoading }: DailySummaryProps) => (
  <Card className="border border-border/50 bg-card p-5 shadow-lg">
    <h3 className="mb-1 text-lg font-semibold text-foreground">Resumen del día</h3>
    <p className="mb-4 text-xs text-muted-foreground">Vista rápida de tu agenda hoy.</p>

    <div className="space-y-4">
      <div className="border-b border-border py-4 text-center">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Total de citas</p>
        <p className="text-4xl font-bold text-foreground">{isLoading ? '—' : summary.total}</p>
      </div>

      {SUMMARY_ITEMS.map(({ key, label, color }) => (
        <div key={key} className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">{isLoading ? '—' : summary[key]}</span>
            <span className={`h-2 w-2 rounded-full ${color}`} />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default DailySummary;
