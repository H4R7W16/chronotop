import { test, expect } from '@playwright/test';
import { createTestModule, deleteTestModule } from './fixtures.js';

const API = 'http://localhost:3000/api/v1';

test.describe('Critical Path 3: JSON-LD-Export', () => {
  let moduleId: string;

  test.beforeEach(async ({ request }) => {
    const mod = await createTestModule(request, { title: 'Export-Test' });
    moduleId = mod.id;

    // Modul mit einem minimalen Datensatz befüllen, damit der Export
    // nicht trivial leer ist
    const placeRes = await request.post(`${API}/modules/${moduleId}/places`, {
      data: { name: 'Wittenberg', lat: 51.866, lng: 12.647, wikidataId: 'Q3955' },
    });
    const place = await placeRes.json();
    const timeRes = await request.post(`${API}/modules/${moduleId}/time-objects`, {
      data: { type: 'instant', date: '1517-10-31', certainty: 'certain', label: '1517' },
    });
    const time = await timeRes.json();
    await request.post(`${API}/modules/${moduleId}/events`, {
      data: {
        title: 'Thesenanschlag',
        description: 'Test',
        placeId: place.id,
        timeObjectId: time.id,
        sourceIds: [],
      },
    });
  });

  test.afterEach(async ({ request }) => {
    await deleteTestModule(request, moduleId);
  });

  test('Export-Endpunkt liefert valides JSON-LD mit allen erwarteten Feldern', async ({ request }) => {
    const res = await request.get(`${API}/modules/${moduleId}/export/jsonld`);
    expect(res.ok()).toBe(true);
    const ld = await res.json();

    // Schema.org-konforme Top-Level-Struktur
    expect(ld['@context']).toBeDefined();
    expect(ld['@context']['@vocab']).toBe('https://schema.org/');
    expect(ld['@context'].chronotop).toContain('chronotop.org');
    expect(ld['@type']).toBe('CreativeWork');
    expect(ld['@id']).toMatch(/^urn:chronotop:module:/);
    expect(ld.name).toBe('Export-Test');
    expect(ld.author?.name).toBe('Playwright');

    // Ereignisse als hasPart-Array
    expect(Array.isArray(ld.hasPart)).toBe(true);
    expect(ld.hasPart).toHaveLength(1);
    const event = ld.hasPart[0];
    expect(event['@type']).toBe('Event');
    expect(event.name).toBe('Thesenanschlag');

    // Ort mit GeoCoordinates und Wikidata-Link
    expect(event.location?.['@type']).toBe('Place');
    expect(event.location?.name).toBe('Wittenberg');
    expect(event.location?.geo?.latitude).toBeCloseTo(51.866, 2);
    expect(event.location?.sameAs).toBe('http://www.wikidata.org/entity/Q3955');

    // Zeit-Objekt
    expect(event.temporal?.startDate).toBe('1517-10-31');
    expect(event.temporal?.certainty).toBe('certain');
  });

  test('Export-View im Browser zeigt JSON-LD und stellt Download bereit', async ({ page }) => {
    await page.goto(`/export/${moduleId}`);
    await expect(page.getByRole('heading', { name: 'JSON-LD Export' })).toBeVisible();

    // JSON-LD ist sichtbar und enthält den Modul-Titel
    await expect(page.locator('pre')).toContainText('Export-Test');
    await expect(page.locator('pre')).toContainText('Thesenanschlag');

    // Download-Button ist da (Click testen wir nicht, weil das den Browser-Download triggert)
    await expect(page.getByRole('button', { name: 'Herunterladen' })).toBeVisible();
  });
});
