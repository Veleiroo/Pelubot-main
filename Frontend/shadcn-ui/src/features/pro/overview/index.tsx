import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';

import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

import { AppointmentCard } from './components/appointment-card';
import { DailySummary } from './components/daily-summary';
import { NewAppointmentModal, type NewAppointmentFormValues } from './components/new-appointment-modal';
import { TodayAppointments } from './components/today-appointments';
import { useOverviewData } from './hooks/useOverviewData';
import { useOverviewActions } from './hooks/useOverviewActions';
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

  const { createAppointment, markAttended, markNoShow, isCreating, isMarkingAttended, isMarkingNoShow } = useOverviewActions({
    professionalId: stylist?.id,
  });

  const handleAppointmentAction = useCallback(
    async (action: AppointmentActionType, appointmentId?: string, detail?: string) => {
      if (!appointmentId) {
        toast({
          title: 'Error',
          description: 'No se pudo identificar la cita',
          variant: 'destructive',
        });
        return;
      }

      try {
        if (action === 'attended') {
          await markAttended(appointmentId);
          toast({
            title: 'Cita marcada como asistida',
            description: 'El cliente ha sido marcado como atendido',
          });
        } else if (action === 'no-show') {
          await markNoShow({ appointmentId, reason: detail });
          toast({
            title: 'Cita marcada como no asistida',
            description: detail ? `Motivo: ${detail}` : 'El cliente no se presentó a la cita',
          });
        } else if (action === 'reschedule') {
          toast({
            title: 'Reprogramación',
            description: 'Abriremos la reprogramación pronto',
          });
        }
      } catch (error) {
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'No se pudo completar la acción',
          variant: 'destructive',
        });
      }
    },
    [markAttended, markNoShow, toast]
  );

  const handleCreateAppointment = useCallback(() => {
    setIsNewAppointmentOpen(true);
  }, []);

  const handleNewAppointmentModalChange = useCallback((open: boolean) => {
    setIsNewAppointmentOpen(open);
  }, []);

  const handleConfirmNewAppointment = useCallback(
    async ({ client, clientPhone, clientEmail, date, time, serviceId, serviceName, durationMinutes, notes }: NewAppointmentFormValues) => {
      try {
        // Construir fecha/hora ISO
        const startDate = new Date(`${date}T${time}:00`);
        if (Number.isNaN(startDate.getTime())) {
          throw new Error('Fecha u hora inválida');
        }

        const startISO = startDate.toISOString();
        const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
        const endISO = endDate.toISOString();

        await createAppointment({
          serviceId,
          serviceName,
          startISO,
          endISO,
          clientName: client,
          clientPhone,
          clientEmail,
          notes: notes || undefined,
        });

        setIsNewAppointmentOpen(false); // Cerrar el modal tras éxito
        
        toast({
          title: 'Cita creada exitosamente',
          description: `Cita para ${client} el ${new Intl.DateTimeFormat('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          }).format(startDate)} a las ${time} h`,
        });
      } catch (error) {
        toast({
          title: 'Error al crear la cita',
          description: error instanceof Error ? error.message : 'No se pudo crear la cita',
          variant: 'destructive',
        });
      }
    },
    [createAppointment, toast]
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
