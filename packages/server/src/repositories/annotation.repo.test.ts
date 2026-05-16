import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../test/setup.js';
import * as moduleRepo from './module.repo.js';
import * as annoRepo from './annotation.repo.js';

const MOD = 'mod-1';

describe('annotation repository', () => {
  beforeEach(async () => {
    await setupTestDb();
    moduleRepo.create(MOD, { title: 'M', description: '', authorName: 'A' });
  });

  it('legt eine Text-Annotation an und liest body + target zurück', () => {
    const created = annoRepo.create('a1', MOD, {
      motivation: 'commenting',
      body: { type: 'text', value: 'Diese Deutung ist umstritten.' },
      target: [{ kind: 'event', id: 'e01' }],
      creator: 'Tester',
    });
    expect(created.body).toEqual({ type: 'text', value: 'Diese Deutung ist umstritten.' });
    expect(created.target).toEqual([{ kind: 'event', id: 'e01' }]);
    expect(created.motivation).toBe('commenting');
    expect(created.certainty).toBe('certain');
    expect(created.creator).toBe('Tester');
  });

  it('persistiert mehrere Targets (z.B. Vergleich zwischen zwei Ereignissen)', () => {
    const created = annoRepo.create('a1', MOD, {
      motivation: 'linking',
      body: { type: 'text', value: 'Beide Ereignisse markieren Brüche.' },
      target: [
        { kind: 'event', id: 'e01' },
        { kind: 'event', id: 'e05' },
      ],
    });
    expect(created.target).toHaveLength(2);
  });

  it('findet Annotationen nach Target', () => {
    annoRepo.create('a1', MOD, {
      motivation: 'commenting',
      body: { type: 'text', value: 'Über e01' },
      target: [{ kind: 'event', id: 'e01' }],
    });
    annoRepo.create('a2', MOD, {
      motivation: 'tagging',
      body: { type: 'tag', value: 'Schlüsselereignis' },
      target: [{ kind: 'event', id: 'e02' }],
    });

    const forE01 = annoRepo.findByTarget(MOD, 'event', 'e01');
    expect(forE01).toHaveLength(1);
    expect(forE01[0].id).toBe('a1');
  });

  it('aktualisiert Body und Sicherheit', () => {
    annoRepo.create('a1', MOD, {
      motivation: 'commenting',
      body: { type: 'text', value: 'Ursprung' },
      target: [{ kind: 'event', id: 'e01' }],
    });
    const u = annoRepo.update('a1', {
      body: { type: 'text', value: 'Korrigiert' },
      certainty: 'contested',
    });
    expect(u?.body).toEqual({ type: 'text', value: 'Korrigiert' });
    expect(u?.certainty).toBe('contested');
  });

  it('löscht eine Annotation', () => {
    annoRepo.create('a1', MOD, {
      motivation: 'commenting',
      body: { type: 'text', value: 'X' },
      target: [{ kind: 'event', id: 'e01' }],
    });
    expect(annoRepo.remove('a1')).toBe(true);
    expect(annoRepo.findById('a1')).toBeUndefined();
  });

  it('löscht Annotationen automatisch beim Löschen ihres Moduls (CASCADE)', () => {
    annoRepo.create('a1', MOD, {
      motivation: 'commenting',
      body: { type: 'text', value: 'X' },
      target: [{ kind: 'event', id: 'e01' }],
    });
    moduleRepo.remove(MOD);
    expect(annoRepo.findByModule(MOD)).toEqual([]);
  });
});
