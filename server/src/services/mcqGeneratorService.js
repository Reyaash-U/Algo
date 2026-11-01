// Generates multiple-choice questions for a revision note from the metadata
// AlgoVault already stores: patternTags, codeBlocks.timeComplexity /
// spaceComplexity / language, and the note title. No AI, no network;
// deterministic from the note so a user sees the same questions on repeat
// revisions. Call `generateMCQs(note)` -> array of { id, category, question,
// options:[4], correctIndex, explanation }.
//
// Each option set is shuffled with a seed derived from the question id so the
// correct answer isn't always in the same position but is stable per note.

// ── Catalogues of question-worthy facts, indexed by patternTag ─────────────

// For every data structure we recognise: pretty name, "primary strength" (used
// as a correct-answer in a why-question), and the operation it's best known for.
const DATA_STRUCTURES = {
  hashmap: { name: 'Hash Map', strength: 'Average O(1) lookup by key', operation: 'Insert and look up a value by key in O(1)' },
  'hash-map': { name: 'Hash Map', strength: 'Average O(1) lookup by key', operation: 'Insert and look up a value by key in O(1)' },
  'hash-table': { name: 'Hash Map', strength: 'Average O(1) lookup by key', operation: 'Insert and look up a value by key in O(1)' },
  hashtable: { name: 'Hash Map', strength: 'Average O(1) lookup by key', operation: 'Insert and look up a value by key in O(1)' },
  'hash-set': { name: 'Hash Set', strength: 'Average O(1) membership test', operation: 'Check whether an element has been seen in O(1)' },
  set: { name: 'Hash Set', strength: 'Average O(1) membership test', operation: 'Check whether an element has been seen in O(1)' },
  stack: { name: 'Stack', strength: 'LIFO access to the most recent element', operation: 'Push and pop the top element in O(1)' },
  'monotonic-stack': { name: 'Monotonic Stack', strength: 'Finds next-greater or next-smaller elements in amortised O(n)', operation: 'Pop until the invariant holds, then push' },
  queue: { name: 'Queue', strength: 'FIFO access, needed for level-order traversal', operation: 'Enqueue at the back, dequeue from the front in O(1)' },
  deque: { name: 'Deque', strength: 'O(1) push and pop from both ends', operation: 'Push or pop at either end in O(1)' },
  heap: { name: 'Heap / Priority Queue', strength: 'O(log n) access to the smallest or largest element', operation: 'Insert and extract the min or max in O(log n)' },
  'priority-queue': { name: 'Heap / Priority Queue', strength: 'O(log n) access to the smallest or largest element', operation: 'Insert and extract the min or max in O(log n)' },
  trie: { name: 'Trie', strength: 'Prefix search in O(length of the key)', operation: 'Walk down characters shared between many strings' },
  tree: { name: 'Tree', strength: 'Hierarchical structure traversed recursively', operation: 'Visit nodes in DFS or BFS order' },
  'binary-tree': { name: 'Binary Tree', strength: 'Hierarchical structure traversed recursively', operation: 'Visit nodes in DFS or BFS order' },
  bst: { name: 'Binary Search Tree', strength: 'Ordered lookup, insert and delete in O(log n) on balance', operation: 'Find, insert or delete a key in O(log n) when balanced' },
  'binary-search-tree': { name: 'Binary Search Tree', strength: 'Ordered lookup, insert and delete in O(log n) on balance', operation: 'Find, insert or delete a key in O(log n) when balanced' },
  'linked-list': { name: 'Linked List', strength: 'O(1) insert and delete at a known position', operation: 'Rewire next pointers around a node' },
  graph: { name: 'Graph', strength: 'Models relationships between nodes', operation: 'Traverse neighbours via BFS, DFS or shortest-path' },
  'adjacency-list': { name: 'Graph (Adjacency List)', strength: 'Space-efficient for sparse graphs', operation: 'Iterate the neighbours of a vertex in O(deg(v))' },
  array: { name: 'Array', strength: 'O(1) random access by index', operation: 'Read or write the element at a given index in O(1)' },
  matrix: { name: 'Matrix / 2D Array', strength: 'O(1) access by row and column', operation: 'Visit neighbours in four or eight directions' },
  'segment-tree': { name: 'Segment Tree', strength: 'O(log n) range queries and point updates', operation: 'Combine results of overlapping segments in O(log n)' },
  'fenwick-tree': { name: 'Fenwick Tree', strength: 'O(log n) prefix sums with point updates', operation: 'Update or query a prefix sum in O(log n)' },
  'union-find': { name: 'Union-Find (DSU)', strength: 'Near-O(1) connectivity queries with path compression', operation: 'Union two components or find a representative' },
};

