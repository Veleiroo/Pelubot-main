import { Card } from '@/components/ui/card';

const stats = [
  { label: 'Confirmadas', value: 2, color: 'bg-accent' },
  { label: 'Pendientes', value: 1, color: 'bg-yellow-500' },
  { label: 'Canceladas', value: 1, color: 'bg-destructive' },
];

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

export const DailySummary = () => (
  <Card className="border-border/50 bg-card p-5 shadow-lg">
    <h3 className="mb-1 text-lg font-semibold text-foreground">Resumen del día</h3>
    <p className="mb-4 text-xs text-muted-foreground">Vista rápida de tu agenda hoy.</p>
    <div className="space-y-4">
      <div className="border-b border-border py-4 text-center">
        <p className="mb-1 text-[10px] uppercase tracking-wider text-muted-foreground">Total de citas</p>
        <p className="text-4xl font-bold text-foreground">4</p>
      </div>
      {stats.map((stat) => (
        <div key={stat.label} className="flex items-center justify-between py-2">
          <span className="text-sm text-muted-foreground">{stat.label}</span>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-foreground">{stat.value}</span>
            <span className={cn('h-2 w-2 rounded-full', stat.color)} />
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default DailySummary;
