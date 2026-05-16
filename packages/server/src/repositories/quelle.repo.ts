import { all, get, run } from '../dbHelper.js';
import type { Source, CreateSourcePayload } from '../../../shared/types.js';
import { parseLocalizedRequired, parseLocalized, stringifyLocalized, stringifyLocalizedNullable } from '../lib/localizedHelper.js';

const toSource = (row: any): Source => ({
  id: row.id,
  moduleId: row.module_id,
  type: row.type,
  title: parseLocalizedRequired(row.title),
  iiifManifestUrl: row.iiif_manifest_url || undefined,
  iiifImageUrl: row.iiif_image_url || undefined,
  url: row.url || undefined,
  license: row.license,
  description: parseLocalized(row.description),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function findByModule(moduleId: string): Source[] {
  const rows = all('SELECT * FROM source WHERE module_id = ? ORDER BY title', [moduleId]);
  return rows.map(toSource);
}

export function findById(id: string): Source | undefined {
  const row = get('SELECT * FROM source WHERE id = ?', [id]);
  return row ? toSource(row) : undefined;
}

export function findByEvent(eventId: string): Source[] {
  const rows = all(
    'SELECT s.* FROM source s JOIN event_source es ON es.source_id = s.id WHERE es.event_id = ? ORDER BY s.title',
    [eventId]
  );
  return rows.map(toSource);
}

export function create(id: string, moduleId: string, data: CreateSourcePayload): Source {
  run(
    'INSERT INTO source (id, module_id, type, title, iiif_manifest_url, iiif_image_url, url, license, description) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id, moduleId, data.type,
      stringifyLocalized(data.title),
      data.iiifManifestUrl ?? null, data.iiifImageUrl ?? null, data.url ?? null,
      data.license,
      stringifyLocalizedNullable(data.description),
    ]
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<CreateSourcePayload>): Source | undefined {
  const existing = findById(id);
  if (!existing) return undefined;

  run(
    `UPDATE source SET type = ?, title = ?, iiif_manifest_url = ?, iiif_image_url = ?, url = ?, license = ?, description = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [
      data.type ?? existing.type,
      stringifyLocalized(data.title ?? existing.title),
      data.iiifManifestUrl ?? existing.iiifManifestUrl ?? null,
      data.iiifImageUrl ?? existing.iiifImageUrl ?? null,
      data.url ?? existing.url ?? null,
      data.license ?? existing.license,
      data.description !== undefined
        ? stringifyLocalizedNullable(data.description)
        : stringifyLocalizedNullable(existing.description),
      id,
    ]
  );
  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM source WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM source WHERE id = ?', [id]);
  return true;
}
