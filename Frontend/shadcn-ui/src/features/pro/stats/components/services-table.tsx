import { ArrowDownRight, ArrowRight, ArrowUpRight, Sparkles } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';

import type { ServicePerformanceRow } from '../types';

const TrendBadge = ({ value, label }: { value: number; label: string }) => {
  const Icon = value > 1 ? ArrowUpRight : value < -1 ? ArrowDownRight : ArrowRight;
  const tone = value > 1 ? 'text-emerald-200 border-emerald-400/40 bg-emerald-500/10' : value < -1 ? 'text-rose-200 border-rose-400/40 bg-rose-500/10' : 'text-white/60 border-white/20 bg-white/10';

  return (
    <Badge
      variant="secondary"
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${tone}`}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {label}
    </Badge>
  );
};

export type ServicesTableProps = {
  services: ServicePerformanceRow[];
  isLoading: boolean;
};

export const ServicesTable = ({ services, isLoading }: ServicesTableProps) => {
  if (isLoading && services.length === 0) {
    return (
      <Card className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <CardHeader className="space-y-3 p-0">
          <Skeleton className="h-5 w-48 bg-white/10" />
          <Skeleton className="h-4 w-64 bg-white/10" />
        </CardHeader>
        <CardContent className="p-0 pt-4">
          <Skeleton className="h-40 w-full rounded-2xl bg-white/5" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border border-white/12 bg-white/5 p-6 shadow-[0_28px_80px_-60px_rgba(56,189,248,0.45)]">
      <CardHeader className="space-y-2 p-0">
        <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
          <Sparkles className="h-5 w-5 text-emerald-300" aria-hidden="true" /> Servicios con mejor desempeño
        </CardTitle>
        <CardDescription className="text-sm text-white/60">
          Ranking de ingresos del mes actual frente al anterior. Úsalo para enfocar promociones.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 pt-4">
        {services.length > 0 ? (
          <ScrollArea className="max-h-[320px] pr-3">
            <table className="w-full min-w-[360px] border-separate border-spacing-y-2 text-sm text-white/85">
              <thead>
                <tr className="text-xs uppercase tracking-[0.24em] text-white/60">
                  <th className="text-left">Servicio</th>
                  <th className="text-right">Ingresos</th>
                  <th className="text-center">Reservas</th>
                  <th className="text-right">Tendencia</th>
                </tr>
              </thead>
              <tbody>
                {services.map((service) => (
                  <tr key={service.serviceId} className="rounded-2xl bg-white/5 text-sm">
                    <td className="rounded-l-2xl px-4 py-3 font-semibold text-white">
                      {service.serviceName}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums text-white/90">{service.revenueLabel}</td>
                    <td className="px-4 py-3 text-center tabular-nums text-white/70">{service.appointments}</td>
                    <td className="rounded-r-2xl px-4 py-3 text-right">
                      <TrendBadge value={service.growthValue} label={service.growthLabel} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </ScrollArea>
        ) : (
          <div className="flex min-h-[140px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 text-center text-sm text-white/60">
            Todavía no hay datos suficientes para mostrar el rendimiento por servicios.
          </div>
        )}
      </CardContent>
    </Card>
  );
};
