// Lädt präzise historische Polygone aus dem "historical-basemaps"-Repository
// (Andreas Ourednik, MIT-Lizenz) und ergänzt sie um einen detaillierten
// Berliner-Mauer-LineString.
//
// Quelle: https://github.com/aourednik/historical-basemaps
import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const HBM = (year: number) =>
  `https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_${year}.geojson`;

interface FC { type: 'FeatureCollection'; features: any[]; }

async function fetchJson(url: string): Promise<FC> {
  console.log(`  GET ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  return res.json();
}

// Vereinfacht eine Geometrie: jeder n-te Punkt im Ring
// (sehr grobe, aber dependency-freie Reduktion).
function decimate<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = Math.ceil(arr.length / maxPoints);
  const out: T[] = [];
  for (let i = 0; i < arr.length; i += step) out.push(arr[i]);
  // Polygon-Ring schließen
  if (out[0] !== arr[arr.length - 1]) out.push(arr[arr.length - 1]);
  return out;
}

function decimateGeometry(g: any, maxPointsPerRing: number): any {
  if (!g) return g;
  if (g.type === 'Polygon') {
    return { type: 'Polygon', coordinates: g.coordinates.map((r: any) => decimate(r, maxPointsPerRing)) };
  }
  if (g.type === 'MultiPolygon') {
    return {
      type: 'MultiPolygon',
      coordinates: g.coordinates.map((poly: any) => poly.map((r: any) => decimate(r, maxPointsPerRing))),
    };
  }
  return g;
}

// Sucht ein Feature anhand mehrerer möglicher Namens-Properties
function findFeature(fc: FC, names: string[]): any | null {
  const wanted = new Set(names.map(n => n.toLowerCase()));
  for (const f of fc.features) {
    const props = f.properties || {};
    const candidates = [props.NAME, props.name, props.SUBJECTO, props.SUBJECTO_1, props.NAME_LONG, props.SOVEREIGNT, props.NAME_EN]
      .filter((v: any): v is string => typeof v === 'string')
      .map((v: string) => v.toLowerCase());
    if (candidates.some(c => wanted.has(c))) return f;
  }
  return null;
}

// Vereinigt mehrere Features zu einem MultiPolygon (ohne echte Topologie-Operation,
// nur durch Sammeln aller Polygone — für Visualisierung ausreichend).
function unionAsMultiPolygon(features: any[]): any {
  const polys: any[] = [];
  for (const f of features) {
    const g = f.geometry;
    if (!g) continue;
    if (g.type === 'Polygon') polys.push(g.coordinates);
    else if (g.type === 'MultiPolygon') polys.push(...g.coordinates);
  }
  return { type: 'MultiPolygon', coordinates: polys };
}

async function seed() {
  const db = await getDb();
  setDbInstance(db);

  const migrationsDir = path.join(__dirname, '..', 'migrations');
  db.run(`CREATE TABLE IF NOT EXISTS _migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))`);
  const stmt = db.prepare('SELECT name FROM _migrations');
  const applied = new Set<string>();
  while (stmt.step()) applied.add(stmt.getAsObject().name as string);
  stmt.free();
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
  for (const file of files) {
    if (applied.has(file)) continue;
    try {
      db.exec(fs.readFileSync(path.join(migrationsDir, file), 'utf-8'));
      db.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
    } catch (err: any) {
      console.warn(`  Migration ${file} skipped: ${err.message}`);
    }
  }

  const refModId = '00000000-0000-0000-0000-000000000001';
  const novModId = '00000000-0000-0000-0000-000000000002';

  // === 1. Heiliges Römisches Reich um 1530 ===
  let hrrGeom: any = null;
  try {
    const fc = await fetchJson(HBM(1530));
    const f = findFeature(fc, [
      'Holy Roman Empire',
      'Heiliges Römisches Reich',
      'Holy Roman Empire of the German Nation',
      'Empire',
    ]);
    if (f) {
      hrrGeom = decimateGeometry(f.geometry, 200);
      console.log(`  HRR: gefunden in 1530-Datensatz, ${countPoints(hrrGeom)} Punkte`);
    } else {
      console.warn('  HRR: nicht gefunden im 1530-Dataset');
    }
  } catch (err) {
    console.warn('  HRR: Fehler beim Laden:', (err as Error).message);
  }

  // Fallback: detaillierter manueller Umriss, falls Online-Quelle scheitert
  if (!hrrGeom) {
    hrrGeom = {
      type: 'Polygon',
      coordinates: [[
        [4.4, 51.4], [4.0, 52.0], [5.0, 52.8], [6.5, 53.5], [8.0, 54.0],
        [9.0, 54.5], [10.5, 54.5], [11.5, 54.5], [13.0, 54.3], [14.5, 54.0],
        [15.5, 53.0], [16.5, 51.5], [18.0, 50.5], [18.5, 49.5], [18.0, 48.5],
        [17.0, 48.0], [16.5, 47.5], [16.0, 46.7], [14.5, 46.2], [13.0, 46.0],
        [11.5, 46.0], [10.5, 45.8], [9.5, 45.6], [8.0, 45.8], [7.0, 46.2],
        [6.0, 46.5], [6.5, 47.5], [7.0, 48.5], [6.5, 49.5], [5.5, 50.0],
        [4.8, 50.5], [4.4, 51.4],
      ]],
    };
  }
  // Als eigener Kontext-Layer, nicht am Ereignisort Augsburg.
  run(
    `INSERT OR REPLACE INTO place
       (id, module_id, lat, lng, name, description, geometry_geojson, valid_from, valid_to, certainty, source_of_claim)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'p11',
      refModId,
      50.3,
      10.4,
      'Heiliges Roemisches Reich um 1530',
      'Kontextflaeche fuer Reichspolitik, Reichstage und Religionsfrieden im Reformationsmodul. Die Geometrie stammt aus historical-basemaps und ist als moderne, generalisierte Referenz fuer historische Territorien zu lesen.',
      JSON.stringify(hrrGeom),
      '1500',
      '1555',
      'reconstructed',
      's10',
    ]
  );

  // === 2. Deutsches Reich 1938 (nach Anschluss Österreichs, ohne Sudetenland) ===
  // Wir kombinieren Deutschland + Österreich aus 1938-Dataset (Anschluss erfolgte März 1938)
  let reichGeom: any = null;
  try {
    const fc = await fetchJson(HBM(1938));
    // In den Historical Basemaps für 1938 ist der Anschluss Österreichs üblicherweise schon enthalten;
    // wir suchen primär nach "Germany"/"Deutsches Reich".
    const candidates = [
      findFeature(fc, ['Germany', 'Deutsches Reich', 'German Reich', 'Deutschland']),
      findFeature(fc, ['Austria', 'Österreich']),
    ].filter(Boolean);

    if (candidates.length > 0) {
      const merged = unionAsMultiPolygon(candidates);
      reichGeom = decimateGeometry(merged, 250);
      console.log(`  Reich 1938: ${candidates.length} Feature(s) gefunden, ${countPoints(reichGeom)} Punkte`);
    } else {
      console.warn('  Reich 1938: nicht gefunden');
    }
  } catch (err) {
    console.warn('  Reich 1938: Fehler beim Laden:', (err as Error).message);
  }

  if (!reichGeom) {
    // Fallback: detailliertere manuelle Kontur Deutsches Reich 1938 (mit Österreich)
    reichGeom = {
      type: 'Polygon',
      coordinates: [[
        [5.95, 50.85], [6.05, 51.85], [7.10, 53.50], [8.20, 53.55], [8.80, 53.83],
        [9.80, 53.95], [10.95, 54.40], [11.45, 54.20], [12.65, 54.40], [13.75, 54.10],
        [14.10, 53.75], [14.45, 53.25], [14.18, 52.85], [14.38, 52.40], [14.85, 51.85],
        [15.05, 51.30], [14.95, 50.80], [14.75, 50.40], [14.30, 50.20], [13.45, 50.50],
        [12.95, 50.30], [12.55, 50.00], [12.30, 49.90], [12.45, 49.50], [13.00, 49.00],
        [13.55, 48.85], [13.85, 48.60], [14.30, 48.55], [14.95, 48.65], [15.55, 48.85],
        [16.10, 48.65], [16.50, 48.40], [16.55, 47.85], [16.20, 47.65], [16.00, 47.55],
        [15.20, 46.90], [14.55, 46.65], [13.50, 46.55], [12.55, 46.65], [12.30, 46.85],
        [11.20, 46.95], [10.55, 46.85], [9.65, 46.95], [9.50, 47.05], [9.55, 47.55],
        [8.55, 47.80], [7.55, 47.60], [7.55, 48.30], [7.60, 49.05], [6.55, 49.20],
        [6.20, 49.50], [6.10, 50.10], [5.95, 50.85],
      ]],
    };
  }
  // Als eigener Kontext-Layer, nicht am konkreten Berliner Synagogenort.
  run(
    `INSERT OR REPLACE INTO place
       (id, module_id, lat, lng, name, description, geometry_geojson, valid_from, valid_to, certainty, source_of_claim)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'p9-08',
      novModId,
      51.1,
      10.4,
      'Deutsches Reich als Pogromraum 1938',
      'Kontextflaeche fuer die reichsweite Dimension der Pogromnacht. Die Geometrie ist eine generalisierte historische Referenz aus historical-basemaps; Grenzstand und zeitliche Logik bleiben quellenkritisch zu lesen.',
      JSON.stringify(reichGeom),
      '1938-01-01',
      '1938-12-31',
      'reconstructed',
      'sq9-11',
    ]
  );

  // === 3. Berliner Mauer – detaillierter Verlauf ===
  // Vereinfachte aber realistische Spur (~70 Stützpunkte) um West-Berlin,
  // basierend auf dem dokumentierten Mauerverlauf 1989.
  const mauerLine = {
    type: 'LineString',
    coordinates: [
      // Start: Bornholmer Brücke (Norden) — wir beginnen oben und gehen im Uhrzeigersinn
      [13.39620, 52.55340], [13.40250, 52.55540], [13.40990, 52.55630], [13.41770, 52.55810],
      [13.42500, 52.55620], [13.43400, 52.55340], [13.44100, 52.54870], [13.44680, 52.54350],
      [13.45000, 52.53800], [13.45460, 52.53180], [13.46000, 52.52600], [13.46300, 52.52050],
      [13.46500, 52.51400], [13.46380, 52.50760], [13.46100, 52.50130], [13.45650, 52.49600],
      [13.45100, 52.49000], [13.44460, 52.48450], [13.43800, 52.47980], [13.43000, 52.47550],
      [13.42250, 52.47200], [13.41450, 52.47000], [13.40500, 52.46900], [13.39600, 52.46900],
      // Süden Berlins – Treptow / Neukölln
      [13.38500, 52.46950], [13.37550, 52.47150], [13.36600, 52.47550], [13.35850, 52.48050],
      [13.35200, 52.48700], [13.34750, 52.49400], [13.34550, 52.50100], [13.34700, 52.50650],
      // Potsdamer Platz / Brandenburger Tor / Reichstag
      [13.35200, 52.50800], [13.36000, 52.50900], [13.37000, 52.51100], [13.37800, 52.51400],
      [13.38050, 52.51700], [13.37800, 52.52000], [13.37500, 52.52100], [13.36800, 52.52150],
      [13.36000, 52.52050], [13.35200, 52.51850], [13.34400, 52.51700], [13.33500, 52.51750],
      [13.32650, 52.51900], [13.31800, 52.52100], [13.31000, 52.52400], [13.30200, 52.52900],
      // Nordwesten – Spandau-Gesamtgebiet exklusive
      [13.29400, 52.53400], [13.28750, 52.53850], [13.28200, 52.54200], [13.28000, 52.54600],
      [13.28200, 52.54950], [13.28800, 52.55150], [13.29500, 52.55300], [13.30200, 52.55450],
      [13.31000, 52.55600], [13.31900, 52.55750], [13.32750, 52.55900], [13.33500, 52.56000],
      // Zurück nach Bornholmer
      [13.34250, 52.55980], [13.35000, 52.55900], [13.35800, 52.55800], [13.36600, 52.55700],
      [13.37400, 52.55600], [13.38200, 52.55500], [13.39000, 52.55400], [13.39620, 52.55340],
    ],
  };
  run(
    `INSERT OR REPLACE INTO place
       (id, module_id, lat, lng, name, description, geometry_geojson, valid_from, valid_to, certainty, source_of_claim)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      'p9-09',
      novModId,
      52.52,
      13.38,
      'Berliner Mauer 1989',
      'Kontextlinie fuer den Mauerfall. Diese Fallback-Geometrie ist eine didaktisch vereinfachte Linie; wenn Overpass erreichbar ist, ersetzt seed:berlin-wall sie durch OSM-Geometrien.',
      JSON.stringify(mauerLine),
      '1961-08-13',
      '1989-11-09',
      'reconstructed',
      'sq9-12',
    ]
  );

  flushSaveDb();
  console.log(`Geometrien aktualisiert.`);
  console.log(`  HRR 1530 (Kontextlayer):  ${countPoints(hrrGeom)} Punkte`);
  console.log(`  Reich 1938 (Kontext):     ${countPoints(reichGeom)} Punkte`);
  console.log(`  Berliner Mauer:           ${mauerLine.coordinates.length} Punkte`);
}

function countPoints(g: any): number {
  let n = 0;
  const visit = (v: any): void => {
    if (Array.isArray(v) && typeof v[0] === 'number') n++;
    else if (Array.isArray(v)) v.forEach(visit);
  };
  visit(g?.coordinates);
  return n;
}

seed().catch(err => { console.error(err); process.exit(1); });
