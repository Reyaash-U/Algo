// Seed script: full demo dataset across every model in schema.prisma —
// 4 users (incl. an admin), a real-looking Problem catalog, ~48 notes (with
// fork lineage + a few richly-written ones), 4 sheets with mixed-status
// items, staggered revisions per user, CfStats for CF-linked users, and a
// few reports in different states — so the app and admin queue are ALIVE
// for demos, not empty.
// Run: npm run seed  (from server/, or `npm run seed` from repo root)
import bcrypt from 'bcryptjs';
import { prisma, connectDB, disconnectDB } from '../config/db.js';

const dayMs = 86400000;

const PATTERNS = [
  'dp', 'graphs', 'two-pointers', 'sliding-window', 'binary-search', 'greedy',
  'topological-sort', 'trie', 'stack', 'heap', 'math', 'strings', 'linked-list', 'sorting',
];

// ── Problem catalog (real, well-known problems — not placeholders) ────────
const PROBLEMS = [
  { platform: 'leetcode', externalId: 'two-sum', title: 'Two Sum', url: 'https://leetcode.com/problems/two-sum/', difficulty: 'easy', tags: ['array', 'hashmap'] },
  { platform: 'leetcode', externalId: 'longest-increasing-subsequence', title: 'Longest Increasing Subsequence', url: 'https://leetcode.com/problems/longest-increasing-subsequence/', difficulty: 'medium', tags: ['dp', 'binary-search'] },
  { platform: 'leetcode', externalId: 'course-schedule', title: 'Course Schedule', url: 'https://leetcode.com/problems/course-schedule/', difficulty: 'medium', tags: ['graphs', 'topological-sort'] },
  { platform: 'leetcode', externalId: 'merge-intervals', title: 'Merge Intervals', url: 'https://leetcode.com/problems/merge-intervals/', difficulty: 'medium', tags: ['array', 'sorting', 'greedy'] },
  { platform: 'leetcode', externalId: 'word-break', title: 'Word Break', url: 'https://leetcode.com/problems/word-break/', difficulty: 'medium', tags: ['dp', 'trie'] },
  { platform: 'leetcode', externalId: 'trapping-rain-water', title: 'Trapping Rain Water', url: 'https://leetcode.com/problems/trapping-rain-water/', difficulty: 'hard', tags: ['two-pointers', 'stack', 'dp'] },
  { platform: 'leetcode', externalId: 'number-of-islands', title: 'Number of Islands', url: 'https://leetcode.com/problems/number-of-islands/', difficulty: 'medium', tags: ['graphs', 'bfs', 'dfs'] },
  { platform: 'leetcode', externalId: 'longest-substring-without-repeating-characters', title: 'Longest Substring Without Repeating Characters', url: 'https://leetcode.com/problems/longest-substring-without-repeating-characters/', difficulty: 'medium', tags: ['sliding-window', 'hashmap'] },
  { platform: 'leetcode', externalId: 'coin-change', title: 'Coin Change', url: 'https://leetcode.com/problems/coin-change/', difficulty: 'medium', tags: ['dp'] },
  { platform: 'leetcode', externalId: 'median-of-two-sorted-arrays', title: 'Median of Two Sorted Arrays', url: 'https://leetcode.com/problems/median-of-two-sorted-arrays/', difficulty: 'hard', tags: ['binary-search', 'array'] },
  { platform: 'leetcode', externalId: 'valid-parentheses', title: 'Valid Parentheses', url: 'https://leetcode.com/problems/valid-parentheses/', difficulty: 'easy', tags: ['stack'] },
  { platform: 'leetcode', externalId: 'kth-largest-element-in-an-array', title: 'Kth Largest Element in an Array', url: 'https://leetcode.com/problems/kth-largest-element-in-an-array/', difficulty: 'medium', tags: ['heap', 'sorting'] },
  { platform: 'codeforces', externalId: '4A', title: 'Watermelon', url: 'https://codeforces.com/problemset/problem/4/A', difficulty: 'easy', tags: ['math', 'brute-force'] },
  { platform: 'codeforces', externalId: '1A', title: 'Theatre Square', url: 'https://codeforces.com/problemset/problem/1/A', difficulty: 'easy', tags: ['math'] },
  { platform: 'codeforces', externalId: '71A', title: 'Way Too Long Words', url: 'https://codeforces.com/problemset/problem/71/A', difficulty: 'easy', tags: ['strings'] },
  { platform: 'codeforces', externalId: '231A', title: 'Team', url: 'https://codeforces.com/problemset/problem/231/A', difficulty: 'easy', tags: ['greedy'] },
  { platform: 'codeforces', externalId: '58A', title: 'Chat room', url: 'https://codeforces.com/problemset/problem/58/A', difficulty: 'easy', tags: ['strings', 'two-pointers'] },
  { platform: 'gfg', externalId: 'kadanes-algorithm', title: "Kadane's Algorithm", url: 'https://www.geeksforgeeks.org/maximum-subarray-sum-using-divide-and-conquer-algorithm/', difficulty: 'easy', tags: ['dp', 'array'] },
  { platform: 'gfg', externalId: 'detect-loop-in-linked-list', title: 'Detect Loop in a Linked List', url: 'https://www.geeksforgeeks.org/detect-loop-in-a-linked-list/', difficulty: 'medium', tags: ['linked-list', 'two-pointers'] },
  { platform: 'gfg', externalId: 'rotate-array', title: 'Rotate Array', url: 'https://www.geeksforgeeks.org/array-rotation/', difficulty: 'easy', tags: ['array'] },
];

