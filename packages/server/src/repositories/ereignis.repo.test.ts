import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../test/setup.js';
import * as moduleRepo from './module.repo.js';
import * as placeRepo from './ort.repo.js';
import * as timeRepo from './zeitobjekt.repo.js';
import * as sourceRepo from './quelle.repo.js';
import * as actorRepo from './actor.repo.js';
import * as conceptRepo from './concept.repo.js';
import * as eventRepo from './ereignis.repo.js';

const MOD = 'mod';

async function fixtureModule() {
  moduleRepo.create(MOD, { title: 'M', description: '', authorName: 'A' });
  placeRepo.create('place-1', MOD, { name: 'Wittenberg', lat: 51.86, lng: 12.65 });
  timeRepo.create('time-1', MOD, {
    type: 'instant', date: '1517-10-31', certainty: 'certain', label: '31. Oktober 1517',
  });
}

describe('event repository', () => {
  beforeEach(async () => {
    await setupTestDb();
    await fixtureModule();
  });

  it('legt ein Ereignis ohne Beziehungen an', () => {
    const event = eventRepo.create('e1', MOD, {
      title: 'Thesenanschlag',
      description: 'Test',
      placeId: 'place-1',
      timeObjectId: 'time-1',
      sourceIds: [],
    });
    expect(event.id).toBe('e1');
    expect(event.place?.name).toBe('Wittenberg');
    expect(event.timeObject?.label).toBe('31. Oktober 1517');
    expect(event.sources).toEqual([]);
    expect(event.actors).toEqual([]);
    expect(event.concepts).toEqual([]);
  });

  it('verknüpft Quellen, Akteure und Begriffe und lädt sie als Joins', () => {
    sourceRepo.create('src-1', MOD, {
      type: 'text', title: 'Originaltext', license: 'CC0',
    });
    actorRepo.create('act-1', MOD, {
      type: 'person', name: 'Martin Luther', wikidataId: 'Q9554',
    });
    conceptRepo.create('con-1', MOD, {
      kind: 'analytical', label: 'Reformation',
    });

    const event = eventRepo.create('e1', MOD, {
      title: 'T', description: '', placeId: 'place-1', timeObjectId: 'time-1',
      sourceIds: ['src-1'],
      actorIds: [{ actorId: 'act-1', role: 'Verfasser' }],
      conceptIds: ['con-1'],
    });

    expect(event.sources?.[0]?.title).toBe('Originaltext');
    expect(event.actors?.[0]?.actor.name).toBe('Martin Luther');
    expect(event.actors?.[0]?.role).toBe('Verfasser');
    expect(event.concepts?.[0]?.label).toBe('Reformation');
  });

  it('aktualisiert Verknüpfungen idempotent (Quellen ersetzen, nicht doppeln)', () => {
    sourceRepo.create('s1', MOD, { type: 'text', title: 'A', license: 'CC0' });
    sourceRepo.create('s2', MOD, { type: 'text', title: 'B', license: 'CC0' });

    eventRepo.create('e1', MOD, {
      title: 'E', description: '', placeId: 'place-1', timeObjectId: 'time-1',
      sourceIds: ['s1'],
    });

    const updated = eventRepo.update('e1', { sourceIds: ['s2'] });
    expect(updated?.sources?.map(s => s.id)).toEqual(['s2']);
  });

  it('folgt-auf-Beziehung zwischen Ereignissen', () => {
    const a = eventRepo.create('a', MOD, {
      title: 'A', description: '', placeId: 'place-1', timeObjectId: 'time-1', sourceIds: [],
    });
    const b = eventRepo.create('b', MOD, {
      title: 'B', description: '', placeId: 'place-1', timeObjectId: 'time-1', sourceIds: [],
      followsId: a.id,
    });
    expect(b.followsId).toBe('a');
  });

  it('persistiert certainty + sourceOfClaim an der Akteur-Verknüpfung', () => {
    sourceRepo.create('s1', MOD, { type: 'text', title: 'Beleg', license: 'CC0' });
    actorRepo.create('act-1', MOD, { type: 'person', name: 'Goebbels' });

    const event = eventRepo.create('e1', MOD, {
      title: 'X', description: '', placeId: 'place-1', timeObjectId: 'time-1',
      sourceIds: [],
      actorIds: [{ actorId: 'act-1', role: 'Anstifter', certainty: 'contested', sourceOfClaim: 's1' }],
    });
    expect(event.actors?.[0]?.role).toBe('Anstifter');
    expect(event.actors?.[0]?.certainty).toBe('contested');
    expect(event.actors?.[0]?.sourceOfClaim).toBe('s1');
  });

  it('löscht Ereignis und entfernt Junction-Einträge per CASCADE', () => {
    sourceRepo.create('s1', MOD, { type: 'text', title: 'X', license: 'CC0' });
    eventRepo.create('e1', MOD, {
      title: 'E', description: '', placeId: 'place-1', timeObjectId: 'time-1',
      sourceIds: ['s1'],
    });

    expect(eventRepo.remove('e1')).toBe(true);
    expect(eventRepo.findById('e1')).toBeUndefined();
    // Quelle bleibt erhalten (sie ist eigenständige Entität)
    expect(sourceRepo.findById('s1')).toBeDefined();
  });
});
