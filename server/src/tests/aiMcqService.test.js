import test from 'node:test';
import assert from 'node:assert/strict';
import { env } from '../config/env.js';
import { callGemini, getAiMcqsForNote, clearAiMcqCache } from '../services/aiMcqService.js';

// We don't want tests to hit real Gemini. All tests inject their own fetch
// and set an API key so the "no key -> []" short-circuit doesn't trigger.
const originalKey = env.GEMINI_API_KEY;
test.before(() => { env.GEMINI_API_KEY = 'test-key'; });
test.after(() => { env.GEMINI_API_KEY = originalKey; });
test.beforeEach(() => { clearAiMcqCache(); });

const geminiReply = (text) => async () => ({ ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text }] } }] }) });

const sampleJson = JSON.stringify({
  questions: [
    { category: 'Data Structure', question: 'Which DS?', options: ['Hash Map', 'Stack', 'Queue', 'Trie'], correctIndex: 0, explanation: 'A hash map gives O(1) lookup.' },
    { category: 'Time Complexity', question: 'What is the time?', options: ['O(1)', 'O(n)', 'O(n^2)', 'O(log n)'], correctIndex: 1, explanation: 'Single scan.' },
  ],
});

test('callGemini returns an empty array when no API key is configured', async () => {
  env.GEMINI_API_KEY = '';
  try {
    assert.deepEqual(await callGemini({ id: 'n', title: 'x' }, geminiReply(sampleJson)), []);
  } finally {
    env.GEMINI_API_KEY = 'test-key';
  }
});

test('callGemini parses valid JSON and tags each question as AI-generated', async () => {
  const q = await callGemini({ id: 'n1', title: 'Two Sum', patternTags: ['hashmap'], codeBlocks: [], updatedAt: new Date() }, geminiReply(sampleJson));
  assert.equal(q.length, 2);
  assert.ok(q.every((x) => x.aiGenerated === true));
  assert.ok(q[0].category.startsWith('AI:'));
  assert.equal(q[0].options[q[0].correctIndex], 'Hash Map');
});

test('callGemini strips ```json fences before parsing', async () => {
  const wrapped = '```json\n' + sampleJson + '\n```';
  const q = await callGemini({ id: 'n2', title: 'x', codeBlocks: [], updatedAt: new Date() }, geminiReply(wrapped));
  assert.equal(q.length, 2);
});

test('callGemini drops malformed questions and keeps the valid ones', async () => {
  const mixed = JSON.stringify({
    questions: [
      { category: 'ok', question: 'Good', options: ['a', 'b', 'c', 'd'], correctIndex: 2, explanation: 'ok' },
      { category: 'bad', question: 'three only', options: ['a', 'b', 'c'], correctIndex: 0, explanation: 'nope' },
      { category: 'bad', question: 'index out of range', options: ['a', 'b', 'c', 'd'], correctIndex: 5, explanation: '' },
      { category: 'bad', question: 'duplicate option', options: ['a', 'a', 'b', 'c'], correctIndex: 0, explanation: '' },
      { category: 'ok', question: 'Also good', options: ['a', 'b', 'c', 'd'], correctIndex: 0, explanation: 'ok' },
    ],
  });
  const q = await callGemini({ id: 'n3', title: 'x', codeBlocks: [], updatedAt: new Date() }, geminiReply(mixed));
  assert.deepEqual(q.map((x) => x.question), ['Good', 'Also good']);
});

test('callGemini returns [] when the body is not JSON', async () => {
  const q = await callGemini({ id: 'n4', title: 'x', codeBlocks: [], updatedAt: new Date() }, geminiReply('Sorry, I can’t help with that.'));
  assert.deepEqual(q, []);
});

test('callGemini returns [] on HTTP errors (quota, 500, etc.)', async () => {
  const err = async () => ({ ok: false, json: async () => ({}) });
  assert.deepEqual(await callGemini({ id: 'n5', title: 'x', codeBlocks: [], updatedAt: new Date() }, err), []);
});

test('callGemini returns [] when the fetch throws (timeout, network error)', async () => {
  const throws = async () => { throw new Error('timeout'); };
  assert.deepEqual(await callGemini({ id: 'n6', title: 'x', codeBlocks: [], updatedAt: new Date() }, throws), []);
});

test('getAiMcqsForNote caches by updatedAt and only calls Gemini when the note changes', async () => {
  let calls = 0;
  const counting = async () => { calls += 1; return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: sampleJson }] } }] }) }; };
  const note = { id: 'cache-1', title: 'x', codeBlocks: [], updatedAt: new Date('2026-10-31T10:00:00Z') };
  await getAiMcqsForNote(note, counting);
  await getAiMcqsForNote(note, counting); // same updatedAt -> cache hit
  assert.equal(calls, 1, 'second call was served from the cache');
  const edited = { ...note, updatedAt: new Date('2026-10-31T11:00:00Z') };
  await getAiMcqsForNote(edited, counting);
  assert.equal(calls, 2, 'edit invalidates the cache');
});
