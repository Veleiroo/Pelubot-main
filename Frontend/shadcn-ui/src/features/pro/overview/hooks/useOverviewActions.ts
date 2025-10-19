import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, type ProReservation, type ProReservationsResponse } from '@/lib/api';

type CreateAppointmentPayload = {
  serviceId: string;
  serviceName: string;
  startISO: string;
  endISO: string;
  clientName: string;
  clientPhone: string;
  clientEmail?: string;
  notes?: string;
};

type OverviewActionsOptions = {
  professionalId?: string | null;
};

export const useOverviewActions = ({ professionalId }: OverviewActionsOptions) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload: CreateAppointmentPayload) => {
      if (!professionalId) throw new Error('No hay profesional activo para crear la reserva.');

      const response = await api.prosCreateReservation({
        service_id: payload.serviceId,
        professional_id: professionalId,
        start: payload.startISO,
        customer_name: payload.clientName,
        customer_phone: payload.clientPhone,
        ...(payload.clientEmail ? { customer_email: payload.clientEmail } : {}),
        ...(payload.notes ? { notes: payload.notes } : {}),
      });

      const reservation: ProReservation = {
        id: response.reservation_id,
        service_id: payload.serviceId,
        service_name: payload.serviceName,
        professional_id: professionalId,
        start: payload.startISO,
        end: payload.endISO,
        status: 'confirmada',
        customer_name: payload.clientName,
        customer_phone: payload.clientPhone,
        customer_email: payload.clientEmail,
        notes: payload.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return { response, reservation };
    },
    onSuccess: ({ reservation }) => {
      queryClient.setQueriesData<ProReservationsResponse>({ queryKey: ['pros', 'reservations'] }, (previous) => {
        if (!previous) return previous;
        const filtered = previous.reservations.filter((item) => item.id !== reservation.id);
        const updated = [...filtered, reservation].sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );
        return { reservations: updated };
      });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'overview'] });
    },
  });

  const markAttendedMutation = useMutation({
    mutationFn: async (appointmentId: string) => {
      return await api.prosMarkAttended(appointmentId);
    },
    onSuccess: () => {
      // Invalidar ambas queries: overview y reservations
      void queryClient.invalidateQueries({ queryKey: ['pros', 'overview'] });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'reservations'] });
    },
  });

  const markNoShowMutation = useMutation({
    mutationFn: async ({ appointmentId, reason }: { appointmentId: string; reason?: string }) => {
      return await api.prosMarkNoShow(appointmentId, reason);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['pros', 'overview'] });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'reservations'] });
    },
  });

  return {
    createAppointment: createMutation.mutateAsync,
    markAttended: markAttendedMutation.mutateAsync,
    markNoShow: markNoShowMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isMarkingAttended: markAttendedMutation.isPending,
    isMarkingNoShow: markNoShowMutation.isPending,
  };
};
