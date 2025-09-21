// Base de API robusto: si la env está vacía (""), usa fallback
const _rawBase = String(import.meta.env?.VITE_API_BASE_URL ?? '').trim();
const BASE = _rawBase || "http://127.0.0.1:8776";
const DEBUG = /^(1|true|yes|y)$/i.test(String(import.meta.env.VITE_ENABLE_DEBUG ?? "0"));

export type Service = { id: string; name: string; duration_min: number; price_eur: number };
export type Professional = { id: string; name: string; services?: string[] };

type SlotsOut = { service_id: string; date: string; professional_id?: string | null; slots: string[] };
type ActionResult = { ok: boolean; message: string };
type ReservationCreateOut = ActionResult & { reservation_id: string; google_event_id?: string | null };
type DaysAvailabilityOut = { service_id: string; start: string; end: string; professional_id?: string | null; available_days: string[] };

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
  const url = `${BASE}${path}`;
  const started = performance.now();

  if (DEBUG) {
    console.debug('HTTP', init?.method || 'GET', url, init?.body ? JSON.parse(String(init.body)) : undefined);
  }

  // Timeout de seguridad de 12s
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12_000);

  try {
    const res = await fetch(url, { headers, signal: ctrl.signal, ...init });
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

      if (DEBUG) console.warn('HTTP ERR', res.status, url, `${ms}ms`, { detail, rid, text: text.slice(0, 200) });
      throw new ApiError(message, { status: res.status, detail: detail ? String(detail) : undefined, requestId: rid, rawBody: text || undefined });
    }

    const data = (await res.json()) as T;
    if (DEBUG) console.debug('HTTP OK', 200, url, `${ms}ms`, data);
    return data;
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
  createReservation: (payload: { service_id: string; professional_id: string; start: string }) =>
    http<ReservationCreateOut>("/reservations", { method: "POST", body: JSON.stringify(payload) }),

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
};
