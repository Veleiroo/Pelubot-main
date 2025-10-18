import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

import type { ClientSummary } from '../types';

const numberFormatter = new Intl.NumberFormat('es-ES');

type SummaryGridProps = {
  summary: ClientSummary;
  isLoading: boolean;
};

const buildSummaryItems = (summary: ClientSummary) => [
  {
    key: 'total',
    label: 'Clientes totales',
    description: `${summary.recurrentes} con visitas recientes`,
    value: summary.total,
    accent: 'text-emerald-600',
  },
  {
    key: 'recurrentes',
    label: 'Clientes recurrentes',
    description: 'Última visita dentro de 90 días',
    value: summary.recurrentes,
    accent: 'text-sky-600',
  },
  {
    key: 'nuevos',
    label: 'Clientes nuevos',
    description: 'Registrados el último trimestre',
    value: summary.nuevos,
    accent: 'text-indigo-600',
  },
  {
    key: 'riesgo',
    label: 'Clientes a recuperar',
    description: `${summary.riesgo} en seguimiento · ${summary.inactivos} inactivos`,
    value: summary.riesgo + summary.inactivos,
    accent: 'text-amber-600',
  },
];

export const SummaryGrid = ({ summary, isLoading }: SummaryGridProps) => {
  const items = buildSummaryItems(summary);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card
          key={item.key}
          className="space-y-3 rounded-2xl border border-border/60 bg-card/90 p-5 shadow-lg shadow-black/10"
        >
          <div>
            <p className="text-sm font-medium text-muted-foreground">{item.label}</p>
            <p className="text-xs text-muted-foreground/80">{item.description}</p>
          </div>
          {isLoading ? (
            <Skeleton className="h-8 w-1/3 rounded-lg bg-muted/40" />
          ) : (
            <span className={`text-4xl font-semibold tracking-tight ${item.accent}`}>
              {numberFormatter.format(item.value)}
            </span>
          )}
        </Card>
      ))}
    </div>
  );
};
