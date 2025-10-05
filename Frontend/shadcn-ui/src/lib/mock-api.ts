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

const clampNumber = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const makeReservationsMock = (options?: { daysAhead?: number; includePastMinutes?: number }) => {
  const now = new Date();
  const normalizedDaysAhead = clampNumber(Math.round(options?.daysAhead ?? 30), 7, 90);
  const normalizedPastMinutes = clampNumber(Math.round(options?.includePastMinutes ?? 60 * 24 * 30), 0, 60 * 24 * 90);
  const pastDays = clampNumber(Math.ceil(normalizedPastMinutes / (60 * 24)), 1, 30);
  const futureDays = normalizedDaysAhead;
  const totalDays = pastDays + futureDays + 1;
  const startDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() - pastDays);

  const reservations = Array.from({ length: totalDays }).flatMap((_, index) => {
    const day = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate() + index);
    const slots = [9, 11, 14, 17].slice(0, (index % 3) + 2);
    return slots.map((hourOffset, slotIdx) => {
      const start = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hourOffset, slotIdx % 2 === 0 ? 0 : 30, 0);
      const end = new Date(start.getTime() + 45 * 60_000);
      const service = BASE_SERVICES[(index + slotIdx) % BASE_SERVICES.length];
      const idSuffix = `${day.getMonth() + 1}-${day.getDate()}-${slotIdx}`;
      return {
        id: `res-${idSuffix}`,
        service_id: service.id,
        service_name: service.name,
        professional_id: MOCK_STYLIST.id,
        start: start.toISOString(),
        end: end.toISOString(),
        customer_name: `Cliente ${index + slotIdx + 1}`,
        customer_phone: '+34 600 000 000',
        notes: slotIdx % 3 === 0 ? 'Confirmar preferencia de estilo.' : undefined,
        created_at: new Date(start.getTime() - 5 * 60_000).toISOString(),
        updated_at: new Date(start.getTime() - 2 * 60_000).toISOString(),
      };
    });
  });

  return { reservations };
};

const makeClientsMock = () => {
  const future = new Date();
  future.setDate(future.getDate() + 5);
  future.setHours(11, 30, 0, 0);

  const clients = [
    {
      id: 'cli-201',
      full_name: 'Laura Pérez',
      first_visit: '2023-06-18',
      last_visit: '2025-09-12',
      upcoming_visit: {
        appointment_id: 'apt-302',
        start: future.toISOString(),
        service_name: 'Coloración completa',
      },
      total_visits: 18,
      total_spent_eur: 845,
      phone: '+34 612 345 678',
      email: 'laura@example.com',
      favorite_services: ['Coloración', 'Tratamiento hidratante'],
      tags: ['VIP', 'Color'],
      status: 'activo' as const,
      loyalty_score: 92,
    },
    {
      id: 'cli-202',
      full_name: 'Marta López',
      first_visit: '2024-01-09',
      last_visit: '2025-08-28',
      total_visits: 6,
      total_spent_eur: 210,
      phone: '+34 698 221 430',
      favorite_services: ['Peinado evento'],
      tags: ['Eventos'],
      status: 'activo' as const,
      loyalty_score: 74,
    },
    {
      id: 'cli-203',
      full_name: 'Andrea Vidal',
      first_visit: '2023-11-14',
      last_visit: '2025-09-01',
      total_visits: 9,
      total_spent_eur: 325,
      favorite_services: ['Tratamiento hidratante'],
      status: 'nuevo' as const,
      loyalty_score: 61,
    },
    {
      id: 'cli-204',
      full_name: 'Sara Núñez',
      first_visit: '2022-04-02',
      last_visit: '2024-12-10',
      total_visits: 3,
      total_spent_eur: 120,
      phone: '+34 677 550 102',
      tags: ['Decoloración'],
      status: 'riesgo' as const,
      loyalty_score: 35,
    },
    {
      id: 'cli-205',
      full_name: 'Daniela Gómez',
      first_visit: '2021-09-23',
      last_visit: '2023-11-18',
      total_visits: 5,
      total_spent_eur: 165,
      status: 'inactivo' as const,
      loyalty_score: 20,
      notes: 'Mudanza reciente, revisar si sigue en la ciudad.',
    },
  ];

  const summary = {
    total: clients.length,
    nuevos: clients.filter((client) => client.status === 'nuevo').length,
    recurrentes: clients.filter((client) => client.status === 'activo').length,
    riesgo: clients.filter((client) => client.status === 'riesgo').length,
    inactivos: clients.filter((client) => client.status === 'inactivo').length,
  };

  const segments = [
    {
      id: 'vip',
      label: 'VIP',
      count: clients.filter((client) => (client.loyalty_score ?? 0) >= 80).length,
      trend: 'up' as const,
      description: 'Ticket medio superior a 60€ y visitas frecuentes.',
    },
    {
      id: 'eventos',
      label: 'Eventos',
      count: clients.filter((client) => client.tags?.includes('Eventos')).length,
      trend: 'steady' as const,
      description: 'Visitan principalmente para peinados y recogidos especiales.',
    },
    {
      id: 'recuperar',
      label: 'Recuperar',
      count: clients.filter((client) => client.status === 'riesgo' || client.status === 'inactivo').length,
      trend: 'down' as const,
      description: 'Más de 90 días sin visita. Acciones de reactivación sugeridas.',
    },
  ];

  return {
    summary,
    segments,
    clients,
  };
};