// ── A handful of notes with real multi-paragraph content + code, not
// placeholder text — one per "flagship" problem, spread across owners. ────
const RICH_NOTE_DEFS = [
  {
    key: 'twoSum', owner: 'demo', problemTitle: 'Two Sum',
    patternTags: ['array', 'hashmap'], confidence: 5, visibility: 'public',
    contentMarkdown: `## Approach
Brute force is O(n^2) checking every pair. Better: single pass with a hashmap
storing value → index as we go. For each number, check if its complement
(target - num) has already been seen.

## Why it works
Since we only need one valid pair, we can build up the seen set incrementally
instead of doing a nested loop. This turns the problem from O(n^2) into O(n)
time with O(n) extra space for the hashmap.

## Edge cases
- Duplicate values in the array (e.g. [3,3], target=6) — still works since we
  check the complement before inserting the current value.
- No solution exists — LeetCode guarantees exactly one solution so this isn't
  handled, but a real production version should throw/return null.`,
    codeBlocks: [
      { language: 'python', code: `def two_sum(nums, target):
    seen = {}
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    return []`, timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
      { language: 'java', code: `public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();
    for (int i = 0; i < nums.length; i++) {
        int complement = target - nums[i];
        if (seen.containsKey(complement)) {
            return new int[]{seen.get(complement), i};
        }
        seen.put(nums[i], i);
    }
    return new int[]{};
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(n)' },
    ],
  },
  {
    key: 'lis', owner: 'demo', problemTitle: 'Longest Increasing Subsequence',
    patternTags: ['dp', 'binary-search-on-answer'], confidence: 4, visibility: 'public',
    contentMarkdown: `## Approach
Patience sorting: maintain a \`tails\` array where tails[i] is the smallest
possible tail value of an increasing subsequence of length i+1. For each new
number, binary search for its position in tails and either extend or replace.

## Why binary search
Because tails is always sorted, we can binary search for the insertion point
in O(log n) instead of scanning linearly, bringing the whole algorithm down
to O(n log n) instead of the naive O(n^2) DP.

## Gotcha
tails does NOT represent an actual valid subsequence — only its length is
meaningful. Don't try to reconstruct the actual LIS from it without extra
bookkeeping (parent pointers).`,
    codeBlocks: [
      { language: 'cpp', code: `int lengthOfLIS(vector<int>& nums) {
    vector<int> tails;
    for (int x : nums) {
        auto it = lower_bound(tails.begin(), tails.end(), x);
        if (it == tails.end()) tails.push_back(x);
        else *it = x;
    }
    return tails.size();
}`, timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)' },
    ],
  },
  {
    key: 'courseSchedule', owner: 'demo', problemTitle: 'Course Schedule',
    patternTags: ['graphs', 'topological-sort'], confidence: 3, visibility: 'link',
    contentMarkdown: `## Approach
This is cycle detection in a directed graph, dressed up as a scheduling
problem. Build an adjacency list from prerequisites, track in-degree per
node, and do a topological sort with Kahn's algorithm (BFS from all
zero-in-degree nodes).

## Why it works
If we can process all \`numCourses\` nodes via the BFS, there's no cycle and a
valid ordering exists. If some nodes never reach in-degree 0, they're stuck
in a cycle and the course plan is impossible.

## Alternative
DFS with a three-color (white/gray/black) visited state also works and is
arguably more intuitive for cycle detection, but Kahn's BFS naturally gives
you the actual topological order for free if you need it.`,
    codeBlocks: [
      { language: 'python', code: `from collections import deque, defaultdict

def can_finish(numCourses, prerequisites):
    graph = defaultdict(list)
    indegree = [0] * numCourses
    for a, b in prerequisites:
        graph[b].append(a)
        indegree[a] += 1

    queue = deque([i for i in range(numCourses) if indegree[i] == 0])
    visited = 0
    while queue:
        node = queue.popleft()
        visited += 1
        for nei in graph[node]:
            indegree[nei] -= 1
            if indegree[nei] == 0:
                queue.append(nei)
    return visited == numCourses`, timeComplexity: 'O(V + E)', spaceComplexity: 'O(V + E)' },
    ],
  },
  {
    key: 'mergeIntervals', owner: 'alex', problemTitle: 'Merge Intervals',
    patternTags: ['array', 'sorting'], confidence: 4, visibility: 'public',
    contentMarkdown: `## Approach
Sort intervals by start time first — once sorted, overlapping intervals are
guaranteed to be adjacent in the array. Then do a single linear pass,
merging into the last interval in the result whenever the current interval's
start is <= the last merged interval's end.

## Edge case
Touching intervals like [1,4] and [4,5] should merge into [1,5] — the
overlap check uses <=, not <.`,
    codeBlocks: [
      { language: 'python', code: `def merge(intervals):
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]
    for start, end in intervals[1:]:
        if start <= merged[-1][1]:
            merged[-1][1] = max(merged[-1][1], end)
        else:
            merged.append([start, end])
    return merged`, timeComplexity: 'O(n log n)', spaceComplexity: 'O(n)' },
    ],
  },
  {
    key: 'wordBreak', owner: 'alex', problemTitle: 'Word Break',
    patternTags: ['dp', 'trie'], confidence: 2, visibility: 'private',
    contentMarkdown: `## Approach
Classic DP: dp[i] = true if s[0:i] can be segmented using words from the
dictionary. Base case dp[0] = true (empty prefix). For each i, try every
split point j < i and check dp[j] && s[j:i] is a valid word.

## Complexity
O(n^2) time in the worst case since we try every split point for every
position, O(n) extra space for the dp array (plus the dictionary lookup set).`,
    codeBlocks: [
      { language: 'python', code: `def word_break(s, wordDict):
    words = set(wordDict)
    dp = [False] * (len(s) + 1)
    dp[0] = True
    for i in range(1, len(s) + 1):
        for j in range(i):
            if dp[j] and s[j:i] in words:
                dp[i] = True
                break
    return dp[-1]`, timeComplexity: 'O(n^2)', spaceComplexity: 'O(n)' },
    ],
  },
  {
    key: 'trapWater', owner: 'priya', problemTitle: 'Trapping Rain Water',
    patternTags: ['two-pointers', 'stack'], confidence: 5, visibility: 'public',
    contentMarkdown: `## Approach
Two pointers from both ends, tracking the max height seen from each side.
Water trapped at any position is bounded by the smaller of the two
"walls" — so we always advance the pointer on the side with the smaller
current max, since that side's water level is already determined.

## Why not just track leftMax/rightMax arrays
That works too (O(n) extra space) but the two-pointer version does it in
O(1) space by only ever needing to know which side currently has the
smaller max, not the exact profile.`,
    codeBlocks: [
      { language: 'cpp', code: `int trap(vector<int>& height) {
    int l = 0, r = height.size() - 1, leftMax = 0, rightMax = 0, water = 0;
    while (l < r) {
        if (height[l] < height[r]) {
            leftMax = max(leftMax, height[l]);
            water += leftMax - height[l++];
        } else {
            rightMax = max(rightMax, height[r]);
            water += rightMax - height[r--];
        }
    }
    return water;
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    ],
  },
  {
    key: 'numIslands', owner: 'priya', problemTitle: 'Number of Islands',
    patternTags: ['graphs', 'bfs'], confidence: 3, visibility: 'private',
    contentMarkdown: `## Approach
Standard flood-fill: scan the grid, and whenever we hit an unvisited '1',
increment the island count and DFS/BFS outward, marking every connected '1'
as visited (flip to '0' in place to avoid an extra visited set).

## Complexity
O(rows * cols) time and space (recursion stack in the worst case of one
giant connected island).`,
    codeBlocks: [
      { language: 'python', code: `def num_islands(grid):
    if not grid:
        return 0
    rows, cols = len(grid), len(grid[0])

    def dfs(r, c):
        if r < 0 or c < 0 or r >= rows or c >= cols or grid[r][c] != '1':
            return
        grid[r][c] = '0'
        dfs(r + 1, c); dfs(r - 1, c); dfs(r, c + 1); dfs(r, c - 1)

    count = 0
    for r in range(rows):
        for c in range(cols):
            if grid[r][c] == '1':
                count += 1
                dfs(r, c)
    return count`, timeComplexity: 'O(rows * cols)', spaceComplexity: 'O(rows * cols)' },
    ],
  },
  {
    key: 'kadane', owner: 'admin', problemTitle: "Kadane's Algorithm",
    patternTags: ['dp', 'array'], confidence: 4, visibility: 'link',
    contentMarkdown: `## Approach
Track the best subarray sum ending at the current index (\`maxEndingHere\`)
and the best seen so far (\`maxSoFar\`). At each step, either extend the
previous subarray or start fresh at the current element — whichever is
larger.

## Why it works
If the running sum ever drops below the current element's own value, it's
never beneficial to keep dragging the old subarray along — starting fresh
is strictly better from that point on.`,
    codeBlocks: [
      { language: 'java', code: `public int maxSubArray(int[] nums) {
    int maxSoFar = nums[0], maxEndingHere = nums[0];
    for (int i = 1; i < nums.length; i++) {
        maxEndingHere = Math.max(nums[i], maxEndingHere + nums[i]);
        maxSoFar = Math.max(maxSoFar, maxEndingHere);
    }
    return maxSoFar;
}`, timeComplexity: 'O(n)', spaceComplexity: 'O(1)' },
    ],
  },
];

const SHEET_DEFS = [
  {
    ownerKey: 'demo', title: 'Amazon SDE Sheet',
    description: 'Curated list of problems frequently asked in Amazon SDE interviews.',
    visibility: 'private', daysOut: 30,
    items: [
      { title: 'Two Sum', status: 'done' },
      { title: 'Merge Intervals', status: 'done' },
      { title: 'Course Schedule', status: 'in_progress' },
      { title: 'Number of Islands', status: 'in_progress' },
      { title: 'Trapping Rain Water', status: 'todo' },
      { title: 'Coin Change', status: 'todo' },
      { title: 'Kth Largest Element in an Array', status: 'todo' },
    ],
  },
  {
    ownerKey: 'alex', title: "Striver's SDE Sheet clone",
    description: 'Community favorite roadmap, cloned and adapted for my own prep.',
    visibility: 'public', daysOut: 45,
    items: [
      { title: 'Two Sum', status: 'done' },
      { title: 'Longest Increasing Subsequence', status: 'done' },
      { title: 'Valid Parentheses', status: 'done' },
      { title: 'Word Break', status: 'in_progress' },
      { title: 'Median of Two Sorted Arrays', status: 'in_progress' },
      { title: 'Longest Substring Without Repeating Characters', status: 'todo' },
      { title: 'Number of Islands', status: 'todo' },
      { title: "Kadane's Algorithm", status: 'todo' },
    ],
  },
  {
    ownerKey: 'priya', title: 'Codeforces Div2 Practice',
    description: 'Div2 A/B warm-up problems to build contest speed.',
    visibility: 'link', daysOut: 20,
    items: [
      { title: 'Watermelon', status: 'done' },
      { title: 'Theatre Square', status: 'done' },
      { title: 'Way Too Long Words', status: 'in_progress' },
      { title: 'Team', status: 'todo' },
      { title: 'Chat room', status: 'todo' },
    ],
  },
  {
    ownerKey: 'admin', title: 'Interview Crash Course',
    description: '2-week crash prep plan for panel interviews.',
    visibility: 'private', daysOut: 14,
    items: [
      { title: 'Two Sum', status: 'done' },
      { title: 'Merge Intervals', status: 'in_progress' },
      { title: 'Course Schedule', status: 'todo' },
      { title: 'Trapping Rain Water', status: 'todo' },
      { title: 'Rotate Array', status: 'todo' },
      { title: 'Detect Loop in a Linked List', status: 'todo' },
    ],
  },
];

function visibilityFor(i) {
  const m = i % 5;
  if (m === 0) return 'public';
  if (m === 1) return 'link';
  return 'private';
}

async function createGeneratedNotes(owner, ownerLabel, count, startIndex, problemPool) {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const idx = startIndex + i;
    const pattern = PATTERNS[idx % PATTERNS.length];
    const linkToProblem = idx % 3 !== 2; // ~2/3 linked to a real Problem row
    const problem = linkToProblem ? problemPool[idx % problemPool.length] : null;
    const note = await prisma.note.create({
      data: {
        ownerId: owner.id,
        title: problem ? `${problem.title} — notes` : `${pattern} practice #${idx + 1}`,
        contentMarkdown: `## Approach\nWe can solve **${problem ? problem.title : pattern}** using the standard approach. First, we initialize our state and iterate through the inputs.\n\nAt each step, we carefully consider the invariants. The core intuition is to break the problem down into smaller subproblems or leverage a specific data structure to optimize the bottlenecks.\n\n### Complexity Analysis\n- **Time:** \`O(N)\` because we process each element a constant number of times.\n- **Space:** \`O(N)\` for auxiliary data structures.\n\n### Code Snippet\n\`\`\`python\ndef solve(nums):\n    # TODO: Implement the optimal solution\n    return len(nums)\n\`\`\``,
        problemId: problem ? problem.id : null,
        patternTags: [pattern],
        visibility: visibilityFor(idx),
        confidence: (idx % 5) + 1,
      },
    });
    rows.push(note);
  }
  return rows;
}

// Stagger nextReviewAt (some overdue, some due today, some future) and vary
// repetitions/easeFactor between freshly-enrolled and well-reviewed notes.
// Skips ~1 in 5 notes so not everything is enrolled in revision.
function buildRevisions(userId, notes) {
  const data = [];
  notes.forEach((note, i) => {
    if (i % 5 === 4) return;
    const experienced = i % 3 === 0;
    const repetitions = experienced ? 4 + (i % 5) : i % 2;
    const easeFactor = experienced ? 2.6 + (i % 4) * 0.1 : 2.5;
    const intervalDays = experienced ? [15, 21, 30, 45, 60][i % 5] : [0, 1][i % 2];
    const dueOffsetDays = i % 7 === 0 ? -2 : i % 4; // some overdue, rest spread over the next few days
    data.push({
      userId,
      noteId: note.id,
      repetitions,
      intervalDays,
      easeFactor,
      lastReviewedAt: experienced ? new Date(Date.now() - intervalDays * dayMs) : null,
      nextReviewAt: new Date(Date.now() + dueOffsetDays * dayMs),
    });
  });
  return data;
}

async function run() {
  await connectDB();

  // Clean slate — order matters for FK constraints (children before parents).
  await prisma.submission.deleteMany({});
  await prisma.report.deleteMany({});
  await prisma.revision.deleteMany({});
  await prisma.sheetItem.deleteMany({});
  await prisma.sheet.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.cfStats.deleteMany({});
  await prisma.problem.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tag.deleteMany({});

  await prisma.tag.createMany({ data: PATTERNS.map((p) => ({ name: p })) });

  // ── Users ────────────────────────────────────────────────────────────
  const passwordHash = await bcrypt.hash('password123', 10);

  const demo = await prisma.user.create({
    data: {
      email: 'demo@algovault.dev',
      passwordHash,
      displayName: 'Demo Student',
      role: 'user',
      cfHandle: 'tourist',
      streakCurrent: 5,
      streakLongest: 22,
      streakLastActiveDate: new Date(),
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: 'admin@algovault.dev',
      passwordHash,
      displayName: 'Aria Admin',
      role: 'admin',
      streakCurrent: 0,
      streakLongest: 0,
    },
  });

  const alex = await prisma.user.create({
    data: {
      email: 'alex@algovault.dev',
      passwordHash,
      displayName: 'Alex Chen',
      role: 'user',
      cfHandle: 'errichto',
      streakCurrent: 12,
      streakLongest: 30,
      streakLastActiveDate: new Date(),
    },
  });

  const priya = await prisma.user.create({
    data: {
      email: 'priya@algovault.dev',
      passwordHash,
      displayName: 'Priya Sharma',
      role: 'user',
      streakCurrent: 0,
      streakLongest: 8,
      streakLastActiveDate: new Date(Date.now() - 5 * dayMs), // streak lapsed a few days ago
    },
  });

  const users = { demo, admin, alex, priya };

  // ── Problems ─────────────────────────────────────────────────────────
  const problemRows = [];
  for (const p of PROBLEMS) {
    problemRows.push(await prisma.problem.create({ data: p }));
  }
  const problemByTitle = Object.fromEntries(problemRows.map((p) => [p.title, p]));

  // ── Notes: rich hand-written ones first ─────────────────────────────
  const richNotes = {};
  for (const def of RICH_NOTE_DEFS) {
    const problem = problemByTitle[def.problemTitle];
    const note = await prisma.note.create({
      data: {
        ownerId: users[def.owner].id,
        title: def.problemTitle,
        contentMarkdown: def.contentMarkdown,
        codeBlocks: def.codeBlocks,
        problemId: problem.id,
        patternTags: def.patternTags,
        visibility: def.visibility,
        confidence: def.confidence,
      },
    });
    richNotes[def.key] = note;
  }

  // ── Notes: bulk-generated, filling out each user's vault ────────────
  const demoGenerated = await createGeneratedNotes(demo, 'demo', 17, 0, problemRows);
  const alexGenerated = await createGeneratedNotes(alex, 'alex', 10, 3, problemRows);
  const priyaGenerated = await createGeneratedNotes(priya, 'priya', 8, 6, problemRows);
  const adminGenerated = await createGeneratedNotes(admin, 'admin', 3, 9, problemRows);

  const demoNotes = [richNotes.twoSum, richNotes.lis, richNotes.courseSchedule, ...demoGenerated];
  const alexNotes = [richNotes.mergeIntervals, richNotes.wordBreak, ...alexGenerated];
  const priyaNotes = [richNotes.trapWater, richNotes.numIslands, ...priyaGenerated];
  const adminNotes = [richNotes.kadane, ...adminGenerated];

  // ── Fork lineage: a couple of real forks so the fork UI has something
  // to show, with forkCount incremented on the originals. ─────────────
  const alexForkOfTwoSum = await prisma.note.create({
    data: {
      ownerId: alex.id,
      title: 'Two Sum (forked, adding my own notes)',
      contentMarkdown: `${richNotes.twoSum.contentMarkdown}\n\n## My addendum\nRevisited this after a contest — the hashmap approach is basically muscle memory now.`,
      codeBlocks: richNotes.twoSum.codeBlocks,
      problemId: richNotes.twoSum.problemId,
      patternTags: richNotes.twoSum.patternTags,
      visibility: 'private',
      confidence: 5,
      forkOfId: richNotes.twoSum.id,
    },
  });
  await prisma.note.update({ where: { id: richNotes.twoSum.id }, data: { forkCount: { increment: 1 } } });
  alexNotes.push(alexForkOfTwoSum);

  const priyaForkOfLis = await prisma.note.create({
    data: {
      ownerId: priya.id,
      title: 'Longest Increasing Subsequence (forked)',
      contentMarkdown: `${richNotes.lis.contentMarkdown}\n\n## My addendum\nAdding a note on reconstructing the actual subsequence, not just the length.`,
      codeBlocks: richNotes.lis.codeBlocks,
      problemId: richNotes.lis.problemId,
      patternTags: richNotes.lis.patternTags,
      visibility: 'link',
      confidence: 4,
      forkOfId: richNotes.lis.id,
    },
  });
  await prisma.note.update({ where: { id: richNotes.lis.id }, data: { forkCount: { increment: 1 } } });
  priyaNotes.push(priyaForkOfLis);

  // ── Sheets + items ───────────────────────────────────────────────────
  const sheetsByOwnerKey = {};
  for (const def of SHEET_DEFS) {
    const sheet = await prisma.sheet.create({
      data: {
        ownerId: users[def.ownerKey].id,
        title: def.title,
        description: def.description,
        visibility: def.visibility,
        targetDate: new Date(Date.now() + def.daysOut * dayMs),
      },
    });
    await prisma.sheetItem.createMany({
      data: def.items.map((item, i) => ({
        sheetId: sheet.id,
        problemId: problemByTitle[item.title]?.id ?? null,
        title: item.title,
        status: item.status,
        position: i,
      })),
    });
    sheetsByOwnerKey[def.ownerKey] = sheet;
  }

  // ── Revisions, staggered per user ───────────────────────────────────
  await prisma.revision.createMany({
    data: [
      ...buildRevisions(demo.id, demoNotes),
      ...buildRevisions(alex.id, alexNotes),
      ...buildRevisions(priya.id, priyaNotes),
      ...buildRevisions(admin.id, adminNotes),
    ],
  });

  // ── CfStats — only for users with a cfHandle. No real API calls here,
  // just plausible numbers inserted directly. ─────────────────────────
  await prisma.cfStats.create({
    data: {
      userId: demo.id,
      handle: 'tourist',
      currentRating: 3823,
      maxRating: 3979,
      ratingHistory: [
        { contestId: 1500, ratingAfter: 3700, at: new Date(Date.now() - 200 * dayMs).toISOString() },
        { contestId: 1550, ratingAfter: 3760, at: new Date(Date.now() - 140 * dayMs).toISOString() },
        { contestId: 1600, ratingAfter: 3823, at: new Date(Date.now() - 60 * dayMs).toISOString() },
      ],
      solvedByTag: [
        { tag: 'dp', solved: 420 },
        { tag: 'graphs', solved: 380 },
        { tag: 'math', solved: 510 },
        { tag: 'greedy', solved: 300 },
        { tag: 'implementation', solved: 600 },
      ],
      syncedAt: new Date(),
    },
  });

  await prisma.cfStats.create({
    data: {
      userId: alex.id,
      handle: 'errichto',
      currentRating: 3650,
      maxRating: 3712,
      ratingHistory: [
        { contestId: 1500, ratingAfter: 3580, at: new Date(Date.now() - 180 * dayMs).toISOString() },
        { contestId: 1580, ratingAfter: 3712, at: new Date(Date.now() - 90 * dayMs).toISOString() },
        { contestId: 1620, ratingAfter: 3650, at: new Date(Date.now() - 30 * dayMs).toISOString() },
      ],
      solvedByTag: [
        { tag: 'dp', solved: 260 },
        { tag: 'graphs', solved: 310 },
        { tag: 'strings', solved: 190 },
        { tag: 'math', solved: 220 },
      ],
      syncedAt: new Date(),
    },
  });

  // ── Reports — one in each status so the admin queue isn't empty. ────
  await prisma.report.create({
    data: {
      reporterId: alex.id,
      targetType: 'note',
      targetId: richNotes.numIslands.id,
      reason: 'Contains plagiarized content copied from another source.',
      status: 'open',
    },
  });
  await prisma.report.create({
    data: {
      reporterId: priya.id,
      targetType: 'sheet',
      targetId: sheetsByOwnerKey.alex.id,
      reason: "Sheet title is misleading — not actually Striver's official sheet.",
      status: 'dismissed',
    },
  });
  await prisma.report.create({
    data: {
      reporterId: demo.id,
      targetType: 'note',
      targetId: richNotes.kadane.id,
      reason: 'Duplicate of an existing note on the same problem.',
      status: 'resolved',
    },
  });

  // ── Submissions: realistic historical activity for demo, alex, priya ────
  const submissionRows = [];
  const nowTs = Date.now();

  // Helper to add submissions on specific days in the past
  function addSubmissionsForUser(user, problemList, activityDays) {
    for (const { daysAgo, count } of activityDays) {
      for (let c = 0; c < count; c++) {
        const prob = problemList[(daysAgo + c) % problemList.length];
        const submittedAt = new Date(nowTs - daysAgo * dayMs + (c * 3600000 + 1200000));
        submissionRows.push({
          userId: user.id,
          problemId: prob ? prob.id : null,
          status: c % 4 === 3 ? 'attempted' : 'accepted',
          language: ['python', 'cpp', 'java', 'javascript'][(daysAgo + c) % 4],
          code: 'def solve():\n    return True',
          submittedAt,
        });
      }
    }
  }

  // Generate a realistic pattern of days with submissions for demo user (~180 submissions across last 300 days)
  const demoDays = [];
  // Active recent streak
  for (let i = 0; i < 7; i++) demoDays.push({ daysAgo: i, count: (i % 3) + 1 });
  // Scattered activity across past year
  for (let i = 8; i < 350; i += 2 + (i % 5)) {
    const count = (i % 7 === 0) ? 5 : (i % 4 === 0) ? 3 : (i % 2 === 0) ? 2 : 1;
    demoDays.push({ daysAgo: i, count });
  }
  addSubmissionsForUser(demo, problemRows, demoDays);

  // Alex days
  const alexDays = [];
  for (let i = 0; i < 14; i++) alexDays.push({ daysAgo: i, count: (i % 2) + 2 });
  for (let i = 15; i < 280; i += 3 + (i % 4)) {
    alexDays.push({ daysAgo: i, count: (i % 3) + 1 });
  }
  addSubmissionsForUser(alex, problemRows, alexDays);

  // Priya days
  const priyaDays = [];
  for (let i = 5; i < 200; i += 4 + (i % 3)) {
    priyaDays.push({ daysAgo: i, count: (i % 2) + 1 });
  }
  addSubmissionsForUser(priya, problemRows, priyaDays);

  await prisma.submission.createMany({ data: submissionRows });

  // ── Summary ──────────────────────────────────────────────────────────
  const [userCount, problemCount, noteCount, revisionCount, sheetCount, sheetItemCount, cfStatsCount, reportCount, tagCount, submissionCount] =
    await Promise.all([
      prisma.user.count(),
      prisma.problem.count(),
      prisma.note.count(),
      prisma.revision.count(),
      prisma.sheet.count(),
      prisma.sheetItem.count(),
      prisma.cfStats.count(),
      prisma.report.count(),
      prisma.tag.count(),
      prisma.submission.count(),
    ]);

  console.log('[seed] summary:');
  console.log(`  users:      ${userCount}`);
  console.log(`  problems:   ${problemCount}`);
  console.log(`  notes:      ${noteCount}`);
  console.log(`  revisions:  ${revisionCount}`);
  console.log(`  sheets:     ${sheetCount}`);
  console.log(`  sheetItems: ${sheetItemCount}`);
  console.log(`  cfStats:    ${cfStatsCount}`);
  console.log(`  reports:    ${reportCount}`);
  console.log(`  tags:       ${tagCount}`);
  console.log(`  submissions: ${submissionCount}`);
  console.log(
    '[seed] accounts (password: password123): demo@algovault.dev (user), admin@algovault.dev (admin), alex@algovault.dev (user), priya@algovault.dev (user)',
  );

  await disconnectDB();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
