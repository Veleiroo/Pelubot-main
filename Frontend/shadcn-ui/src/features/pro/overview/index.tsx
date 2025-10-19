import { useCallback, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { format } from 'date-fns';

import { useToast } from '@/hooks/use-toast';
import { useProSession } from '@/store/pro';

import {
  RescheduleAppointmentDialog,
  RESCHEDULE_TIME_OPTIONS,
  type RescheduleFormValues,
} from '../shared/components/reschedule-appointment-dialog';
import type { Appointment } from '../shared/types';

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
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);

  const stylist = session?.stylist;
  const {
    appointments: todayAppointments,
    upcomingAppointment,
    summary,
    isInitialOverviewLoading,
    overviewErrorMessage,
  } = useOverviewData(Boolean(stylist));

  const {
    createAppointment,
    markAttended,
    markNoShow,
    cancelAppointment,
    deleteAppointment,
    rescheduleAppointment,
    isCreating,
    isMarkingAttended,
    isMarkingNoShow,
    isCancelling,
    isRescheduling,
  } = useOverviewActions({
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
        } else if (action === 'cancel') {
          await cancelAppointment(appointmentId);
          toast({
            title: 'Cita cancelada',
            description: 'La cita ha sido eliminada de la agenda',
          });
        } else if (action === 'reschedule') {
          const entry =
            todayAppointments.find((item) => item.id === appointmentId) ??
            (upcomingAppointment?.id === appointmentId ? upcomingAppointment : null);

          if (!entry) {
            toast({
              title: 'Error',
              description: 'No encontramos la cita para reprogramar',
              variant: 'destructive',
            });
            return;
          }

          const startDate = new Date(entry.raw.start);
          if (Number.isNaN(startDate.getTime())) {
            toast({
              title: 'Error',
              description: 'La hora actual de la cita es inválida',
              variant: 'destructive',
            });
            return;
          }

          let endTime: string | undefined;
          let durationMinutes: number | undefined;

          if (entry.raw.end) {
            const endDate = new Date(entry.raw.end);
            if (!Number.isNaN(endDate.getTime()) && endDate.getTime() > startDate.getTime()) {
              endTime = format(endDate, 'HH:mm');
              durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
            }
          }

          setRescheduleTarget({
            id: entry.id,
            date: format(startDate, 'yyyy-MM-dd'),
            time: format(startDate, 'HH:mm'),
            endTime,
            client: entry.client,
            clientPhone: entry.raw.client_phone ?? undefined,
            clientEmail: entry.raw.client_email ?? undefined,
            service: entry.service,
            serviceId: entry.raw.service_id ?? undefined,
            status: entry.status,
            durationMinutes: durationMinutes && durationMinutes > 0 ? durationMinutes : undefined,
            notes: entry.raw.notes ?? undefined,
          });
        } else if (action === 'delete') {
          await deleteAppointment(appointmentId);
          toast({
            title: 'Cita eliminada',
            description: 'La cita fue eliminada de forma permanente',
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
    [
      cancelAppointment,
      deleteAppointment,
      markAttended,
      markNoShow,
      toast,
      todayAppointments,
      upcomingAppointment,
    ]
  );

  const handleCreateAppointment = useCallback(() => {
    setIsNewAppointmentOpen(true);
  }, []);

  const handleNewAppointmentModalChange = useCallback((open: boolean) => {
    setIsNewAppointmentOpen(open);
  }, []);

  const handleRescheduleConfirm = useCallback(
    async ({ newDate, newTime, durationMinutes }: RescheduleFormValues) => {
      if (!rescheduleTarget) return;

      const appointmentDate = (() => {
        if (newDate) {
          const parsed = new Date(`${newDate}T00:00:00`);
          if (!Number.isNaN(parsed.getTime())) {
            return parsed;
          }
        }
        return new Date(`${rescheduleTarget.date}T00:00:00`);
      })();

      try {
        await rescheduleAppointment({
          reservationId: rescheduleTarget.id,
          date: appointmentDate,
          newTime,
          durationMinutes,
          clientName: rescheduleTarget.client,
        });
        setRescheduleTarget(null);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'No se pudo reprogramar la cita. Inténtalo de nuevo.';
        toast({
          title: 'No se pudo reprogramar',
          description: message,
          variant: 'destructive',
        });
        throw new Error(message);
      }
    },
    [rescheduleAppointment, rescheduleTarget, toast]
  );

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
              isRescheduling={isRescheduling}
            />
            <DailySummary summary={summary} isLoading={isInitialOverviewLoading} />
          </div>
          <TodayAppointments
            appointments={todayAppointments}
            summary={summary}
            isLoading={isInitialOverviewLoading}
            errorMessage={overviewErrorMessage}
            onCreateAppointment={handleCreateAppointment}
            onAction={handleAppointmentAction}
            isProcessingAction={isMarkingAttended || isMarkingNoShow || isCancelling}
            isRescheduling={isRescheduling}
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

      <RescheduleAppointmentDialog
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setRescheduleTarget(null);
          }
        }}
        appointment={rescheduleTarget}
        timeOptions={RESCHEDULE_TIME_OPTIONS}
        isSubmitting={isRescheduling}
        onSubmit={handleRescheduleConfirm}
      />
    </>
  );
};

export default ProsOverviewView;
