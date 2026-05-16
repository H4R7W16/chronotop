import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/quelle.repo.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:mid/sources', async (req, res) => {
  res.json(await repo.findByModule(req.params.mid));
});

router.post('/:mid/sources', requireRole('author', 'mid'), async (req, res) => {
  const { type, title, license } = req.body;
  if (!type || !title) {
    res.status(400).json({ error: 'type and title are required' });
    return;
  }
  const id = crypto.randomUUID();
  const source = await repo.create(id, req.params.mid, { ...req.body, license: license ?? 'CC-BY-SA 4.0' });
  res.status(201).json(source);
});

router.put('/:mid/sources/:id', requireRole('author', 'mid'), async (req, res) => {
  const source = await repo.update(req.params.id, req.body);
  if (!source) { res.status(404).json({ error: 'Source not found' }); return; }
  res.json(source);
});

router.delete('/:mid/sources/:id', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Source not found' }); return; }
  res.status(204).send();
});

export default router;
