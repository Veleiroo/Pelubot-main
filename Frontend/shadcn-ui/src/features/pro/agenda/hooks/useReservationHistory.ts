import { useQuery } from '@tanstack/react-query';
import { api, ProReservationHistoryResponse, ReservationStatus } from '@/lib/api';

export type ReservationHistoryFilters = {
  page: number;
  pageSize: number;
  search?: string;
  statuses: ReservationStatus[];
  services: string[];
  dateFrom?: string;
  dateTo?: string;
};

const buildQueryPayload = (filters: ReservationHistoryFilters) => ({
  page: filters.page,
  pageSize: filters.pageSize,
  search: filters.search?.trim() || undefined,
  status: filters.statuses,
  serviceIds: filters.services,
  dateFrom: filters.dateFrom || undefined,
  dateTo: filters.dateTo || undefined,
});

export const useReservationHistory = (filters: ReservationHistoryFilters) => {
  return useQuery<ProReservationHistoryResponse>({
    queryKey: ['pros', 'reservations', 'history', filters],
    queryFn: () => api.prosReservationHistory(buildQueryPayload(filters)),
    keepPreviousData: true,
    staleTime: 60_000,
  });
};
