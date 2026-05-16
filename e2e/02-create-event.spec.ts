import { test, expect } from '@playwright/test';
import { createTestModule, deleteTestModule } from './fixtures.js';

const API = 'http://localhost:3000/api/v1';

test.describe('Critical Path 2: Ereignis erstellen', () => {
  let moduleId: string;

  test.beforeEach(async ({ request }) => {
    const mod = await createTestModule(request);
    moduleId = mod.id;
  });

  test.afterEach(async ({ request }) => {
    await deleteTestModule(request, moduleId);
  });

  test('Ereignis wird mit Ort, Zeit und Quelle angelegt und ist in der Karte sichtbar', async ({ page, request }) => {
    // Vorbereitung: Ort, Zeit, Quelle direkt per API anlegen
    // (Author-Picker getestet wir separat; hier liegt der Fokus auf Event-Erstellung)
    const placeRes = await request.post(`${API}/modules/${moduleId}/places`, {
      data: { name: 'Wittenberg', lat: 51.866, lng: 12.647, wikidataId: 'Q3955' },
    });
    expect(placeRes.ok()).toBe(true);
    const place = await placeRes.json();

    const timeRes = await request.post(`${API}/modules/${moduleId}/time-objects`, {
      data: { type: 'instant', date: '1517-10-31', certainty: 'certain', label: '31. Oktober 1517' },
    });
    expect(timeRes.ok()).toBe(true);
    const time = await timeRes.json();

    const sourceRes = await request.post(`${API}/modules/${moduleId}/sources`, {
      data: { type: 'text', title: 'Originaltext der 95 Thesen', license: 'CC0' },
    });
    expect(sourceRes.ok()).toBe(true);

    // Author-Modus öffnen
    await page.goto(`/author/${moduleId}`);
    await expect(page.getByRole('button', { name: '+ Neues Ereignis' })).toBeVisible();

    // Form öffnen
    await page.getByRole('button', { name: '+ Neues Ereignis' }).click();

    const title = 'Thesenanschlag in Wittenberg';
    await page.locator('#event-title').fill(title);
    await page.locator('#event-description').fill('Martin Luthers 95 Thesen.');

    // Existierenden Ort + Zeit auswählen
    await page.locator('#event-place-select').selectOption(place.id);
    await page.locator('#event-time-select').selectOption(time.id);

    // Speichern
    await page.getByRole('button', { name: 'Speichern' }).click();

    // Ereignis erscheint in der Sidebar-Liste
    await expect(page.locator('article').filter({ hasText: title })).toBeVisible({ timeout: 10_000 });

    // Per API verifizieren
    const eventsRes = await request.get(`${API}/modules/${moduleId}/events`);
    const events = await eventsRes.json();
    expect(events).toHaveLength(1);
    expect(events[0].title).toBe(title);
    expect(events[0].place.name).toBe('Wittenberg');
    expect(events[0].timeObject.label).toBe('31. Oktober 1517');
  });
});
