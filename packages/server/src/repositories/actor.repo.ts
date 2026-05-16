import { all, get, run } from '../dbHelper.js';
import type { Actor, CreateActorPayload, EventActorLink } from '../../../shared/types.js';
import { parseLocalizedRequired, parseLocalized, stringifyLocalized, stringifyLocalizedNullable } from '../lib/localizedHelper.js';

const toActor = (row: any): Actor => ({
  id: row.id,
  moduleId: row.module_id,
  type: row.type,
  name: parseLocalizedRequired(row.name),
  wikidataId: row.wikidata_id || undefined,
  gndId: row.gnd_id || undefined,
  description: parseLocalized(row.description),
  birthDate: row.birth_date || undefined,
  deathDate: row.death_date || undefined,
  certainty: row.certainty ?? 'certain',
  sourceOfClaim: row.source_of_claim || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export function findByModule(moduleId: string): Actor[] {
  const rows = all('SELECT * FROM actor WHERE module_id = ? ORDER BY name', [moduleId]);
  return rows.map(toActor);
}

export function findById(id: string): Actor | undefined {
  const row = get('SELECT * FROM actor WHERE id = ?', [id]);
  return row ? toActor(row) : undefined;
}

export function findByEvent(eventId: string): EventActorLink[] {
  const rows = all(`
    SELECT a.*, ea.role as link_role,
           ea.certainty as link_certainty,
           ea.source_of_claim as link_source_of_claim
    FROM actor a
    JOIN event_actor ea ON ea.actor_id = a.id
    WHERE ea.event_id = ?
    ORDER BY a.name
  `, [eventId]);
  return rows.map((r: any) => ({
    actor: toActor(r),
    role: r.link_role || undefined,
    certainty: r.link_certainty ?? 'certain',
    sourceOfClaim: r.link_source_of_claim || undefined,
  }));
}

export function create(id: string, moduleId: string, data: CreateActorPayload): Actor {
  run(
    `INSERT INTO actor
       (id, module_id, type, name, wikidata_id, gnd_id, description,
        birth_date, death_date, certainty, source_of_claim)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, moduleId, data.type,
      stringifyLocalized(data.name),
      data.wikidataId ?? null, data.gndId ?? null,
      stringifyLocalizedNullable(data.description),
      data.birthDate ?? null, data.deathDate ?? null,
      data.certainty ?? 'certain',
      data.sourceOfClaim ?? null,
    ]
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<CreateActorPayload>): Actor | undefined {
  const existing = findById(id);
  if (!existing) return undefined;
  run(
    `UPDATE actor
       SET type = ?, name = ?, wikidata_id = ?, gnd_id = ?,
           description = ?, birth_date = ?, death_date = ?,
           certainty = ?, source_of_claim = ?,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.type ?? existing.type,
      stringifyLocalized(data.name ?? existing.name),
      data.wikidataId ?? existing.wikidataId ?? null,
      data.gndId ?? existing.gndId ?? null,
      data.description !== undefined
        ? stringifyLocalizedNullable(data.description)
        : stringifyLocalizedNullable(existing.description),
      data.birthDate ?? existing.birthDate ?? null,
      data.deathDate ?? existing.deathDate ?? null,
      data.certainty ?? existing.certainty ?? 'certain',
      data.sourceOfClaim !== undefined ? (data.sourceOfClaim || null) : (existing.sourceOfClaim ?? null),
      id,
    ]
  );
  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM actor WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM actor WHERE id = ?', [id]);
  return true;
}
