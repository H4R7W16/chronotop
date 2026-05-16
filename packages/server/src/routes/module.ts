import { Router } from 'express';
import crypto from 'crypto';
import * as repo from '../repositories/module.repo.js';
import * as membershipRepo from '../repositories/module_membership.repo.js';
import { requireRole, requireAuth } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/', async (_req, res) => {
  res.json(await repo.findAll());
});

router.post('/', requireRole('author'), async (req, res) => {
  const { title, description, authorName } = req.body;
  if (!title || !authorName) {
    res.status(400).json({ error: 'title and authorName are required' });
    return;
  }
  const id = crypto.randomUUID();
  const module = await repo.create(id, {
    title,
    description: description ?? '',
    authorName,
    createdBy: req.user?.userId,
  });
  // Ersteller erhält automatisch Author-Mitgliedschaft im neuen Modul
  if (req.user) {
    await membershipRepo.grant(req.user.userId, id, 'author');
  }
  res.status(201).json(module);
});

router.get('/:id', async (req, res) => {
  const module = await repo.findById(req.params.id);
  if (!module) { res.status(404).json({ error: 'Module not found' }); return; }
  res.json(module);
});

// Liefert die effektive Rolle des eingeloggten Users für ein Modul
router.get('/:mid/my-role', requireAuth, async (req, res) => {
  const role = await membershipRepo.getEffectiveRole(
    req.user!.userId,
    req.user!.role,
    req.params.mid,
  );
  res.json({ role });
});

router.put('/:id', requireRole('author', 'id'), async (req, res) => {
  const module = await repo.update(req.params.id, req.body);
  if (!module) { res.status(404).json({ error: 'Module not found' }); return; }
  res.json(module);
});

router.delete('/:id', requireRole('author', 'id'), async (req, res) => {
  const deleted = await repo.remove(req.params.id);
  if (!deleted) { res.status(404).json({ error: 'Module not found' }); return; }
  res.status(204).send();
});

export default router;
