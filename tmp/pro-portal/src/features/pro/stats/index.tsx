import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

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
      <div className="flex min-h-[280px] items-center justify-center text-sm text-white/70">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Preparando tus estadísticas...
      </div>
    );
  }

  const { data, isLoading, isFetching, refetch } = statsQuery;

  return (
    <section className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-white">Estadísticas</h1>
        <p className="text-sm text-white/60">
          Controla tus ingresos, fidelización y servicios estrella para tomar decisiones más rápido.
        </p>
        {isFetching ? (
          <p className="text-xs text-white/40">Actualizando datos en tiempo real...</p>
        ) : null}
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
