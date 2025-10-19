import { mockHttp, MockHttpError } from './mock-api';

// Base de API: prioriza VITE_API_BASE_URL y, si falta, recurre al mismo origen.
const BASE = (() => {
  const raw = String(import.meta.env?.VITE_API_BASE_URL ?? '').trim();
  if (raw) return raw.replace(/\/$/, '');

  const path = String(import.meta.env?.VITE_API_BASE_PATH ?? '').trim();
  const normalizedPath = path ? (path.startsWith('/') ? path : `/${path}`) : '';

  if (typeof window !== 'undefined') {
    const origin = window.location.origin.replace(/\/$/, '');
    if (!normalizedPath) {
      if (import.meta.env.PROD) {
        console.warn('VITE_API_BASE_URL no definido; usando origen actual');
      }
      return '';
    }
    return `${origin}${normalizedPath}`.replace(/\/$/, '');
  }

  return normalizedPath || '';
})();
const DEBUG = /^(1|true|yes|y)$/i.test(String(import.meta.env.VITE_ENABLE_DEBUG ?? "0"));
const MOCK_MODE_RAW = String(import.meta.env?.VITE_USE_MOCKS ?? 'auto').trim().toLowerCase();
const MOCK_MODE = (() => {
  if (['0', 'false', 'off', 'no', 'n'].includes(MOCK_MODE_RAW)) return 'off';
  if (['force', 'always', 'mock'].includes(MOCK_MODE_RAW)) return 'force';
  return 'auto';
})();
const IS_DEV_RUNTIME = import.meta.env.DEV;
const MOCK_FORCE = MOCK_MODE === 'force';
const USE_MOCKS = MOCK_FORCE || (IS_DEV_RUNTIME && MOCK_MODE !== 'off');
const API_KEY = String(import.meta.env?.VITE_API_KEY ?? '').trim();

export type Service = { id: string; name: string; duration_min: number; price_eur: number };
export type Professional = { id: string; name: string; services?: string[] };
export type ReservationStatus = 'confirmada' | 'asistida' | 'no_asistida' | 'cancelada';
export type ProAppointmentStatus = 'confirmada' | 'asistida' | 'no_asistida' | 'cancelada';
export type ProOverviewAppointment = {
  id: string;
  start: string;
  end?: string | null;
  service_id?: string | null;
  service_name?: string | null;
  status: ProAppointmentStatus;
  client_name?: string | null;
  client_email?: string | null;
  client_phone?: string | null;
  last_visit?: string | null;
  notes?: string | null;
};
export type ProOverviewSummary = {
  total: number;
  confirmadas: number;
  asistidas: number;
  no_asistidas: number;
  canceladas: number;
};
export type ProOverview = {
  date: string;
  timezone: string;
  summary: ProOverviewSummary;
  upcoming?: ProOverviewAppointment | null;
  appointments: ProOverviewAppointment[];
};

