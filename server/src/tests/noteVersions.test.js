import { test } from 'node:test';
import assert from 'node:assert/strict';
import { prisma } from '../config/db.js';
import { updateNote } from '../services/noteService.js';

test('updateNote snapshots the prior title/content into versions when either changes', async () => {
  const existing = {
    title: 'Old Title',
    contentMarkdown: 'Old content',
    versions: [],
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };
  const originalFind = prisma.note.findUnique;
  const originalUpdate = prisma.note.update;
  let capturedData;

  prisma.note.findUnique = async () => existing;
  prisma.note.update = async ({ data }) => {
    capturedData = data;
    return { id: 'note-1', ...existing, ...data };
  };

  try {
    await updateNote('note-1', { title: 'New Title' });
    assert.equal(capturedData.versions.length, 1);
    assert.equal(capturedData.versions[0].title, 'Old Title');
    assert.equal(capturedData.versions[0].contentMarkdown, 'Old content');
    assert.equal(capturedData.versions[0].savedAt, '2025-01-01T00:00:00.000Z');
  } finally {
    prisma.note.findUnique = originalFind;
    prisma.note.update = originalUpdate;
  }
});

test('updateNote does not touch versions when only tags/confidence change', async () => {
  const originalUpdate = prisma.note.update;
  let capturedData;

  prisma.note.update = async ({ data }) => {
    capturedData = data;
    return { id: 'note-1', ...data };
  };

  try {
    await updateNote('note-1', { confidence: 4, patternTags: ['dp'] });
    assert.equal(capturedData.versions, undefined);
  } finally {
    prisma.note.update = originalUpdate;
  }
});

test('updateNote caps version history at 50 entries', async () => {
  const existing = {
    title: 'Old Title',
    contentMarkdown: 'Old content',
    versions: Array.from({ length: 50 }, (_, i) => ({ title: `v${i}`, contentMarkdown: '', savedAt: '2025-01-01T00:00:00.000Z' })),
    updatedAt: new Date('2025-01-01T00:00:00Z'),
  };
  const originalFind = prisma.note.findUnique;
  const originalUpdate = prisma.note.update;
  let capturedData;

  prisma.note.findUnique = async () => existing;
  prisma.note.update = async ({ data }) => {
    capturedData = data;
    return { id: 'note-1', ...existing, ...data };
  };

  try {
    await updateNote('note-1', { title: 'Newest Title' });
    assert.equal(capturedData.versions.length, 50);
    assert.equal(capturedData.versions[capturedData.versions.length - 1].title, 'Old Title');
    assert.equal(capturedData.versions[0].title, 'v1');
  } finally {
    prisma.note.findUnique = originalFind;
    prisma.note.update = originalUpdate;
  }
});
