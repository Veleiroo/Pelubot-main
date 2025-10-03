const BASE_SERVICES = [
  { id: 'corte_cabello', name: 'Corte de cabello clásico', duration_min: 30, price_eur: 15 },
  { id: 'arreglo_barba', name: 'Arreglo de barba premium', duration_min: 25, price_eur: 12 },
  { id: 'corte_jubilado', name: 'Corte Jubilado', duration_min: 35, price_eur: 13 },
];

const BASE_PROFESSIONALS = [
  { id: 'ana', name: 'Ana Fernández' },
  { id: 'luis', name: 'Luis Ortega' },
  { id: 'marcos', name: 'Marcos Vidal' },
];

const toYmd = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
const today = new Date();
const baseDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 2);
const availableDay = toYmd(baseDate);
const slotIso = `${availableDay}T10:00:00+02:00`;

export class MockHttpError extends Error {
  status: number;
  detail?: string;

  constructor(status: number, message: string, detail?: string) {
    super(message);
    this.name = 'MockHttpError';
    this.status = status;
    this.detail = detail;
  }
}

const MOCK_STYLIST = {
  id: 'marina',
  name: 'Marina García',
  display_name: 'Marina',
  services: ['corte_cabello', 'arreglo_barba'],
  email: 'marina@example.com',
  phone: '+34 600 123 456',
  calendar_id: null,
  use_gcal_busy: false,
};

const makeSessionPayload = () => ({
  stylist: MOCK_STYLIST,
  session_expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
});

let hasProsSession = false;

const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj)) as T;
const findProfessionalForService = (serviceId?: string) => {
  void serviceId; // los mocks no restringen por servicio
  return BASE_PROFESSIONALS[0];
};

export function mockHttp(path: string, init?: RequestInit) {
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = init?.body ? tryParseBody(init.body) : undefined;

  switch (path) {
    case '/services':
      if (method === 'GET') return clone(BASE_SERVICES);
      break;
    case '/professionals':
      if (method === 'GET') return clone(BASE_PROFESSIONALS);
      break;
    case '/slots/days':
      if (method === 'POST')
        return {
          service_id: pickString(body, 'service_id') ?? BASE_SERVICES[0].id,
          start: pickString(body, 'start') ?? availableDay,
          end: pickString(body, 'end') ?? availableDay,
          professional_id: pickString(body, 'professional_id') ?? findProfessionalForService(pickString(body, 'service_id'))?.id ?? null,
          available_days: [availableDay],
        };
      break;
    case '/slots':
      if (method === 'POST') {
        const serviceId = pickString(body, 'service_id') ?? BASE_SERVICES[0].id;
        return {
          service_id: serviceId,
          date: pickString(body, 'date_str') ?? availableDay,
          professional_id: pickString(body, 'professional_id') ?? findProfessionalForService(serviceId).id,
          slots: [slotIso],
        };
      }
      break;
    case '/reservations':
      if (method === 'POST') {
        const reservationId = `mock-${Date.now()}`;
        return {
          ok: true,
          message: `Reserva creada en modo mock. ID: ${reservationId}`,
          reservation_id: reservationId,
          google_event_id: null,
        };
      }
      break;
    case '/pros/me':
      if (method === 'GET') {
        if (!hasProsSession) {
          throw new MockHttpError(401, 'No active session', 'No active session (mock)');
        }
        return makeSessionPayload();
      }
      break;
    case '/pros/login':
      if (method === 'POST') {
        hasProsSession = true;
        return makeSessionPayload();
      }
      break;
    case '/pros/logout':
      if (method === 'POST') {
        hasProsSession = false;
        return { ok: true, message: 'Sesión cerrada (mock)' };
      }
      break;
    default:
      break;
  }

  return undefined;
}

type MockBody = Record<string, unknown> | undefined;

function tryParseBody(body: BodyInit): MockBody {
  if (typeof body === 'string') {
    try {
      return JSON.parse(body) as Record<string, unknown>;
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function pickString(body: MockBody, key: string): string | undefined {
  if (body && typeof body[key] === 'string') {
    return String(body[key]);
  }
  return undefined;
}
