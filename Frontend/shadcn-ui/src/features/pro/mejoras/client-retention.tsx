import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Bell } from 'lucide-react';

const retentionGroups = [
  {
    label: 'Activas (<30 días)',
    count: 42,
    percentage: '54.3%',
    status: 'Mejora',
    statusColor: 'bg-primary/20 text-primary',
  },
  {
    label: 'En seguimiento (30-90 días)',
    count: 18,
    percentage: '23.1%',
    status: 'Estable',
    statusColor: 'bg-yellow-500/20 text-yellow-600',
  },
  {
    label: 'Recuperar (>90 días)',
    count: 17,
    percentage: '22.6%',
    status: 'En riesgo',
    statusColor: 'bg-destructive/20 text-destructive',
  },
] as const;

export const ClientRetention = () => (
  <Card className="border border-border/50 bg-card p-6 shadow-lg">
    <div className="mb-2 flex items-center gap-2">
      <Bell className="h-5 w-5 text-foreground" />
      <h2 className="text-lg font-semibold text-foreground">Retención de clientas</h2>
    </div>
    <p className="mb-6 text-sm text-muted-foreground">
      Revisa los grupos según su última visita y prioriza acciones de reactivación.
    </p>

    <div className="space-y-4">
      {retentionGroups.map((group) => (
        <div key={group.label} className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex-1">
              <h3 className="mb-1 text-sm font-semibold text-foreground">{group.label}</h3>
              <p className="text-xs text-muted-foreground">Clientas que visitaron el salón en el último mes.</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold text-foreground">{group.count}</span>
              <span className="ml-2 text-sm text-muted-foreground">clientas · {group.percentage}</span>
            </div>
            <Badge className={group.statusColor}>{group.status}</Badge>
          </div>
        </div>
      ))}
    </div>

    <div className="mt-6 rounded-lg border border-primary/30 bg-primary/10 p-4">
      <h3 className="mb-2 text-sm font-semibold text-foreground">Seguimiento recomendado</h3>
      <p className="text-xs text-muted-foreground">
        Contactos que llevan más tiempo sin visitar el salón. Podrás automatizar recordatorios muy pronto.
      </p>
    </div>
  </Card>
);

export default ClientRetention;
