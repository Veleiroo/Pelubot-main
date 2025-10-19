import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

import { AppointmentCard } from './components/appointment-card';
import { DailySummary } from './components/daily-summary';
import { NewAppointmentModal, type NewAppointmentFormValues } from './components/new-appointment-modal';
import { TodayAppointments } from './components/today-appointments';
import { useOverviewData } from './hooks/useOverviewData';
import type { AppointmentActionType } from './types';

export const ProsOverviewView = () => {
  const { toast } = useToast();
  const { session } = useProSession();

  const [isNewAppointmentOpen, setIsNewAppointmentOpen] = useState(false);

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
    setIsNewAppointmentOpen(true);
  }, []);

  const handleNewAppointmentModalChange = useCallback((open: boolean) => {
    setIsNewAppointmentOpen(open);
  }, []);

  const handleConfirmNewAppointment = useCallback(
    ({ client, date, time, service }: NewAppointmentFormValues) => {
      const schedule = new Date(`${date}T${time}`);
      const dateLabel = Number.isNaN(schedule.getTime())
        ? `${date} a las ${time} h`
        : `${new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(schedule)} a las ${time} h`;

      toast({
        title: 'Cita creada',
        description: `Registraremos la cita para ${client} (${service}) el ${dateLabel}.`,
      });
    },
    [toast]
  );

  if (!stylist) {
    return (
      <div className="flex min-h-[320px] items-center justify-center text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" aria-hidden="true" />
        Cargando portal...
      </div>
    );
  }

  return (
    <>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="grid gap-6 xl:grid-cols-[minmax(350px,400px)_1fr]">
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

      <NewAppointmentModal
        open={isNewAppointmentOpen}
        onOpenChange={handleNewAppointmentModalChange}
        suggestedDate={upcomingAppointment?.raw.start ?? null}
        suggestedService={upcomingAppointment?.service ?? null}
        onConfirm={handleConfirmNewAppointment}
      />
    </>
  );
};

export default ProsOverviewView;
