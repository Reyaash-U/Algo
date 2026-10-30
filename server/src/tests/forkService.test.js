import test from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { forkNote, forkSheet } from '../services/forkService.js';

const newUser = (tag) =>
  prisma.user.create({ data: { email: `fork-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.com`, passwordHash: 'x', displayName: `Fork ${tag}` } });

async function withUsers(fn) {
  const [owner, other] = [await newUser('owner'), await newUser('other')];
  try {
    await fn(owner, other);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: [owner.id, other.id] } } });
  }
}

test('forking someone else\'s note twice returns the same copy and counts once', () =>
  withUsers(async (owner, other) => {
    const note = await prisma.note.create({ data: { ownerId: owner.id, title: 'Two Sum', contentMarkdown: 'hash map', visibility: 'public' } });

    const first = await forkNote(note.id, other.id);
    assert.equal(first.created, true);
    assert.equal(first.note.forkOfId, note.id);

    const second = await forkNote(note.id, other.id);
    assert.equal(second.created, false);
    assert.equal(second.note.id, first.note.id);

    assert.equal((await prisma.note.findUnique({ where: { id: note.id } })).forkCount, 1);
    assert.equal(await prisma.note.count({ where: { ownerId: other.id } }), 1);
  }));

test('a deleted copy can be forked again, and forking your own note duplicates it', () =>
  withUsers(async (owner, other) => {
    const note = await prisma.note.create({ data: { ownerId: owner.id, title: 'DP', contentMarkdown: 'x', visibility: 'public' } });

    const first = await forkNote(note.id, other.id);
    await prisma.note.update({ where: { id: first.note.id }, data: { deletedAt: new Date() } });
    const again = await forkNote(note.id, other.id);
    assert.equal(again.created, true);
    assert.notEqual(again.note.id, first.note.id);

    const mine1 = await forkNote(note.id, owner.id);
    const mine2 = await forkNote(note.id, owner.id);
    assert.equal(mine1.created && mine2.created, true); // deliberate duplicates of your own note
    assert.notEqual(mine1.note.id, mine2.note.id);
  }));

test('forking someone else\'s sheet twice returns the same copy and counts once', () =>
  withUsers(async (owner, other) => {
    const sheet = await prisma.sheet.create({
      data: { ownerId: owner.id, title: 'Sheet', visibility: 'public', items: { create: [{ title: 'A', position: 0 }, { title: 'B', position: 1 }] } },
    });

    const first = await forkSheet(sheet.id, other.id);
    assert.equal(first.created, true);
    assert.equal(first.sheet.items.length, 2);

    const second = await forkSheet(sheet.id, other.id);
    assert.equal(second.created, false);
    assert.equal(second.sheet.id, first.sheet.id);
    assert.equal(second.sheet.items.length, 2); // existing copy comes back with its items

    assert.equal((await prisma.sheet.findUnique({ where: { id: sheet.id } })).forkCount, 1);
    assert.equal(await prisma.sheet.count({ where: { ownerId: other.id } }), 1);

    // Your own sheet still duplicates, titled "(Copy)".
    const copy = await forkSheet(sheet.id, owner.id);
    assert.equal(copy.created, true);
    assert.equal(copy.sheet.title, 'Sheet (Copy)');
  }));
