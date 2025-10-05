import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
    accent: 'text-emerald-300',
  },
  {
    key: 'recurrentes',
    label: 'Clientes recurrentes',
    description: 'Última visita dentro de 90 días',
    value: summary.recurrentes,
    accent: 'text-sky-300',
  },
  {
    key: 'nuevos',
    label: 'Clientes nuevos',
    description: 'Registrados el último trimestre',
    value: summary.nuevos,
    accent: 'text-indigo-300',
  },
  {
    key: 'riesgo',
    label: 'Clientes a recuperar',
    description: `${summary.riesgo} en seguimiento · ${summary.inactivos} inactivos`,
    value: summary.riesgo + summary.inactivos,
    accent: 'text-amber-300',
  },
];

export const SummaryGrid = ({ summary, isLoading }: SummaryGridProps) => {
  const items = buildSummaryItems(summary);

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => (
        <Card key={item.key} className="rounded-2xl border border-white/10 bg-white/[0.06] shadow-sm backdrop-blur">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold text-white">{item.label}</CardTitle>
            <CardDescription className="text-xs text-white/60">{item.description}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-1/3 rounded-xl bg-white/10" />
            ) : (
              <span className={`text-3xl font-semibold tracking-tight ${item.accent}`}>
                {numberFormatter.format(item.value)}
              </span>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
