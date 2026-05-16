import { test, expect } from '@playwright/test';
import { MODULE_IDS } from './fixtures.js';

const API = 'http://localhost:3000/api/v1';

test.describe('Public Beta 3: Export', () => {
  test('liefert JSON-LD und einen Modul-Entwurf für die Beta-Module', async ({ page, request }) => {
    const res = await request.get(`${API}/modules/${MODULE_IDS.ebersbach}/export/jsonld`);
    expect(res.ok()).toBe(true);
    const ld = await res.json();
    expect(ld['@type']).toBe('CreativeWork');
    expect(ld['@id']).toBe(`urn:chronotop:module:${MODULE_IDS.ebersbach}`);
    expect(Array.isArray(ld.hasPart)).toBe(true);
    expect(ld.hasPart.length).toBeGreaterThan(10);

    await page.goto(`/export/${MODULE_IDS.ebersbach}`);
    await expect(page.getByRole('heading', { name: 'JSON-LD Export' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Modul-Entwurf exportieren' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Bearbeiteten Modulstand herunterladen' })).toBeVisible();
    await expect(page.locator('pre')).toContainText('Ebersbach', { timeout: 10_000 });
  });
});
