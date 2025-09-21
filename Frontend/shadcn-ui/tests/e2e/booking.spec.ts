import { test, expect } from '@playwright/test';

const today = new Date();
const futureDay = new Date(today.getFullYear(), today.getMonth(), Math.min(today.getDate() + 2, 28));
const toYmd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const BASE_DAY = toYmd(futureDay);
const SLOT_ISO = `${BASE_DAY}T10:00:00+02:00`;
const SLOT_LABEL = '10:00';
const DAY_LABEL = String(futureDay.getDate());
const MONTH_START = toYmd(new Date(futureDay.getFullYear(), futureDay.getMonth(), 1));
const MONTH_END = toYmd(new Date(futureDay.getFullYear(), futureDay.getMonth() + 1, 0));

const servicesPayload = [
  { id: 'corte', name: 'Corte de pelo', duration_min: 30, price_eur: 15 },
  { id: 'barba', name: 'Arreglo de barba', duration_min: 20, price_eur: 10 },
];

const professionalsPayload = [
  { id: 'ana', name: 'Ana', services: ['corte', 'tinte'] },
  { id: 'luis', name: 'Luis', services: ['corte', 'barba'] },
];

test('cliente puede reservar una cita completa', async ({ page }) => {
  page.on('console', (msg) => console.log('[console]', msg.text()));
  page.on('pageerror', (err) => console.error('[pageerror]', err));
  // Mock API responses
  await page.route('**/services', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(servicesPayload),
    });
  });

  await page.route('**/professionals', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(professionalsPayload),
    });
  });

  await page.route('**/slots/days', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        service_id: 'corte',
        start: MONTH_START,
        end: MONTH_END,
        available_days: [BASE_DAY],
      }),
    });
  });

  await page.route('**/slots', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        service_id: 'corte',
        date: BASE_DAY,
        professional_id: 'ana',
        slots: [SLOT_ISO],
      }),
    });
  });

  const reservationId = 'res-playwright-1';
  await page.route('**/reservations', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      service_id: 'corte',
      professional_id: 'ana',
      start: SLOT_ISO,
    });
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        ok: true,
        message: `Reserva creada exitosamente. ID: ${reservationId} (sin sincronización con Google Calendar)`,
        reservation_id: reservationId,
        google_event_id: null,
      }),
    });
  });

  await page.goto('/book/service');
  await page.waitForLoadState('networkidle');
  await expect(page.getByText('Selecciona un servicio')).toBeVisible();

  await page.getByRole('button', { name: 'Seleccionar', exact: false }).first().click();
  await expect(page).toHaveURL(/\/book\/date/);
  const dayCell = page.getByRole('gridcell', { name: new RegExp(`^${DAY_LABEL}$`) });
  await dayCell.waitFor({ state: 'attached' });
  await dayCell.click();
  await page.getByRole('button', { name: SLOT_LABEL }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page).toHaveURL(/\/book\/confirm/);
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(page.getByText('¡Reserva creada!')).toBeVisible();
  const idLine = page.locator('[data-testid="reservation-id"]');
  await expect(idLine).toContainText(reservationId);
});
