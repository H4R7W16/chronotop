import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { getDb, saveDb, startAutoSave, closePool } from './db.js';
import { setDbInstance, exec, run, all } from './dbHelper.js';
import moduleRoutes from './routes/module.js';
import placeRoutes from './routes/ort.js';
import timeObjectRoutes from './routes/zeitobjekt.js';
import sourceRoutes from './routes/quelle.js';
import eventRoutes from './routes/ereignis.js';
import actorRoutes from './routes/actor.js';
import conceptRoutes from './routes/concept.js';
import annotationRoutes from './routes/annotation.js';
import revisionRoutes from './routes/revision.js';
import taskRoutes from './routes/task.js';
import movementRoutes from './routes/movement.js';
import exportRoutes from './routes/export.js';
import wikidataRoutes from './routes/wikidata.js';
import authRoutes from './routes/auth.js';
import { optionalAuth } from './middleware/auth.middleware.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());
app.use(optionalAuth);

// Routes
app.use('/api/v1/modules', moduleRoutes);
app.use('/api/v1/modules', placeRoutes);
app.use('/api/v1/modules', timeObjectRoutes);
app.use('/api/v1/modules', sourceRoutes);
app.use('/api/v1/modules', eventRoutes);
app.use('/api/v1/modules', actorRoutes);
app.use('/api/v1/modules', conceptRoutes);
app.use('/api/v1/modules', annotationRoutes);
app.use('/api/v1/modules', revisionRoutes);
app.use('/api/v1/modules', taskRoutes);
app.use('/api/v1/modules', movementRoutes);
app.use('/api/v1/modules', exportRoutes);
app.use('/api/v1/wikidata', wikidataRoutes);
app.use('/api/v1/auth', authRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

function runMigrations(): void {
  const migrationsDir = path.join(__dirname, 'migrations');

  exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name       TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    all('SELECT name FROM _migrations').map((r: any) => r.name as string)
  );

  const files = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    if (file === '015_postgis.sql') {
      run('INSERT INTO _migrations (name) VALUES (?)', [file]);
      console.log(`  Migration skipped optional: ${file} (PostGIS is not used by the sql.js demo database)`);
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    try {
      exec(sql);
      run('INSERT INTO _migrations (name) VALUES (?)', [file]);
      console.log(`  Migration applied: ${file}`);
    } catch (err: any) {
      console.warn(`  Migration ${file} failed (skipped): ${err.message}`);
    }
  }
}

async function start() {
  // sql.js-Datenbankinstanz laden und registrieren
  const db = await getDb();
  setDbInstance(db);

  // Migrationen ausführen
  runMigrations();

  // Automatisch alle 10 Sekunden auf Festplatte speichern
  startAutoSave(10_000);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    saveDb();
    await closePool();
    process.exit(0);
  });
  process.on('SIGTERM', async () => {
    saveDb();
    await closePool();
    process.exit(0);
  });

  app.listen(PORT, () => {
    console.log(`Chronotop server running on http://localhost:${PORT}`);
    const dbPath = process.env.DB_PATH ?? 'packages/server/data/chronotop.db';
    console.log(`Database: ${dbPath} (sql.js)`);
  });
}

start().catch(console.error);
