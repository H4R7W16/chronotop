import { all, get, run } from '../dbHelper.js';
import type { Concept, CreateConceptPayload } from '../../../shared/types.js';
import { parseLocalizedRequired, parseLocalized, stringifyLocalized, stringifyLocalizedNullable } from '../lib/localizedHelper.js';

const toConcept = (row: any): Concept => ({
  id: row.id,
  moduleId: row.module_id,
  kind: row.kind,
  label: parseLocalizedRequired(row.label),
  description: parseLocalized(row.description),
  wikidataId: row.wikidata_id || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function findByModule(moduleId: string): Concept[] {
  const rows = all('SELECT * FROM concept WHERE module_id = ? ORDER BY label', [moduleId]);
  return rows.map(toConcept);
}

export function findById(id: string): Concept | undefined {
  const row = get('SELECT * FROM concept WHERE id = ?', [id]);
  return row ? toConcept(row) : undefined;
}

export function findByEvent(eventId: string): Concept[] {
  const rows = all(`
    SELECT c.* FROM concept c
    JOIN event_concept ec ON ec.concept_id = c.id
    WHERE ec.event_id = ?
    ORDER BY c.label
  `, [eventId]);
  return rows.map(toConcept);
}

export function create(id: string, moduleId: string, data: CreateConceptPayload): Concept {
  run(
    'INSERT INTO concept (id, module_id, kind, label, description, wikidata_id) VALUES (?, ?, ?, ?, ?, ?)',
    [
      id, moduleId, data.kind,
      stringifyLocalized(data.label),
      stringifyLocalizedNullable(data.description),
      data.wikidataId ?? null,
    ]
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<CreateConceptPayload>): Concept | undefined {
  const existing = findById(id);
  if (!existing) return undefined;
  run(
    `UPDATE concept SET kind = ?, label = ?, description = ?, wikidata_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [
      data.kind ?? existing.kind,
      stringifyLocalized(data.label ?? existing.label),
      data.description !== undefined
        ? stringifyLocalizedNullable(data.description)
        : stringifyLocalizedNullable(existing.description),
      data.wikidataId ?? existing.wikidataId ?? null,
      id,
    ]
  );
  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM concept WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM concept WHERE id = ?', [id]);
  return true;
}