const ALGORITHMS = {
  'two-pointers': { name: 'Two Pointers', precondition: 'Works on sorted or monotone sequences', avoids: 'Requires scanning the entire array independently' },
  'sliding-window': { name: 'Sliding Window', precondition: 'Needs a contiguous subarray or substring that satisfies a condition', avoids: 'Scans every pair of indices separately' },
  'binary-search': { name: 'Binary Search', precondition: 'The search space must be sorted or monotone', avoids: 'Linear scan of unsorted data' },
  'binary-search-on-answer': { name: 'Binary Search on Answer', precondition: 'The predicate must be monotone in the answer', avoids: 'Trying every possible answer linearly' },
  dp: { name: 'Dynamic Programming', precondition: 'Needs overlapping subproblems and optimal substructure', avoids: 'Recomputing the same subproblem many times' },
  'dynamic-programming': { name: 'Dynamic Programming', precondition: 'Needs overlapping subproblems and optimal substructure', avoids: 'Recomputing the same subproblem many times' },
  greedy: { name: 'Greedy', precondition: 'A local best choice must lead to a global best', avoids: 'Exploring every possible choice tree' },
  backtracking: { name: 'Backtracking', precondition: 'The solution space is a tree that can be pruned', avoids: 'Brute-force enumeration of all configurations' },
  bfs: { name: 'Breadth-First Search (BFS)', precondition: 'Finds the shortest path on an unweighted graph', avoids: 'Depth-first search when you need the shortest path' },
  dfs: { name: 'Depth-First Search (DFS)', precondition: 'Explores as deep as possible before backtracking', avoids: 'Breadth-first search when you only need reachability' },
  recursion: { name: 'Recursion', precondition: 'The problem can be defined in terms of smaller sub-instances', avoids: 'Writing an iterative loop that mirrors the stack by hand' },
  'divide-and-conquer': { name: 'Divide and Conquer', precondition: 'The problem splits into independent subproblems whose results combine', avoids: 'Solving the whole input in one pass' },
  'bit-manipulation': { name: 'Bit Manipulation', precondition: 'The values fit in a fixed-size integer and bits carry meaning', avoids: 'Allocating an array to simulate the bits' },
  'topological-sort': { name: 'Topological Sort', precondition: 'The input graph must be a directed acyclic graph (DAG)', avoids: 'Sorting that ignores edge direction' },
  'prefix-sum': { name: 'Prefix Sum', precondition: 'The array is static and range sums are queried many times', avoids: 'Recomputing each range sum in O(n)' },
  sorting: { name: 'Sorting', precondition: 'A sorted order simplifies the comparisons that follow', avoids: 'Comparing every unordered pair in O(n^2)' },
  kadane: { name: 'Kadane’s Algorithm', precondition: 'The problem asks for a maximum contiguous subarray sum', avoids: 'Enumerating every subarray in O(n^2)' },
  dijkstra: { name: 'Dijkstra’s Algorithm', precondition: 'The graph has non-negative edge weights', avoids: 'BFS when edges carry different weights' },
  'sweep-line': { name: 'Line Sweep', precondition: 'Events can be ordered along one axis', avoids: 'Checking every pair of intervals' },
};

// Distractor pools (plausible wrong answers chosen from the same universe).
const DS_NAME_POOL = Object.values(DATA_STRUCTURES).map((d) => d.name);
const DS_STRENGTH_POOL = Object.values(DATA_STRUCTURES).map((d) => d.strength);
const DS_OPERATION_POOL = Object.values(DATA_STRUCTURES).map((d) => d.operation);
const ALGO_NAME_POOL = Object.values(ALGORITHMS).map((a) => a.name);
const ALGO_PRECONDITION_POOL = Object.values(ALGORITHMS).map((a) => a.precondition);
const ALGO_AVOIDS_POOL = Object.values(ALGORITHMS).map((a) => a.avoids);

const TIME_POOL = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)', 'O(2^n)', 'O(n!)'];
const SPACE_POOL = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)'];

