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
    const adminUser = await prisma.user.findFirst({
      where: { email: 'demo@algovault.dev' },
    });
    const note = await prisma.note.findFirst({
      where: { deletedAt: null },
    });

    if (!adminUser || !note) {
      console.error('Missing demo user or seeded note in DB. Please run seed script first.');
      return;
    }

    const userToken = signAccessToken({ ...adminUser, role: 'user' });
    const adminToken = signAccessToken(adminUser);

    console.log(`\nUsing User ID: ${adminUser.id} (${adminUser.email})`);
    console.log(`Using Note ID: ${note.id} (Title: "${note.title}")`);

    // 2. File a report on the note (User access)
    console.log('\n--- 1. Filing a report on the note (POST /notes/:id/report) ---');
    const reportRes = await fetch(`http://localhost:${port}/api/notes/${note.id}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userToken}`,
      },
      body: JSON.stringify({ reason: 'Contains plagiarism in code blocks.' }),
    });

    const reportJson = await reportRes.json();
    console.log(`Status: ${reportRes.status}`);
    console.log('Response:', JSON.stringify(reportJson, null, 2));

    if (!reportJson.ok) {
      console.error('Failed to create report!');
      return;
    }
    const reportId = reportJson.data.id;

    // 3. List reports (Admin access)
    console.log('\n--- 2. Listing reports as Admin (GET /admin/reports) ---');
    const listRes = await fetch(`http://localhost:${port}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const listJson = await listRes.json();
    console.log(`Status: ${listRes.status}`);
    console.log('Response:', JSON.stringify(listJson, null, 2));

    // 4. Resolve the report (Admin access)
    console.log(`\n--- 3. Resolving the report ID: ${reportId} (PATCH /admin/reports/:id) ---`);
    const resolveRes = await fetch(`http://localhost:${port}/api/admin/reports/${reportId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ status: 'dismissed' }),
    });
    const resolveJson = await resolveRes.json();
    console.log(`Status: ${resolveRes.status}`);
    console.log('Response:', JSON.stringify(resolveJson, null, 2));

    // 5. Verify the report is no longer open
    console.log('\n--- 4. Listing reports again (should be empty if only open are returned) ---');
    const verifyRes = await fetch(`http://localhost:${port}/api/admin/reports`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const verifyJson = await verifyRes.json();
    console.log(`Status: ${verifyRes.status}`);
    console.log('Response:', JSON.stringify(verifyJson, null, 2));
  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    server.close();
    await disconnectDB();
  }
}

run();
