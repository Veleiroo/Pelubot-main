import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

import { InsightsCard } from './components/insights-card';
import { RetentionCard } from './components/retention-card';
import { ServicesTable } from './components/services-table';
import { SummaryGrid } from './components/summary-grid';
import { TrendChartCard } from './components/trend-chart-card';
import { useStatsData } from './hooks/useStatsData';

export const ProsStatsView = () => {
  const { session } = useProSession();
  const { toast } = useToast();
  const hasStylist = Boolean(session?.stylist);
  const statsQuery = useStatsData(hasStylist);

  useEffect(() => {
    if (!statsQuery.errorMessage || statsQuery.isLoading) return;
    toast({
      title: 'No pudimos cargar las métricas',
      description: statsQuery.errorMessage,
      variant: 'destructive',
    });
  }, [statsQuery.errorMessage, statsQuery.isLoading, toast]);

  if (!hasStylist) {
    return (
      <div className="flex min-h-[280px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        Preparando tus estadísticas...
      </div>
    );
  }

  const { data, isLoading, isFetching, refetch } = statsQuery;

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Estadísticas</h1>
          <p className="text-sm text-muted-foreground">
            Controla tus ingresos, fidelización y servicios estrella para tomar decisiones más rápido.
          </p>
          {isFetching ? (
            <p className="text-xs text-muted-foreground/70">Actualizando datos en tiempo real...</p>
          ) : null}
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Refrescar
        </Button>
      </header>

      <SummaryGrid
        cards={data.summaryCards}
        isLoading={isLoading}
        errorMessage={statsQuery.errorMessage}
        onRetry={() => refetch()}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
        <TrendChartCard
          points={data.trendPoints}
          isLoading={isLoading}
          errorMessage={statsQuery.errorMessage}
          onRetry={() => refetch()}
        />
        <RetentionCard segments={data.retention} isLoading={isLoading} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.9fr)]">
        <ServicesTable services={data.services} isLoading={isLoading} />
        <InsightsCard insights={data.insights} isLoading={isLoading} />
      </div>
    </section>
  );
};

export default ProsStatsView;
