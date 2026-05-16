import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/movement.repo.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

/** GET /:mid/movements — alle Routen eines Moduls (öffentlich) */
router.get('/:mid/movements', async (req, res) => {
  res.json(await repo.findByModule(req.params.mid));
});

/** GET /:mid/movements/:id — einzelne Route */
router.get('/:mid/movements/:id', async (req, res) => {
  const m = await repo.findById(req.params.id);
  if (!m || m.moduleId !== req.params.mid) {
    res.status(404).json({ error: 'Bewegung nicht gefunden' }); return;
  }
  res.json(m);
});

/** POST /:mid/movements — neue Route anlegen (author+) */
router.post('/:mid/movements', requireRole('author', 'mid'), async (req, res) => {
  const { coordinates, name, description, color, eventId } = req.body;
  if (!Array.isArray(coordinates) || coordinates.length < 2) {
    res.status(400).json({ error: 'coordinates muss ein Array mit mindestens 2 Punkten sein' });
    return;
  }
  const id = crypto.randomUUID();
  const movement = await repo.create(id, req.params.mid, {
    coordinates, name, description, color, eventId,
  });
  res.status(201).json(movement);
});

/** PUT /:mid/movements/:id — Route bearbeiten (author+) */
router.put('/:mid/movements/:id', requireRole('author', 'mid'), async (req, res) => {
  const m = await repo.update(req.params.id, req.body);
  if (!m) { res.status(404).json({ error: 'Bewegung nicht gefunden' }); return; }
  res.json(m);
});

/** DELETE /:mid/movements/:id — Route löschen (author+) */
router.delete('/:mid/movements/:id', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Bewegung nicht gefunden' }); return; }
  res.status(204).send();
});

export default router;
