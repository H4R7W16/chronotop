/**
 * Test-Setup: stellt für jeden Test eine frische In-Memory-SQLite-Datenbank
 * bereit (via sql.js — kein Plattenzugriff, kein Docker erforderlich).
 *
 * Nutzung in Tests:
 *
 *     import { setupTestDb } from '../test/setup.js';
 *     beforeEach(setupTestDb);
 */
import initSqlJs from 'sql.js';
import { setDbInstance } from '../dbHelper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.join(__dirname, '..', 'migrations');

/**
 * Erstellt eine frische In-Memory-SQLite-Datenbank, wendet alle Migrationen
 * an und registriert sie als globalen dbHelper-Adapter.
 *
 * Migrationen, die Postgres-spezifische Syntax (z. B. PostGIS) verwenden,
 * werden bei Fehlern übersprungen und als Warnung geloggt.
 */
export async function setupTestDb(): Promise<void> {
  const SQL = await initSqlJs();
  const db = new SQL.Database();

  // SQLite erzwingt CASCADE/FK-Constraints nur mit diesem PRAGMA
  db.run('PRAGMA foreign_keys = ON;');

  setDbInstance(db);

  // Migrations-Tracking-Tabelle
  db.run(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  // Alle Migrationen einspielen
  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      db.exec(sql);
      db.run(
        'INSERT INTO _migrations (name) VALUES (?) ON CONFLICT DO NOTHING',
        [file]
      );
    } catch (err: any) {
      // Postgres-spezifische Extensions (PostGIS) sind in sql.js nicht verfügbar
      console.warn(`  [test] Migration ${file} übersprungen: ${err.message}`);
    }
  }
}
