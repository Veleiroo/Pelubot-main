import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { differenceInMinutes, format, isValid, parseISO } from 'date-fns';

import { api, ApiError, type ProReservationsResponse, type ProReservation } from '@/lib/api';

import type { Appointment, AppointmentStatus } from '../../shared/types';

const mapReservation = (reservation: ProReservation): Appointment | null => {
  if (!reservation.start) return null;
  const start = parseISO(reservation.start);
  if (!isValid(start)) return null;

  const end = reservation.end ? parseISO(reservation.end) : null;
  const status = reservation.status as AppointmentStatus;
  const client = reservation.customer_name?.trim() || 'Cliente por confirmar';
  const service = reservation.service_name?.trim() || reservation.service_id || 'Servicio por confirmar';
  const durationMinutes = end && isValid(end) ? Math.max(0, differenceInMinutes(end, start)) : undefined;

  return {
    id: reservation.id,
    date: format(start, 'yyyy-MM-dd'),
    time: format(start, 'HH:mm'),
    endTime: end && isValid(end) ? format(end, 'HH:mm') : undefined,
    client,
    clientPhone: reservation.customer_phone ?? undefined,
    service,
    serviceId: reservation.service_id,
    status,
    durationMinutes,
    notes: reservation.notes ?? undefined,
  };
};

export const useAgendaData = (
  enabled: boolean,
  options: { daysAhead?: number; includePastMinutes?: number } = {}
) => {
  const daysAhead = options.daysAhead ?? 180;
  const includePastMinutes = options.includePastMinutes ?? 60 * 24 * 30; // último mes

  const reservationsQuery = useQuery<ProReservationsResponse, ApiError>({
    queryKey: ['pros', 'reservations', daysAhead, includePastMinutes],
    queryFn: () => api.prosReservations({ daysAhead, includePastMinutes }),
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
    retry: (failureCount, error) => {
      if (error instanceof ApiError && error.status === 401) return false;
      return failureCount < 2;
    },
  });

  const appointments = useMemo<Appointment[]>(() => {
    const payload = reservationsQuery.data;
    if (!payload?.reservations?.length) return [];
    const mapped = payload.reservations
      .map((reservation) => mapReservation(reservation))
      .filter((appointment): appointment is Appointment => Boolean(appointment));
    return mapped;
  }, [reservationsQuery.data]);

  const error = reservationsQuery.error as ApiError | undefined;

  return {
    appointments,
    isLoading: reservationsQuery.isLoading && !reservationsQuery.data,
    isFetching: reservationsQuery.isFetching,
    errorMessage: error?.message ?? null,
    refetch: reservationsQuery.refetch,
  };
};
