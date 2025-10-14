import type {
  ProClient,
  ProClientStatus,
  ProClientsSegment,
  ProClientsSummary,
} from '@/lib/api';

export type ClientSummary = ProClientsSummary;

export type ClientSegment = ProClientsSegment & {
  accent?: 'emerald' | 'amber' | 'rose';
};

export type ClientRow = {
  id: string;
  name: string;
  initials: string;
  status: ProClientStatus;
  lastVisitLabel: string;
  lastVisitRelative?: string;
  upcomingLabel?: string;
  totalVisits: number;
  totalSpent: number;
  favoriteServices: string[];
  tags: string[];
  contact?: {
    phone?: string | null;
    email?: string | null;
  };
  loyaltyScore?: number | null;
  notes?: string | null;
  raw: ProClient;
};

export type ClientsData = {
  summary: ClientSummary;
  segments: ClientSegment[];
  clients: ClientRow[];
  isLoading: boolean;
  errorMessage: string | null;
  refetch: () => Promise<unknown>;
};
