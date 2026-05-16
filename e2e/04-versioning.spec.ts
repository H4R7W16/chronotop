import { test, expect } from '@playwright/test';
import { firstEvent, localized, MODULE_IDS } from './fixtures.js';

test.describe('Public Beta 4: Autorentool im Demo-Modus', () => {
  test('ist ohne Login nutzbar und macht lokale Bearbeitung/Export transparent', async ({ page, request }) => {
    const event = await firstEvent(request, MODULE_IDS.ebersbach);
    const eventTitle = localized(event.title);

    await page.goto(`/author/${MODULE_IDS.ebersbach}?event=${event.id}`);

    await expect(page.getByText('Autorentool zum Testen')).toBeVisible();
    await expect(page.getByText('Lokale Änderungen werden nicht gespeichert')).toBeVisible();
    await expect(page.getByText('Autoren-Workbench')).toBeVisible();
    await expect(page.getByRole('button', { name: '+ Neues Ereignis' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: eventTitle })).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: '+ Neues Ereignis' }).click();
    await expect(page.locator('#event-title')).toBeVisible();
    await expect(page.getByRole('button', { name: 'In Demo-Entwurf speichern' })).toBeVisible();

    await page.getByRole('link', { name: 'Exportieren' }).click();
    await page.waitForURL(new RegExp(`/export/${MODULE_IDS.ebersbach}`));
    await expect(page.getByText('Server-Revisionen sind in der Demo gesperrt')).toBeVisible();
  });
});
