import { useCallback } from 'react';
import { Loader2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

import { AppointmentCard } from './components/appointment-card';
import { DailySummary } from './components/daily-summary';
import { TodayAppointments } from './components/today-appointments';
import { useOverviewData } from './hooks/useOverviewData';
import type { AppointmentActionType } from './types';

export const ProsOverviewView = () => {
  const { toast } = useToast();
  const { session } = useProSession();

  const stylist = session?.stylist;
  const {
    appointments: todayAppointments,
    upcomingAppointment,
    summary,
    isInitialOverviewLoading,
    overviewErrorMessage,
  } = useOverviewData(Boolean(stylist));

  const handleAppointmentAction = useCallback(
    (action: AppointmentActionType, detail?: string) => {
      const labels: Record<AppointmentActionType, string> = {
        attended: 'Marcada como asistida',
        'no-show': 'Marcada como no asistida',
        reschedule: 'Abriremos la reprogramación pronto',
      };
      toast({
        title: labels[action],
        description: detail ?? 'Prototipo temporal: los cambios se guardarán en una próxima iteración.',
      });
    },
    [toast]
  );

  const handleCreateAppointment = useCallback(() => {
    toast({
      title: 'Crear cita',
      description: 'Muy pronto podrás agendar directamente desde aquí.',
    });
  }, [toast]);

  if (!stylist) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        Cargando portal...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
      <section className="grid gap-6 lg:grid-cols-[400px_1fr]">
        <div className="space-y-6">
          <AppointmentCard
            appointment={upcomingAppointment}
            isLoading={isInitialOverviewLoading}
            onAction={handleAppointmentAction}
          />
          <DailySummary summary={summary} isLoading={isInitialOverviewLoading} />
        </div>
        <TodayAppointments
          appointments={todayAppointments}
          summary={summary}
          isLoading={isInitialOverviewLoading}
          errorMessage={overviewErrorMessage}
          onSelectAppointment={(id) =>
            toast({
              title: 'Detalle en construcción',
              description: `Abriremos la cita ${id} en breve.`,
            })
          }
          onCreateAppointment={handleCreateAppointment}
        />
      </section>
    </div>
  );
};

export default ProsOverviewView;
