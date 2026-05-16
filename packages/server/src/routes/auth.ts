import { Router } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import * as userRepo from '../repositories/user.repo.js';
import { requireAuth, signToken, setSessionCookie, clearSessionCookie } from '../middleware/auth.middleware.js';

const router = Router();

// POST /auth/register
router.post('/register', async (req, res) => {
  const { email, password, displayName } = req.body;
  if (!email || !password || !displayName) {
    res.status(400).json({ error: 'email, password und displayName sind erforderlich' });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Passwort muss mindestens 8 Zeichen haben' });
    return;
  }
  if (await userRepo.findByEmail(email)) {
    res.status(409).json({ error: 'E-Mail-Adresse bereits vergeben' });
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const id = crypto.randomUUID();
  const user = await userRepo.create(id, email, passwordHash, displayName);

  const token = signToken({ userId: user.id, email: user.email, role: user.role });
  setSessionCookie(res, token);
  res.status(201).json(user);
});

// POST /auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'email und password sind erforderlich' });
    return;
  }

  const row = await userRepo.findByEmail(email);
  if (!row) {
    res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    return;
  }

  const valid = await bcrypt.compare(password, row.password_hash);
  if (!valid) {
    res.status(401).json({ error: 'Ungültige Zugangsdaten' });
    return;
  }

  const token = signToken({ userId: row.id, email: row.email, role: row.role });
  setSessionCookie(res, token);
  res.json(userRepo.toPublic(row));
});

// POST /auth/logout
router.post('/logout', (_req, res) => {
  clearSessionCookie(res);
  res.status(204).send();
});

// GET /auth/me
router.get('/me', requireAuth, async (req, res) => {
  const row = await userRepo.findById(req.user!.userId);
  if (!row) {
    res.status(404).json({ error: 'Benutzer nicht gefunden' });
    return;
  }
  res.json(userRepo.toPublic(row));
});

export default router;
