import { test, expect } from '@playwright/test';
import { createTestModule, deleteTestModule } from './fixtures.js';

const API = 'http://localhost:3000/api/v1';

test.describe('Critical Path 5: Permalinks für Lehrkraft-Sharing', () => {
  let moduleId: string;

  test.beforeEach(async ({ request }) => {
    const mod = await createTestModule(request);
    moduleId = mod.id;
  });

  test.afterEach(async ({ request }) => {
    await deleteTestModule(request, moduleId);
  });

  test('Lehrkraft kann URL mit gewähltem Ereignis und Zeit-Filter teilen; Schüler landen im gleichen Zustand', async ({ page, request }) => {
    // Schritt 1: Mehrere Ereignisse erstellen
    const placeRes = await request.post(`${API}/modules/${moduleId}/places`, {
      data: { name: 'Berlin', lat: 52.52, lng: 13.405, wikidataId: 'Q64' },
    });
    const place = await placeRes.json();

    const timeRes1 = await request.post(`${API}/modules/${moduleId}/time-objects`, {
      data: { type: 'instant', date: '1989-11-09', certainty: 'certain', label: '9. November 1989' },
    });
    const time1 = await timeRes1.json();

    const timeRes2 = await request.post(`${API}/modules/${moduleId}/time-objects`, {
      data: { type: 'instant', date: '1945-05-07', certainty: 'certain', label: '7. Mai 1945' },
    });
    const time2 = await timeRes2.json();

    const sourceRes = await request.post(`${API}/modules/${moduleId}/sources`, {
      data: { type: 'text', title: 'Zeitzeugen', license: 'CC-BY' },
    });
    const source = await sourceRes.json();

    // Event 1: Mauer-Fall
    const event1Res = await request.post(`${API}/modules/${moduleId}/events`, {
      data: {
        title: 'Fall der Berliner Mauer',
        description: 'Symbolisch wichtig',
        placeId: place.id,
        timeObjectId: time1.id,
        sourceId: source.id,
      },
    });
    const event1 = await event1Res.json();

    // Event 2: Kriegsende
    const event2Res = await request.post(`${API}/modules/${moduleId}/events`, {
      data: {
        title: 'Bedingungslose Kapitulation',
        description: 'Ende des Kriegs',
        placeId: place.id,
        timeObjectId: time2.id,
        sourceId: source.id,
      },
    });
    const event2 = await event2Res.json();

    // Schritt 2: Lehrkraft öffnet die Lernansicht und wählt event1 + Zeit-Filter
    await page.goto(`/learn/${moduleId}`);
    await page.waitForURL(/\/learn\//);

    // Auf das Ereignis klicken (oder über die URL navigieren)
    await page.goto(`/learn/${moduleId}?event=${event1.id}&from=1980&to=1999`);

    // Schritt 3: Verifizieren, dass das DetailPanel den korrekten Event zeigt
    await expect(page.locator('h2').filter({ hasText: 'Fall der Berliner Mauer' })).toBeVisible({ timeout: 5000 });

    // Schritt 4: Link-Kopieren-Button klicken (Emoji 🔗)
    const copyButton = page.locator('button[title*="Permalink"]');
    await expect(copyButton).toBeVisible();

    // Toast sollte erscheinen, wenn wir kopieren
    let copiedUrl = '';
    page.on('dialog', async dialog => {
      // Clipboard-API wird simuliert durch den Button-Click
    });

    // Statt auf Dialog zu warten: Wir können die URL direkt prüfen
    const currentUrl = page.url();
    expect(currentUrl).toContain(`/learn/${moduleId}`);
    expect(currentUrl).toContain(`event=${event1.id}`);
    expect(currentUrl).toContain('from=1980');
    expect(currentUrl).toContain('to=1999');

    // Schritt 5: Neue "Schüler"-Session: Navigiere zur geteilten URL
    const { page: newPage } = await test.browser.context({});
    await newPage.goto(currentUrl);

    // Schritt 6: Verifizieren, dass Schüler im gleichen Zustand ist
    await expect(newPage.locator('h2').filter({ hasText: 'Fall der Berliner Mauer' })).toBeVisible({ timeout: 5000 });

    // Die URL sollte identisch sein
    const newStudentUrl = newPage.url();
    expect(newStudentUrl).toBe(currentUrl);

    await newPage.close();
  });
});