export type ProReservation = {
  id: string;
  service_id: string;
  service_name?: string | null;
  professional_id: string;
  start: string;
  end: string;
  status: ReservationStatus;
  customer_name?: string | null;
  customer_email?: string | null;
  customer_phone?: string | null;
  notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type ProReservationsResponse = {
  reservations: ProReservation[];
};

export type ProsReschedulePayload = {
  new_date?: string;
  new_time?: string;
  new_start?: string;
};

export type ProsRescheduleResponse = ActionResult & {
  reservation_id?: string;
  start?: string | null;
  end?: string | null;
};

export type ProClientStatus = 'activo' | 'nuevo' | 'riesgo' | 'inactivo';

export type ProClientUpcoming = {
  appointment_id: string;
  start: string;
  service_name?: string | null;
};

export type ProClient = {
  id: string;
  full_name: string;
  first_visit?: string | null;
  last_visit?: string | null;
  upcoming_visit?: ProClientUpcoming | null;
  total_visits: number;
  total_spent_eur: number;
  phone?: string | null;
  email?: string | null;
  favorite_services?: string[];
  tags?: string[];
  notes?: string | null;
  status: ProClientStatus;
  loyalty_score?: number | null;
};

export type ProClientsSummary = {
  total: number;
  nuevos: number;
  recurrentes: number;
  riesgo: number;
  inactivos: number;
};

export type ProClientsSegment = {
  id: string;
  label: string;
  count: number;
  trend: 'up' | 'down' | 'steady';
  description?: string;
};

export type ProClientsResponse = {
  summary: ProClientsSummary;
  segments: ProClientsSegment[];
  clients: ProClient[];
};

export type ProStatsSummary = {
  total_revenue_eur: number;
  revenue_change_pct: number;
  avg_ticket_eur: number;
  avg_ticket_change_pct: number;
  repeat_rate_pct: number;
  repeat_rate_change_pct: number;
  new_clients: number;
  new_clients_change_pct: number;
};

export type ProStatsTrendPoint = {
  period: string;
  label: string;
  revenue_eur: number;
  appointments: number;
};

export type ProStatsServicePerformance = {
  service_id: string;
  service_name: string;
  total_appointments: number;
  total_revenue_eur: number;
  growth_pct: number;
};

export type ProStatsRetentionBucket = {
  id: string;
  label: string;
  count: number;
  share_pct: number;
  trend: 'up' | 'down' | 'steady';
  description?: string;
};

export type ProStatsInsight = {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
};

export type ProStatsResponse = {
  generated_at: string;
  summary: ProStatsSummary;
  revenue_series: ProStatsTrendPoint[];
  top_services: ProStatsServicePerformance[];
  retention: ProStatsRetentionBucket[];
  insights: ProStatsInsight[];
};

type SlotsOut = { service_id: string; date: string; professional_id?: string | null; slots: string[] };
type ActionResult = { ok: boolean; message: string };
type ReservationCreateOut = ActionResult & { reservation_id: string; google_event_id?: string | null };
type DaysAvailabilityOut = { service_id: string; start: string; end: string; professional_id?: string | null; available_days: string[] };
export type ReservationCreatePayload = {
  service_id: string;
  professional_id: string;
  start: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  notes?: string;
};

export class ApiError extends Error {
  status: number;
  detail?: string;
  requestId?: string;
  rawBody?: string;

  constructor(message: string, opts: { status: number; detail?: string; requestId?: string; rawBody?: string }) {
    super(message);
    this.name = 'ApiError';
    this.status = opts.status;
    this.detail = opts.detail;
    this.requestId = opts.requestId;
    this.rawBody = opts.rawBody;
  }
}

async function http<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> ?? {}),
  };
  if (API_KEY && !headers['X-API-Key']) {
    headers['X-API-Key'] = API_KEY;
  }
  const url = `${BASE}${path}`;
  const started = performance.now();

  if (DEBUG) {
    console.debug('HTTP', init?.method || 'GET', url, init?.body ? JSON.parse(String(init.body)) : undefined);
  }

  // Timeout de seguridad de 12s
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);

  const attemptFetch = async () => {
    const target = url || path;
    const res = await fetch(target, {
      headers,
      signal: ctrl.signal,
      credentials: init?.credentials ?? 'include',
      ...init,
    });
    const ms = Math.round(performance.now() - started);

    if (!res.ok) {
      let text = '';
      let detail: string | undefined;
      try {
        text = await res.text();
        try {
          const parsed = JSON.parse(text);
          if (parsed && typeof parsed === 'object') {
            detail = parsed.detail ?? parsed.message ?? undefined;
          }
        } catch {
          /* texto plano */
        }
      } catch {
        /* noop */
      }

      const rid = res.headers.get('X-Request-ID') || undefined;
      const fallback = `HTTP ${res.status}${rid ? ` [rid=${rid}]` : ''}`;
      const message = (detail && String(detail)) || (text ? `${fallback}: ${text.slice(0, 200)}` : fallback);

      if (DEBUG) console.warn('HTTP ERR', res.status, target, `${ms}ms`, { detail, rid, text: text.slice(0, 200) });
      throw new ApiError(message, { status: res.status, detail: detail ? String(detail) : undefined, requestId: rid, rawBody: text || undefined });
    }

    const data = (await res.json()) as T;
    if (DEBUG) console.debug('HTTP OK', 200, target, `${ms}ms`, data);
    return data;
  };

  const tryMock = () => {
    try {
      return mockHttp(path, init);
    } catch (error) {
      if (error instanceof MockHttpError) {
        throw new ApiError(error.message, { status: error.status, detail: error.detail });
      }
      throw error;
    }
  };

  const shouldMockFirst = USE_MOCKS && (MOCK_FORCE || !BASE);

  try {
    if (shouldMockFirst) {
      const mock = tryMock();
      if (mock !== undefined) {
        if (DEBUG) console.info('HTTP MOCK (sin BASE)', path, mock);
        return mock as T;
      }
    }

    try {
      const data = await attemptFetch();
      return data;
    } catch (error) {
      if (USE_MOCKS) {
        const mock = tryMock();
        if (mock !== undefined) {
          if (DEBUG) console.info('HTTP MOCK fallback', path, error);
          return mock as T;
        }
      }
      throw error;
    }
  } finally {
    clearTimeout(timer);
  }
}

