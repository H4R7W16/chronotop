import { all, get, run } from '../dbHelper.js';
import type {
  Annotation, CreateAnnotationPayload, AnnotationBody, AnnotationTarget,
} from '../../../shared/types.js';

const toAnnotation = (row: any): Annotation => ({
  id: row.id,
  moduleId: row.module_id,
  motivation: row.motivation,
  body: safeParseJson<AnnotationBody>(row.body, { type: 'text', value: '' }),
  target: safeParseJson<AnnotationTarget[]>(row.target, []),
  creator: row.creator || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  certainty: row.certainty ?? 'certain',
  sourceOfClaim: row.source_of_claim || undefined,
  creatorRole: (row.creator_role ?? 'author') as 'author' | 'learner',
});

function safeParseJson<T>(s: string, fallback: T): T {
  try { return JSON.parse(s) as T; } catch { return fallback; }
}

export function findByModule(moduleId: string): Annotation[] {
  const rows = all(
    'SELECT * FROM annotation WHERE module_id = ? ORDER BY created_at DESC',
    [moduleId],
  );
  return rows.map(toAnnotation);
}

export function findById(id: string): Annotation | undefined {
  const row = get('SELECT * FROM annotation WHERE id = ?', [id]);
  return row ? toAnnotation(row) : undefined;
}

/** Findet alle Annotationen, die ein bestimmtes Target referenzieren. */
export function findByTarget(moduleId: string, kind: string, targetId: string): Annotation[] {
  const allAnnotations = findByModule(moduleId);
  return allAnnotations.filter(a => a.target.some(t => t.kind === kind && t.id === targetId));
}

export function create(id: string, moduleId: string, data: CreateAnnotationPayload): Annotation {
  run(
    `INSERT INTO annotation
       (id, module_id, motivation, body, target, creator, certainty, source_of_claim, creator_role)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, moduleId, data.motivation,
      JSON.stringify(data.body),
      JSON.stringify(data.target),
      data.creator ?? null,
      data.certainty ?? 'certain',
      data.sourceOfClaim ?? null,
      data.creatorRole ?? 'author',
    ]
  );
  return findById(id)!;
}

export function update(id: string, data: Partial<CreateAnnotationPayload>): Annotation | undefined {
  const existing = findById(id);
  if (!existing) return undefined;
  run(
    `UPDATE annotation
       SET motivation = ?, body = ?, target = ?, creator = ?,
           certainty = ?, source_of_claim = ?, creator_role = ?,
           updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`,
    [
      data.motivation ?? existing.motivation,
      JSON.stringify(data.body ?? existing.body),
      JSON.stringify(data.target ?? existing.target),
      data.creator ?? existing.creator ?? null,
      data.certainty ?? existing.certainty ?? 'certain',
      data.sourceOfClaim !== undefined ? (data.sourceOfClaim || null) : (existing.sourceOfClaim ?? null),
      data.creatorRole ?? existing.creatorRole ?? 'author',
      id,
    ]
  );
  return findById(id)!;
}

export function remove(id: string): boolean {
  const before = get('SELECT id FROM annotation WHERE id = ?', [id]);
  if (!before) return false;
  run('DELETE FROM annotation WHERE id = ?', [id]);
  return true;
}
