import { all, get, run } from '../dbHelper.js';
import type { TimeObject, CreateTimeObjectPayload } from '../../../shared/types.js';
import { parseLocalizedRequired, stringifyLocalized } from '../lib/localizedHelper.js';

const toTimeObject = (row: any): TimeObject => ({
  id: row.id,
  moduleId: row.module_id,
  type: row.type,
  date: row.date || undefined,
  startDate: row.start_date || undefined,
  endDate: row.end_date || undefined,
  certainty: row.certainty,
  label: parseLocalizedRequired(row.label),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function findByModule(moduleId: string): TimeObject[] {
  const rows = all('SELECT * FROM time_object WHERE module_id = ? ORDER BY COALESCE(date, start_date)', [moduleId]);
  return rows.map(toTimeObject);
}

export function findById(id: string): TimeObject | undefined {
  const row = get('SELECT * FROM time_object WHERE id = ?', [id]);
  return row ? toTimeObject(row) : undefined;
}

export function create(id: string, moduleId: string, data: CreateTimeObjectPayload): TimeObject {
  run(
    'INSERT INTO time_object (id, module_id, type, date, start_date, end_date, certainty, label) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id, moduleId, data.type,
      data.date ?? null, data.startDate ?? null, data.endDate ?? null,
      data.certainty,
      stringifyLocalized(data.label),
    ]
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<CreateTimeObjectPayload>): TimeObject | undefined {
  const existing = findById(id);
  if (!existing) return undefined;

  run(
    `UPDATE time_object SET type = ?, date = ?, start_date = ?, end_date = ?, certainty = ?, label = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [
      data.type ?? existing.type,
      data.date ?? existing.date ?? null,
      data.startDate ?? existing.startDate ?? null,
      data.endDate ?? existing.endDate ?? null,
      data.certainty ?? existing.certainty,
      stringifyLocalized(data.label ?? existing.label),
      id,
    ]
  );
  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM time_object WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM time_object WHERE id = ?', [id]);
  return true;
}
