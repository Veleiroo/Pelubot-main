import { useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api, ApiError, type ProOverview, type ProOverviewAppointment } from '@/lib/api';

import { formatHour } from '../lib/format';
import type { OverviewAppointmentEntry, OverviewSummary } from '../types';

const buildFallbackSummary = (appointments: OverviewAppointmentEntry[]): OverviewSummary => {
  return appointments.reduce<OverviewSummary>(
    (acc, appointment) => {
      acc.total += 1;
      if (appointment.status === 'confirmada') acc.confirmadas += 1;
      if (appointment.status === 'pendiente') acc.pendientes += 1;
      if (appointment.status === 'cancelada') acc.canceladas += 1;
      return acc;
    },
    { total: 0, confirmadas: 0, pendientes: 0, canceladas: 0 }
  );
};

export const useOverviewData = (enabled: boolean) => {
  const overviewQuery = useQuery<ProOverview, ApiError>({
    queryKey: ['pros', 'overview'],
    queryFn: api.prosOverview,
    enabled,
    refetchInterval: 60_000,
    retry: 1,
  });

  const overview = overviewQuery.data;

  const mapAppointment = useCallback((appointment: ProOverviewAppointment): OverviewAppointmentEntry => ({
    id: appointment.id,
    time: formatHour(appointment.start),
    client: appointment.client_name ?? 'Reserva sin nombre',
    service: appointment.service_name ?? appointment.service_id ?? 'Servicio por confirmar',
    status: appointment.status,
    phone: appointment.client_phone ?? undefined,
    lastVisit: appointment.last_visit ?? undefined,
    notes: appointment.notes ?? undefined,
    raw: appointment,
  }), []);

  const appointments = useMemo<OverviewAppointmentEntry[]>(() => {
    if (!overview) return [];
    return overview.appointments.map(mapAppointment);
  }, [overview, mapAppointment]);

  const upcomingAppointment = useMemo<OverviewAppointmentEntry | null>(() => {
    if (overview?.upcoming) {
      return mapAppointment(overview.upcoming);
    }
    return appointments.find((appointment) => appointment.status !== 'cancelada') ?? appointments[0] ?? null;
  }, [overview, appointments, mapAppointment]);

  const summary = useMemo<OverviewSummary>(() => {
    if (overview?.summary) {
      return overview.summary;
    }
    return buildFallbackSummary(appointments);
  }, [overview, appointments]);

  const overviewError = (overviewQuery.error as ApiError | undefined) ?? null;

  return {
    overview,
    appointments,
    upcomingAppointment,
    summary,
    isInitialOverviewLoading: overviewQuery.isLoading && !overview,
    overviewErrorMessage: overviewError?.message ?? null,
    refetchOverview: overviewQuery.refetch,
  };
};
