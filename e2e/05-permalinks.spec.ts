import { test, expect } from '@playwright/test';
import { firstEvent, localized, MODULE_IDS } from './fixtures.js';

test.describe('Public Beta 5: Permalinks', () => {
  test('teilen Auswahl und Zeitfenster stabil in einer neuen Browser-Session', async ({ page, browser, request }) => {
    const event = await firstEvent(request, MODULE_IDS.ebersbach);
    const eventTitle = localized(event.title);

    await page.goto(`/learn/${MODULE_IDS.ebersbach}?event=${event.id}&from=1800&to=1950`);
    await expect(page.locator('h2').filter({ hasText: eventTitle })).toBeVisible({ timeout: 10_000 });

    const sharedUrl = page.url();
    expect(sharedUrl).toContain(`/learn/${MODULE_IDS.ebersbach}`);
    expect(sharedUrl).toContain(`event=${event.id}`);
    expect(sharedUrl).toContain('from=1800');
    expect(sharedUrl).toContain('to=1950');

    const context = await browser.newContext();
    const studentPage = await context.newPage();
    await studentPage.goto(sharedUrl);
    await expect(studentPage.locator('h2').filter({ hasText: eventTitle })).toBeVisible({ timeout: 10_000 });
    expect(studentPage.url()).toBe(sharedUrl);
    await context.close();
  });
});
