import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { setupTestDb } from '../test/setup.js';
import authRoutes from './auth.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/auth', authRoutes);
  return app;
}

beforeEach(setupTestDb);

describe('Auth: Register → Login → Me → Logout', () => {
  it('registriert einen neuen Benutzer', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'test@example.com', password: 'geheim123', displayName: 'Testuser' });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe('test@example.com');
    expect(res.body.displayName).toBe('Testuser');
    // Erster User einer leeren DB wird framework_dev (Bootstrap)
    expect(['framework_dev', 'author', 'viewer']).toContain(res.body.role);
    expect(res.body).not.toHaveProperty('password_hash');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('lehnt doppelte E-Mail ab (409)', async () => {
    const app = createApp();
    await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'geheim123', displayName: 'Erster' });

    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'dup@example.com', password: 'anderes456', displayName: 'Zweiter' });

    expect(res.status).toBe(409);
  });

  it('lehnt zu kurzes Passwort ab (400)', async () => {
    const app = createApp();
    const res = await request(app)
      .post('/auth/register')
      .send({ email: 'kurz@example.com', password: 'abc', displayName: 'X' });

    expect(res.status).toBe(400);
  });

  it('vollständiger Flow: Register → Me → Login → Me → Logout → Me (401)', async () => {
    const app = createApp();

    // Register
    const regRes = await request(app)
      .post('/auth/register')
      .send({ email: 'flow@example.com', password: 'passw0rd!', displayName: 'Flow-User' });
    expect(regRes.status).toBe(201);
    const cookie = regRes.headers['set-cookie'] as string | string[];

    // Me (mit Cookie aus Register)
    const meRes = await request(app).get('/auth/me').set('Cookie', cookie);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe('flow@example.com');

    // Logout
    const logoutRes = await request(app).post('/auth/logout').set('Cookie', cookie);
    expect(logoutRes.status).toBe(204);

    // Login erneut
    const loginRes = await request(app)
      .post('/auth/login')
      .send({ email: 'flow@example.com', password: 'passw0rd!' });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.email).toBe('flow@example.com');
    const newCookie = loginRes.headers['set-cookie'] as string | string[];

    // Me (mit frischem Cookie aus Login)
    const me2Res = await request(app).get('/auth/me').set('Cookie', newCookie);
    expect(me2Res.status).toBe(200);

    // Me ohne Cookie → 401
    const unauthRes = await request(app).get('/auth/me');
    expect(unauthRes.status).toBe(401);
  });

  it('login schlägt mit falschen Zugangsdaten fehl (401)', async () => {
    const app = createApp();
    await request(app)
      .post('/auth/register')
      .send({ email: 'creds@example.com', password: 'richtig99', displayName: 'Test' });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'creds@example.com', password: 'falsch' });
    expect(res.status).toBe(401);
  });
});
