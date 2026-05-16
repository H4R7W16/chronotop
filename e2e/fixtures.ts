import type { APIRequestContext } from '@playwright/test';
import type { Event, LocalizedString } from '@chronotop/shared';

const API_BASE = 'http://localhost:3000/api/v1';

export const MODULE_IDS = {
  ebersbach: '00000000-0000-0000-0000-000000000005',
  neckarFils: '00000000-0000-0000-0000-000000000004',
  esslingen: '00000000-0000-0000-0000-000000000003',
} as const;

export function localized(value: LocalizedString | undefined): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  return value.de || Object.values(value).find(Boolean) || '';
}

export async function getModules(request: APIRequestContext): Promise<any[]> {
  const res = await request.get(`${API_BASE}/modules`);
  if (!res.ok()) throw new Error(`Module konnten nicht geladen werden: ${res.status()}`);
  return res.json();
}

export async function getEvents(request: APIRequestContext, moduleId: string): Promise<Event[]> {
  const res = await request.get(`${API_BASE}/modules/${moduleId}/events`);
  if (!res.ok()) throw new Error(`Ereignisse konnten nicht geladen werden: ${res.status()}`);
  return res.json();
}

export async function firstEvent(request: APIRequestContext, moduleId: string): Promise<Event> {
  const events = await getEvents(request, moduleId);
  if (events.length === 0) throw new Error(`Modul ${moduleId} enthält keine Ereignisse.`);
  return events[0];
}
