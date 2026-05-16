import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/concept.repo.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:mid/concepts', async (req, res) => {
  res.json(await repo.findByModule(req.params.mid));
});

router.post('/:mid/concepts', requireRole('author', 'mid'), async (req, res) => {
  const { kind, label } = req.body;
  if (!kind || !label) {
    res.status(400).json({ error: 'kind and label are required' });
    return;
  }
  const id = crypto.randomUUID();
  const concept = await repo.create(id, req.params.mid, req.body);
  res.status(201).json(concept);
});

router.put('/:mid/concepts/:id', requireRole('author', 'mid'), async (req, res) => {
  const concept = await repo.update(req.params.id, req.body);
  if (!concept) { res.status(404).json({ error: 'Concept not found' }); return; }
  res.json(concept);
});

router.delete('/:mid/concepts/:id', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Concept not found' }); return; }
  res.status(204).send();
});

export default router;
