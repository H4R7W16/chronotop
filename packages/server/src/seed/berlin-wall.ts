// Lädt den exakten Verlauf der Berliner Mauer aus OpenStreetMap (Overpass-API).
// Historiker:innen-tauglich: Tausende Mapper:innen haben die historische Trasse
// in OSM nach historischen Quellen rekonstruiert.
//
// Tag-Konvention: way[wall=berlin_wall] (siehe https://wiki.openstreetmap.org/wiki/Tag:wall%3Dberlin_wall)
//
// Falls Overpass nicht erreichbar ist, bleibt die kuratierte Fallback-Geometrie
// aus geometries-precise.ts aktiv. So bleibt seed:local fuer GitHub-Pages-Demos
// robust, ohne Live-Daten als Pflicht zu setzen.
import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Mehrere Overpass-Instanzen als Fallback (manche sind manchmal überlastet)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
];

// Frage: Berliner Mauer in OSM. Mehrere Tag-Varianten kombiniert,
// weil die Mauer historisch unter verschiedenen Tags gepflegt wird:
// - historic=citywalls + name=Berliner Mauer
// - barrier=wall + name=Berliner Mauer
// - wall=berlin_wall (älteres Schema)
// Bbox: Berliner Region.
const OVERPASS_QUERY = `[out:json][timeout:90];(way["historic"="citywalls"]["name"~"Mauer",i](52.30,13.05,52.70,13.80);way["barrier"="wall"]["name"~"Berliner Mauer",i](52.30,13.05,52.70,13.80);way["wall"="berlin_wall"](52.30,13.05,52.70,13.80);way["name"="Berliner Mauer"](52.30,13.05,52.70,13.80););out geom;`;

interface OverpassWay {
  type: 'way';
  id: number;
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassWay[];
}

async function fetchOverpass(): Promise<OverpassResponse> {
  let lastErr: Error | null = null;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log(`  POST ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'User-Agent': 'chronotop-seed/0.1 (educational tool)',
        },
        body: `data=${encodeURIComponent(OVERPASS_QUERY)}`,
      });
      if (!res.ok) {
        lastErr = new Error(`HTTP ${res.status}: ${res.statusText}`);
        continue;
      }
      return res.json();
    } catch (err) {
      lastErr = err as Error;
      console.warn(`    fehlgeschlagen: ${(err as Error).message}`);
    }
  }
  throw lastErr ?? new Error('alle Overpass-Endpoints nicht erreichbar');
}

async function seed() {
  const db = await getDb();
  setDbInstance(db);

  // Migrationen sicherstellen
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

  console.log('Frage Berliner-Mauer-Geometrie aus OpenStreetMap ab...');
  const data = await fetchOverpass();
  const ways = data.elements.filter(e => e.type === 'way' && e.geometry?.length);
  console.log(`  ${ways.length} OSM-Ways mit wall=berlin_wall gefunden.`);

  if (ways.length === 0) {
    console.warn('  Keine Wege gefunden; Fallback-Geometrie bleibt aktiv.');
    return;
  }

  // Konvertiere zu MultiLineString-Koordinaten: jedes Way-Element wird ein eigener LineString.
  const lines: number[][][] = ways.map(w =>
    w.geometry!.map(p => [p.lon, p.lat])
  );

  const totalPoints = lines.reduce((n, l) => n + l.length, 0);
  console.log(`  ${lines.length} LineString(s), insgesamt ${totalPoints} Stützpunkte.`);

  const geometry = {
    type: 'MultiLineString' as const,
    coordinates: lines,
  };

  const novModId = '00000000-0000-0000-0000-000000000002';
  // Mauer: Bau ab 13.08.1961, Fall am 09.11.1989
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
      'Kontextlinie fuer den Mauerfall. Die Live-Geometrie stammt aus OpenStreetMap/Overpass und ersetzt die kuratierte Fallback-Linie, wenn der Import erreichbar ist.',
      JSON.stringify(geometry),
      '1961-08-13',
      '1989-11-09',
      'reconstructed',
      'sq9-12',
    ]
  );

  flushSaveDb();
  console.log(`Berliner Mauer aus OSM (© OpenStreetMap-Mitwirkende) übernommen: ${totalPoints} Stützpunkte.`);
}

seed().catch(err => {
  console.warn(`Berliner-Mauer-Import uebersprungen; Fallback-Geometrie bleibt aktiv. Grund: ${(err as Error).message}`);
  process.exit(0);
});
