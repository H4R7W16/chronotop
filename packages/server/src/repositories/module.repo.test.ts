import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../test/setup.js';
import * as repo from './module.repo.js';

describe('module repository', () => {
  beforeEach(async () => {
    await setupTestDb();
  });

  it('liefert leere Liste, wenn keine Module existieren', () => {
    expect(repo.findAll()).toEqual([]);
  });

  it('legt ein Modul an und findet es per ID wieder', () => {
    const created = repo.create('m1', {
      title: 'Reformation',
      description: 'Test-Modul',
      authorName: 'Tester',
    });

    expect(created.id).toBe('m1');
    expect(created.title).toBe('Reformation');
    expect(created.version).toBe('0.1.0');
    expect(created.license).toMatch(/CC-BY-SA/);

    const fetched = repo.findById('m1');
    expect(fetched).toEqual(created);
  });

  it('listet Module nach updated_at absteigend', () => {
    repo.create('a', { title: 'A', description: '', authorName: 'X' });
    repo.create('b', { title: 'B', description: '', authorName: 'X' });

    const all = repo.findAll();
    expect(all).toHaveLength(2);
    expect(all.map(m => m.id).sort()).toEqual(['a', 'b']);
  });

  it('aktualisiert nur die übergebenen Felder', () => {
    repo.create('m', { title: 'Alt', description: 'AltDesc', authorName: 'Anna' });

    const updated = repo.update('m', { title: 'Neu' });
    expect(updated?.title).toBe('Neu');
    expect(updated?.description).toBe('AltDesc');
    expect(updated?.authorName).toBe('Anna');
  });

  it('löscht ein Modul und gibt true zurück; false bei nicht existierender ID', () => {
    repo.create('m', { title: 'X', description: '', authorName: 'A' });
    expect(repo.remove('m')).toBe(true);
    expect(repo.findById('m')).toBeUndefined();
    expect(repo.remove('does-not-exist')).toBe(false);
  });
});
