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

test.describe('Portal profesionales (backend real)', () => {
  test('permite iniciar sesión, mostrar overview y volver a entrar tras logout', async ({ page }) => {
    await page.goto('/pros/login');

    await expect(page.getByRole('heading', { name: /Inicia sesión/i })).toBeVisible();

    const loginAndWaitForOverview = async () => {
      await page.getByLabel('Usuario o email').fill('deinis');
      await page.getByLabel('Contraseña').fill('1234');

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

    const overview = await loginAndWaitForOverview();

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

    const overviewAfterRelogin = await loginAndWaitForOverview();
    await expect(page.locator('text=Resumen del día')).toBeVisible();
    await expect(page.locator(`text=${overviewAfterRelogin.summary.total}`).first()).toBeVisible();
  });
});
