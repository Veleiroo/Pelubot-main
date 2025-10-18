import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { HelpCircle, TrendingDown, TrendingUp } from 'lucide-react';

const stats = [
  {
    label: 'INGRESOS DEL MES',
    value: '4318,00 €',
    change: '+12.5 %',
    comparison: 'vs. mes anterior',
    trend: 'up',
    color: 'bg-emerald-500/10',
  },
  {
    label: 'TICKET MEDIO',
    value: '68,40 €',
    change: '+4.2 %',
    comparison: 'vs. mes anterior',
    trend: 'up',
    color: 'bg-blue-500/10',
  },
  {
    label: 'REPETICIÓN DE CLIENTAS',
    value: '62.0%',
    change: '+3.5 %',
    comparison: 'vs. mes anterior',
    trend: 'up',
    color: 'bg-amber-500/10',
  },
  {
    label: 'NUEVAS CLIENTAS',
    value: '14',
    change: '-8.4 %',
    comparison: 'vs. mes anterior',
    trend: 'down',
    color: 'bg-rose-500/10',
  },
] as const;

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

export const StatsCards = () => (
  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
    {stats.map((stat) => (
      <Card key={stat.label} className={cn('relative overflow-hidden p-6', stat.color)}>
        <div className="mb-4 flex items-start justify-between">
          <h3 className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{stat.label}</h3>
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
        </div>
        <p className="mb-3 text-3xl font-bold text-foreground">{stat.value}</p>
        <div className="flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn('flex items-center gap-1', stat.trend === 'up' ? 'text-primary' : 'text-destructive')}
          >
            {stat.trend === 'up' ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {stat.change}
          </Badge>
          <span className="text-xs text-muted-foreground">{stat.comparison}</span>
        </div>
      </Card>
    ))}
  </div>
);

export default StatsCards;
