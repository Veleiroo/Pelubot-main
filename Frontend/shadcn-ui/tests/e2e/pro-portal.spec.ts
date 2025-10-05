import { test, expect } from '@playwright/test';

const stylistPayload = {
  id: 'deinis',
  name: 'Deinis',
  display_name: 'Deinis',
  email: 'deinis@example.com',
  services: ['corte', 'barba'],
};

const sessionResponse = {
  stylist: stylistPayload,
  session_expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

test.describe('Portal profesionales', () => {
  test('profesional puede iniciar sesión y ver el panel', async ({ page }) => {
    let hasSession = false;
    await page.route('**/pros/me', async (route) => {
      const method = route.request().method();
      if (method !== 'GET') {
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
        return;
      }
      if (hasSession) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(sessionResponse),
        });
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'No active session' }),
      });
    });
    await page.route('**/pros/login', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: '',
        });
        return;
      }
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const payload = route.request().postDataJSON();
  expect(payload).toMatchObject({ identifier: 'deinis', password: '1234' });

      hasSession = true;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'set-cookie': 'session_token=test-token; Path=/; HttpOnly',
        },
        body: JSON.stringify(sessionResponse),
      });
    });

  await page.goto('/pros/login');
  await expect(page.getByRole('heading', { name: /Accede al portal profesional/i })).toBeVisible();

  await page.getByLabel('Usuario o email').fill('deinis');
  await page.getByLabel('Contraseña').fill('1234');

    await Promise.all([
      page.waitForURL(/\/pros$/),
      page.getByRole('button', { name: /Iniciar sesión/i }).click(),
    ]);

  await expect(page.getByRole('heading', { level: 1, name: /Hola, Deinis/i })).toBeVisible();
  });

  test('muestra error cuando las credenciales son inválidas', async ({ page }) => {
    page.on('console', (message) => {
      console.log('browser:', message.text());
    });
    await page.route('**/pros/me', async (route) => {
      const method = route.request().method();
      if (method !== 'GET') {
        await route.fulfill({ status: 204, contentType: 'application/json', body: '' });
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'No active session' }),
      });
    });
  await page.route('**/pros/login', async (route) => {
      if (route.request().method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          contentType: 'application/json',
          body: '',
        });
        return;
      }
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'Credenciales inválidas' }),
      });
    });

  await page.goto('/pros/login');
  await expect(page.getByRole('heading', { name: /Accede al portal profesional/i })).toBeVisible();

  await page.getByLabel('Usuario o email').fill('deinis');
  await page.getByLabel('Contraseña').fill('wrongpass');

    await page.getByRole('button', { name: /Iniciar sesión/i }).click();

    const form = page.locator('form');
    await expect(form.getByText('Revisa tus datos.')).toBeVisible();
    await expect(form.getByText('Credenciales inválidas')).toBeVisible();
    await expect(page).toHaveURL(/\/pros\/login$/);
  });
});
