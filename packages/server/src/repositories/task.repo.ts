import { all, get, run } from '../dbHelper.js';

// ------------------------------------------------------------------ //
//  Types                                                               //
// ------------------------------------------------------------------ //

export interface TaskRow {
  id: string;
  module_id: string;
  title: string;
  prompt: string;
  type: 'text' | 'choice';
  options: string | null;      // JSON-Array
  answer_key: string | null;
  target_event_id: string | null;
  position: number;
  created_at: string;
}

export interface Task {
  id: string;
  moduleId: string;
  title: string;
  prompt: string;
  type: 'text' | 'choice';
  options: string[];            // [] für 'text'-Aufgaben
  answerKey: string | null;
  targetEventId: string | null;
  position: number;
  createdAt: string;
}

export interface TaskAnswerRow {
  id: string;
  task_id: string;
  user_id: string;
  value: string;
  submitted_at: string;
}

export interface TaskAnswer {
  id: string;
  taskId: string;
  userId: string;
  value: string;
  submittedAt: string;
}

// ------------------------------------------------------------------ //
//  Mapping                                                             //
// ------------------------------------------------------------------ //

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    moduleId: row.module_id,
    title: row.title,
    prompt: row.prompt,
    type: row.type,
    options: row.options ? JSON.parse(row.options) : [],
    answerKey: row.answer_key ?? null,
    targetEventId: row.target_event_id ?? null,
    position: row.position,
    createdAt: row.created_at,
  };
}

function toAnswer(row: TaskAnswerRow): TaskAnswer {
  return {
    id: row.id,
    taskId: row.task_id,
    userId: row.user_id,
    value: row.value,
    submittedAt: row.submitted_at,
  };
}

// ------------------------------------------------------------------ //
//  Task CRUD                                                           //
// ------------------------------------------------------------------ //

export function findByModule(moduleId: string): Task[] {
  const rows = all(
    'SELECT * FROM task WHERE module_id = ? ORDER BY position ASC, created_at ASC',
    [moduleId],
  ) as TaskRow[];
  return rows.map(toTask);
}

export function findById(id: string): Task | null {
  const row = get('SELECT * FROM task WHERE id = ?', [id]) as TaskRow | undefined;
  return row ? toTask(row) : null;
}

export interface CreateTaskData {
  title?: string;
  prompt: string;
  type?: 'text' | 'choice';
  options?: string[];
  answerKey?: string;
  targetEventId?: string;
  position?: number;
}

export function create(id: string, moduleId: string, data: CreateTaskData): Task {
  const { title = '', prompt, type = 'text', options, answerKey, targetEventId, position = 0 } = data;
  run(
    `INSERT INTO task (id, module_id, title, prompt, type, options, answer_key, target_event_id, position)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, moduleId, title, prompt, type,
      options && options.length > 0 ? JSON.stringify(options) : null,
      answerKey ?? null,
      targetEventId ?? null,
      position,
    ],
  );
  return findById(id)!;
}

export interface UpdateTaskData extends Partial<CreateTaskData> {}

export function update(id: string, data: UpdateTaskData): Task | null {
  const existing = findById(id);
  if (!existing) return null;

  const title      = data.title      !== undefined ? data.title      : existing.title;
  const prompt     = data.prompt     !== undefined ? data.prompt     : existing.prompt;
  const type       = data.type       !== undefined ? data.type       : existing.type;
  const options    = data.options    !== undefined ? data.options    : existing.options;
  const answerKey  = data.answerKey  !== undefined ? data.answerKey  : existing.answerKey;
  const targetEvId = data.targetEventId !== undefined ? data.targetEventId : existing.targetEventId;
  const position   = data.position   !== undefined ? data.position   : existing.position;

  run(
    `UPDATE task SET title=?, prompt=?, type=?, options=?, answer_key=?, target_event_id=?, position=?
     WHERE id=?`,
    [
      title, prompt, type,
      options && options.length > 0 ? JSON.stringify(options) : null,
      answerKey ?? null,
      targetEvId ?? null,
      position,
      id,
    ],
  );
  return findById(id);
}

export function remove(id: string): boolean {
  const existing = findById(id);
  if (!existing) return false;
  run('DELETE FROM task WHERE id = ?', [id]);
  return true;
}

// ------------------------------------------------------------------ //
//  Answers                                                             //
// ------------------------------------------------------------------ //

export function findAnswersByTask(taskId: string): TaskAnswer[] {
  const rows = all(
    'SELECT * FROM task_answer WHERE task_id = ? ORDER BY submitted_at DESC',
    [taskId],
  ) as TaskAnswerRow[];
  return rows.map(toAnswer);
}

export function findAnswersByUser(userId: string, moduleId: string): TaskAnswer[] {
  const rows = all(
    `SELECT ta.* FROM task_answer ta
     JOIN task t ON t.id = ta.task_id
     WHERE ta.user_id = ? AND t.module_id = ?
     ORDER BY t.position ASC`,
    [userId, moduleId],
  ) as TaskAnswerRow[];
  return rows.map(toAnswer);
}

export function findAnswer(taskId: string, userId: string): TaskAnswer | null {
  const row = get(
    'SELECT * FROM task_answer WHERE task_id = ? AND user_id = ?',
    [taskId, userId],
  ) as TaskAnswerRow | undefined;
  return row ? toAnswer(row) : null;
}

export function upsertAnswer(id: string, taskId: string, userId: string, value: string): TaskAnswer {
  run(
    `INSERT INTO task_answer (id, task_id, user_id, value)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(task_id, user_id) DO UPDATE SET value = excluded.value, submitted_at = CURRENT_TIMESTAMP`,
    [id, taskId, userId, value],
  );
  return findAnswer(taskId, userId)!;
}

export function deleteAnswer(taskId: string, userId: string): boolean {
  const existing = findAnswer(taskId, userId);
  if (!existing) return false;
  run('DELETE FROM task_answer WHERE task_id = ? AND user_id = ?', [taskId, userId]);
  return true;
}

// Alle Antworten für ein Modul (Lehrer-Auswertung) —
// gibt Aufgaben mit eingebetteten Antworten zurück
export interface TaskWithAnswers extends Task {
  answers: TaskAnswer[];
}

export function findAllWithAnswers(moduleId: string): TaskWithAnswers[] {
  const tasks = findByModule(moduleId);
  return tasks.map(task => ({
    ...task,
    answers: findAnswersByTask(task.id),
  }));
}
