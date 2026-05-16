import { describe, expect, it } from 'vitest';
import { parseGeoJsonImport } from './geojsonImport.js';

describe('parseGeoJsonImport', () => {
  it('liest Polygone mit Metadaten aus einer FeatureCollection', () => {
    const result = parseGeoJsonImport({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {
          name: 'Industriekorridor Neckar-Fils',
          validFrom: '1845',
          validTo: '1914',
          certainty: 'reconstructed',
          license: 'CC BY 4.0',
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[[9.1, 48.7], [9.8, 48.7], [9.8, 48.9], [9.1, 48.9], [9.1, 48.7]]],
        },
      }],
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Industriekorridor Neckar-Fils');
    expect(result.items[0].geometryType).toBe('Polygon');
    expect(result.items[0].validFrom).toBe('1845');
    expect(result.items[0].validTo).toBe('1914');
    expect(result.items[0].lat).toBeCloseTo(48.8);
    expect(result.items[0].lng).toBeCloseTo(9.45);
  });

  it('unterstuetzt LineString und setzt einen Default fuer Sicherheit', () => {
    const result = parseGeoJsonImport({
      type: 'Feature',
      properties: { title: 'Filsbahn' },
      geometry: { type: 'LineString', coordinates: [[9.18, 48.78], [9.84, 48.62]] },
    }, { defaultCertainty: 'probable' });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].name).toBe('Filsbahn');
    expect(result.items[0].geometryType).toBe('LineString');
    expect(result.items[0].certainty).toBe('probable');
  });

  it('nimmt Punkte als Orte ohne Flaechengeometrie auf', () => {
    const result = parseGeoJsonImport({
      type: 'Feature',
      properties: { name: 'Maschinenfabrik Esslingen' },
      geometry: { type: 'Point', coordinates: [9.31, 48.74] },
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].geometry).toBeUndefined();
    expect(result.items[0].geometryType).toBe('Point');
    expect(result.items[0].lat).toBeCloseTo(48.74);
  });

  it('meldet unbrauchbare Geometrien als Warnung', () => {
    const result = parseGeoJsonImport({
      type: 'FeatureCollection',
      features: [{
        type: 'Feature',
        properties: {},
        geometry: { type: 'MultiPoint', coordinates: [[9, 48]] },
      }],
    });

    expect(result.items).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
  });
});
