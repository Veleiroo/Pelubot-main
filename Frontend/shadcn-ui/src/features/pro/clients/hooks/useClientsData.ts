import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api, ApiError, type ProClient } from '@/lib/api';

import { extractInitials, formatRelativeDays, formatShortDate } from '../lib/format';
import type { ClientRow, ClientSegment, ClientSummary, ClientsData } from '../types';

const EMPTY_SUMMARY: ClientSummary = {
  total: 0,
  nuevos: 0,
  recurrentes: 0,
  riesgo: 0,
  inactivos: 0,
};

const SEGMENT_ACCENT_ORDER: Array<ClientSegment['accent']> = ['emerald', 'amber', 'rose'];

const mapClient = (client: ProClient): ClientRow => {
  const lastVisitDate = formatShortDate(client.last_visit);
  const lastVisitRelative = formatRelativeDays(client.last_visit);
  const upcomingDate = formatShortDate(client.upcoming_visit?.start ?? null);
  const upcomingRelative = formatRelativeDays(client.upcoming_visit?.start ?? null);

  return {
    id: client.id,
    name: client.full_name,
    initials: extractInitials(client.full_name),
    status: client.status,
    lastVisitLabel: lastVisitDate ?? 'Sin visitas registradas',
    lastVisitRelative: lastVisitRelative ?? undefined,
    upcomingLabel: upcomingDate
      ? upcomingRelative
        ? `${upcomingDate} · ${upcomingRelative}`
        : upcomingDate
      : undefined,
    totalVisits: client.total_visits,
    totalSpent: client.total_spent_eur,
    favoriteServices: client.favorite_services ?? [],
    tags: client.tags ?? [],
    contact: client.phone || client.email ? { phone: client.phone ?? undefined, email: client.email ?? undefined } : undefined,
    loyaltyScore: client.loyalty_score ?? undefined,
    notes: client.notes ?? undefined,
    raw: client,
  };
};

export const useClientsData = (enabled: boolean): ClientsData => {
  const query = useQuery({
    queryKey: ['pros', 'clients'],
    queryFn: api.prosClients,
    enabled,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const summary = query.data?.summary ?? EMPTY_SUMMARY;

  const segments = useMemo<ClientSegment[]>(() => {
    const base = query.data?.segments ?? [];
    if (base.length === 0) return [];

    return base.map((segment, index) => ({
      ...segment,
      accent: SEGMENT_ACCENT_ORDER[index % SEGMENT_ACCENT_ORDER.length],
    }));
  }, [query.data?.segments]);

  const clients = useMemo<ClientRow[]>(() => {
    const base = query.data?.clients ?? [];
    return base.map(mapClient);
  }, [query.data?.clients]);

  const error = query.error as ApiError | null;

  return {
    summary,
    segments,
    clients,
    isLoading: query.isLoading && !query.data,
    errorMessage: error?.message ?? null,
    refetch: query.refetch,
  };
};
