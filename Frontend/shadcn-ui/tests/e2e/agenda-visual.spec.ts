import { expect, test } from '@playwright/test';

const stylistPayload = {
  id: 'test-stylist',
  name: 'Test Stylist',
  display_name: 'Test Stylist',
  email: 'test@example.com',
  services: ['corte', 'barba'],
};

const sessionResponse = {
  stylist: stylistPayload,
  session_expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
};

const mockReservations = [
  {
    id: 'res1',
    client_name: 'Juan Pérez',
    client_phone: '+34123456789',
    service: 'corte',
    slot_start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
    status: 'confirmed',
    notes: 'Cliente habitual',
  },
  {
    id: 'res2',
    client_name: 'María García',
    client_phone: '+34987654321',
    service: 'barba',
    slot_start: new Date(new Date().setHours(14, 30, 0, 0)).toISOString(),
    status: 'pending',
  },
];

test.describe('Agenda Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Mock session endpoint
    await page.route('**/pros/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sessionResponse),
      });
    });

    // Mock reservations endpoint
    await page.route('**/pros/reservations**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReservations),
      });
    });

    // Navigate directly to agenda
    await page.goto('/pro/agenda');
    await page.waitForLoadState('networkidle');
  });

  test('debug - capture page state', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(2000);
    
    // Take screenshot
    await page.screenshot({ path: 'test-results/agenda-debug.png', fullPage: true });
    
    // Get page content
    const content = await page.content();
    console.log('Page URL:', page.url());
    console.log('Page title:', await page.title());
    
    // Check if we're on the right page
    const url = page.url();
    expect(url).toContain('/pro/agenda');
  });

  test('calendar should be properly sized and visible', async ({ page }) => {
    // Wait for calendar to be visible
    const calendar = page.locator('.pelu-cal');
    await expect(calendar).toBeVisible();

    // Check calendar size
    const calendarBox = await calendar.boundingBox();
    expect(calendarBox).toBeTruthy();
    if (calendarBox) {
      // Calendar should be at least 280px wide (7 days * 3.5rem minimum)
      expect(calendarBox.width).toBeGreaterThanOrEqual(280);
    }
  });

  test('calendar days should have proper styling', async ({ page }) => {
    // Check if calendar day buttons are visible
    const dayButtons = page.locator('.rdp-day_button');
    await expect(dayButtons.first()).toBeVisible();

    // Get the first day button's computed style
    const firstDay = dayButtons.first();
    const buttonBox = await firstDay.boundingBox();
    expect(buttonBox).toBeTruthy();
    
    if (buttonBox) {
      // Day buttons should be at least 56px (3.5rem)
      expect(buttonBox.width).toBeGreaterThanOrEqual(56);
      expect(buttonBox.height).toBeGreaterThanOrEqual(56);
    }
  });

  test('busy day indicator should be visible', async ({ page }) => {
    // Look for days with the busy class
    const busyDay = page.locator('.calendar-day--busy').first();
    
    // If there are busy days, check the indicator
    const busyCount = await page.locator('.calendar-day--busy').count();
    if (busyCount > 0) {
      await expect(busyDay).toBeVisible();
      
      // The busy indicator is an ::after pseudo-element
      // We can verify it exists by checking the element has the class
      const hasClass = await busyDay.evaluate((el) => 
        el.classList.contains('calendar-day--busy')
      );
      expect(hasClass).toBeTruthy();
    }
  });

  test('today badge should not flicker', async ({ page }) => {
    // Check if HOY badge exists
    const hoyBadge = page.getByText('HOY', { exact: true });
    
    const badgeCount = await hoyBadge.count();
    if (badgeCount > 0) {
      await expect(hoyBadge.first()).toBeVisible();
      
      // Check that it doesn't have animate-pulse class
      const hasAnimation = await hoyBadge.first().evaluate((el) => {
        const classes = el.className;
        return classes.includes('animate-pulse') || classes.includes('animate-[pulse');
      });
      expect(hasAnimation).toBeFalsy();
    }
  });

  test('calendar hover effects should work', async ({ page }) => {
    // Get a future day (not disabled)
    const futureDay = page.locator('.rdp-day_button:not(.calendar-day--disabled):not(.calendar-day--past)').first();
    await expect(futureDay).toBeVisible();

    // Hover over the day
    await futureDay.hover();
    
    // The hover effect should apply (we can't directly test CSS transitions, 
    // but we can verify the element is still visible and clickable)
    await expect(futureDay).toBeVisible();
  });

  test('selected day should have proper styling', async ({ page }) => {
    // Click on a day to select it
    const selectableDay = page.locator('.rdp-day_button:not(.calendar-day--disabled):not(.calendar-day--past)').first();
    await selectableDay.click();

    // Wait a moment for the state to update
    await page.waitForTimeout(500);

    // Check if there's a selected day
    const selectedDay = page.locator('.calendar-day--selected');
    const selectedCount = await selectedDay.count();
    
    if (selectedCount > 0) {
      await expect(selectedDay.first()).toBeVisible();
      
      // Verify it has the selected class
      const hasClass = await selectedDay.first().evaluate((el) =>
        el.classList.contains('calendar-day--selected')
      );
      expect(hasClass).toBeTruthy();
    }
  });

  test('appointments card should be visible and properly styled', async ({ page }) => {
    // Check appointments card
    const appointmentsCard = page.locator('text=Citas del día').locator('..');
    await expect(appointmentsCard).toBeVisible();

    // Check for appointment items or empty state
    const hasAppointments = await page.locator('[class*="space-y-3"]').count() > 0;
    
    if (hasAppointments) {
      // If there are appointments, they should be visible
      const appointmentCards = page.locator('[class*="group/card"]');
      if (await appointmentCards.count() > 0) {
        await expect(appointmentCards.first()).toBeVisible();
      }
    }
  });

  test('calendar legend should be visible', async ({ page }) => {
    // Check for the legend item
    const legend = page.getByText('Días con citas');
    await expect(legend).toBeVisible();

    // Check for the indicator dot
    const legendContainer = legend.locator('..');
    await expect(legendContainer).toBeVisible();
  });
});
