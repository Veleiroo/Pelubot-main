import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Users } from 'lucide-react';

const retentionData = [
  {
    label: 'Activas (<30 días)',
    count: 42,
    percentage: '54.3%',
    status: 'Mejora',
    statusColor: 'bg-primary/20 text-primary',
    description: 'Clientas que visitaron el salón en el último mes.',
  },
  {
    label: 'En seguimiento (30-90 días)',
    count: 18,
    percentage: '23.1%',
    status: 'Estable',
    statusColor: 'bg-yellow-500/20 text-yellow-600',
    description: 'Recomendada una campaña de recordatorio.',
  },
  {
    label: 'Recuperar (>90 días)',
    count: 17,
    percentage: '22.6%',
    status: 'En riesgo',
    statusColor: 'bg-destructive/20 text-destructive',
    description: 'Contacta con beneficios especiales para su retorno.',
  },
] as const;

export const ClientRetentionStats = () => (
  <Card className="border border-border/50 bg-card p-6 shadow-lg">
    <div className="mb-2 flex items-center gap-2">
      <Users className="h-5 w-5 text-foreground" />
      <h2 className="text-lg font-semibold text-foreground">Retención de clientas</h2>
    </div>
    <p className="mb-6 text-sm text-muted-foreground">
      Revisa los grupos según su última visita y prioriza acciones de reactivación.
    </p>

    <div className="space-y-4">
      {retentionData.map((item) => (
        <div key={item.label} className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="mb-3">
            <h3 className="mb-1 text-sm font-semibold text-foreground">{item.label}</h3>
            <p className="text-xs text-muted-foreground">{item.description}</p>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-foreground">{item.count}</span>
              <span className="ml-2 text-sm text-muted-foreground">clientas · {item.percentage}</span>
            </div>
            <Badge className={item.statusColor}>{item.status}</Badge>
          </div>
        </div>
      ))}
    </div>
  </Card>
);

export default ClientRetentionStats;
