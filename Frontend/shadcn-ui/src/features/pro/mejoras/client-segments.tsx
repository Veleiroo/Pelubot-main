import { Card } from '@/components/ui/card';
import { AlertCircle, TrendingUp, Users } from 'lucide-react';

const segments = [
  {
    icon: TrendingUp,
    label: 'VIP',
    description: 'Ticket medio superior a 60€ y visitas frecuentes.',
    count: 1,
    color: 'text-primary',
  },
  {
    icon: Users,
    label: 'EVENTOS',
    description: 'Visitan principalmente para peinados y recogidos especiales.',
    count: 1,
    color: 'text-yellow-500',
  },
  {
    icon: AlertCircle,
    label: 'RECUPERAR',
    description: 'Más de 90 días sin visita. Acciones de reactivación sugeridas.',
    count: 2,
    color: 'text-destructive',
  },
] as const;

const cn = (...classes: string[]) => classes.filter(Boolean).join(' ');

export const ClientSegments = () => (
  <Card className="border border-border/50 bg-card p-6 shadow-lg">
    <div className="mb-2 flex items-center gap-2">
      <Users className="h-5 w-5 text-foreground" />
      <h2 className="text-lg font-semibold text-foreground">Segmentos destacados</h2>
    </div>
    <p className="mb-6 text-sm text-muted-foreground">
      Agrupaciones automáticas según hábitos y valor histórico. Añadiremos filtros y acciones pronto.
    </p>

    <div className="space-y-4">
      {segments.map((segment) => (
        <div key={segment.label} className="rounded-lg border border-border bg-secondary/30 p-4">
          <div className="mb-2 flex items-start justify-between">
            <div className="flex items-center gap-2">
              <segment.icon className={cn('h-5 w-5', segment.color)} />
              <h3 className="font-semibold text-foreground">{segment.label}</h3>
            </div>
            <span className="text-2xl font-bold text-foreground">{segment.count}</span>
          </div>
          <p className="text-sm text-muted-foreground">{segment.description}</p>
        </div>
      ))}
    </div>
  </Card>
);

export default ClientSegments;
