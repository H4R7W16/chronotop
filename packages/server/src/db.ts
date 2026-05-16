import initSqlJs from 'sql.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Pfad zur SQLite-Datenbankdatei.
 * Kann via DB_PATH-Umgebungsvariable überschrieben werden.
 * Standard: packages/server/data/chronotop.db
 */
const DB_PATH =
  process.env.DB_PATH ??
  path.join(__dirname, '..', 'data', 'chronotop.db');

let _db: any = null;
let _saveTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Gibt die sql.js-Datenbankinstanz zurück (lazy singleton).
 * Lädt beim ersten Aufruf die WASM-Binärdatei und öffnet / erstellt die DB.
 */
export async function getDb(): Promise<any> {
  if (_db) return _db;

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    _db = new SQL.Database(fileBuffer);
  } else {
    _db = new SQL.Database();
  }

  // SQLite erzwingt CASCADE-Deletes und FK-Constraints nur mit diesem PRAGMA.
  // Muss nach jedem Datenbankopen gesetzt werden.
  _db.run('PRAGMA foreign_keys = ON;');

  return _db;
}

/** Schreibt die In-Memory-Datenbank auf die Festplatte. */
export function saveDb(): void {
  if (!_db) return;
  const data = _db.export();
  const buffer = Buffer.from(data);
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Startet einen periodischen Auto-Save (default: alle 5 Sekunden).
 * Mehrfache Aufrufe sind sicher (wird nur einmal gestartet).
 */
export function startAutoSave(intervalMs = 5000): void {
  if (_saveTimer) return;
  _saveTimer = setInterval(saveDb, intervalMs);
}

/** Stoppt den Auto-Save-Timer und schließt die Datenbankverbindung. */
export async function closePool(): Promise<void> {
  if (_saveTimer) {
    clearInterval(_saveTimer);
    _saveTimer = null;
  }
  if (_db) {
    saveDb();
    _db.close();
    _db = null;
  }
}
