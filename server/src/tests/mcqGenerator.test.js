import test from 'node:test';
import assert from 'node:assert/strict';
import { generateMCQs, ratingFromQuizResult } from '../services/mcqGeneratorService.js';

const twoSum = {
  id: 'note-two-sum',
  title: 'Two Sum',
  patternTags: ['array', 'hashmap'],
  codeBlocks: [{ language: 'python', timeComplexity: 'O(n)', spaceComplexity: 'O(n)' }],
  problem: { difficulty: 'easy', platform: 'leetcode' },
};

test('generateMCQs builds several questions per category from note metadata', () => {
  const questions = generateMCQs(twoSum);
  // Hashmap tag -> 3 DS questions; O(n) time -> 3 time questions; O(n) space -> 2 space;
  // language -> 1. No algorithm tag, so no algorithm questions. 9 total.
  assert.ok(questions.length >= 8, `expected at least 8 questions, got ${questions.length}`);
  const categories = questions.map((q) => q.category);
  assert.ok(categories.includes('Data Structure'));
  assert.ok(categories.includes('Data Structure Role'));
  assert.ok(categories.includes('Data Structure Operation'));
  assert.ok(categories.includes('Time Complexity'));
  assert.ok(categories.includes('Time Complexity Comparison'));
  assert.ok(categories.includes('Complexity Scaling'));
  assert.ok(categories.includes('Space Complexity'));
  assert.ok(categories.includes('In-place vs Auxiliary Space'));
  assert.ok(categories.includes('Implementation Language'));
  for (const q of questions) {
    assert.equal(q.options.length, 4, `${q.category} must have 4 options`);
    assert.ok(q.correctIndex >= 0 && q.correctIndex < 4);
    assert.equal(new Set(q.options).size, 4, `${q.category} options must be distinct`);
    assert.ok(q.explanation && q.explanation.length > 0);
  }
});

test('generateMCQs adds algorithm questions when a known algorithm tag is present', () => {
  const graphNote = { id: 'g', title: 'Course Schedule', patternTags: ['graph', 'topological-sort', 'dfs'], codeBlocks: [] };
  const categories = generateMCQs(graphNote).map((q) => q.category);
  assert.ok(categories.includes('Algorithm / Approach'));
  assert.ok(categories.includes('Algorithm Precondition'));
  assert.ok(categories.includes('Algorithm Trade-off'));
});

test('generateMCQs promotes student-written keyInsight and edgeCase to problem-specific MCQs', () => {
  const note = {
    id: 'n',
    title: 'Two Sum',
    patternTags: ['hashmap'],
    codeBlocks: [],
    keyInsight: 'Store the complement in a hash map while iterating once',
    edgeCase: 'The same index should not be used twice',
  };
  const distractors = { insight: ['Sort then two-pointer scan'], edge: ['Negative numbers break the hash lookup'] };
  const questions = generateMCQs(note, distractors);
  const insight = questions.find((q) => q.category === 'Key Insight (your own)');
  const edge = questions.find((q) => q.category === 'Edge Case (your own)');
  assert.ok(insight && edge, 'both student-written questions were generated');
  assert.equal(insight.options[insight.correctIndex], note.keyInsight);
  assert.equal(edge.options[edge.correctIndex], note.edgeCase);
  assert.ok(insight.options.includes('Sort then two-pointer scan'), 'uses a distractor from the user\'s other notes');
});

test('generateMCQs omits student-written questions when the note has no insight or edge case', () => {
  const note = { id: 'n', title: 'Blank', patternTags: ['hashmap'], codeBlocks: [] };
  const categories = generateMCQs(note).map((q) => q.category);
  assert.ok(!categories.includes('Key Insight (your own)'));
  assert.ok(!categories.includes('Edge Case (your own)'));
});

test('generateMCQs uses the stated complexity as the correct answer, not a guess', () => {
  const q = generateMCQs(twoSum).find((x) => x.category === 'Time Complexity');
  assert.equal(q.options[q.correctIndex], 'O(n)');
});

test('generateMCQs is deterministic across calls for the same note', () => {
  const a = generateMCQs(twoSum);
  const b = generateMCQs(twoSum);
  assert.deepEqual(a, b);
});

test('generateMCQs skips categories whose data is missing', () => {
  const minimal = { id: 'note-min', title: 'Bare note', patternTags: [], codeBlocks: [] };
  assert.deepEqual(generateMCQs(minimal), []);

  const tagsOnly = { id: 'note-tags', title: 'Only tags', patternTags: ['bfs'] };
  const q = generateMCQs(tagsOnly);
  // One algorithm tag -> 3 algorithm questions. Nothing else.
  assert.deepEqual(q.map((x) => x.category), ['Algorithm / Approach', 'Algorithm Precondition', 'Algorithm Trade-off']);
});

test('generateMCQs returns [] for a null or non-object note instead of throwing', () => {
  assert.deepEqual(generateMCQs(null), []);
  assert.deepEqual(generateMCQs('x'), []);
});

test('ratingFromQuizResult maps accuracy and confidence to the SM-2 scale', () => {
  // Again (< 50%)
  assert.equal(ratingFromQuizResult({ total: 4, correct: 0 }), 0);
  assert.equal(ratingFromQuizResult({ total: 4, correct: 1 }), 0);
  // Hard (50-99%)
  assert.equal(ratingFromQuizResult({ total: 4, correct: 2 }), 1);
  assert.equal(ratingFromQuizResult({ total: 4, correct: 3 }), 1);
  // Good (100% without the Easy confirmation)
  assert.equal(ratingFromQuizResult({ total: 4, correct: 4 }), 2);
  assert.equal(ratingFromQuizResult({ total: 4, correct: 4, confidentEasy: false }), 2);
  // Easy only with the explicit confidence flag
  assert.equal(ratingFromQuizResult({ total: 4, correct: 4, confidentEasy: true }), 3);
  // Can't claim Easy with less than 100%
  assert.equal(ratingFromQuizResult({ total: 4, correct: 3, confidentEasy: true }), 1);
});

test('ratingFromQuizResult rejects invalid inputs with null', () => {
  assert.equal(ratingFromQuizResult({ total: 0, correct: 0 }), null);
  assert.equal(ratingFromQuizResult({ total: 4, correct: -1 }), null);
  assert.equal(ratingFromQuizResult({ total: 4, correct: 5 }), null);
  assert.equal(ratingFromQuizResult({ total: 'four', correct: 2 }), null);
});
