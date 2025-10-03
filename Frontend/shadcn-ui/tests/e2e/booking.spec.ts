import { test, expect, type Page } from '@playwright/test';

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

const mockBookingApis = async (page: Page) => {
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
};

/**
 * Flujo completo de reserva comprobando que no aparecen errores en la consola del navegador.
 */
test('cliente puede reservar una cita completa', async ({ page }) => {
  await mockBookingApis(page);
  const pageErrors: Error[] = [];
  page.on('pageerror', (err) => pageErrors.push(err));

  const reservationId = 'res-playwright-1';
  await page.route('**/reservations', async (route) => {
    const body = route.request().postDataJSON();
    expect(body).toMatchObject({
      service_id: 'corte',
      professional_id: 'ana',
      start: SLOT_ISO,
    });
    expect(route.request().headerValue('x-api-key')).toBeTruthy();
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
  await page.getByRole('button', { name: /corte de pelo/i }).click();
  await expect(page).toHaveURL(/\/book\/date/);
  await expect(page.getByRole('heading', { level: 1, name: 'Selecciona fecha y hora' })).toBeVisible();
  await expect(page.getByText('Día disponible')).toBeVisible();
  await expect(page.getByText('Hoy')).toBeVisible();
  await expect(page.getByText('Seleccionado')).toBeVisible();
  await expect(page.getByText('Elige un día y después un horario disponible.')).toBeVisible();

  const dayCell = page.getByRole('gridcell', { name: new RegExp(`^${DAY_LABEL}$`) });
  await dayCell.waitFor({ state: 'visible' });
  await dayCell.click();
  const slotsGrid = page.getByTestId('slots-grid');
  await expect(slotsGrid).toBeVisible();
  const layoutInfo = await slotsGrid.evaluate((el) => {
    const element = el as HTMLElement;
    const style = getComputedStyle(element);
    const widths = Array.from(element.children).map((child) => (child as HTMLElement).offsetWidth);
    return {
      template: style.gridTemplateColumns,
      hasAutoFitClass: element.classList.contains('grid-cols-[repeat(auto-fit,minmax(110px,1fr))]'),
      justifyCenter: element.classList.contains('justify-center'),
      justifyItemsCenter: element.classList.contains('justify-items-center'),
      overflowY: style.overflowY,
      isScrollable: element.scrollHeight - element.clientHeight > 2,
      minWidth: widths.length ? Math.min(...widths) : 0,
      maxWidth: widths.length ? Math.max(...widths) : 0,
    };
  });
  expect(layoutInfo.hasAutoFitClass).toBeTruthy();
  expect(layoutInfo.justifyCenter).toBeTruthy();
  expect(layoutInfo.justifyItemsCenter).toBeTruthy();
  expect(layoutInfo.overflowY).not.toBe('scroll');
  expect(layoutInfo.isScrollable).toBeFalsy();
  expect(layoutInfo.maxWidth - layoutInfo.minWidth).toBeLessThanOrEqual(2);
  await page.getByRole('button', { name: SLOT_LABEL }).click();
  await expect(page.locator('text=/Has elegido/')).toHaveCount(0);
  await page.getByRole('button', { name: 'Continuar' }).click();

  await expect(page).toHaveURL(/\/book\/confirm/);
  await page.getByLabel('Nombre completo').fill('Cliente Playwright');
  await page.getByLabel('Teléfono').fill('+34 600 000 000');
  await page.getByLabel('Notas para la barbería').fill('Test automatizado');
  await page.getByRole('button', { name: 'Confirmar reserva' }).click();

  await expect(page.getByText('¡Reserva creada!')).toBeVisible();
  const idLine = page.locator('[data-testid="reservation-id"]');
  await expect(idLine).toContainText(reservationId);
  expect(pageErrors).toEqual([]);
});

/**
 * Verifica que la ventana modal se puede cerrar haciendo clic fuera.
 */
test('la ventana de reserva se cierra al pulsar fuera', async ({ page }) => {
  await mockBookingApis(page);

  await page.goto('/');
  await page.getByRole('button', { name: /reservar ahora/i }).first().click();

  await expect(page).toHaveURL(/\/book\/date/);

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  const overlay = page.locator('[data-testid="booking-overlay"]');
  await expect(overlay).toBeVisible();
  await page.evaluate(() => {
    const overlayEl = document.querySelector('[data-testid="booking-overlay"]');
    if (!overlayEl) return;
    const pointerDown = new PointerEvent('pointerdown', { bubbles: true });
    overlayEl.dispatchEvent(pointerDown);
    const pointerUp = new PointerEvent('pointerup', { bubbles: true });
    overlayEl.dispatchEvent(pointerUp);
    const click = new MouseEvent('click', { bubbles: true });
    overlayEl.dispatchEvent(click);
  });

  await expect(dialog).toBeHidden();
  await expect(page).toHaveURL('/');
});
