import { test, expect } from '@playwright/test';
import { deleteTestModule } from './fixtures.js';

test.describe('Critical Path 1: Modul anlegen', () => {
  let createdId: string | null = null;

  test.afterEach(async ({ request }) => {
    if (createdId) {
      await deleteTestModule(request, createdId);
      createdId = null;
    }
  });

  test('Lehrkraft erstellt ein Modul über das ModulePicker-Formular', async ({ page, request }) => {
    const title = `Playwright-Test-Modul ${Date.now()}`;
    const author = 'Playwright Bot';

    await page.goto('/');
    // Es gibt zwei Chronotop-Headings (Header + Hero); wir prüfen nur dass die Seite geladen ist
    await expect(page.getByRole('heading', { name: 'Module' })).toBeVisible();

    // Form öffnen
    await page.getByRole('button', { name: '+ Neues Modul' }).click();

    // Felder ausfüllen (Form-Felder via Labels, FormField wickelt input ins label)
    await page.getByLabel('Titel').fill(title);
    await page.getByLabel('Beschreibung').fill('Erzeugt durch Playwright-E2E-Test.');
    await page.getByLabel('Autor/in').fill(author);

    // Speichern → Navigation in den Author-Modus
    await page.getByRole('button', { name: 'Speichern' }).click();
    await page.waitForURL(/\/author\//, { timeout: 10_000 });

    // Modul-ID aus URL extrahieren für Cleanup
    const url = page.url();
    const match = url.match(/\/author\/([0-9a-f-]+)/i);
    expect(match).not.toBeNull();
    createdId = match![1];

    // Header zeigt Modul-Titel an (nur auf Desktop sichtbar)
    await expect(page.locator('header')).toContainText(title);

    // Per API verifizieren, dass das Modul wirklich angelegt wurde
    const res = await request.get(`http://localhost:3000/api/v1/modules/${createdId}`);
    expect(res.ok()).toBe(true);
    const body = await res.json();
    expect(body.title).toBe(title);
    expect(body.authorName).toBe(author);
  });
});
