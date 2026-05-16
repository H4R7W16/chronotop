import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/task.repo.js';
import { requireRole, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

// ------------------------------------------------------------------ //
//  Aufgaben-CRUD (nur für Autoren/Devs)                               //
// ------------------------------------------------------------------ //

/** GET /:mid/tasks — Liste aller Aufgaben eines Moduls (öffentlich lesbar) */
router.get('/:mid/tasks', async (req, res) => {
  res.json(await repo.findByModule(req.params.mid));
});

/** POST /:mid/tasks — Aufgabe anlegen (author+) */
router.post('/:mid/tasks', requireRole('author', 'mid'), async (req, res) => {
  const { title, prompt, type, options, answerKey, targetEventId, position } = req.body;
  if (!prompt) {
    res.status(400).json({ error: 'prompt ist erforderlich' });
    return;
  }
  if (type === 'choice' && (!Array.isArray(options) || options.length < 2)) {
    res.status(400).json({ error: 'choice-Aufgaben brauchen mindestens 2 Optionen' });
    return;
  }
  const id = crypto.randomUUID();
  const task = await repo.create(id, req.params.mid, {
    title, prompt, type, options, answerKey, targetEventId, position,
  });
  res.status(201).json(task);
});

/** PUT /:mid/tasks/:tid — Aufgabe bearbeiten (author+) */
router.put('/:mid/tasks/:tid', requireRole('author', 'mid'), async (req, res) => {
  const task = await repo.update(req.params.tid, req.body);
  if (!task) { res.status(404).json({ error: 'Aufgabe nicht gefunden' }); return; }
  res.json(task);
});

/** DELETE /:mid/tasks/:tid — Aufgabe löschen (author+) */
router.delete('/:mid/tasks/:tid', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.tid);
  if (!deleted) { res.status(404).json({ error: 'Aufgabe nicht gefunden' }); return; }
  res.status(204).send();
});

// ------------------------------------------------------------------ //
//  Antworten                                                           //
// ------------------------------------------------------------------ //

/**
 * POST /:mid/tasks/:tid/answer — Antwort einreichen oder aktualisieren
 * Jeder angemeldete User kann antworten (auch viewer/learner).
 */
router.post('/:mid/tasks/:tid/answer', requireAuth, async (req, res) => {
  const { value } = req.body;
  if (value === undefined || value === null) {
    res.status(400).json({ error: 'value ist erforderlich' });
    return;
  }
  const task = await repo.findById(req.params.tid);
  if (!task || task.moduleId !== req.params.mid) {
    res.status(404).json({ error: 'Aufgabe nicht gefunden' }); return;
  }
  const id = crypto.randomUUID();
  const answer = await repo.upsertAnswer(id, req.params.tid, req.user!.userId, String(value));
  res.status(201).json(answer);
});

/**
 * DELETE /:mid/tasks/:tid/answer — eigene Antwort zurückziehen
 */
router.delete('/:mid/tasks/:tid/answer', requireAuth, async (req, res) => {
  const deleted = await repo.deleteAnswer(req.params.tid, req.user!.userId);
  if (!deleted) { res.status(404).json({ error: 'Keine Antwort gefunden' }); return; }
  res.status(204).send();
});

/**
 * GET /:mid/tasks/my-answers — alle eigenen Antworten für ein Modul
 */
router.get('/:mid/tasks/my-answers', requireAuth, async (req, res) => {
  const answers = await repo.findAnswersByUser(req.user!.userId, req.params.mid);
  res.json(answers);
});

/**
 * GET /:mid/tasks/:tid/answers — alle Antworten einer Aufgabe (nur author+)
 * Lehrkraft-Auswertung.
 */
router.get('/:mid/tasks/:tid/answers', requireRole('author', 'mid'), async (req, res) => {
  const task = await repo.findById(req.params.tid);
  if (!task || task.moduleId !== req.params.mid) {
    res.status(404).json({ error: 'Aufgabe nicht gefunden' }); return;
  }
  res.json(await repo.findAnswersByTask(req.params.tid));
});

/**
 * GET /:mid/tasks-results — alle Aufgaben + alle Antworten (Lehrkraft-Übersicht)
 * Kompakt: gibt Aufgaben-Objekte mit eingebetteten Antworten zurück.
 */
router.get('/:mid/tasks-results', requireRole('author', 'mid'), async (req, res) => {
  res.json(await repo.findAllWithAnswers(req.params.mid));
});

export default router;