const normalizeTag = (tag) => String(tag ?? '').trim().toLowerCase().replace(/\s+/g, '-');
const normalizeComplexity = (text) => String(text ?? '').replace(/\s+/g, '').replace(/\*/g, '').replace(/O\(/i, 'O(');

// 32-bit integer hash of a string — enough randomness for shuffling four options.
function seedFrom(text) {
  let hash = 2166136261; // FNV offset basis; mixes small input differences better than a simple sum
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function shuffleWithSeed(items, seed) {
  const arr = [...items];
  let state = seed || 1;
  for (let i = arr.length - 1; i > 0; i--) {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    const j = state % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Returns an { options:[4], correctIndex } for a question whose correct answer is `correct`,
// filling with up to 3 distractors from `pool` (minus the correct answer and any excluded).
// Case-insensitive matching avoids near-duplicates such as "O(n)" and "O( n )".
function buildOptions(questionId, correct, pool, exclude = []) {
  const key = (v) => String(v).toLowerCase().replace(/\s+/g, ' ').trim();
  const excludedKeys = new Set([correct, ...exclude].map(key));
  const distractors = [];
  for (const option of pool) {
    const k = key(option);
    if (excludedKeys.has(k)) continue;
    excludedKeys.add(k); // no two options with the same meaning
    distractors.push(option);
    if (distractors.length === 3) break;
  }
  if (distractors.length < 3) return null;
  const options = shuffleWithSeed([correct, ...distractors], seedFrom(questionId));
  return { options, correctIndex: options.findIndex((o) => o === correct) };
}

// Convenience: build a question only if we have enough distractors; otherwise null.
function makeQuestion(id, category, question, correct, pool, explanation, exclude = []) {
  const opts = buildOptions(id, correct, pool, exclude);
  if (!opts) return null;
  return { id, category, question, ...opts, explanation };
}

// ── Question builders ──────────────────────────────────────────────────────

function dataStructureIdentifyQ(note, ds, tag) {
  return makeQuestion(
    `ds-id::${note.id}`,
    'Data Structure',
    `Which data structure is central to solving "${note.title}"?`,
    ds.name,
    DS_NAME_POOL,
    `The note is tagged with "${tag}", so ${ds.name} is the data structure the saved solution relies on.`,
  );
}

function dataStructureStrengthQ(note, ds) {
  return makeQuestion(
    `ds-why::${note.id}`,
    'Data Structure Role',
    `Why is ${ds.name} the natural choice for "${note.title}"?`,
    ds.strength,
    DS_STRENGTH_POOL,
    `${ds.name} is useful here because of its characteristic: ${ds.strength.toLowerCase()}.`,
  );
}

function dataStructureOperationQ(note, ds) {
  return makeQuestion(
    `ds-op::${note.id}`,
    'Data Structure Operation',
    `Which operation does ${ds.name} provide efficiently in this solution?`,
    ds.operation,
    DS_OPERATION_POOL,
    `${ds.name} supports: ${ds.operation.toLowerCase()}.`,
  );
}

function algorithmIdentifyQ(note, algo, tag) {
  return makeQuestion(
    `algo-id::${note.id}`,
    'Algorithm / Approach',
    `Which algorithmic approach best describes the solution to "${note.title}"?`,
    algo.name,
    ALGO_NAME_POOL,
    `The note tags identify "${tag}" as the approach.`,
  );
}

function algorithmPreconditionQ(note, algo) {
  return makeQuestion(
    `algo-pre::${note.id}`,
    'Algorithm Precondition',
    `What property must the input have for ${algo.name} to apply to "${note.title}"?`,
    algo.precondition,
    ALGO_PRECONDITION_POOL,
    `${algo.name} applies because: ${algo.precondition.toLowerCase()}.`,
  );
}

function algorithmAvoidsQ(note, algo) {
  return makeQuestion(
    `algo-naive::${note.id}`,
    'Algorithm Trade-off',
    `What inefficient approach does ${algo.name} let you avoid for "${note.title}"?`,
    algo.avoids,
    ALGO_AVOIDS_POOL,
    `Compared to a naive solution, ${algo.name} avoids: ${algo.avoids.toLowerCase()}.`,
  );
}

const COMPLEXITY_ORDER = ['O(1)', 'O(log n)', 'O(n)', 'O(n log n)', 'O(n^2)', 'O(n^3)', 'O(2^n)', 'O(n!)'];

function complexityDirectQ(note, kind, canonical) {
  const label = kind === 'time' ? 'time' : 'auxiliary space';
  return makeQuestion(
    `${kind}-direct::${note.id}`,
    kind === 'time' ? 'Time Complexity' : 'Space Complexity',
    `What is the ${label} complexity of the saved solution to "${note.title}"?`,
    canonical,
    kind === 'time' ? TIME_POOL : SPACE_POOL,
    `The code block in this note records a ${label} complexity of ${canonical}.`,
  );
}

function complexityWorseQ(note, canonical) {
  const idx = COMPLEXITY_ORDER.indexOf(canonical);
  if (idx < 0 || idx === COMPLEXITY_ORDER.length - 1) return null;
  const worse = COMPLEXITY_ORDER[idx + 1];
  return makeQuestion(
    `time-worse::${note.id}`,
    'Time Complexity Comparison',
    `Compared with the ${canonical} optimal solution to "${note.title}", which complexity below would be strictly worse?`,
    worse,
    TIME_POOL,
    `${worse} grows faster than ${canonical}, so it would be the inferior approach.`,
    [canonical],
  );
}

function complexityScalingQ(note) {
  return makeQuestion(
    `time-scale::${note.id}`,
    'Complexity Scaling',
    `For an input size n = 10^6, which of these complexities is the only one that still runs within a second?`,
    'O(n log n)',
    TIME_POOL,
    'For n = 10^6, O(n log n) is roughly 2*10^7 operations, which fits in a second; O(n^2) and above do not.',
  );
}

function spaceInPlaceQ(note, canonical) {
  const inPlace = canonical === 'O(1)';
  const correct = inPlace ? 'Yes — it uses only O(1) extra memory' : 'No — it needs extra memory proportional to the input';
  return makeQuestion(
    `space-inplace::${note.id}`,
    'In-place vs Auxiliary Space',
    `Does the saved solution to "${note.title}" work in place?`,
    correct,
    ['Yes — it uses only O(1) extra memory', 'No — it needs extra memory proportional to the input', 'Yes, but the recursion stack still grows with the input', 'No, it needs quadratic extra memory'],
    `With ${canonical} auxiliary space, the solution ${inPlace ? 'does not' : 'does'} allocate memory that grows with the input.`,
  );
}

function languageQ(note) {
  const LANG_POOL = ['Python', 'C++', 'Java', 'JavaScript', 'Go', 'Rust', 'C#', 'Kotlin', 'TypeScript'];
  const alias = (lang) => {
    const l = String(lang ?? '').toLowerCase().trim();
    if (['python', 'py', 'python3'].includes(l)) return 'Python';
    if (['cpp', 'c++', 'cxx'].includes(l)) return 'C++';
    if (l === 'java') return 'Java';
    if (['js', 'javascript', 'node'].includes(l)) return 'JavaScript';
    if (l === 'go') return 'Go';
    if (l === 'rust') return 'Rust';
    if (['cs', 'c#', 'csharp'].includes(l)) return 'C#';
    if (['kt', 'kotlin'].includes(l)) return 'Kotlin';
    if (['ts', 'typescript'].includes(l)) return 'TypeScript';
    return null;
  };
  const blocks = Array.isArray(note.codeBlocks) ? note.codeBlocks : [];
  const correct = blocks.map((b) => alias(b?.language)).find(Boolean);
  if (!correct) return null;
  return makeQuestion(
    `lang::${note.id}`,
    'Implementation Language',
    `Which language is the saved solution to "${note.title}" written in?`,
    correct,
    LANG_POOL,
    `The code block in this note is written in ${correct}.`,
  );
}

// Stock insights used as distractors for the student's own "key insight" and
// "edge case" questions. Picked to sound plausible but be wrong for most problems,
// so a student who did the reading can tell them apart from what they actually wrote.
const STOCK_INSIGHTS = [
  'Sort the input first, then do a linear scan',
  'Use dynamic programming over all subarrays',
  'Use a hash map to store seen values and their indices',
  'Scan from both ends with two pointers',
  'Use a sliding window whose size grows and shrinks on demand',
  'Binary search on the answer and verify with a greedy check',
  'Run depth-first search and memoise visited states',
  'Use a monotonic stack to find next-greater elements',
  'Precompute prefix sums for O(1) range queries',
  'Reverse the problem and solve the complement',
];
const STOCK_EDGE_CASES = [
  'The array could be empty',
  'All elements could be identical',
  'The input could contain negative numbers',
  'A single element should still return a valid answer',
  'The target may not exist in the input',
  'Integer overflow when summing large values',
  'The input may already be sorted',
  'Watch out for off-by-one on the last iteration',
  'Duplicate values must still be handled correctly',
  'The graph may be disconnected',
];

function studentInsightQ(note, distractors) {
  const text = String(note.keyInsight ?? '').trim();
  if (!text) return null;
  return makeQuestion(
    `insight::${note.id}`,
    'Key Insight (your own)',
    `What is the key insight you recorded for "${note.title}"?`,
    text,
    [...distractors.insight, ...STOCK_INSIGHTS],
    'This is the insight you wrote on this note. Recognising it is the point of writing it down.',
  );
}

function studentEdgeCaseQ(note, distractors) {
  const text = String(note.edgeCase ?? '').trim();
  if (!text) return null;
  return makeQuestion(
    `edge::${note.id}`,
    'Edge Case (your own)',
    `What edge case did you flag for "${note.title}"?`,
    text,
    [...distractors.edge, ...STOCK_EDGE_CASES],
    'This is the edge case you wrote on this note.',
  );
}

// ── Main entry ─────────────────────────────────────────────────────────────

/**
 * Generate MCQs for a note. Returns the questions that could be built from the
 * available metadata — typically 6–12 for a well-tagged note with complexity
 * stated and an insight written, and fewer for sparse notes. Caller should
 * treat an empty array as "quiz unavailable, fall back to the plain reveal-and-rate flow".
 *
 * `distractors` is optional and lets the caller supply real text from the user's
 * OTHER notes to use as plausible wrong answers for the student-written questions.
 * When omitted, distractors come from a built-in stock pool only.
 */
export function generateMCQs(note, distractors = { insight: [], edge: [] }) {
  if (!note || typeof note !== 'object') return [];
  const tags = (note.patternTags ?? []).map(normalizeTag);
  const questions = [];

  // Student-authored questions come first — they are the most problem-specific.
  questions.push(studentInsightQ(note, distractors), studentEdgeCaseQ(note, distractors));

  const dsTag = tags.find((t) => DATA_STRUCTURES[t]);
  if (dsTag) {
    const ds = DATA_STRUCTURES[dsTag];
    questions.push(dataStructureIdentifyQ(note, ds, dsTag), dataStructureStrengthQ(note, ds), dataStructureOperationQ(note, ds));
  }

  const algoTag = tags.find((t) => ALGORITHMS[t]);
  if (algoTag) {
    const algo = ALGORITHMS[algoTag];
    questions.push(algorithmIdentifyQ(note, algo, algoTag), algorithmPreconditionQ(note, algo), algorithmAvoidsQ(note, algo));
  }

  const blocks = Array.isArray(note.codeBlocks) ? note.codeBlocks : [];
  const timeRaw = blocks.map((b) => normalizeComplexity(b?.timeComplexity)).find((v) => v && /^O\(/i.test(v));
  if (timeRaw) {
    const canonicalTime = TIME_POOL.find((p) => p.toLowerCase() === timeRaw.toLowerCase()) ?? timeRaw;
    questions.push(complexityDirectQ(note, 'time', canonicalTime), complexityWorseQ(note, canonicalTime), complexityScalingQ(note));
  }

  const spaceRaw = blocks.map((b) => normalizeComplexity(b?.spaceComplexity)).find((v) => v && /^O\(/i.test(v));
  if (spaceRaw) {
    const canonicalSpace = SPACE_POOL.find((p) => p.toLowerCase() === spaceRaw.toLowerCase()) ?? spaceRaw;
    questions.push(complexityDirectQ(note, 'space', canonicalSpace), spaceInPlaceQ(note, canonicalSpace));
  }

  questions.push(languageQ(note));

  return questions.filter(Boolean);
}

/**
 * Maps a quiz result to an SM-2 rating (0..3): Again / Hard / Good / Easy.
 * "Easy" requires both 100% accuracy AND an explicit confidence flag, so a user
 * doesn't accidentally stretch the next interval just by answering correctly.
 */
export function ratingFromQuizResult({ total, correct, confidentEasy = false }) {
  if (!Number.isInteger(total) || total <= 0) return null;
  if (!Number.isInteger(correct) || correct < 0 || correct > total) return null;
  const accuracy = correct / total;
  if (accuracy < 0.5) return 0; // Again
  if (accuracy < 1) return 1; // Hard
  return confidentEasy ? 3 : 2; // Easy only when the user confirms it was easy
}
