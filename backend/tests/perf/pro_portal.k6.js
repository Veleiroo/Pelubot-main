import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8776';
const MODE = (__ENV.MODE || 'baseline').toLowerCase();
const LOGIN_IDENTIFIER = __ENV.PRO_IDENTIFIER || 'deinis';
const LOGIN_PASSWORD = __ENV.PRO_PASSWORD || '1234';
const SESSION_COOKIE = 'pro_session';

const FULL_DAY_SLOTS = [
  [10, 0],
  [10, 30],
  [11, 0],
  [11, 30],
  [12, 0],
  [12, 30],
  [13, 0],
  [13, 30],
  [16, 0],
  [16, 30],
  [17, 0],
  [17, 30],
  [18, 0],
  [18, 30],
  [19, 0],
  [19, 30],
];

const SATURDAY_SLOTS = FULL_DAY_SLOTS.slice(0, 8);

const WEEKLY_TEMPLATE = [
  FULL_DAY_SLOTS,
  FULL_DAY_SLOTS,
  FULL_DAY_SLOTS,
  FULL_DAY_SLOTS,
  FULL_DAY_SLOTS,
  SATURDAY_SLOTS,
  [],
];

const SLOTS_PER_WEEK = WEEKLY_TEMPLATE.reduce((acc, day) => acc + day.length, 0);
const MAX_SLOT_DAYS = parseInt(__ENV.GCAL_SLOT_MAX_DAYS || '150', 10);
const START_BASE = (() => {
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  while (base.getDay() !== 1) {
    base.setDate(base.getDate() + 1);
  }
  base.setDate(base.getDate() + 28); // empujar a ~1 mes vista para evitar datos existentes
  return base;
})();

const overviewLatency = new Trend('overview_latency', true);
const reservationsLatency = new Trend('reservations_latency', true);
const createLatency = new Trend('reservation_create_latency', true);
const rescheduleLatency = new Trend('reservation_reschedule_latency', true);
const markLatency = new Trend('reservation_mark_latency', true);
const cancelLatency = new Trend('reservation_cancel_latency', true);
const deleteLatency = new Trend('reservation_delete_latency', true);
const failures = new Counter('perf_failures');
const createdCounter = new Counter('reservations_created_total');

const SCENARIOS = {
  baseline: {
    vus: 1,
    iterations: 1,
  },
  read: {
    stages: [
      { duration: '15s', target: 1 },
      { duration: '1m', target: 5 },
      { duration: '30s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.02'],
      http_req_duration: ['p(95)<400'],
    },
  },
  write: {
    stages: [
      { duration: '20s', target: 1 },
      { duration: '1m', target: 3 },
      { duration: '40s', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.05'],
      reservation_create_latency: ['p(95)<600'],
    },
  },
  mixed: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '30s', target: 5 },
      { duration: '1m30s', target: 15 },
      { duration: '1m', target: 0 },
    ],
    thresholds: {
      http_req_failed: ['rate<0.05'],
      http_req_duration: ['p(95)<600', 'p(99)<1200'],
    },
  },
};

export const options = SCENARIOS[MODE] || SCENARIOS.baseline;

function authHeaders(cookieValue) {
  return {
    headers: {
      Cookie: `${SESSION_COOKIE}=${cookieValue}`,
      'Content-Type': 'application/json',
    },
  };
}

function apiHeaders(cookieValue) {
  return {
    headers: {
      Cookie: `${SESSION_COOKIE}=${cookieValue}`,
    },
  };
}

function allocateSlot() {
  const iter = typeof __ITER === 'undefined' ? 0 : __ITER;
  const vus = typeof __VU === 'undefined' ? 1 : __VU;
  const globalIndex = iter * 64 + (vus - 1);
  return slotForIndex(globalIndex);
}

function slotForIndex(globalIndex) {
  let index = globalIndex % SLOTS_PER_WEEK;
  const weekOffset = Math.floor(globalIndex / SLOTS_PER_WEEK);
  let weekday = 0;
  while (weekday < WEEKLY_TEMPLATE.length) {
    const slots = WEEKLY_TEMPLATE[weekday];
    if (index < slots.length) {
      const [hour, minute] = slots[index];
      const date = new Date(START_BASE.getTime());
      let totalDays = weekOffset * 7 + weekday;
      let cycles = 0;
      if (totalDays > MAX_SLOT_DAYS) {
        cycles = Math.floor(totalDays / MAX_SLOT_DAYS);
        totalDays = totalDays % MAX_SLOT_DAYS;
      }
      date.setDate(date.getDate() + totalDays);
      date.setHours(hour, minute, 0, 0);
      if (cycles > 0) {
        date.setMinutes(date.getMinutes() + cycles);
      }
      return { iso: date.toISOString(), globalIndex, weekday, slotIndex: index };
    }
    index -= slots.length;
    weekday += 1;
  }
  // En caso de caer en domingo (sin slots), avanzamos una semana completa
  return slotForIndex(globalIndex + SLOTS_PER_WEEK);
}

