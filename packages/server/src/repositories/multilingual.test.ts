import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../test/setup.js';
import * as moduleRepo from './module.repo.js';
import * as ereignisRepo from './ereignis.repo.js';
import * as actorRepo from './actor.repo.js';
import * as conceptRepo from './concept.repo.js';
import * as ortRepo from './ort.repo.js';
import * as zeitobjektRepo from './zeitobjekt.repo.js';
import { localized, parseLocalized, stringifyLocalized } from '../lib/localizedHelper.js';

beforeEach(setupTestDb);

// ──────────────────────────────────────────────
// localizedHelper Unit-Tests
// ──────────────────────────────────────────────

describe('localizedHelper', () => {
  it('parseLocalized: Plain-String bleibt ein String', () => {
    expect(parseLocalized('Hallo Welt')).toBe('Hallo Welt');
  });

  it('parseLocalized: JSON-Objekt wird geparst', () => {
    expect(parseLocalized('{"de":"Hallo","en":"Hello"}')).toEqual({ de: 'Hallo', en: 'Hello' });
  });

  it('parseLocalized: null/undefined → undefined', () => {
    expect(parseLocalized(null)).toBeUndefined();
    expect(parseLocalized(undefined)).toBeUndefined();
    expect(parseLocalized('')).toBeUndefined();
  });

  it('stringifyLocalized: Plain-String bleibt Plain-String', () => {
    expect(stringifyLocalized('Hallo')).toBe('Hallo');
  });

  it('stringifyLocalized: Nur-DE-Objekt → Plain-String (rückwärts-kompatibel)', () => {
    expect(stringifyLocalized({ de: 'Hallo', en: '' })).toBe('Hallo');
  });

  it('stringifyLocalized: Beide Sprachen → JSON', () => {
    const result = stringifyLocalized({ de: 'Hallo', en: 'Hello' });
    expect(JSON.parse(result)).toEqual({ de: 'Hallo', en: 'Hello' });
  });
});

// ──────────────────────────────────────────────
// localized() Fallback-Verhalten
// ──────────────────────────────────────────────

describe('localized() Helper', () => {
  it('Plain-String wird unverändert zurückgegeben', () => {
    expect(localized('Hallo', 'de')).toBe('Hallo');
    expect(localized('Hallo', 'en')).toBe('Hallo');
  });

  it('gibt den Wert in der gewünschten Sprache zurück', () => {
    const v = { de: 'Hallo', en: 'Hello' };
    expect(localized(v, 'de')).toBe('Hallo');
    expect(localized(v, 'en')).toBe('Hello');
  });

  it('fällt auf DE zurück wenn Sprache fehlt', () => {
    const v = { de: 'Hallo' };
    expect(localized(v, 'en')).toBe('Hallo');
    expect(localized(v, 'fr')).toBe('Hallo');
  });

  it('gibt fallback zurück wenn Objekt leer ist', () => {
    expect(localized({}, 'de', 'FALLBACK')).toBe('FALLBACK');
  });

  it('gibt fallback zurück wenn String leer ist', () => {
    expect(localized('', 'de', 'FALLBACK')).toBe('FALLBACK');
  });
});

// ──────────────────────────────────────────────
// Repo-Persistenz: Plain-Strings (Altdaten)
// ──────────────────────────────────────────────

