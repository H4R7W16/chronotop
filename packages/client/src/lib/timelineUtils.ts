import type { Event, LocalizedString } from '@chronotop/shared';

function localized(value: LocalizedString, lang: string, fallback = ''): string {
  if (typeof value === 'string') return value || fallback;
  const direct = value[lang];
  if (direct) return direct;
  const de = value['de'];
  if (de) return de;
  return Object.values(value).find(v => v) ?? fallback;
}

function l(v: LocalizedString | undefined, lang = 'de'): string {
  return v ? localized(v, lang) : '';
}

// Liefert ein sortierbares Datum aus einem Ereignis
export function getEventDate(event: Event): string | null {
  if (!event.timeObject) return null;
  if (event.timeObject.type === 'instant') return event.timeObject.date ?? null;
  return event.timeObject.startDate ?? null;
}

export function getEventEndDate(event: Event): string | null {
  if (!event.timeObject) return null;
  if (event.timeObject.type === 'span') return event.timeObject.endDate ?? null;
  return event.timeObject.date ?? null;
}

// Sortiert Ereignisse nach Datum
export function sortEventsByDate(events: Event[]): Event[] {
  return [...events].sort((a, b) => {
    const da = getEventDate(a) ?? '';
    const db = getEventDate(b) ?? '';
    return da.localeCompare(db);
  });
}

// Konvertiert ein ISO-Datum (YYYY oder YYYY-MM-DD) in eine fraktionale Jahreszahl
export function dateToYear(dateStr: string): number {
  // Format: YYYY-MM-DD oder YYYY
  const match = dateStr.match(/^(-?\d+)(?:-(\d{2}))?(?:-(\d{2}))?/);
  if (!match) return parseInt(dateStr, 10);
  const year = parseInt(match[1], 10);
  const month = match[2] ? parseInt(match[2], 10) : 1;
  const day = match[3] ? parseInt(match[3], 10) : 1;
  // Fraktionaler Jahresanteil für genauere Position auf der Achse
  return year + ((month - 1) * 30 + (day - 1)) / 365;
}

// Filter: passt das Ereignis zur Volltextsuche?
// Sucht in Titel, Beschreibung, Ort, Quellen, Akteuren, Begriffen.
export function eventMatchesSearch(event: Event, query: string, lang = 'de'): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase();
  const haystack = [
    l(event.title, lang),
    l(event.description, lang),
    l(event.place?.name, lang),
    l(event.place?.description, lang),
    l(event.timeObject?.label, lang),
    ...(event.sources?.map(s => l(s.title, lang)) ?? []),
    ...(event.sources?.map(s => l(s.description, lang)) ?? []),
    ...(event.actors?.map(a => l(a.actor.name, lang)) ?? []),
    ...(event.actors?.map(a => a.role ?? '') ?? []),
    ...(event.concepts?.map(c => l(c.label, lang)) ?? []),
    ...(event.concepts?.map(c => l(c.description, lang)) ?? []),
  ].join(' ').toLowerCase();
  return haystack.includes(q);
}

/**
 * Prüft, ob die Geometrie eines Place im aktuellen Zeitfenster sichtbar sein soll.
 *
 * Ein Place ohne `validFrom`/`validTo` gilt als immer-sichtbar (Standard für Punkte
 * ohne explizite Datierung wie „Berlin").
 *
 * Mit Gültigkeit: Place ist sichtbar, wenn sein Gültigkeits-Intervall
 * mit dem aktiven Filter-Intervall überlappt.
 *
 * Beispiele:
 * - Place "Reich 1933-1945", Filter Cursor 1989  → unsichtbar
 * - Place "Reich 1933-1945", Filter Cursor 1938  → sichtbar
 * - Place "Berliner Mauer 1961-1989", kein Filter → sichtbar (immer wenn kein Filter aktiv)
 * - Place ohne Datierung, Filter Cursor 1850     → sichtbar (immer)
 */
export function isPlaceValidInRange(
  validFrom: string | undefined | null,
  validTo: string | undefined | null,
  filterFrom: string | undefined,
  filterTo: string | undefined,
): boolean {
  // Wenn kein Filter aktiv ist, ist der Place sichtbar
  if (!filterFrom && !filterTo) return true;

  // Wenn keine Gültigkeit am Place gesetzt: gilt als immer-sichtbar
  if (!validFrom && !validTo) return true;

  // Überlappungs-Logik: Intervalle [a1,a2] und [b1,b2] überlappen, wenn
  // a1 <= b2 UND a2 >= b1. Wir behandeln NULL-Grenzen als ±unendlich.
  const a1 = validFrom ?? null;
  const a2 = validTo   ?? null;
  const b1 = filterFrom ?? null;
  const b2 = filterTo   ?? null;

  // a1 > b2 → Place beginnt nach Filter-Ende → keine Überlappung
  if (a1 && b2 && a1 > b2) return false;
  // a2 < b1 → Place endet vor Filter-Anfang → keine Überlappung
  if (a2 && b1 && a2 < b1) return false;

  return true;
}

// Filter: liegt das Ereignis im Zeitbereich?
export function isEventInTimeRange(event: Event, from?: string, to?: string): boolean {
  if (!from && !to) return true;
  const start = getEventDate(event);
  const end = getEventEndDate(event);
  if (!start) return true;

  if (from && end && end < from) return false;
  if (to && start > to) return false;
  return true;
}

// Berechnet sinnvolle Tick-Abstände für die Achse (in Jahren)
export function computeTickStep(rangeYears: number, targetTicks = 8): number {
  const niceSteps = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000];
  const ideal = rangeYears / targetTicks;
  for (const s of niceSteps) {
    if (s >= ideal) return s;
  }
  return niceSteps[niceSteps.length - 1];
}

// Verteilt Events auf Lanes (Bahnen), damit überlappende Spans nebeneinander liegen
export interface LayoutedEvent {
  event: Event;
  startYear: number;
  endYear: number;
  lane: number;
}

export function layoutEvents(events: Event[]): LayoutedEvent[] {
  const sorted = sortEventsByDate(events);
  const lanes: number[] = []; // pro Lane: das Endjahr des letzten Events
  const result: LayoutedEvent[] = [];

  for (const event of sorted) {
    const startStr = getEventDate(event);
    if (!startStr) continue;
    const start = dateToYear(startStr);
    const endStr = getEventEndDate(event);
    const end = endStr ? dateToYear(endStr) : start;

    let lane = 0;
    while (lane < lanes.length && lanes[lane] >= start - 0.1) lane++;
    if (lane === lanes.length) lanes.push(end);
    else lanes[lane] = Math.max(end, lanes[lane]);

    result.push({ event, startYear: start, endYear: end, lane });
  }
  return result;
}
