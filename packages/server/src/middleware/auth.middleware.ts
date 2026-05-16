import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { getEffectiveRole, ROLE_LEVEL } from '../repositories/module_membership.repo.js';

const JWT_SECRET = process.env.JWT_SECRET ?? 'dev-secret-change-in-production';
const COOKIE_NAME = 'session';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

function extractPayload(req: Request): JwtPayload | null {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  req.user = extractPayload(req) ?? undefined;
  next();
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const payload = extractPayload(req);
  if (!payload) {
    res.status(401).json({ error: 'Nicht angemeldet' });
    return;
  }
  req.user = payload;
  next();
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { httpOnly: true, sameSite: 'lax' });
}

/**
 * Middleware-Fabrik: prüft ob der angemeldete User mindestens `minRole` hat.
 * `midParam` ist optional der Name des Route-Parameters, der die Modul-ID enthält
 * (z. B. 'mid' oder 'id'). Mit ihm wird die effektive Rolle (global + Mitgliedschaft)
 * berechnet.
 *
 * Gibt 401 zurück wenn nicht angemeldet, 403 wenn die Rolle nicht ausreicht.
 */
export function requireRole(minRole: string, midParam?: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      res.status(401).json({ error: 'Nicht angemeldet' });
      return;
    }
    let effectiveRole = req.user.role;
    if (midParam) {
      const moduleId = req.params[midParam];
      if (moduleId) {
        effectiveRole = await getEffectiveRole(req.user.userId, req.user.role, moduleId);
      }
    }
    if ((ROLE_LEVEL[effectiveRole] ?? 0) < (ROLE_LEVEL[minRole] ?? 0)) {
      res.status(403).json({ error: 'Keine Berechtigung' });
      return;
    }
    next();
  };
}
