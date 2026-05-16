import { all, get, run } from '../dbHelper.js';
import type { Event, CreateEventPayload } from '../../../shared/types.js';
import * as sourceRepo from './quelle.repo.js';
import * as placeRepo from './ort.repo.js';
import * as actorRepo from './actor.repo.js';
import * as conceptRepo from './concept.repo.js';
import { parseLocalizedRequired, stringifyLocalized } from '../lib/localizedHelper.js';

const toEvent = (row: any): Event => ({
  id: row.id,
  moduleId: row.module_id,
  title: parseLocalizedRequired(row.title),
  description: parseLocalizedRequired(row.description),
  placeId: row.place_id,
  timeObjectId: row.time_object_id,
  followsId: row.follows_id || null,
  partOfId: row.part_of_id || null,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

function enrichWithRelations(event: Event): Event {
  const place = placeRepo.findById(event.placeId);
  const timeObj = get('SELECT * FROM time_object WHERE id = ?', [event.timeObjectId]);
  const sources = sourceRepo.findByEvent(event.id);
  const actors = actorRepo.findByEvent(event.id);
  const concepts = conceptRepo.findByEvent(event.id);

  return {
    ...event,
    place,
    timeObject: timeObj ? {
      id: timeObj.id, moduleId: timeObj.module_id, type: timeObj.type,
      date: timeObj.date || undefined, startDate: timeObj.start_date || undefined,
      endDate: timeObj.end_date || undefined, certainty: timeObj.certainty,
      label: parseLocalizedRequired(timeObj.label),
    } : undefined,
    sources,
    actors,
    concepts,
  };
}

export function findByModule(moduleId: string): Event[] {
  const rows = all('SELECT * FROM event WHERE module_id = ? ORDER BY created_at', [moduleId]);
  return rows.map((r: any) => enrichWithRelations(toEvent(r)));
}

export function findById(id: string): Event | undefined {
  const row = get('SELECT * FROM event WHERE id = ?', [id]);
  if (!row) return undefined;
  return enrichWithRelations(toEvent(row));
}

export function create(id: string, moduleId: string, data: CreateEventPayload): Event {
  run(
    'INSERT INTO event (id, module_id, title, description, place_id, time_object_id, follows_id, part_of_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      id, moduleId,
      stringifyLocalized(data.title),
      stringifyLocalized(data.description),
      data.placeId, data.timeObjectId,
      data.followsId ?? null, data.partOfId ?? null,
    ]
  );
  for (const sourceId of data.sourceIds) {
    run('INSERT INTO event_source (event_id, source_id) VALUES (?, ?)', [id, sourceId]);
  }
  if (data.actorIds) {
    for (const link of data.actorIds) {
      run(
        `INSERT INTO event_actor (event_id, actor_id, role, certainty, source_of_claim)
         VALUES (?, ?, ?, ?, ?)`,
        [id, link.actorId, link.role ?? null, link.certainty ?? 'certain', link.sourceOfClaim ?? null]
      );
    }
  }
  if (data.conceptIds) {
    for (const cid of data.conceptIds) {
      run('INSERT INTO event_concept (event_id, concept_id) VALUES (?, ?)', [id, cid]);
    }
  }
  return findById(id)!;
}

export function update(id: string, data: Partial<CreateEventPayload>): Event | undefined {
  const existing = findById(id);
  if (!existing) return undefined;

  run(
    `UPDATE event SET title = ?, description = ?, place_id = ?, time_object_id = ?, follows_id = ?, part_of_id = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
    [
      stringifyLocalized(data.title ?? existing.title),
      stringifyLocalized(data.description ?? existing.description),
      data.placeId ?? existing.placeId,
      data.timeObjectId ?? existing.timeObjectId,
      data.followsId ?? existing.followsId ?? null,
      data.partOfId ?? existing.partOfId ?? null,
      id,
    ]
  );

  if (data.sourceIds) {
    run('DELETE FROM event_source WHERE event_id = ?', [id]);
    for (const sourceId of data.sourceIds) {
      run('INSERT INTO event_source (event_id, source_id) VALUES (?, ?)', [id, sourceId]);
    }
  }
  if (data.actorIds) {
    run('DELETE FROM event_actor WHERE event_id = ?', [id]);
    for (const link of data.actorIds) {
      run(
        `INSERT INTO event_actor (event_id, actor_id, role, certainty, source_of_claim)
         VALUES (?, ?, ?, ?, ?)`,
        [id, link.actorId, link.role ?? null, link.certainty ?? 'certain', link.sourceOfClaim ?? null]
      );
    }
  }
  if (data.conceptIds) {
    run('DELETE FROM event_concept WHERE event_id = ?', [id]);
    for (const cid of data.conceptIds) {
      run('INSERT INTO event_concept (event_id, concept_id) VALUES (?, ?)', [id, cid]);
    }
  }

  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM event WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM event WHERE id = ?', [id]);
  return true;
}
