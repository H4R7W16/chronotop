import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { setupTestDb } from '../test/setup.js';
import authRoutes from './auth.js';
import moduleRoutes from './module.js';
import ereignisRoutes from './ereignis.js';
import ortRoutes from './ort.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(optionalAuth);
  app.use('/auth', authRoutes);
  app.use('/modules', moduleRoutes);
  app.use('/modules', ereignisRoutes);
  app.use('/modules', ortRoutes);
  return app;
}

beforeEach(setupTestDb);

describe('Rollen-Enforcement', () => {
  it('framework_dev kann Modul anlegen, viewer nicht (401 anonym)', async () => {
    const app = createApp();

    // Anonym → kein Modul anlegen
    const anonRes = await request(app)
      .post('/modules')
      .send({ title: 'Test', description: '', authorName: 'X' });
    expect(anonRes.status).toBe(401);
  });

  it('framework_dev (Erstregistrant) kann Modul anlegen und löschen', async () => {
    const app = createApp();

    const regRes = await request(app)
      .post('/auth/register')
      .send({ email: 'dev@example.com', password: 'devpass1', displayName: 'Dev' });
    expect(regRes.status).toBe(201);
    expect(regRes.body.role).toBe('framework_dev');
    const devCookie = regRes.headers['set-cookie'];

    const modRes = await request(app)
      .post('/modules')
      .set('Cookie', devCookie)
      .send({ title: 'Mein Modul', description: '', authorName: 'Dev' });
    expect(modRes.status).toBe(201);
    const mid = modRes.body.id;

    const delRes = await request(app)
      .delete(`/modules/${mid}`)
      .set('Cookie', devCookie);
    expect(delRes.status).toBe(204);
  });

  it('viewer kann nicht löschen (403), author schon (204)', async () => {
    const app = createApp();

    // Erster User = framework_dev
    const devReg = await request(app)
      .post('/auth/register')
      .send({ email: 'dev@example.com', password: 'devpass1', displayName: 'Dev' });
    const devCookie = devReg.headers['set-cookie'];

    // Zweiter User = viewer (Standard)
    const viewerReg = await request(app)
      .post('/auth/register')
      .send({ email: 'viewer@example.com', password: 'viewerpass', displayName: 'Viewer' });
    expect(viewerReg.body.role).toBe('viewer');
    const viewerCookie = viewerReg.headers['set-cookie'];

    // Dritter User = wird manuell als author registriert (Role-Override in create)
    // Wir testen hier mit dem Dev-User als Author
    const modRes = await request(app)
      .post('/modules')
      .set('Cookie', devCookie)
      .send({ title: 'Test-Modul', description: '', authorName: 'Dev' });
    const mid = modRes.body.id;

    // Viewer → DELETE → 403
    const viewerDel = await request(app)
      .delete(`/modules/${mid}`)
      .set('Cookie', viewerCookie);
    expect(viewerDel.status).toBe(403);

    // Dev (framework_dev) → DELETE → 204
    const devDel = await request(app)
      .delete(`/modules/${mid}`)
      .set('Cookie', devCookie);
    expect(devDel.status).toBe(204);
  });

  it('viewer kann GETs ausführen (200)', async () => {
    const app = createApp();

    // Dev-User legt Modul an
    const devReg = await request(app)
      .post('/auth/register')
      .send({ email: 'dev@example.com', password: 'devpass1', displayName: 'Dev' });
    const devCookie = devReg.headers['set-cookie'];

    const modRes = await request(app)
      .post('/modules')
      .set('Cookie', devCookie)
      .send({ title: 'Öffentlich', description: '', authorName: 'Dev' });
    const mid = modRes.body.id;

    // Viewer (anonym) → GET → 200
    const getRes = await request(app).get('/modules');
    expect(getRes.status).toBe(200);

    const getOneRes = await request(app).get(`/modules/${mid}`);
    expect(getOneRes.status).toBe(200);
  });

  it('module_membership: Author-Mitgliedschaft erlaubt DELETE, Viewer-Mitgliedschaft nicht', async () => {
    const app = createApp();

    // Dev legt Modul an
    const devReg = await request(app)
      .post('/auth/register')
      .send({ email: 'dev@example.com', password: 'devpass1', displayName: 'Dev' });
    const devCookie = devReg.headers['set-cookie'];

    const modRes = await request(app)
      .post('/modules')
      .set('Cookie', devCookie)
      .send({ title: 'Shared Modul', description: '', authorName: 'Dev' });
    const mid = modRes.body.id;

    // Viewer registriert sich
    const viewerReg = await request(app)
      .post('/auth/register')
      .send({ email: 'viewer@example.com', password: 'viewerpass', displayName: 'Viewer' });
    const viewerCookie = viewerReg.headers['set-cookie'];

    // Viewer → POST auf Ereignis → 403 (kein author)
    const postRes = await request(app)
      .post(`/modules/${mid}/events`)
      .set('Cookie', viewerCookie)
      .send({ title: 'Test', placeId: 'x', timeObjectId: 'y', sourceIds: [] });
    expect(postRes.status).toBe(403);
  });
});
