import { all, get, run } from '../dbHelper.js';
import type { ModuleRevision, CreateModuleRevisionPayload } from '../../../shared/types.js';

const toRev = (row: any): ModuleRevision => ({
  id: row.id,
  moduleId: row.module_id,
  version: row.version,
  snapshot: safeParseJson(row.snapshot),
  message: row.message || undefined,
  creator: row.creator || undefined,
  createdAt: row.created_at,
});

function safeParseJson(s: string): object {
  try { return JSON.parse(s); } catch { return {}; }
}

export function findByModule(moduleId: string): ModuleRevision[] {
  const rows = all(
    'SELECT * FROM module_revision WHERE module_id = ? ORDER BY created_at DESC',
    [moduleId],
  );
  return rows.map(toRev);
}

export function findById(id: string): ModuleRevision | undefined {
  const row = get('SELECT * FROM module_revision WHERE id = ?', [id]);
  return row ? toRev(row) : undefined;
}

export function findByModuleAndVersion(moduleId: string, version: string): ModuleRevision | undefined {
  const row = get(
    'SELECT * FROM module_revision WHERE module_id = ? AND version = ?',
    [moduleId, version],
  );
  return row ? toRev(row) : undefined;
}

export function create(
  id: string,
  moduleId: string,
  data: CreateModuleRevisionPayload,
  snapshot: object,
): ModuleRevision {
  run(
    `INSERT INTO module_revision (id, module_id, version, snapshot, message, creator)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      id, moduleId, data.version,
      JSON.stringify(snapshot),
      data.message ?? null,
      data.creator ?? null,
    ]
  );
  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM module_revision WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM module_revision WHERE id = ?', [id]);
  return true;
}
