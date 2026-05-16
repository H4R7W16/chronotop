import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/ort.repo.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:mid/places', async (req, res) => {
  res.json(await repo.findByModule(req.params.mid));
});

router.post('/:mid/places', requireRole('author', 'mid'), async (req, res) => {
  const {
    name, lat, lng, wikidataId, description, geometry,
    validFrom, validTo, certainty, sourceOfClaim,
  } = req.body;
  if (!name || lat == null || lng == null) {
    res.status(400).json({ error: 'name, lat, and lng are required' });
    return;
  }
  const id = crypto.randomUUID();
  const place = await repo.create(id, req.params.mid, {
    name, lat, lng, wikidataId, description, geometry,
    validFrom, validTo, certainty, sourceOfClaim,
  });
  res.status(201).json(place);
});

router.put('/:mid/places/:id', requireRole('author', 'mid'), async (req, res) => {
  const place = await repo.update(req.params.id, req.body);
  if (!place) { res.status(404).json({ error: 'Place not found' }); return; }
  res.json(place);
});

router.delete('/:mid/places/:id', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Place not found' }); return; }
  res.status(204).send();
});

export default router;
