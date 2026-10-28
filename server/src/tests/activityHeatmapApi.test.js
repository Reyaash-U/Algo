import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../app.js';
import { prisma } from '../config/db.js';
import { env } from '../config/env.js';

let server;
let baseUrl;
let testUser;
let token;

before(async () => {
  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}`;
      resolve();
    });
  });

  testUser = await prisma.user.create({
    data: {
      email: `api_heat_test_${Date.now()}@example.com`,
      passwordHash: 'dummy',
      displayName: 'API Heat User',
      role: 'user',
    },
  });

  token = jwt.sign(
    { sub: testUser.id, role: testUser.role, tokenVersion: 0 },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' },
  );

  // Add 2 submissions for testUser on 2026-09-10
  await prisma.submission.createMany({
    data: [
      { userId: testUser.id, submittedAt: new Date('2026-09-10T10:00:00Z'), status: 'accepted' },
      { userId: testUser.id, submittedAt: new Date('2026-09-10T15:00:00Z'), status: 'accepted' },
    ],
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  if (testUser) {
    await prisma.submission.deleteMany({ where: { userId: testUser.id } });
    await prisma.user.delete({ where: { id: testUser.id } }).catch(() => null);
  }
});

test('GET /api/dashboard/activity-heatmap without token returns 401 Unauthorized', async () => {
  const res = await fetch(`${baseUrl}/api/dashboard/activity-heatmap`);
  assert.equal(res.status, 401);
  const data = await res.json();
  assert.equal(data.ok, false);
});

test('GET /api/dashboard/activity-heatmap with valid token returns real aggregated data', async () => {
  const res = await fetch(`${baseUrl}/api/dashboard/activity-heatmap?from=2026-09-09&to=2026-09-11`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  assert.equal(res.status, 200);
  const json = await res.json();
  assert.equal(json.ok, true);
  assert.equal(json.data.from, '2026-09-09');
  assert.equal(json.data.to, '2026-09-11');
  assert.equal(json.data.total, 2);
  assert.equal(json.data.days.length, 3);

  const day10 = json.data.days.find((d) => d.date === '2026-09-10');
  assert.ok(day10);
  assert.equal(day10.count, 2);

  const day09 = json.data.days.find((d) => d.date === '2026-09-09');
  assert.ok(day09);
  assert.equal(day09.count, 0);
});

test('POST /api/submissions creates a submission and reflects in activity-heatmap', async () => {
  const subRes = await fetch(`${baseUrl}/api/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: 'accepted',
      language: 'python',
      submittedAt: new Date('2026-09-11T09:00:00Z'),
    }),
  });

  assert.equal(subRes.status, 201);
  const subJson = await subRes.json();
  assert.equal(subJson.ok, true);
  assert.equal(subJson.data.status, 'accepted');

  // Verify the day count increased on 2026-09-11
  const heatRes = await fetch(`${baseUrl}/api/dashboard/activity-heatmap?from=2026-09-11&to=2026-09-11`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const heatJson = await heatRes.json();
  assert.equal(heatJson.ok, true);
  assert.equal(heatJson.data.total, 1);
  assert.equal(heatJson.data.days[0].date, '2026-09-11');
  assert.equal(heatJson.data.days[0].count, 1);
});
