import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDb, closePool } from '../db.js';
import { setDbInstance } from '../dbHelper.js';
import * as moduleRepo from '../repositories/module.repo.js';
import * as eventRepo from '../repositories/ereignis.repo.js';
import * as placeRepo from '../repositories/ort.repo.js';
import * as timeObjectRepo from '../repositories/zeitobjekt.repo.js';
import * as sourceRepo from '../repositories/quelle.repo.js';
import * as actorRepo from '../repositories/actor.repo.js';
import * as conceptRepo from '../repositories/concept.repo.js';
import * as movementRepo from '../repositories/movement.repo.js';
import * as taskRepo from '../repositories/task.repo.js';
import * as annotationRepo from '../repositories/annotation.repo.js';
import * as revisionRepo from '../repositories/revision.repo.js';
import { buildJsonLd } from '../services/jsonld.service.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const BETA_MODULE_IDS = [
  '00000000-0000-0000-0000-000000000005', // Ebersbach
  '00000000-0000-0000-0000-000000000004', // Industrialisierung Neckar/Fils
  '00000000-0000-0000-0000-000000000003', // Esslingen 1933-45
];

async function main() {
  const db = await getDb();
  setDbInstance(db);

  const modules = BETA_MODULE_IDS.map(id => {
    const mod = moduleRepo.findById(id);
    if (!mod) throw new Error(`Beta-Modul fehlt in der Datenbank: ${id}`);
    return mod;
  });

  const moduleData: Record<string, unknown> = {};
  for (const mod of modules) {
    moduleData[mod.id] = {
      module: mod,
      events: eventRepo.findByModule(mod.id),
      places: placeRepo.findByModule(mod.id),
      timeObjects: timeObjectRepo.findByModule(mod.id),
      sources: sourceRepo.findByModule(mod.id),
      actors: actorRepo.findByModule(mod.id),
      concepts: conceptRepo.findByModule(mod.id),
      movements: movementRepo.findByModule(mod.id),
      tasks: taskRepo.findByModule(mod.id),
      annotations: annotationRepo.findByModule(mod.id),
      revisions: revisionRepo.findByModule(mod.id),
      jsonLd: buildJsonLd(mod.id),
    };
  }

  const payload = {
    schema: 'chronotop.static-demo.v1',
    generatedAt: new Date().toISOString(),
    modules,
    moduleData,
  };

  const outDir = path.resolve(__dirname, '../../../client/public/demo');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'demo-data.json'),
    `${JSON.stringify(payload, null, 2)}\n`,
    'utf8',
  );

  console.log(`Static demo exported: ${modules.length} modules -> ${path.join(outDir, 'demo-data.json')}`);
}

main()
  .catch(err => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closePool();
  });
