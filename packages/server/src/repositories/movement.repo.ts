import { all, get, run } from '../dbHelper.js';

// ------------------------------------------------------------------ //
//  Types                                                               //
// ------------------------------------------------------------------ //

export interface MovementRow {
  id: string;
  module_id: string;
  event_id: string | null;
  name: string;
  description: string;
  coordinates: string;   // JSON
  color: string;
  created_at: string;
  updated_at: string;
}

export interface Movement {
  id: string;
  moduleId: string;
  eventId: string | null;
  name: string;
  description: string;
  /** GeoJSON LineString coordinate array: [[lng, lat], …] */
  coordinates: [number, number][];
  color: string;
  createdAt: string;
  updatedAt: string;
}

// ------------------------------------------------------------------ //
//  Mapping                                                             //
// ------------------------------------------------------------------ //

function toMovement(row: MovementRow): Movement {
  return {
    id: row.id,
    moduleId: row.module_id,
    eventId: row.event_id ?? null,
    name: row.name,
    description: row.description,
    coordinates: JSON.parse(row.coordinates) as [number, number][],
    color: row.color,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ------------------------------------------------------------------ //
//  CRUD                                                                //
// ------------------------------------------------------------------ //

export function findByModule(moduleId: string): Movement[] {
  const rows = all(
    'SELECT * FROM movement WHERE module_id = ? ORDER BY created_at ASC',
    [moduleId],
  ) as MovementRow[];
  return rows.map(toMovement);
}

export function findById(id: string): Movement | null {
  const row = get('SELECT * FROM movement WHERE id = ?', [id]) as MovementRow | undefined;
  return row ? toMovement(row) : null;
}

export interface CreateMovementData {
  eventId?: string | null;
  name?: string;
  description?: string;
  coordinates: [number, number][];
  color?: string;
}

export function create(id: string, moduleId: string, data: CreateMovementData): Movement {
  const { eventId = null, name = '', description = '', coordinates, color = '#7B2D42' } = data;
  run(
    `INSERT INTO movement (id, module_id, event_id, name, description, coordinates, color)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, moduleId, eventId, name, description, JSON.stringify(coordinates), color],
  );
  return findById(id)!;
}

export interface UpdateMovementData extends Partial<Omit<CreateMovementData, 'coordinates'>> {
  coordinates?: [number, number][];
}

export function update(id: string, data: UpdateMovementData): Movement | null {
  const existing = findById(id);
  if (!existing) return null;

  const eventId     = data.eventId     !== undefined ? data.eventId     : existing.eventId;
  const name        = data.name        !== undefined ? data.name        : existing.name;
  const description = data.description !== undefined ? data.description : existing.description;
  const coordinates = data.coordinates !== undefined ? data.coordinates : existing.coordinates;
  const color       = data.color       !== undefined ? data.color       : existing.color;

  run(
    `UPDATE movement
     SET event_id=?, name=?, description=?, coordinates=?, color=?, updated_at=CURRENT_TIMESTAMP
     WHERE id=?`,
    [eventId, name, description, JSON.stringify(coordinates), color, id],
  );
  return findById(id);
}

export function remove(id: string): boolean {
  if (!findById(id)) return false;
  run('DELETE FROM movement WHERE id = ?', [id]);
  return true;
}
