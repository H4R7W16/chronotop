import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/actor.repo.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:mid/actors', async (req, res) => {
  res.json(await repo.findByModule(req.params.mid));
});

router.post('/:mid/actors', requireRole('author', 'mid'), async (req, res) => {
  const { type, name } = req.body;
  if (!type || !name) {
    res.status(400).json({ error: 'type and name are required' });
    return;
  }
  const id = crypto.randomUUID();
  const actor = await repo.create(id, req.params.mid, req.body);
  res.status(201).json(actor);
});

router.put('/:mid/actors/:id', requireRole('author', 'mid'), async (req, res) => {
  const actor = await repo.update(req.params.id, req.body);
  if (!actor) { res.status(404).json({ error: 'Actor not found' }); return; }
  res.json(actor);
});

router.delete('/:mid/actors/:id', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Actor not found' }); return; }
  res.status(204).send();
});

export default router;
