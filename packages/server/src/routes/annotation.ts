import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/annotation.repo.js';
import { requireRole, optionalAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/:mid/annotations', async (req, res) => {
  const { kind, target } = req.query;
  if (typeof kind === 'string' && typeof target === 'string') {
    res.json(await repo.findByTarget(req.params.mid, kind, target));
    return;
  }
  res.json(await repo.findByModule(req.params.mid));
});

// P2.6: Lernenden-Annotationen — authentifizierte Nutzer (author/learner) können Annotationen erstellen
router.post('/:mid/annotations', requireRole('learner', 'mid'), async (req, res) => {
  const { motivation, body, target } = req.body;
  if (!motivation || !body || !Array.isArray(target) || target.length === 0) {
    res.status(400).json({ error: 'motivation, body and non-empty target array are required' });
    return;
  }
  const id = crypto.randomUUID();
  // creatorRole automatisch von req.user.role ableiten
  // 'framework_dev' und 'author' → 'author', 'learner' und 'viewer' → 'learner'
  const creatorRole = (req.user?.role === 'learner' || req.user?.role === 'viewer') ? 'learner' : 'author';
  const annotation = await repo.create(id, req.params.mid, { ...req.body, creatorRole });
  res.status(201).json(annotation);
});

router.put('/:mid/annotations/:id', requireRole('author', 'mid'), async (req, res) => {
  const annotation = await repo.update(req.params.id, req.body);
  if (!annotation) { res.status(404).json({ error: 'Annotation not found' }); return; }
  res.json(annotation);
});

router.delete('/:mid/annotations/:id', requireRole('author', 'mid'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Annotation not found' }); return; }
  res.status(204).send();
});

export default router;