const makeStatsMock = () => {
  const now = new Date();
  const revenue_series = Array.from({ length: 6 }).map((_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
    const label = date.toLocaleDateString('es-ES', { month: 'short' });
    const period = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const base = 3200 + index * 180;
    const revenue_eur = base + Math.sin(index / 2.5) * 240;
    const appointments = Math.max(10, Math.round(45 + Math.cos(index / 1.6) * 5));
    return { period, label: label.charAt(0).toUpperCase() + label.slice(1), revenue_eur: Math.round(revenue_eur), appointments };
  });

  const summary = {
    total_revenue_eur: revenue_series[5]?.revenue_eur ?? 0,
    revenue_change_pct: 12.5,
    avg_ticket_eur: 68.4,
    avg_ticket_change_pct: 4.2,
    repeat_rate_pct: 62.0,
    repeat_rate_change_pct: 3.5,
    new_clients: 14,
    new_clients_change_pct: -8.4,
  };

  const top_services = [
    {
      service_id: 'corte_cabello',
      service_name: 'Corte de cabello',
      total_appointments: 38,
      total_revenue_eur: 1230,
      growth_pct: 9.8,
    },
    {
      service_id: 'coloracion',
      service_name: 'Coloración completa',
      total_appointments: 21,
      total_revenue_eur: 1520,
      growth_pct: 4.3,
    },
    {
      service_id: 'tratamiento',
      service_name: 'Tratamiento hidratante',
      total_appointments: 17,
      total_revenue_eur: 890,
      growth_pct: -3.1,
    },
  ];

  const retention = [
    {
      id: 'active-30',
      label: 'Activas (<30 días)',
      count: 42,
      share_pct: 54.3,
      trend: 'up' as const,
      description: 'Clientas que visitaron el salón en el último mes.',
    },
    {
      id: 'risk-90',
      label: 'En seguimiento (30-90 días)',
      count: 18,
      share_pct: 23.1,
      trend: 'steady' as const,
      description: 'Recomendada una campaña de recordatorio.',
    },
    {
      id: 'recover-90+',
      label: 'Recuperar (>90 días)',
      count: 17,
      share_pct: 22.6,
      trend: 'down' as const,
      description: 'Contacta con beneficios especiales para su retorno.',
    },
  ];

  const insights = [
    {
      id: 'upsell-color',
      title: 'Activa un pack de coloración para clientas frecuentes',
      description: 'Las reservas de coloración crecieron 4,3% este mes. Ofrece un paquete de mantenimiento para subir el ticket medio.',
      priority: 'medium' as const,
    },
    {
      id: 'recover-vip',
      title: 'Recupera clientas VIP con bono de cortes',
      description: '17 clientas llevan más de 90 días sin visitarte. Un bono con descuento limitado puede acelerar su regreso.',
      priority: 'high' as const,
    },
    {
      id: 'nps-survey',
      title: 'Lanza encuesta NPS post servicio',
      description: 'Con una repetición del 62%, medir satisfacción te ayudará a identificar mejoras rápidas.',
      priority: 'low' as const,
    },
  ];

  return {
    generated_at: new Date().toISOString(),
    summary,
    revenue_series,
    top_services,
    retention,
    insights,
  };
};

const parseNumberParam = (value: string | null | undefined) => {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

export function mockHttp(path: string, init?: RequestInit) {
  const method = (init?.method ?? 'GET').toUpperCase();
  const body = init?.body ? tryParseBody(init.body) : undefined;
  const url = new URL(path, 'https://mock.pelubot');
  const pathname = url.pathname;

  switch (pathname) {
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
    case '/pros/reservations':
      if (method === 'GET') {
        if (!hasProsSession) {
          throw new MockHttpError(401, 'No active session', 'No active session (mock)');
        }
        const daysAhead = parseNumberParam(url.searchParams.get('days_ahead'));
        const includePastMinutes = parseNumberParam(url.searchParams.get('include_past_minutes'));
        return makeReservationsMock({ daysAhead, includePastMinutes });
      }
      break;
    case '/pros/clients':
      if (method === 'GET') {
        if (!hasProsSession) {
          throw new MockHttpError(401, 'No active session', 'No active session (mock)');
        }
        return makeClientsMock();
      }
      break;
    case '/pros/stats':
      if (method === 'GET') {
        if (!hasProsSession) {
          throw new MockHttpError(401, 'No active session', 'No active session (mock)');
        }
        return makeStatsMock();
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
