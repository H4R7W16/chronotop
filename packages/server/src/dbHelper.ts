/**
 * Datenbank-Helper für sql.js (In-Memory SQLite via WebAssembly).
 *
 * Bietet eine einheitliche synchrone API über der sql.js-Datenbankinstanz.
 * Die Instanz wird einmalig via setDbInstance() registriert.
 *
 * Warum synchron: sql.js führt alle Abfragen synchron im selben Thread aus.
 * Das vereinfacht den gesamten Stack — keine Promises, kein Connection-Pooling.
 */

import { saveDb } from './db.js';

let _db: any = null;

/** Setzt die aktive sql.js-Datenbankinstanz. */
export function setDbInstance(db: any): void {
  _db = db;
}

/**
 * Kompatibilitäts-Shim: In der pg-Variante wurde setAdapter() genutzt.
 * Im sql.js-Modus ist dies ein no-op — setDbInstance() ist die richtige Funktion.
 */
export function setAdapter(_adapter: any): void { /* no-op im sql.js-Modus */ }

/** Speichert die Datenbank sofort auf die Festplatte (flush). */
export function flushSaveDb(): void {
  saveDb();
}

function getDb(): any {
  if (!_db) throw new Error('DB nicht initialisiert. Bitte setDbInstance() aufrufen.');
  return _db;
}

/**
 * Konvertiert PostgreSQL-`$N`-Platzhalter zurück in SQLite-`?`.
 * Wird benötigt, falls Code mit pg-Platzhaltern übergeben wird.
 * Im Normalfall verwendet der Code bereits `?`.
 */
export function toPostgresParams(sql: string): string {
  // Im sql.js-Modus: keine Konvertierung nötig (sql.js nutzt ?)
  return sql;
}

/** Gibt alle Zeilen einer SELECT-Query zurück. */
export function all(sql: string, params: any[] = []): any[] {
  const stmt = getDb().prepare(sql);
  const rows: any[] = [];
  try {
    if (params.length) stmt.bind(params);
    while (stmt.step()) rows.push(stmt.getAsObject());
  } finally {
    stmt.free();
  }
  return rows;
}

/** Gibt die erste Zeile einer Query zurück oder `undefined`. */
export function get(sql: string, params: any[] = []): any | undefined {
  return all(sql, params)[0];
}

/** Führt eine mutierende Query aus (INSERT / UPDATE / DELETE). */
export function run(sql: string, params: any[] = []): void {
  getDb().run(sql, params);
}

/** Führt ein oder mehrere SQL-Statements ohne Parameter aus (z. B. DDL). */
export function exec(sql: string): void {
  getDb().exec(sql);
}
