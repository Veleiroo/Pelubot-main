const { test, expect } = require('@playwright/test');

const formatHour = (isoString) => {
  const dt = new Date(isoString);
  if (Number.isNaN(dt.getTime())) return null;
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(dt);
};

const loginAndWaitForOverview = async (page) => {
  await expect(page.getByRole('heading', { name: /Inicia sesión/i })).toBeVisible();

  const overviewResponsePromise = page.waitForResponse(
    (response) => response.url().includes('/api/pros/overview') && response.request().method() === 'GET'
  );

  await Promise.all([
    page.waitForURL(/\/pros(?:\/?$)/),
    page.getByRole('button', { name: /Iniciar sesión/i }).click(),
  ]);

  const overviewResponse = await overviewResponsePromise;
  await expect(overviewResponse.ok()).toBeTruthy();
  return overviewResponse.json();
};

test.describe('Portal profesionales (backend real)', () => {
  test('permite iniciar sesión, mostrar overview y volver a entrar tras logout', async ({ page }) => {
    await page.goto('/pros/login');
    await page.getByLabel('Usuario o email').fill('deinis');
    await page.getByLabel('Contraseña').fill('1234');

    const overview = await loginAndWaitForOverview(page);

    await expect(page.locator('text=Resumen del día')).toBeVisible();
    await expect(page.locator('text=Citas de hoy')).toBeVisible();
    await expect(page.locator('text=Total de citas')).toBeVisible();
    await expect(page.locator(`text=${overview.summary.total}`).first()).toBeVisible();

    if (overview.summary.total > 0 && overview.appointments.length > 0) {
      const first = overview.appointments[0];
      const timeLabel = formatHour(first.start);
      if (timeLabel) {
        await expect(page.locator(`text=${timeLabel} h`).first()).toBeVisible();
      }
      if (first.client_name) {
        await expect(page.locator(`text=${first.client_name}`).first()).toBeVisible();
      }
      if (first.service_name) {
        await expect(page.locator(`text=${first.service_name}`).first()).toBeVisible();
      }
    }

    await page.getByRole('button', { name: /Salir/i }).click();
    await expect(page.getByRole('heading', { name: /Inicia sesión/i })).toBeVisible({ timeout: 10_000 });

    await page.getByLabel('Usuario o email').fill('deinis');
    await page.getByLabel('Contraseña').fill('1234');

    const overviewAfterRelogin = await loginAndWaitForOverview(page);
    await expect(page.locator('text=Resumen del día')).toBeVisible();
    await expect(page.locator(`text=${overviewAfterRelogin.summary.total}`).first()).toBeVisible();
  });

  test('permite crear y cancelar una cita desde la agenda', async ({ page }) => {
    await page.goto('/pros/login');
    await page.getByLabel('Usuario o email').fill('deinis');
    await page.getByLabel('Contraseña').fill('1234');

    await loginAndWaitForOverview(page);

    await page.getByRole('link', { name: 'Agenda' }).click();

    await page.waitForResponse(
      (response) => response.url().includes('/api/pros/reservations') && response.request().method() === 'GET'
    );

    await page.getByRole('button', { name: 'Crear cita' }).first().click();

    const dialog = page.getByRole('dialog', { name: 'Crear cita' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox', { name: 'Servicio' }).click();
    await page.getByRole('option').first().click();

    await dialog.getByRole('combobox', { name: 'Hora de inicio' }).click();
    await page.getByRole('option', { name: '22:00 h' }).click();

    const clientName = `E2E ${Date.now()}`;
    await dialog.getByLabel('Nombre de la persona').fill(clientName);
    await dialog.getByLabel('Teléfono de contacto').fill('600000001');
    await dialog.getByLabel('Notas internas').fill('Cita creada desde test E2E');

    const createResponsePromise = page.waitForResponse(
      (response) => response.url().includes('/api/pros/reservations') && response.request().method() === 'POST'
    );

    await dialog.getByRole('button', { name: 'Guardar cita' }).click();

    const createResponse = await createResponsePromise;
    await expect(createResponse.ok()).toBeTruthy();
    const createPayload = await createResponse.json();
    expect(createPayload?.reservation_id).toBeTruthy();

    await expect(page.getByText('Cita creada')).toBeVisible();

    const appointmentHeading = page.getByRole('heading', { name: clientName });
    await expect(appointmentHeading).toBeVisible({ timeout: 10_000 });

    const cancelResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/api/pros/reservations/${createPayload.reservation_id}/cancel`) &&
        response.request().method() === 'POST'
    );

    const appointmentCard = appointmentHeading.locator('xpath=ancestor::div[contains(@class,"border")]').first();
    await appointmentCard.getByRole('button', { name: 'Cancelar' }).first().click();

    const cancelResponse = await cancelResponsePromise;
    await expect(cancelResponse.ok()).toBeTruthy();
    await expect(page.getByText('Cita cancelada')).toBeVisible();
  });
});
