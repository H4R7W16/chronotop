import { describe, it, expect, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { setupTestDb } from '../test/setup.js';
import authRoutes from './auth.js';
import moduleRoutes from './module.js';
import taskRoutes from './task.js';
import { optionalAuth } from '../middleware/auth.middleware.js';

function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(optionalAuth);
  app.use('/auth', authRoutes);
  app.use('/modules', moduleRoutes);
  app.use('/modules', taskRoutes);
  return app;
}

beforeEach(setupTestDb);

// ------------------------------------------------------------------ //
//  Hilfsfunktionen                                                     //
// ------------------------------------------------------------------ //

async function registerAndGetCookie(app: ReturnType<typeof createApp>, email: string, pw = 'passwort99') {
  const res = await request(app)
    .post('/auth/register')
    .send({ email, password: pw, displayName: email.split('@')[0] });
  return { cookie: res.headers['set-cookie'] as string | string[], user: res.body };
}

async function createModule(app: ReturnType<typeof createApp>, cookie: string | string[]) {
  const res = await request(app)
    .post('/modules')
    .set('Cookie', cookie)
    .send({ title: 'Test-Modul', description: '', authorName: 'Dev' });
  return res.body.id as string;
}

// ------------------------------------------------------------------ //
//  Tests                                                               //
// ------------------------------------------------------------------ //

