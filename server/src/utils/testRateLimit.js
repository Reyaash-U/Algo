import { prisma, connectDB, disconnectDB } from '../config/db.js';
import { createApp } from '../app.js';
import { signAccessToken } from './tokens.js';

async function run() {
  await connectDB();
  const app = createApp();

  const server = app.listen(0);
  const port = server.address().port;
  console.log(`[test] Express server listening on dynamic port ${port}`);

  try {
    // 1. Get seeded entities
    const user = await prisma.user.findFirst({
      where: { email: 'demo@algovault.dev' },
    });
    const note = await prisma.note.findFirst({
      where: { ownerId: user.id },
    });

    if (!user || !note) {
      console.error('Demo user or seeded note not found in DB. Please run seed script first.');
      return;
    }

    const token = signAccessToken(user);

    // 2. Simulate normal typing autosaves (spaced 800ms apart)
    console.log('\n--- 1. Testing normal debounced updates (spaced 800ms apart) ---');
    console.log('Sending 5 updates sequentially...');
    for (let i = 0; i < 5; i++) {
      const res = await fetch(`http://localhost:${port}/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contentMarkdown: `Normal typing edit ${i}` }),
      });
      console.log(`Update ${i + 1} status: ${res.status}`);
      if (res.status === 429) {
        console.error('FAIL: Rate limited under normal typing!');
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 800));
    }
    console.log('SUCCESS: Spaced updates passed without rate limiting.');

    // 3. Simulate a tight loop (unspaced requests) to trigger 429
    console.log('\n--- 2. Testing tight loop updates (abuse simulation) ---');
    console.log('Sending 20 updates in a tight loop...');
    let rateLimited = false;

    for (let i = 0; i < 20; i++) {
      const res = await fetch(`http://localhost:${port}/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ contentMarkdown: `Tight loop edit ${i}` }),
      });

      if (res.status === 429) {
        console.log(`Request ${i + 1} status: 429 Too Many Requests (SUCCESS: throttled!)`);
        rateLimited = true;
        break;
      } else {
        console.log(`Request ${i + 1} status: ${res.status}`);
      }
    }

    if (!rateLimited) {
      console.error('FAIL: Tight loop requests did not trigger 429!');
    }
  } catch (err) {
    console.error('Error during rate limit test:', err);
  } finally {
    server.close();
    await disconnectDB();
  }
}

run();