describe('Modul-Repo: Plain-String-Kompatibilität', () => {
  it('speichert Plain-String und liest ihn als LocalizedString zurück', () => {
    const mod = moduleRepo.create('test-mod-1', {
      title: 'Reformation',
      description: 'Ein Modul über die Reformation',
      authorName: 'Test',
    });
    expect(mod.title).toBe('Reformation');
    expect(localized(mod.title, 'de')).toBe('Reformation');
    expect(localized(mod.title, 'en')).toBe('Reformation'); // Fallback auf Plain-String
  });

  it('speichert mehrsprachigen String und liest ihn korrekt zurück', () => {
    const mod = moduleRepo.create('test-mod-2', {
      title: { de: 'Reformation', en: 'Reformation' },
      description: { de: 'Beschreibung', en: 'Description' },
      authorName: 'Test',
    });
    expect(localized(mod.title, 'de')).toBe('Reformation');
    expect(localized(mod.title, 'en')).toBe('Reformation');
    expect(localized(mod.description, 'de')).toBe('Beschreibung');
    expect(localized(mod.description, 'en')).toBe('Description');
  });

  it('Fallback: DE-Wert wenn EN fehlt', () => {
    const mod = moduleRepo.create('test-mod-3', {
      title: { de: 'Nur Deutsch' },
      description: 'desc',
      authorName: 'Test',
    });
    expect(localized(mod.title, 'en')).toBe('Nur Deutsch');
  });
});

// ──────────────────────────────────────────────
// Repo-Persistenz: Akteure
// ──────────────────────────────────────────────

describe('Actor-Repo: Mehrsprachigkeit', () => {
  it('speichert und liest mehrsprachigen Akteur-Namen', () => {
    const modId = 'test-actor-mod';
    moduleRepo.create(modId, { title: 'Test', description: '', authorName: 'T' });

    const actor = actorRepo.create('actor-1', modId, {
      type: 'person',
      name: { de: 'Martin Luther', en: 'Martin Luther' },
      description: { de: 'Reformator', en: 'Reformer' },
    });

    expect(localized(actor.name, 'de')).toBe('Martin Luther');
    expect(localized(actor.description!, 'en')).toBe('Reformer');
    expect(localized(actor.description!, 'fr')).toBe('Reformator'); // Fallback DE
  });
});

// ──────────────────────────────────────────────
// Repo-Persistenz: Ereignisse
// ──────────────────────────────────────────────

describe('Ereignis-Repo: Mehrsprachigkeit', () => {
  it('speichert mehrsprachiges Event und liest es zurück', () => {
    const modId = 'ev-mod';
    moduleRepo.create(modId, { title: 'T', description: '', authorName: 'X' });

    const place = ortRepo.create('place-1', modId, {
      name: { de: 'Wittenberg', en: 'Wittenberg' },
      lat: 51.8, lng: 12.6,
    });
    const time = zeitobjektRepo.create('time-1', modId, {
      type: 'instant',
      date: '1517',
      certainty: 'certain',
      label: { de: '1517', en: '1517' },
    });

    const event = ereignisRepo.create('event-1', modId, {
      title: { de: 'Thesenanschlag', en: 'Ninety-five Theses' },
      description: { de: 'Luther nagelt seine Thesen an die Kirchentür.', en: 'Luther posts his theses.' },
      placeId: place.id,
      timeObjectId: time.id,
      sourceIds: [],
    });

    expect(localized(event.title, 'de')).toBe('Thesenanschlag');
    expect(localized(event.title, 'en')).toBe('Ninety-five Theses');
    expect(localized(event.description, 'en')).toBe('Luther posts his theses.');
  });

  it('Altdaten-Kompatibilität: Plain-String-Titel bleibt lesbar', () => {
    const modId = 'ev-mod-old';
    moduleRepo.create(modId, { title: 'T', description: '', authorName: 'X' });

    const place = ortRepo.create('place-2', modId, { name: 'Worms', lat: 49.6, lng: 8.3 });
    const time = zeitobjektRepo.create('time-2', modId, {
      type: 'instant', date: '1521', certainty: 'certain', label: '1521',
    });

    const event = ereignisRepo.create('event-2', modId, {
      title: 'Reichstag zu Worms',
      description: 'Luther wird vorgeladen.',
      placeId: place.id,
      timeObjectId: time.id,
      sourceIds: [],
    });

    expect(localized(event.title, 'de')).toBe('Reichstag zu Worms');
    expect(localized(event.title, 'en')).toBe('Reichstag zu Worms'); // Fallback
  });
});