function track(res, metric) {
  metric.add(res.timings.duration);
  const label = res.request
    ? `${res.request.method} ${res.request.url}`
    : `req ${res.status}`;
  const ok = check(res, {
    [`${label} status`]: (r) => r.status >= 200 && r.status < 400,
  });
  if (!ok) {
    failures.add(1);
  }
}

function performRead(cookieValue) {
  const resOverview = http.get(`${BASE_URL}/pros/overview`, apiHeaders(cookieValue));
  track(resOverview, overviewLatency);

  const resReservations = http.get(`${BASE_URL}/pros/reservations?days_ahead=7`, apiHeaders(cookieValue));
  track(resReservations, reservationsLatency);
}

function performWrite(cookieValue, stylistId) {
  const slot = allocateSlot();
  const startISO = slot.iso;
  const payload = {
    service_id: 'corte_cabello',
    professional_id: stylistId,
    start: startISO,
    customer_name: `Perf User ${__VU}-${__ITER}`,
    customer_phone: `+3411${Math.floor(10000000 + Math.random() * 89999999)}`,
    customer_email: `perf${__VU}${__ITER}@example.com`,
    notes: 'Carga automatizada',
  };

  const createRes = http.post(
    `${BASE_URL}/pros/reservations`,
    JSON.stringify(payload),
    authHeaders(cookieValue),
  );
  track(createRes, createLatency);
  check(createRes, {
    'create returns id': (r) => r.status === 200 && r.json().reservation_id,
  }) || failures.add(1);

  if (createRes.status >= 300) {
    return;
  }

  createdCounter.add(1);

  const reservationId = createRes.json().reservation_id;
  const updatedSlot = slotForIndex(slot.globalIndex + SLOTS_PER_WEEK);

  const rescheduleRes = http.post(
    `${BASE_URL}/pros/reservations/${reservationId}/reschedule`,
    JSON.stringify({ new_start: updatedSlot.iso }),
    authHeaders(cookieValue),
  );
  track(rescheduleRes, rescheduleLatency);

  const markRes = http.post(
    `${BASE_URL}/pros/reservations/${reservationId}/mark-attended`,
    null,
    apiHeaders(cookieValue),
  );
  track(markRes, markLatency);

  const cancelRes = http.post(
    `${BASE_URL}/pros/reservations/${reservationId}/cancel`,
    null,
    apiHeaders(cookieValue),
  );
  track(cancelRes, cancelLatency);

  const deleteRes = http.del(
    `${BASE_URL}/pros/reservations/${reservationId}`,
    null,
    apiHeaders(cookieValue),
  );
  track(deleteRes, deleteLatency);
}

export function setup() {
  const loginRes = http.post(
    `${BASE_URL}/pros/login`,
    JSON.stringify({ identifier: LOGIN_IDENTIFIER, password: LOGIN_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' } },
  );

  const ok = check(loginRes, {
    'login 200': (r) => r.status === 200,
    'session cookie presente': (r) => r.cookies && r.cookies[SESSION_COOKIE],
  });

  if (!ok) {
    throw new Error(`Login falló: ${loginRes.status} → ${loginRes.body}`);
  }

  const cookieValue = loginRes.cookies[SESSION_COOKIE][0].value;
  const stylistId = loginRes.json().stylist.id;
  return { cookie: cookieValue, stylistId };
}

export default function (data) {
  if (!data || !data.cookie) {
    throw new Error('No session data received in default function');
  }

  if (MODE === 'baseline') {
    performRead(data.cookie);
  } else if (MODE === 'read') {
    performRead(data.cookie);
  } else if (MODE === 'write') {
    performWrite(data.cookie, data.stylistId);
  } else if (MODE === 'mixed') {
    performRead(data.cookie);
    sleep(0.3);
    performWrite(data.cookie, data.stylistId);
  } else {
    performRead(data.cookie);
  }

  sleep(0.5 + Math.random() * 0.5);
}
