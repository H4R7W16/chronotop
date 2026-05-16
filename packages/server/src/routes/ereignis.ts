import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/ereignis.repo.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:mid/events', async (req, res) => {
  res.json(await repo.findByModule(req.params.mid));
});

router.get('/:mid/events/:id', async (req, res) => {
  const event = await repo.findById(req.params.id);
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
  res.json(event);
});

router.post('/:mid/events', requireRole('author', 'mid'), async (req, res) => {
  const { title, description, placeId, timeObjectId, sourceIds } = req.body;
  if (!title || !placeId || !timeObjectId) {
    res.status(400).json({ error: 'title, placeId, and timeObjectId are required' });
    return;
  }
  const id = crypto.randomUUID();
  const event = await repo.create(id, req.params.mid, {
    title,
    description: description ?? '',
    placeId,
    timeObjectId,
    sourceIds: sourceIds ?? [],
    followsId: req.body.followsId,
    partOfId: req.body.partOfId,
  });
  res.status(201).json(event);
});

router.put('/:mid/events/:id', requireRole('author', 'mid'), async (req, res) => {
  const event = await repo.update(req.params.id, req.body);
  if (!event) { res.status(404).json({ error: 'Event not found' }); return; }
  res.json(event);
});

router.delete('/:mid/events/:id', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Event not found' }); return; }
  res.status(204).send();
});

export default router;
