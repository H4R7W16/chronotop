import { all, get, run } from '../dbHelper.js';
import type { ContentModule, CreateModulePayload } from '../../../shared/types.js';
import { parseLocalizedRequired, stringifyLocalized } from '../lib/localizedHelper.js';

const toModule = (row: any): ContentModule => ({
  id: row.id,
  title: parseLocalizedRequired(row.title),
  description: parseLocalizedRequired(row.description),
  authorName: row.author_name,
  version: row.version,
  license: row.license,
  basemapUrl: row.basemap_url ?? null,
  basemapLabel: row.basemap_label ?? null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function findAll(): ContentModule[] {
  const rows = all('SELECT * FROM content_module ORDER BY updated_at DESC');
  return rows.map(toModule);
}

export function findById(id: string): ContentModule | undefined {
  const row = get('SELECT * FROM content_module WHERE id = ?', [id]);
  return row ? toModule(row) : undefined;
}

export function create(id: string, data: CreateModulePayload & { createdBy?: string }): ContentModule {
  run(
    'INSERT INTO content_module (id, title, description, author_name, created_by) VALUES (?, ?, ?, ?, ?)',
    [id, stringifyLocalized(data.title), stringifyLocalized(data.description), data.authorName, data.createdBy ?? null]
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<CreateModulePayload> & {
  basemapUrl?: string | null;
  basemapLabel?: string | null;
}): ContentModule | undefined {
  const existing = findById(id);
  if (!existing) return undefined;

  run(
    `UPDATE content_module
     SET title = ?, description = ?, author_name = ?,
         basemap_url = ?, basemap_label = ?,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      stringifyLocalized(data.title ?? existing.title),
      stringifyLocalized(data.description ?? existing.description),
      data.authorName ?? existing.authorName,
      'basemapUrl' in data ? (data.basemapUrl ?? null) : existing.basemapUrl ?? null,
      'basemapLabel' in data ? (data.basemapLabel ?? null) : existing.basemapLabel ?? null,
      id,
    ]
  );
  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM content_module WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM content_module WHERE id = ?', [id]);
  return true;
}
