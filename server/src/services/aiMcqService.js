// Calls Google Gemini to generate problem-specific MCQs for a revision note.
// Falls back to returning [] on any failure, so the quiz endpoint can still
// serve its templated and student-authored questions.
//
// Caching: in-memory, keyed by the note's updatedAt timestamp, so an edit to
// the note invalidates the cache automatically. Survives one server process;
// clears on restart. For production you'd persist this to the notes table
// (added as a future enhancement, not implemented here).

import { env } from '../config/env.js';

const MODEL = 'gemini-flash-lite-latest';
const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_OUTPUT_TOKENS = 2048;

const cache = new Map(); // noteId -> { updatedAt: string, questions: array }

export function clearAiMcqCache() {
  cache.clear();
}

function cacheKey(note) {
  const updatedAt = note.updatedAt instanceof Date ? note.updatedAt.toISOString() : String(note.updatedAt ?? '');
  return `${note.id}::${updatedAt}`;
}

function buildPrompt(note) {
  const codeBlocks = Array.isArray(note.codeBlocks) ? note.codeBlocks : [];
  const firstCode = codeBlocks.find((b) => b?.code)?.code ?? '(no code block saved)';
  const firstLang = codeBlocks[0]?.language ?? 'unknown';
  const complexity = codeBlocks[0];
  return `You write short multiple-choice questions that test understanding of a specific coding problem.

Problem title: ${note.title}
Pattern tags: ${(note.patternTags ?? []).join(', ') || 'none'}
Stated time complexity: ${complexity?.timeComplexity ?? 'unknown'}
Stated space complexity: ${complexity?.spaceComplexity ?? 'unknown'}
Student's own notes (markdown):
<<<
${String(note.contentMarkdown ?? '').slice(0, 1500) || '(empty)'}
>>>
First code block (${firstLang}):
<<<
${String(firstCode).slice(0, 1500)}
>>>

Return EXACTLY this JSON shape and nothing else:
{"questions":[{"category":"Data Structure|Algorithm|Key Insight|Time Complexity|Space Complexity|Edge Case","question":"...","options":["a","b","c","d"],"correctIndex":0,"explanation":"one sentence"}]}

Rules:
- Exactly 5 questions, no more and no fewer.
- Every question MUST be specific to this problem; do not ask generic DSA trivia.
- Exactly 4 distinct options per question; one is correct.
- correctIndex is an integer 0..3.
- Each explanation is one short sentence.
- Keep each option under 150 characters.
- No markdown, no commentary, no code fences in your response — JSON only.`;
}

// Strips the ```json fences Gemini occasionally wraps around its JSON, then
// validates the shape. Returns [] when anything about the response is off,
// so a malformed answer can never land in the UI.
function parseAndValidate(raw) {
  const text = String(raw ?? '').replace(/```json\s*|```/gi, '').trim();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return [];
  }
  const list = Array.isArray(parsed?.questions) ? parsed.questions : [];
  const seen = new Set();
  const valid = [];
  for (let i = 0; i < list.length; i++) {
    const q = list[i];
    if (typeof q?.question !== 'string' || q.question.length > 500) continue;
    if (!Array.isArray(q.options) || q.options.length !== 4) continue;
    if (!q.options.every((o) => typeof o === 'string' && o.length > 0 && o.length < 300)) continue;
    if (new Set(q.options.map((o) => o.trim().toLowerCase())).size !== 4) continue; // distinct options
    if (!Number.isInteger(q.correctIndex) || q.correctIndex < 0 || q.correctIndex > 3) continue;
    const key = q.question.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push({
      id: `ai-${i}`,
      category: `AI: ${typeof q.category === 'string' ? q.category.slice(0, 60) : 'Insight'}`,
      question: q.question,
      options: q.options,
      correctIndex: q.correctIndex,
      explanation: typeof q.explanation === 'string' ? q.explanation.slice(0, 500) : '',
      aiGenerated: true,
    });
  }
  return valid;
}

/**
 * Call Gemini for problem-specific MCQs. Returns [] on any error, timeout, or
 * invalid response. `fetchImpl` is injected for tests.
 */
export async function callGemini(note, fetchImpl = fetch) {
  if (!env.GEMINI_API_KEY) return [];
  const body = {
    contents: [{ parts: [{ text: buildPrompt(note) }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      responseMimeType: 'application/json',
    },
  };
  try {
    const res = await fetchImpl(`${ENDPOINT}?key=${encodeURIComponent(env.GEMINI_API_KEY)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!res.ok) return [];
    const payload = await res.json();
    const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    return parseAndValidate(text);
  } catch {
    return [];
  }
}

/**
 * Public entry: cache-aware wrapper. Returns a cached result if the note
 * hasn't changed, otherwise generates fresh and caches the result.
 */
export async function getAiMcqsForNote(note, fetchImpl = fetch) {
  if (!env.GEMINI_API_KEY) return [];
  const key = cacheKey(note);
  const hit = cache.get(note.id);
  if (hit && hit.key === key) return hit.questions;
  const questions = await callGemini(note, fetchImpl);
  cache.set(note.id, { key, questions });
  return questions;
}
