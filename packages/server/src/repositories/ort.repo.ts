import { all, get, run } from '../dbHelper.js';
import type { Place, CreatePlacePayload, PlaceGeometry } from '../../../shared/types.js';
import { parseLocalizedRequired, parseLocalized, stringifyLocalized, stringifyLocalizedNullable } from '../lib/localizedHelper.js';

const toPlace = (row: any): Place => ({
  id: row.id,
  moduleId: row.module_id,
  wikidataId: row.wikidata_id || undefined,
  lat: row.lat,
  lng: row.lng,
  name: parseLocalizedRequired(row.name),
  description: parseLocalized(row.description),
  geometry: row.geometry_geojson ? safeParseGeometry(row.geometry_geojson) : undefined,
  validFrom: row.valid_from || undefined,
  validTo:   row.valid_to   || undefined,
  certainty: row.certainty ?? 'certain',
  sourceOfClaim: row.source_of_claim || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function safeParseGeometry(s: string): PlaceGeometry | undefined {
  try {
    const obj = JSON.parse(s);
    if (obj && obj.type && obj.coordinates) return obj as PlaceGeometry;
  } catch { /* ignore */ }
  return undefined;
}

const stringifyGeometry = (g: PlaceGeometry | undefined): string | null =>
  g ? JSON.stringify(g) : null;

export function findByModule(moduleId: string): Place[] {
  const rows = all('SELECT * FROM place WHERE module_id = ? ORDER BY name', [moduleId]);
  return rows.map(toPlace);
}

export function findById(id: string): Place | undefined {
  const row = get('SELECT * FROM place WHERE id = ?', [id]);
  return row ? toPlace(row) : undefined;
}

export function create(id: string, moduleId: string, data: CreatePlacePayload): Place {
  run(
    `INSERT INTO place
       (id, module_id, wikidata_id, lat, lng, name, description, geometry_geojson,
        valid_from, valid_to, certainty, source_of_claim)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, moduleId,
      data.wikidataId ?? null, data.lat, data.lng,
      stringifyLocalized(data.name),
      stringifyLocalizedNullable(data.description),
      stringifyGeometry(data.geometry),
      data.validFrom ?? null,
      data.validTo   ?? null,
      data.certainty ?? 'certain',
      data.sourceOfClaim ?? null,
    ]
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<CreatePlacePayload>): Place | undefined {
  const existing = findById(id);
  if (!existing) return undefined;

  run(
    `UPDATE place
       SET wikidata_id = ?, lat = ?, lng = ?, name = ?,
           description = ?, geometry_geojson = ?,
           valid_from = ?, valid_to = ?,
           certainty = ?, source_of_claim = ?,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.wikidataId ?? existing.wikidataId ?? null,
      data.lat ?? existing.lat,
      data.lng ?? existing.lng,
      stringifyLocalized(data.name ?? existing.name),
      data.description !== undefined
        ? stringifyLocalizedNullable(data.description)
        : stringifyLocalizedNullable(existing.description),
      data.geometry !== undefined ? stringifyGeometry(data.geometry) : stringifyGeometry(existing.geometry),
      data.validFrom !== undefined ? (data.validFrom || null) : (existing.validFrom ?? null),
      data.validTo   !== undefined ? (data.validTo   || null) : (existing.validTo   ?? null),
      data.certainty ?? existing.certainty ?? 'certain',
      data.sourceOfClaim !== undefined ? (data.sourceOfClaim || null) : (existing.sourceOfClaim ?? null),
      id,
    ]
  );
  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM place WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM place WHERE id = ?', [id]);
  return true;
}
