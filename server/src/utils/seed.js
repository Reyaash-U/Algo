// Seed script: ~30 notes across patterns with staggered nextReviewAt so the
// demo Revision Queue and dashboard are ALIVE, not empty.
// Run: npm run seed  (from server/, or `npm run seed` from repo root)
import bcrypt from 'bcryptjs';
import { prisma, connectDB, disconnectDB } from '../config/db.js';

const PATTERNS = ['dp', 'graphs', 'two-pointers', 'sliding-window', 'binary-search', 'greedy'];

async function run() {
  await connectDB();

  // Clean slate — order matters for FK constraints (children before parents).
  await prisma.revision.deleteMany({});
  await prisma.sheetItem.deleteMany({});
  await prisma.sheet.deleteMany({});
  await prisma.note.deleteMany({});
  await prisma.cfStats.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.tag.deleteMany({});

  await prisma.tag.createMany({
    data: PATTERNS.map((p) => ({ name: p })),
  });

  const demo = await prisma.user.create({
    data: {
      email: 'demo@algovault.dev',
      passwordHash: await bcrypt.hash('password123', 10),
      displayName: 'Demo Student',
      streakCurrent: 5,
      streakLongest: 22,
      streakLastActiveDate: new Date(),
    },
  });

  const noteRows = [];
  for (let i = 0; i < 30; i++) {
    const note = await prisma.note.create({
      data: {
        ownerId: demo.id,
        title: `Problem ${i + 1}`,
        contentMarkdown: `## Approach\nNotes for problem ${i + 1}.`,
        patternTags: [PATTERNS[i % PATTERNS.length]],
        confidence: (i % 5) + 1,
      },
    });
    noteRows.push(note);
  }

  // Stagger nextReviewAt: some overdue, some today, some future.
  const dayMs = 86400000;
  await prisma.revision.createMany({
    data: noteRows.map((n, i) => ({
      userId: demo.id,
      noteId: n.id,
      repetitions: i % 4,
      intervalDays: [0, 1, 6, 15][i % 4],
      easeFactor: 2.5,
      nextReviewAt: new Date(Date.now() + (i % 7 === 0 ? -1 : i % 3) * dayMs),
    })),
  });

  console.log(`[seed] created demo user (demo@algovault.dev / password123) + ${noteRows.length} notes`);
  await disconnectDB();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
