import type { LocalizedString } from '../../../shared/types.js';

/**
 * Re-Export der localized()-Funktion, damit Server-Tests nicht direkt
 * aus shared/types.js importieren müssen (Value-Import würde Vitest
 * Pfad-Probleme bereiten — Type-Imports werden zur Laufzeit eliminiert).
 */
export function localized(value: LocalizedString, lang: string, fallback = ''): string {
  if (typeof value === 'string') return value || fallback;
  const direct = value[lang];
  if (direct) return direct;
  const de = value['de'];
  if (de) return de;
  return Object.values(value).find(v => v) ?? fallback;
}

/**
 * Liest einen DB-Rohwert als LocalizedString.
 * Plain-Strings (Altdaten) werden direkt zurückgegeben — sie sind als `LocalizedString`
 * gültig (= implizit Deutsch). JSON-Objekte werden geparst.
 */
export function parseLocalized(raw: string | null | undefined): LocalizedString | undefined {
  if (!raw) return undefined;
  if (raw.trimStart().startsWith('{')) {
    try {
      const obj = JSON.parse(raw);
      if (obj && typeof obj === 'object' && !Array.isArray(obj)) return obj as Record<string, string>;
    } catch { /* kein valides JSON → als Plain-String behandeln */ }
  }
  return raw;
}

/** Non-nullable Variante: liefert `fallback` wenn raw leer ist. */
export function parseLocalizedRequired(raw: string | null | undefined, fallback: LocalizedString = ''): LocalizedString {
  return parseLocalized(raw) ?? fallback;
}

/**
 * Serialisiert einen LocalizedString für die DB.
 * - Plain-String → unverändert
 * - Nur DE vorhanden → Plain-String (rückwärts-kompatibel, spart Storage)
 * - Mehrere Sprachen → JSON-Objekt (leere Werte werden ausgelassen)
 */
export function stringifyLocalized(value: LocalizedString): string {
  if (typeof value === 'string') return value;
  const filtered = Object.fromEntries(Object.entries(value).filter(([, v]) => v && v.trim()));
  const keys = Object.keys(filtered);
  if (keys.length === 0) return '';
  if (keys.length === 1 && 'de' in filtered) return filtered['de'];
  return JSON.stringify(filtered);
}

/** Null-safe Variante für optionale Felder. */
export function stringifyLocalizedNullable(value: LocalizedString | undefined | null): string | null {
  if (value === undefined || value === null) return null;
  const result = stringifyLocalized(value);
  return result || null;
}
