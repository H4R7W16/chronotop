import { describe, it, expect, beforeEach } from 'vitest';
import { setupTestDb } from '../test/setup.js';
import { run } from '../dbHelper.js';
import * as moduleRepo from './module.repo.js';
import * as placeRepo from './ort.repo.js';

const MOD_ID = 'mod-1';

describe('place repository', () => {
  beforeEach(async () => {
    await setupTestDb();
    moduleRepo.create(MOD_ID, { title: 'M', description: '', authorName: 'A' });
  });

  it('legt einen Punkt-Ort an', () => {
    const place = placeRepo.create('p1', MOD_ID, {
      name: 'Wittenberg',
      lat: 51.86,
      lng: 12.65,
      wikidataId: 'Q3955',
    });

    expect(place.lat).toBeCloseTo(51.86);
    expect(place.lng).toBeCloseTo(12.65);
    expect(place.wikidataId).toBe('Q3955');
    expect(place.geometry).toBeUndefined();
  });

  it('persistiert eine Polygon-Geometrie und liest sie als GeoJSON zurück', () => {
    const polygon = {
      type: 'Polygon' as const,
      coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1], [0, 0]]],
    };
    placeRepo.create('p1', MOD_ID, {
      name: 'Test', lat: 0, lng: 0, geometry: polygon,
    });

    const read = placeRepo.findById('p1');
    expect(read?.geometry?.type).toBe('Polygon');
    expect((read?.geometry as any).coordinates[0]).toHaveLength(5);
  });

  it('aktualisiert nur die geänderten Felder, behält Geometrie bei', () => {
    const polygon = { type: 'Polygon' as const, coordinates: [[[0, 0], [1, 0], [1, 1], [0, 0]]] };
    placeRepo.create('p1', MOD_ID, { name: 'Alt', lat: 0, lng: 0, geometry: polygon });

    const updated = placeRepo.update('p1', { name: 'Neu' });
    expect(updated?.name).toBe('Neu');
    expect(updated?.geometry?.type).toBe('Polygon');
  });

  it('listet nur Plätze des angegebenen Moduls', () => {
    const otherMod = 'mod-2';
    moduleRepo.create(otherMod, { title: 'M2', description: '', authorName: 'A' });
    placeRepo.create('p1', MOD_ID, { name: 'Eigen', lat: 0, lng: 0 });
    placeRepo.create('p2', otherMod, { name: 'Fremd', lat: 0, lng: 0 });

    const places = placeRepo.findByModule(MOD_ID);
    expect(places).toHaveLength(1);
    expect(places[0].name).toBe('Eigen');
  });

  it('löscht einen Ort', () => {
    placeRepo.create('p1', MOD_ID, { name: 'X', lat: 0, lng: 0 });
    expect(placeRepo.remove('p1')).toBe(true);
    expect(placeRepo.findById('p1')).toBeUndefined();
  });

  it('persistiert validFrom und validTo', () => {
    placeRepo.create('p1', MOD_ID, {
      name: 'Reich', lat: 51, lng: 10,
      validFrom: '1933-01-30',
      validTo:   '1945-05-08',
    });
    const r = placeRepo.findById('p1')!;
    expect(r.validFrom).toBe('1933-01-30');
    expect(r.validTo).toBe('1945-05-08');
  });

  it('lässt validFrom/validTo nullable und unverändert beim Update', () => {
    placeRepo.create('p1', MOD_ID, { name: 'X', lat: 0, lng: 0, validFrom: '1500' });
    const u = placeRepo.update('p1', { name: 'Y' });
    expect(u?.validFrom).toBe('1500');
    expect(u?.validTo).toBeUndefined();
  });

  it('löscht Gültigkeitsdaten, wenn explizit auf undefined/leeren String gesetzt', () => {
    placeRepo.create('p1', MOD_ID, { name: 'X', lat: 0, lng: 0, validFrom: '1500', validTo: '1600' });
    const u = placeRepo.update('p1', { validFrom: undefined as any });
    expect(u?.validFrom).toBe('1500');
    const u2 = placeRepo.update('p1', { validFrom: '' });
    expect(u2?.validFrom).toBeUndefined();
  });

  it('persistiert certainty mit Default „certain" und nimmt explizite Werte an', () => {
    placeRepo.create('p1', MOD_ID, { name: 'A', lat: 0, lng: 0 });
    expect(placeRepo.findById('p1')?.certainty).toBe('certain');

    placeRepo.create('p2', MOD_ID, { name: 'B', lat: 0, lng: 0, certainty: 'contested' });
    expect(placeRepo.findById('p2')?.certainty).toBe('contested');

    placeRepo.update('p2', { certainty: 'reconstructed' });
    expect(placeRepo.findById('p2')?.certainty).toBe('reconstructed');
  });

  it('persistiert sourceOfClaim als Referenz auf eine Quelle', () => {
    run('INSERT INTO source (id, module_id, type, title, license) VALUES (?, ?, ?, ?, ?)',
      ['src-1', MOD_ID, 'text', 'Test-Quelle', 'CC0']);

    placeRepo.create('p1', MOD_ID, { name: 'X', lat: 0, lng: 0, sourceOfClaim: 'src-1' });
    expect(placeRepo.findById('p1')?.sourceOfClaim).toBe('src-1');
  });
});
