import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../test/setup.js';
import * as moduleRepo from './module.repo.js';
import * as revRepo from './revision.repo.js';

const MOD = 'mod-1';

describe('revision repository', () => {
  beforeEach(async () => {
    await setupTestDb();
    moduleRepo.create(MOD, { title: 'M', description: '', authorName: 'A' });
  });

  it('legt eine Revision mit Snapshot an und liest sie zurück', () => {
    const snap = { '@type': 'CreativeWork', name: 'Test' };
    const rev = revRepo.create('r1', MOD, { version: '1.0.0', message: 'erste Version' }, snap);

    expect(rev.version).toBe('1.0.0');
    expect(rev.snapshot).toEqual(snap);
    expect(rev.message).toBe('erste Version');
  });

  it('verbietet doppelte Versionen pro Modul (UNIQUE-Constraint)', () => {
    revRepo.create('r1', MOD, { version: '1.0.0' }, { x: 1 });
    expect(() => revRepo.create('r2', MOD, { version: '1.0.0' }, { x: 2 })).toThrow();
  });

  it('listet Revisionen nach Erstellungs-Zeitpunkt absteigend', async () => {
    revRepo.create('r1', MOD, { version: '0.1.0' }, { x: 1 });
    // Kleine Pause, damit Zeitstempel sich unterscheidet
    await new Promise(r => setTimeout(r, 1100));
    revRepo.create('r2', MOD, { version: '0.2.0' }, { x: 2 });

    const list = revRepo.findByModule(MOD);
    expect(list[0].version).toBe('0.2.0');
    expect(list[1].version).toBe('0.1.0');
  });

  it('findet Revision per Modul + Version', () => {
    revRepo.create('r1', MOD, { version: '1.0.0' }, { x: 1 });
    const found = revRepo.findByModuleAndVersion(MOD, '1.0.0');
    expect(found?.id).toBe('r1');
    expect(revRepo.findByModuleAndVersion(MOD, 'unbekannt')).toBeUndefined();
  });

  it('löscht Revisionen automatisch beim Löschen ihres Moduls (CASCADE)', () => {
    revRepo.create('r1', MOD, { version: '1.0.0' }, { x: 1 });
    moduleRepo.remove(MOD);
    expect(revRepo.findById('r1')).toBeUndefined();
  });
});