describe('Aufgaben-API', () => {
  it('GET /modules/:mid/tasks — leere Liste bei neuem Modul', async () => {
    const app = createApp();
    const { cookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, cookie);

    const res = await request(app).get(`/modules/${mid}/tasks`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('Autor kann Textaufgabe anlegen', async () => {
    const app = createApp();
    const { cookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, cookie);

    const res = await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', cookie)
      .send({ title: 'Frage 1', prompt: 'Was war die Ursache?', type: 'text' });

    expect(res.status).toBe(201);
    expect(res.body.prompt).toBe('Was war die Ursache?');
    expect(res.body.type).toBe('text');
    expect(res.body.options).toEqual([]);
  });

  it('Autor kann Choice-Aufgabe anlegen', async () => {
    const app = createApp();
    const { cookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, cookie);

    const res = await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', cookie)
      .send({
        title: 'Multiple Choice',
        prompt: 'Wann begann der Erste Weltkrieg?',
        type: 'choice',
        options: ['1912', '1914', '1916'],
        answerKey: '1914',
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('choice');
    expect(res.body.options).toEqual(['1912', '1914', '1916']);
    expect(res.body.answerKey).toBe('1914');
  });

  it('Choice-Aufgabe ohne Optionen → 400', async () => {
    const app = createApp();
    const { cookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, cookie);

    const res = await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', cookie)
      .send({ prompt: 'Fehlerhafte Aufgabe', type: 'choice', options: ['nur eine'] });

    expect(res.status).toBe(400);
  });

  it('Anonym → 401 beim Anlegen', async () => {
    const app = createApp();
    const { cookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, cookie);

    const res = await request(app)
      .post(`/modules/${mid}/tasks`)
      .send({ prompt: 'Frage?', type: 'text' });

    expect(res.status).toBe(401);
  });

  it('Viewer → 403 beim Anlegen', async () => {
    const app = createApp();
    const { cookie: devCookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, devCookie);
    const { cookie: viewerCookie } = await registerAndGetCookie(app, 'viewer@example.com');

    const res = await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', viewerCookie)
      .send({ prompt: 'Darf ich nicht?', type: 'text' });

    expect(res.status).toBe(403);
  });

  it('Aufgabe bearbeiten und löschen', async () => {
    const app = createApp();
    const { cookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, cookie);

    const created = await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', cookie)
      .send({ prompt: 'Original', type: 'text' });
    const tid = created.body.id;

    const updated = await request(app)
      .put(`/modules/${mid}/tasks/${tid}`)
      .set('Cookie', cookie)
      .send({ prompt: 'Aktualisiert' });
    expect(updated.status).toBe(200);
    expect(updated.body.prompt).toBe('Aktualisiert');

    const deleted = await request(app)
      .delete(`/modules/${mid}/tasks/${tid}`)
      .set('Cookie', cookie);
    expect(deleted.status).toBe(204);

    const listRes = await request(app).get(`/modules/${mid}/tasks`);
    expect(listRes.body).toEqual([]);
  });

  it('Angemeldeter User kann Antwort einreichen und aktualisieren', async () => {
    const app = createApp();
    const { cookie: devCookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, devCookie);

    const taskRes = await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', devCookie)
      .send({ prompt: 'Erkläre …', type: 'text' });
    const tid = taskRes.body.id;

    const { cookie: learnerCookie } = await registerAndGetCookie(app, 'learner@example.com');

    // Erste Antwort
    const ans1 = await request(app)
      .post(`/modules/${mid}/tasks/${tid}/answer`)
      .set('Cookie', learnerCookie)
      .send({ value: 'Meine erste Antwort' });
    expect(ans1.status).toBe(201);
    expect(ans1.body.value).toBe('Meine erste Antwort');

    // Antwort aktualisieren (upsert)
    const ans2 = await request(app)
      .post(`/modules/${mid}/tasks/${tid}/answer`)
      .set('Cookie', learnerCookie)
      .send({ value: 'Überarbeitete Antwort' });
    expect(ans2.status).toBe(201);
    expect(ans2.body.value).toBe('Überarbeitete Antwort');
  });

  it('Anonym → 401 beim Antworten', async () => {
    const app = createApp();
    const { cookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, cookie);
    const taskRes = await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', cookie)
      .send({ prompt: 'Frage?', type: 'text' });

    const res = await request(app)
      .post(`/modules/${mid}/tasks/${taskRes.body.id}/answer`)
      .send({ value: 'Antwort ohne Login' });
    expect(res.status).toBe(401);
  });

  it('my-answers liefert eigene Antworten', async () => {
    const app = createApp();
    const { cookie: devCookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, devCookie);

    const t1 = (await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', devCookie)
      .send({ prompt: 'Frage 1', type: 'text' })).body.id;

    const t2 = (await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', devCookie)
      .send({ prompt: 'Frage 2', type: 'text' })).body.id;

    const { cookie: learnerCookie } = await registerAndGetCookie(app, 'learner@example.com');
    await request(app).post(`/modules/${mid}/tasks/${t1}/answer`).set('Cookie', learnerCookie).send({ value: 'A1' });
    await request(app).post(`/modules/${mid}/tasks/${t2}/answer`).set('Cookie', learnerCookie).send({ value: 'A2' });

    const myRes = await request(app).get(`/modules/${mid}/tasks/my-answers`).set('Cookie', learnerCookie);
    expect(myRes.status).toBe(200);
    expect(myRes.body).toHaveLength(2);
    expect(myRes.body.map((a: any) => a.value)).toContain('A1');
    expect(myRes.body.map((a: any) => a.value)).toContain('A2');
  });

  it('Lehrer-Auswertung: tasks-results enthält alle Antworten', async () => {
    const app = createApp();
    const { cookie: devCookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, devCookie);

    const tid = (await request(app)
      .post(`/modules/${mid}/tasks`)
      .set('Cookie', devCookie)
      .send({ prompt: 'Erkläre …', type: 'text' })).body.id;

    const { cookie: l1Cookie } = await registerAndGetCookie(app, 'l1@example.com');
    const { cookie: l2Cookie } = await registerAndGetCookie(app, 'l2@example.com');
    await request(app).post(`/modules/${mid}/tasks/${tid}/answer`).set('Cookie', l1Cookie).send({ value: 'Antwort L1' });
    await request(app).post(`/modules/${mid}/tasks/${tid}/answer`).set('Cookie', l2Cookie).send({ value: 'Antwort L2' });

    const resultsRes = await request(app)
      .get(`/modules/${mid}/tasks-results`)
      .set('Cookie', devCookie);
    expect(resultsRes.status).toBe(200);
    expect(resultsRes.body).toHaveLength(1);
    expect(resultsRes.body[0].answers).toHaveLength(2);
    const values = resultsRes.body[0].answers.map((a: any) => a.value);
    expect(values).toContain('Antwort L1');
    expect(values).toContain('Antwort L2');
  });

  it('Viewer kann tasks-results nicht sehen (403)', async () => {
    const app = createApp();
    const { cookie: devCookie } = await registerAndGetCookie(app, 'dev@example.com');
    const mid = await createModule(app, devCookie);
    const { cookie: viewerCookie } = await registerAndGetCookie(app, 'viewer@example.com');

    const res = await request(app)
      .get(`/modules/${mid}/tasks-results`)
      .set('Cookie', viewerCookie);
    expect(res.status).toBe(403);
  });
});
