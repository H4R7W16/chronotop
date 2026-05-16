/**
 * Hilfsfunktionen für E2E-Tests, die direkt mit der API sprechen, um
 * Aufräumen und Setup von Test-Daten zu beschleunigen.
 *
 * Tests arbeiten gegen die laufende Entwicklungs-DB. Sie räumen ihre
 * eigenen Module nach dem Test wieder auf, damit aufeinanderfolgende
 * Läufe stabil bleiben.
 */
import type { APIRequestContext } from '@playwright/test';

const API_BASE = 'http://localhost:3000/api/v1';

/** Erstellt ein Modul direkt per API und gibt seine ID zurück. */
export async function createTestModule(
  request: APIRequestContext,
  data: Partial<{ title: string; description: string; authorName: string }> = {},
): Promise<{ id: string }> {
  const res = await request.post(`${API_BASE}/modules`, {
    data: {
      title: data.title ?? `E2E-Modul ${Date.now()}`,
      description: data.description ?? 'Automatisch durch E2E-Test angelegt',
      authorName: data.authorName ?? 'Playwright',
    },
  });
  if (!res.ok()) throw new Error(`Modul-Erstellung fehlgeschlagen: ${res.status()}`);
  return res.json();
}

/** Löscht ein Test-Modul wieder. Schluckt Fehler, damit Cleanups robust sind. */
export async function deleteTestModule(
  request: APIRequestContext,
  id: string,
): Promise<void> {
  await request.delete(`${API_BASE}/modules/${id}`).catch(() => undefined);
}
