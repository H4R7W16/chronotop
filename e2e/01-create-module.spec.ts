import { test, expect } from '@playwright/test';
import { getModules, localized, MODULE_IDS } from './fixtures.js';

test.describe('Public Beta 1: Modulauswahl', () => {
  test('zeigt nur die drei kuratierten Beta-Module und öffnet Ebersbach', async ({ page, request }) => {
    const modules = await getModules(request);
    expect(modules.map(module => module.id)).toEqual([
      MODULE_IDS.ebersbach,
      MODULE_IDS.neckarFils,
      MODULE_IDS.esslingen,
    ]);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Module' })).toBeVisible();

    await expect(page.getByText('Ebersbach an der Fils')).toBeVisible();
    await expect(page.getByText('Industrialisierung an Neckar und Fils')).toBeVisible();
    await expect(page.getByText('Esslingen am Neckar 1933-1945')).toBeVisible();
    await expect(page.getByText('Reformation')).toHaveCount(0);
    await expect(page.getByText('9. November')).toHaveCount(0);

    const ebersbachCard = page.locator('article').filter({ hasText: localized(modules[0].title) });
    await ebersbachCard.getByRole('button', { name: 'Erkunden' }).click();
    await page.waitForURL(new RegExp(`/learn/${MODULE_IDS.ebersbach}`));
    await expect(page.locator('header')).toContainText('Ebersbach');
  });
});
