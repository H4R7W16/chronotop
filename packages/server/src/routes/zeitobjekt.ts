import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/zeitobjekt.repo.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:mid/time-objects', async (req, res) => {
  res.json(await repo.findByModule(req.params.mid));
});

router.post('/:mid/time-objects', requireRole('author', 'mid'), async (req, res) => {
  const { type, date, startDate, endDate, certainty, label } = req.body;
  if (!type || !label) {
    res.status(400).json({ error: 'type and label are required' });
    return;
  }
  const id = crypto.randomUUID();
  const obj = await repo.create(id, req.params.mid, { type, date, startDate, endDate, certainty: certainty ?? 'certain', label });
  res.status(201).json(obj);
});

router.put('/:mid/time-objects/:id', requireRole('author', 'mid'), async (req, res) => {
  const obj = await repo.update(req.params.id, req.body);
  if (!obj) { res.status(404).json({ error: 'TimeObject not found' }); return; }
  res.json(obj);
});

router.delete('/:mid/time-objects/:id', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'TimeObject not found' }); return; }
  res.status(204).send();
});

export default router;
