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

const makeOverviewMock = () => {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 9, 30, 0);
  const plusMinutes = (minutes: number) => new Date(base.getTime() + minutes * 60_000);

  const appointments = [
    {
      id: 'apt-201',
      start: plusMinutes(0).toISOString(),
      end: plusMinutes(45).toISOString(),
      service_id: 'corte_cabello',
      service_name: 'Corte y peinado',
      status: 'confirmada' as const,
      client_name: 'Laura Pérez',
      client_phone: '+34 612 345 678',
      last_visit: '2025-09-12',
      notes: 'Prefiere acabado con ondas suaves.',
    },
    {
      id: 'apt-202',
      start: plusMinutes(120).toISOString(),
      end: plusMinutes(180).toISOString(),
      service_id: 'coloracion',
      service_name: 'Coloración parcial',
      status: 'pendiente' as const,
      client_name: 'Marta López',
    },
    {
      id: 'apt-203',
      start: plusMinutes(240).toISOString(),
      end: plusMinutes(300).toISOString(),
      service_id: 'tratamiento',
      service_name: 'Tratamiento hidratante',
      status: 'confirmada' as const,
      client_name: 'Andrea Vidal',
    },
    {
      id: 'apt-204',
      start: plusMinutes(360).toISOString(),
      end: plusMinutes(420).toISOString(),
      service_id: 'recogido',
      service_name: 'Recogido evento',
      status: 'cancelada' as const,
      client_name: 'Sara Núñez',
    },
  ];

  const summary = {
    total: appointments.length,
    confirmadas: appointments.filter((a) => a.status === 'confirmada').length,
    pendientes: appointments.filter((a) => a.status === 'pendiente').length,
    canceladas: appointments.filter((a) => a.status === 'cancelada').length,
  };

  const nowMs = now.getTime();
  const upcoming =
    appointments.find((a) => a.status !== 'cancelada' && new Date(a.start).getTime() >= nowMs) ??
    appointments.find((a) => a.status !== 'cancelada') ??
    null;

  return {
    date: toYmd(now),
    timezone: 'Europe/Madrid',
    summary,
    upcoming,
    appointments,
  };
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
    case '/pros/overview':
      if (method === 'GET') {
        if (!hasProsSession) {
          throw new MockHttpError(401, 'No active session', 'No active session (mock)');
        }
        return makeOverviewMock();
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
