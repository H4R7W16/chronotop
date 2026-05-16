/**
 * Standalone-Migrations-Runner für sql.js (SQLite).
 * Aufruf: npm run migrate
 *
 * Liest die DB aus DB_PATH (oder Standard-Pfad), wendet alle ausstehenden
 * Migrationen an und schreibt die DB zurück.
 */
import { getDb, saveDb } from './db.js';
import { setDbInstance } from './dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, 'migrations');

async function migrate() {
  const db = await getDb();
  setDbInstance(db);

  console.log('Running migrations…');

  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Bereits angewendete Migrationen ermitteln
  const stmt = db.prepare('SELECT name FROM _migrations');
  const applied = new Set<string>();
  while (stmt.step()) applied.add(stmt.getAsObject().name as string);
  stmt.free();

  const files = fs.readdirSync(migrationsDir)
    .filter((f: string) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  skip: ${file}`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      db.exec(sql);
      db.run('INSERT INTO _migrations (name) VALUES (?)', [file]);
      console.log(`  applied: ${file}`);
    } catch (err: any) {
      console.warn(`  failed (skipped): ${file} — ${err.message}`);
    }
  }

  saveDb();
  console.log('Migrations complete.');
}

migrate().catch(console.error);
