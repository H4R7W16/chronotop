import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/revision.repo.js';
import { buildJsonLd } from '../services/jsonld.service.js';
import { requireRole } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:mid/revisions', async (req, res) => {
  const list = (await repo.findByModule(req.params.mid)).map(r => ({
    id: r.id, version: r.version, message: r.message, creator: r.creator, createdAt: r.createdAt,
  }));
  res.json(list);
});

router.get('/:mid/revisions/:rid', async (req, res) => {
  const rev = await repo.findById(req.params.rid);
  if (!rev || rev.moduleId !== req.params.mid) {
    res.status(404).json({ error: 'Revision not found' });
    return;
  }
  res.json(rev);
});

/**
 * Veröffentlicht den aktuellen Modul-Stand als zitierfähige Revision.
 * Body: { version: string, message?: string, creator?: string }
 *
 * Erzeugt einen frischen JSON-LD-Snapshot des Moduls und legt ihn ab.
 * Pro (Modul, Version) ist nur eine Revision möglich (UNIQUE-Constraint).
 */
router.post('/:mid/revisions', requireRole('author', 'mid'), async (req, res) => {
  const { version, message, creator } = req.body;
  if (!version || typeof version !== 'string') {
    res.status(400).json({ error: 'version is required' });
    return;
  }

  const snapshot = await buildJsonLd(req.params.mid);
  if (!snapshot) {
    res.status(404).json({ error: 'Module not found' });
    return;
  }

  // Prüfen ob Version schon existiert
  if (await repo.findByModuleAndVersion(req.params.mid, version)) {
    res.status(409).json({ error: `Version "${version}" existiert bereits in diesem Modul` });
    return;
  }

  const id = crypto.randomUUID();
  const rev = await repo.create(id, req.params.mid, { version, message, creator }, snapshot);
  res.status(201).json(rev);
});

router.delete('/:mid/revisions/:rid', requireRole('author', 'mid'), async (req, res) => {
  const rev = await repo.findById(req.params.rid);
  if (!rev || rev.moduleId !== req.params.mid) {
    res.status(404).json({ error: 'Revision not found' });
    return;
  }
  await repo.remove(req.params.rid);
  res.status(204).send();
});

export default router;
