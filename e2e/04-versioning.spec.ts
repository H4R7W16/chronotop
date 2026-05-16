import { test, expect } from '@playwright/test';
import { createTestModule, deleteTestModule } from './fixtures.js';

const API = 'http://localhost:3000/api/v1';

test.describe('Critical Path 4: Versionierung', () => {
  let moduleId: string;

  test.beforeEach(async ({ request }) => {
    const mod = await createTestModule(request);
    moduleId = mod.id;
  });

  test.afterEach(async ({ request }) => {
    await deleteTestModule(request, moduleId);
  });

  test('Modul wird versioniert; Version-Permalink liefert validen JSON-LD-Snapshot', async ({ page, request }) => {
    // Schritt 1: Ereignis erstellen (damit das Modul nicht leer ist)
    const placeRes = await request.post(`${API}/modules/${moduleId}/places`, {
      data: { name: 'Berlin', lat: 52.52, lng: 13.405, wikidataId: 'Q64' },
    });
    expect(placeRes.ok()).toBe(true);
    const place = await placeRes.json();

    const timeRes = await request.post(`${API}/modules/${moduleId}/time-objects`, {
      data: { type: 'instant', date: '1989-11-09', certainty: 'certain', label: '9. November 1989' },
    });
    expect(timeRes.ok()).toBe(true);
    const time = await timeRes.json();

    const sourceRes = await request.post(`${API}/modules/${moduleId}/sources`, {
      data: { type: 'text', title: 'Zeitzeugen-Bericht', license: 'CC-BY' },
    });
    expect(sourceRes.ok()).toBe(true);

    // Event erstellen per API, damit wir schnell testen können
    const eventRes = await request.post(`${API}/modules/${moduleId}/events`, {
      data: {
        title: 'Fall der Berliner Mauer',
        description: 'Symbolisch wichtiges Ereignis der deutschen Wiedervereinigung.',
        placeId: place.id,
        timeObjectId: time.id,
        sourceId: (await sourceRes.json()).id,
      },
    });
    expect(eventRes.ok()).toBe(true);

    // Schritt 2: Export-Ansicht öffnen
    await page.goto(`/export/${moduleId}`);
    await expect(page.getByRole('heading', { name: 'Versionen' })).toBeVisible();

    // Schritt 3: Version veröffentlichen
    const publishButton = page.getByRole('button', { name: '+ Aktuellen Stand veröffentlichen' });
    await publishButton.click();

    // Form ausfüllen
    await page.locator('input[placeholder="Version (z.B. 1.0.0)"]').fill('1.0.0');
    await page.locator('input[placeholder="Notiz: Was hat sich geändert?"]').fill('Erste stabile Version mit Mauer-Fall-Ereignis');

    // Veröffentlichen
    const publishFormButton = page.getByRole('button', { name: 'Veröffentlichen' });
    await publishFormButton.click();

    // Toast-Bestätigung warten
    await expect(page.locator('text=Version 1.0.0 festgeschrieben')).toBeVisible({ timeout: 5000 });

    // Schritt 4: Verifizieren, dass Version in Liste sichtbar ist
    const versionRow = page.locator('text=v1.0.0');
    await expect(versionRow).toBeVisible();

    const sublabelText = page.locator('text=Erste stabile Version mit Mauer-Fall-Ereignis');
    await expect(sublabelText).toBeVisible();

    // Schritt 5: Per API verifizieren, dass Permalink validen JSON-LD liefert
    // Zuerst die Revisions-Liste abrufen, um die revision.id zu finden
    const revisionsRes = await request.get(`${API}/modules/${moduleId}/revisions`);
    expect(revisionsRes.ok()).toBe(true);
    const revisions = await revisionsRes.json();
    expect(revisions).toHaveLength(1);
    expect(revisions[0].version).toBe('1.0.0');

    const revisionId = revisions[0].id;

    // Permalink aufrufen
    const permalinkRes = await request.get(
      `${API}/modules/${moduleId}/revisions/${revisionId}`
    );
    expect(permalinkRes.ok()).toBe(true);
    const revisionData = await permalinkRes.json();
    const snapshot = revisionData.snapshot;

    // Snapshot ist valider JSON-LD
    expect(snapshot).toHaveProperty('@type');
    expect(snapshot).toHaveProperty('name'); // Module-Titel
    expect(snapshot['@type']).toBe('CreativeWork');

    // Ereignis sollte im Snapshot enthalten sein (als hasPart-Array)
    expect(snapshot.hasPart).toBeDefined();
    if (Array.isArray(snapshot.hasPart)) {
      expect(snapshot.hasPart.length).toBeGreaterThan(0);
      expect(snapshot.hasPart[0].name).toBe('Fall der Berliner Mauer');
    }
  });
});
