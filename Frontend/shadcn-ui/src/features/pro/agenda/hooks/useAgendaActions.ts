import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

import { api, type ProReservation, type ProReservationsResponse } from '@/lib/api';

const combineDateAndTime = (date: Date, time: string) => {
  const [hours, minutes] = time.split(':').map((value) => Number.parseInt(value, 10));
  const safeHours = Number.isFinite(hours) ? hours : 0;
  const safeMinutes = Number.isFinite(minutes) ? minutes : 0;
  const next = new Date(date.getFullYear(), date.getMonth(), date.getDate(), safeHours, safeMinutes, 0, 0);
  return next;
};

const minutesToMs = (minutes?: number) => (Number.isFinite(minutes) && minutes ? minutes * 60_000 : 45 * 60_000);

const sortReservations = (reservations: ProReservation[]) =>
  [...reservations].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

const upsertReservation = (reservations: ProReservation[], reservation: ProReservation) =>
  sortReservations(reservations.filter((item) => item.id !== reservation.id).concat(reservation));

const ensureReservationsArray = (payload?: ProReservationsResponse | null) =>
  Array.isArray(payload?.reservations) ? payload!.reservations : [];

type CreateAppointmentPayload = {
  date: Date;
  time: string;
  serviceId: string;
  serviceName: string;
  durationMinutes?: number;
  clientName: string;
  clientPhone: string;
  notes?: string;
  slotStartIso?: string;
};

type ReschedulePayload = {
  reservationId: string;
  date: Date;
  newTime: string;
  durationMinutes?: number;
};

type CancelPayload = { reservationId: string };

type AgendaActionsOptions = {
  professionalId?: string | null;
};

export const useAgendaActions = ({ professionalId }: AgendaActionsOptions) => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (payload: CreateAppointmentPayload) => {
      if (!professionalId) throw new Error('No hay profesional activo para crear la reserva.');

      const startDate = payload.slotStartIso ? new Date(payload.slotStartIso) : combineDateAndTime(payload.date, payload.time);
      if (Number.isNaN(startDate.getTime())) throw new Error('Fecha u hora inválida');
      const startIso = payload.slotStartIso ?? startDate.toISOString();
      const durationMs = minutesToMs(payload.durationMinutes);
      const endIso = new Date(startDate.getTime() + durationMs).toISOString();

      const response = await api.prosCreateReservation({
        service_id: payload.serviceId,
        professional_id: professionalId,
        start: startIso,
        customer_name: payload.clientName,
        customer_phone: payload.clientPhone,
        ...(payload.notes ? { notes: payload.notes } : {}),
      });

      const reservation: ProReservation = {
        id: response.reservation_id,
        service_id: payload.serviceId,
        service_name: payload.serviceName,
        professional_id: professionalId,
        start: startIso,
        end: endIso,
        status: 'confirmada',
        customer_name: payload.clientName,
        customer_phone: payload.clientPhone,
        notes: payload.notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      return { response, reservation };
    },
    onSuccess: ({ reservation }) => {
      queryClient.setQueriesData<ProReservationsResponse>({ queryKey: ['pros', 'reservations'] }, (previous) => {
        if (!previous) return previous;
        const current = ensureReservationsArray(previous);
        return { reservations: upsertReservation(current, reservation) };
      });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'overview'] });
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: async (payload: ReschedulePayload) => {
      const startDate = combineDateAndTime(payload.date, payload.newTime);
      const startIso = startDate.toISOString();
      const durationMs = minutesToMs(payload.durationMinutes);
      const endIso = new Date(startDate.getTime() + durationMs).toISOString();

      const response = await api.prosRescheduleReservation(payload.reservationId, {
        new_date: format(payload.date, 'yyyy-MM-dd'),
        new_time: payload.newTime,
      });

      return { response, reservationId: payload.reservationId, startIso, endIso };
    },
    onSuccess: ({ reservationId, startIso, endIso }) => {
      queryClient.setQueriesData<ProReservationsResponse>({ queryKey: ['pros', 'reservations'] }, (previous) => {
        if (!previous) return previous;
        const current = ensureReservationsArray(previous);
        const next = current.map((reservation) =>
          reservation.id === reservationId
            ? {
                ...reservation,
                start: startIso,
                end: endIso,
                updated_at: new Date().toISOString(),
              }
            : reservation
        );
        return { reservations: sortReservations(next) };
      });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'overview'] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (payload: CancelPayload) => {
      const response = await api.prosCancelReservation(payload.reservationId);
      return { response, reservationId: payload.reservationId };
    },
    onSuccess: ({ reservationId }) => {
      queryClient.setQueriesData<ProReservationsResponse>({ queryKey: ['pros', 'reservations'] }, (previous) => {
        if (!previous) return previous;
        const current = ensureReservationsArray(previous);
        const updated = current.map((r) =>
          r.id === reservationId ? { ...r, status: 'cancelada' as const } : r
        );
        return { reservations: updated };
      });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'overview'] });
    },
  });

  const markAttendedMutation = useMutation({
    mutationFn: async (reservationId: string) => {
      const response = await api.prosMarkAttended(reservationId);
      return { response, reservationId };
    },
    onSuccess: ({ reservationId }) => {
      queryClient.setQueriesData<ProReservationsResponse>({ queryKey: ['pros', 'reservations'] }, (previous) => {
        if (!previous) return previous;
        const current = ensureReservationsArray(previous);
        const updated = current.map((r) =>
          r.id === reservationId ? { ...r, status: 'asistida' as const } : r
        );
        return { reservations: updated };
      });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'overview'] });
    },
  });

  const markNoShowMutation = useMutation({
    mutationFn: async ({ reservationId, reason }: { reservationId: string; reason?: string }) => {
      const response = await api.prosMarkNoShow(reservationId, reason);
      return { response, reservationId };
    },
    onSuccess: ({ reservationId }) => {
      queryClient.setQueriesData<ProReservationsResponse>({ queryKey: ['pros', 'reservations'] }, (previous) => {
        if (!previous) return previous;
        const current = ensureReservationsArray(previous);
        const updated = current.map((r) =>
          r.id === reservationId ? { ...r, status: 'no_asistida' as const } : r
        );
        return { reservations: updated };
      });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'reservations'] });
      void queryClient.invalidateQueries({ queryKey: ['pros', 'overview'] });
    },
  });

  return {
    createAppointment: createMutation.mutateAsync,
    rescheduleAppointment: rescheduleMutation.mutateAsync,
    cancelAppointment: cancelMutation.mutateAsync,
    markAttended: markAttendedMutation.mutateAsync,
    markNoShow: markNoShowMutation.mutateAsync,
    isCreating: createMutation.isPending,
    isRescheduling: rescheduleMutation.isPending,
    isCancelling: cancelMutation.isPending,
    isMarkingAttended: markAttendedMutation.isPending,
    isMarkingNoShow: markNoShowMutation.isPending,
  };
};
