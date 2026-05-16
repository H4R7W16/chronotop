// Ergänzt einige Orte um Polygone/Linien zur Demonstration des Flächen-Features.
// Geometrien sind absichtlich grob vereinfacht — sie illustrieren räumliche Bedeutung,
// erheben aber keinen Anspruch auf historisch präzise Grenzziehung.
import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

  const refModId = '00000000-0000-0000-0000-000000000001';
  const novModId = '00000000-0000-0000-0000-000000000002';

  // === Reformations-Modul: Augsburger Religionsfrieden – Geltungsbereich ===
  // Stark vereinfachtes Polygon des Heiligen Römischen Reiches deutscher Nation um 1555
  const hrrPolygon = {
    type: 'Polygon',
    coordinates: [[
      [4.8, 51.5],   // Niederrhein
      [6.0, 53.4],   // Nordsee-Küste
      [11.5, 54.5],  // Schleswig
      [14.5, 53.5],  // Pommern
      [18.5, 49.5],  // Schlesien/Mähren
      [16.5, 46.5],  // Krain
      [12.0, 45.7],  // Tirol-Süd
      [7.5, 46.0],   // Westschweiz
      [5.5, 49.0],   // Lothringen
      [4.8, 51.5],
    ]],
  };
  // An den Augsburger Reichstag-Ort hängen
  run(`UPDATE place SET geometry_geojson = ? WHERE id = 'p06' AND module_id = ?`,
    [JSON.stringify(hrrPolygon), refModId]);

  // === 9.-November-Modul: Deutsches Reich 1938 als Geltungsbereich der Pogromnacht ===
  // Stark vereinfachtes Polygon (Grenzen vor dem Anschluss der Sudetengebiete)
  const reich1938 = {
    type: 'Polygon',
    coordinates: [[
      [5.95, 50.85],  // Aachen
      [6.0, 53.5],    // Nordsee-Küste
      [11.0, 54.6],   // Flensburg
      [14.0, 54.5],   // Pommern
      [18.4, 54.3],   // Memel
      [22.8, 54.4],   // Tilsit
      [22.9, 50.5],   // Schlesien-Ost
      [18.5, 50.0],   // Mähren-Grenze
      [14.0, 50.5],   // Erzgebirge
      [12.5, 49.0],   // Bayerischer Wald
      [13.0, 47.5],   // Salzburg
      [9.5, 47.5],    // Bodensee
      [7.5, 47.6],    // Basel
      [6.0, 49.0],    // Saargrenze
      [6.0, 50.5],    // Aachen-Bereich
      [5.95, 50.85],
    ]],
  };
  // An die "Synagoge"-Stelle hängen (Pogromnacht-Ereignis)
  run(`UPDATE place SET geometry_geojson = ?, name = ?, description = ? WHERE id = 'p9-05' AND module_id = ?`, [
    JSON.stringify(reich1938),
    'Deutsches Reich (Grenzen 1938)',
    'Geografischer Wirkungsbereich der Pogromnacht: Im gesamten damaligen Reichsgebiet (inkl. annektiertem Österreich und Sudetenland) wurden in derselben Nacht Synagogen, jüdische Geschäfte und Wohnungen angegriffen. Punkt-Marker steht stellvertretend bei der Synagoge Fasanenstraße, Berlin.',
    novModId,
  ]);

  // === 9.-November-Modul: Berliner Mauer als LineString (vereinfacht) ===
  const mauerLine = {
    type: 'LineString',
    coordinates: [
      [13.31, 52.52], // Brandenburger Tor (Pariser Platz)
      [13.34, 52.51], // Potsdamer Platz
      [13.36, 52.50], // Checkpoint Charlie
      [13.39, 52.49], // Heinrich-Heine-Straße
      [13.42, 52.49], // Treptow
      [13.45, 52.50], // Sonnenallee
      [13.47, 52.52], // Bornholmer Brücke (Norden)
      [13.40, 52.55], // Norden Berlin
      [13.31, 52.55], // West-Norden
      [13.28, 52.52], // Weddinger Bereich
      [13.31, 52.52], // zurück zum Brandenburger Tor
    ],
  };
  // An die Bornholmer-Stelle hängen
  run(`UPDATE place SET geometry_geojson = ? WHERE id = 'p9-06' AND module_id = ?`,
    [JSON.stringify(mauerLine), novModId]);

  flushSaveDb();
  console.log('Geometrien ergänzt: HRR-Polygon (Augsburg), Deutsches Reich 1938 (Pogromnacht), Berliner Mauer-LineString (Bornholmer).');
}

seed().catch(console.error);
