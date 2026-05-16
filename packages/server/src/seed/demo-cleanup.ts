import { getDb } from '../db.js';
import { setDbInstance, run, flushSaveDb } from '../dbHelper.js';

const legacyDemoModuleIds = [
  '00000000-0000-0000-0000-000000000001', // Reformation
  '00000000-0000-0000-0000-000000000002', // 9. November
];

async function cleanupDemoModules() {
  const db = await getDb();
  setDbInstance(db);

  for (const moduleId of legacyDemoModuleIds) {
    run('DELETE FROM content_module WHERE id = ?', [moduleId]);
  }

  flushSaveDb();
  console.log(`Demo-Cleanup complete: ${legacyDemoModuleIds.length} alte Demo-Module entfernt.`);
}

cleanupDemoModules().catch(err => {
  console.error(err);
  process.exit(1);
});
