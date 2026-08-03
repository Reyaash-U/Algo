import { createApp } from './app.js';
import { connectDB } from './config/db.js';
import { env } from './config/env.js';
import { registerCronJobs } from './jobs/index.js';

async function main() {
  await connectDB();
  const app = createApp();

  registerCronJobs(); // daily revision digest, cf auto-sync

  app.listen(env.PORT, () => {
    console.log(`[server] listening on http://localhost:${env.PORT}  (stubs: ${env.ENABLE_STUBS})`);
  });
}

main().catch((err) => {
  console.error('[server] failed to start:', err);
  process.exit(1);
});
