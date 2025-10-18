import { Loader2 } from 'lucide-react';
import { useMemo } from 'react';

import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

import { ClientsTable } from './components/client-table';
import { FollowUpsCard } from './components/follow-ups-card';
import { SegmentsCard } from './components/segments-card';
import { SummaryGrid } from './components/summary-grid';
import { useClientsData } from './hooks/useClientsData';
import type { ClientRow } from './types';

const pickFollowUps = (clients: ClientRow[]) => {
  const toDate = (value: string | null | undefined) => {
    if (!value) return Number.NEGATIVE_INFINITY;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? Number.NEGATIVE_INFINITY : date.getTime();
  };

  return clients
    .filter((client) => client.status === 'riesgo' || client.status === 'inactivo')
    .sort((a, b) => toDate(a.raw.last_visit ?? null) - toDate(b.raw.last_visit ?? null))
    .slice(0, 3);
};

export const ProsClientsView = () => {
  const { toast } = useToast();
  const { session } = useProSession();
  const stylist = session?.stylist;

  const { summary, segments, clients, isLoading, errorMessage, refetch } = useClientsData(Boolean(stylist));

  const followUps = useMemo(() => pickFollowUps(clients), [clients]);

  if (!stylist) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        Cargando cartera de clientes...
      </div>
    );
  }

  const handleComingSoon = () => {
    toast({
      title: 'Función en camino',
      description: 'Estamos terminando el flujo de importación y edición de clientes. ¡Muy pronto disponible! 🛠️',
    });
  };

  return (
    <section className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-foreground">Clientes</h1>
          <p className="text-sm text-muted-foreground">
            Visualiza tus contactos, detecta oportunidades y prepara campañas de fidelización.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          Actualizar
        </Button>
      </header>

      <SummaryGrid summary={summary} isLoading={isLoading} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <ClientsTable
          clients={clients}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onImportClick={handleComingSoon}
          onRefreshClick={() => {
            void refetch();
          }}
        />
        <div className="space-y-6">
          <SegmentsCard segments={segments} isLoading={isLoading} />
          <FollowUpsCard followUps={followUps} isLoading={isLoading} />
          <div className="rounded-2xl border border-dashed border-border/60 bg-card/70 p-5 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">¿Qué viene después?</p>
            <ul className="mt-3 list-disc space-y-2 pl-5">
              <li>Edición de fichas con notas y etiquetas personalizadas.</li>
              <li>Filtros avanzados (ticket medio, servicios favoritos, última visita).</li>
              <li>Automatizaciones para recordatorios por WhatsApp y correo.</li>
            </ul>
            <button
              type="button"
              onClick={handleComingSoon}
              className="mt-4 inline-flex items-center rounded-full border border-border/60 px-4 py-2 text-xs font-medium uppercase tracking-wide text-muted-foreground transition hover:bg-muted/30 hover:text-foreground"
            >
              Avisarme cuando esté listo
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ProsClientsView;
