import type {
  ProStatsResponse,
  ProStatsSummary,
  ProStatsTrendPoint,
  ProStatsServicePerformance,
  ProStatsRetentionBucket,
  ProStatsInsight,
} from '@/lib/api';

export type StatsSummaryMetricId =
  | 'total_revenue'
  | 'avg_ticket'
  | 'repeat_rate'
  | 'new_clients';

export type SummaryMetricCard = {
  id: StatsSummaryMetricId;
  label: string;
  formattedValue: string;
  formattedChange: string;
  trend: 'up' | 'down' | 'steady';
  accent: 'emerald' | 'indigo' | 'amber' | 'rose';
  tooltip?: string;
};

export type TrendPoint = {
  label: string;
  monthIso: string;
  revenueValue: number;
  revenueLabel: string;
  appointments: number;
};

export type ServicePerformanceRow = {
  serviceId: string;
  serviceName: string;
  revenueLabel: string;
  revenueValue: number;
  appointments: number;
  growthLabel: string;
  growthValue: number;
};

export type RetentionSegment = {
  id: string;
  label: string;
  count: number;
  shareLabel: string;
  shareValue: number;
  trend: 'up' | 'down' | 'steady';
  description?: string;
};

export type InsightItem = {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

export type StatsData = {
  summaryCards: SummaryMetricCard[];
  trendPoints: TrendPoint[];
  services: ServicePerformanceRow[];
  retention: RetentionSegment[];
  insights: InsightItem[];
  generatedAt: string;
};

export type StatsQueryResult = {
  data: StatsData;
  isLoading: boolean;
  isFetching: boolean;
  errorMessage: string | null;
  refetch: () => Promise<unknown>;
};

export type {
  ProStatsResponse,
  ProStatsSummary,
  ProStatsTrendPoint,
  ProStatsServicePerformance,
  ProStatsRetentionBucket,
  ProStatsInsight,
};