export const api = {
  // Catálogos.
  getServices: () => http<Service[]>("/services"),
  getProfessionals: () => http<Professional[]>("/professionals"),

  // Slots. El backend espera { service_id, date_str, professional_id? }.
  getSlots: (
    args: { service_id: string; date: string; professional_id?: string | null; use_gcal?: boolean },
    opts?: { signal?: AbortSignal }
  ) =>
    http<SlotsOut>("/slots", {
      method: "POST",
      body: JSON.stringify({
        service_id: args.service_id,
        date_str: args.date,
        professional_id: args.professional_id ?? undefined,
        use_gcal: args.use_gcal ?? undefined,
      }),
      signal: opts?.signal,
    }),

  // Creación de reservas. El backend espera { service_id, professional_id, start }.
  createReservation: (payload: ReservationCreatePayload) =>
    http<ReservationCreateOut>("/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Disponibilidad por días para un rango [start, end].
  getDaysAvailability: (
    args: { service_id: string; start: string; end: string; professional_id?: string | null; use_gcal?: boolean },
    opts?: { signal?: AbortSignal }
  ) =>
    http<DaysAvailabilityOut>("/slots/days", {
      method: "POST",
      body: JSON.stringify({
        service_id: args.service_id,
        start: args.start,
        end: args.end,
        professional_id: args.professional_id ?? undefined,
        use_gcal: args.use_gcal ?? undefined,
      }),
      signal: opts?.signal,
    }),
  prosLogin: (payload: { identifier: string; password: string }) =>
    http<{ stylist: StylistPublic; session_expires_at: string }>("/pros/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  prosLogout: () =>
    http<ActionResult>("/pros/logout", {
      method: "POST",
    }),

  prosMe: () => http<{ stylist: StylistPublic; session_expires_at: string }>("/pros/me"),

  prosOverview: () => http<ProOverview>("/pros/overview"),
  
  prosCreateReservation: (payload: ReservationCreatePayload) =>
    http<ReservationCreateOut>("/pros/reservations", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  
  prosReservations: (params?: { daysAhead?: number; includePastMinutes?: number }) => {
    const search = new URLSearchParams();
    if (typeof params?.daysAhead === 'number') {
      search.set('days_ahead', String(Math.max(1, Math.round(params.daysAhead))));
    }
    if (typeof params?.includePastMinutes === 'number') {
      search.set('include_past_minutes', String(Math.max(0, Math.round(params.includePastMinutes))));
    }
    const qs = search.toString();
    const path = qs ? `/pros/reservations?${qs}` : "/pros/reservations";
    return http<ProReservationsResponse>(path);
  },

  prosCancelReservation: (reservationId: string) =>
    http<ActionResult>(`/pros/reservations/${reservationId}/cancel`, {
      method: "POST",
    }),

  prosRescheduleReservation: (reservationId: string, payload: ProsReschedulePayload) =>
    http<ProsRescheduleResponse>(`/pros/reservations/${reservationId}/reschedule`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  prosMarkAttended: (reservationId: string) =>
    http<ActionResult>(`/pros/reservations/${reservationId}/mark-attended`, {
      method: "POST",
    }),

  prosMarkNoShow: (reservationId: string, reason?: string) =>
    http<ActionResult>(`/pros/reservations/${reservationId}/mark-no-show`, {
      method: "POST",
      body: reason ? JSON.stringify({ reason }) : undefined,
    }),

  prosClients: () => http<ProClientsResponse>("/pros/clients"),

  prosStats: () => http<ProStatsResponse>("/pros/stats"),
};

export type StylistPublic = {
  id: string;
  name: string;
  services: string[];
  display_name?: string | null;
  email?: string | null;
  phone?: string | null;
  calendar_id?: string | null;
  use_gcal_busy?: boolean;
};
