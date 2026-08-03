import { connectDB, disconnectDB } from '../config/db.js';
import { dailyRevisionDigest } from '../jobs/dailyRevisionDigest.js';

async function test() {
  try {
    await connectDB();
    await dailyRevisionDigest();
  } catch (err) {
    console.error('Error during manual test run:', err);
  } finally {
    await disconnectDB();
  }
}

test();
