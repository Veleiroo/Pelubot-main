import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

import { api, ApiError } from '@/lib/api';

import { SUMMARY_CARD_COPY } from '../constants';
import { formatChange, formatEuro, formatShare, pickTrend } from '../lib/format';
import type {
  InsightItem,
  ProStatsResponse,
  RetentionSegment,
  ServicePerformanceRow,
  StatsData,
  SummaryMetricCard,
  TrendPoint,
} from '../types';

export const useStatsData = (enabled: boolean) => {
  const query = useQuery<ProStatsResponse, ApiError>({
    queryKey: ['pros', 'stats'],
    queryFn: api.prosStats,
    enabled,
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const statsData = useMemo<StatsData | null>(() => {
    const payload = query.data;
    if (!payload) return null;

    const summaryCards: SummaryMetricCard[] = [
      {
        id: 'total_revenue',
        label: SUMMARY_CARD_COPY.total_revenue.label,
        formattedValue: formatEuro(payload.summary.total_revenue_eur, { withDecimals: true }),
        formattedChange: formatChange(payload.summary.revenue_change_pct),
        trend: pickTrend(payload.summary.revenue_change_pct),
        accent: SUMMARY_CARD_COPY.total_revenue.accent,
        tooltip: SUMMARY_CARD_COPY.total_revenue.tooltip,
      },
      {
        id: 'avg_ticket',
        label: SUMMARY_CARD_COPY.avg_ticket.label,
        formattedValue: formatEuro(payload.summary.avg_ticket_eur, { withDecimals: true }),
        formattedChange: formatChange(payload.summary.avg_ticket_change_pct),
        trend: pickTrend(payload.summary.avg_ticket_change_pct),
        accent: SUMMARY_CARD_COPY.avg_ticket.accent,
        tooltip: SUMMARY_CARD_COPY.avg_ticket.tooltip,
      },
      {
        id: 'repeat_rate',
        label: SUMMARY_CARD_COPY.repeat_rate.label,
        formattedValue: formatShare(payload.summary.repeat_rate_pct),
        formattedChange: formatChange(payload.summary.repeat_rate_change_pct),
        trend: pickTrend(payload.summary.repeat_rate_change_pct),
        accent: SUMMARY_CARD_COPY.repeat_rate.accent,
        tooltip: SUMMARY_CARD_COPY.repeat_rate.tooltip,
      },
      {
        id: 'new_clients',
        label: SUMMARY_CARD_COPY.new_clients.label,
        formattedValue: `${payload.summary.new_clients}`,
        formattedChange: formatChange(payload.summary.new_clients_change_pct),
        trend: pickTrend(payload.summary.new_clients_change_pct),
        accent: SUMMARY_CARD_COPY.new_clients.accent,
        tooltip: SUMMARY_CARD_COPY.new_clients.tooltip,
      },
    ];

    const trendPoints: TrendPoint[] = payload.revenue_series.map((point) => ({
      label: point.label,
      monthIso: point.period,
      revenueValue: point.revenue_eur,
      revenueLabel: formatEuro(point.revenue_eur, { withDecimals: true }),
      appointments: point.appointments,
    }));

    const services: ServicePerformanceRow[] = payload.top_services.map((service) => ({
      serviceId: service.service_id,
      serviceName: service.service_name,
      revenueValue: service.total_revenue_eur,
      revenueLabel: formatEuro(service.total_revenue_eur, { withDecimals: true }),
      appointments: service.total_appointments,
      growthValue: service.growth_pct,
      growthLabel: formatChange(service.growth_pct),
    }));

    const retention: RetentionSegment[] = payload.retention.map((segment) => ({
      id: segment.id,
      label: segment.label,
      count: segment.count,
      shareValue: segment.share_pct,
      shareLabel: formatShare(segment.share_pct),
      trend: segment.trend,
      description: segment.description,
    }));

    const insights: InsightItem[] = payload.insights.map((insight) => ({
      id: insight.id,
      title: insight.title,
      description: insight.description,
      priority: insight.priority,
    }));

    return {
      summaryCards,
      trendPoints,
      services,
      retention,
      insights,
      generatedAt: payload.generated_at,
    } satisfies StatsData;
  }, [query.data]);

  return {
    data: statsData ?? {
      summaryCards: [],
      trendPoints: [],
      services: [],
      retention: [],
      insights: [],
      generatedAt: '',
    },
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    errorMessage: query.error?.message ?? null,
    refetch: query.refetch,
  };
};
