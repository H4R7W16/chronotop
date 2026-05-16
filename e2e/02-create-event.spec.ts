import { test, expect } from '@playwright/test';
import { firstEvent, localized, MODULE_IDS } from './fixtures.js';

test.describe('Public Beta 2: Lernendenansicht', () => {
  test('lädt Karte, Zeitleiste, Aufgaben und ein ausgewähltes Ebersbach-Ereignis', async ({ page, request }) => {
    const event = await firstEvent(request, MODULE_IDS.ebersbach);
    const eventTitle = localized(event.title);

    await page.goto(`/learn/${MODULE_IDS.ebersbach}?event=${event.id}`);

    await expect(page.locator('.maplibregl-canvas')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('h2').filter({ hasText: eventTitle })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText('Zeitleiste').first()).toBeVisible();
    await expect(page.getByText('Aufgaben').first()).toBeVisible();
    await page.getByRole('button', { name: /Aufgaben/ }).last().click();
    await expect(page.getByText('Melde dich an, um Aufgaben zu beantworten.')).toBeVisible();
  });
});
