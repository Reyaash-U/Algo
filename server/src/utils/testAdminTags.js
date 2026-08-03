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
    // 1. Find the seeded demo user
    let user = await prisma.user.findFirst({
      where: { email: 'demo@algovault.dev' },
    });

    if (!user) {
      console.error('Demo user not found. Please run seed script first.');
      return;
    }

    // 2. Temporarily sign a standard USER token
    console.log('\n--- 1. Testing non-admin access (should get 403) ---');
    const userToken = signAccessToken({ ...user, role: 'user' });
    const userRes = await fetch(`http://localhost:${port}/api/admin/tags`, {
      headers: { Authorization: `Bearer ${userToken}` },
    });
    const userJson = await userRes.json();
    console.log(`Status: ${userRes.status}`);
    console.log('Response:', JSON.stringify(userJson, null, 2));

    // 3. Promote user to ADMIN
    console.log('\nPromoting user demo@algovault.dev to admin role...');
    user = await prisma.user.update({
      where: { id: user.id },
      data: { role: 'admin' },
    });

    const adminToken = signAccessToken(user);

    // 4. Test GET /api/admin/tags
    console.log('\n--- 2. Testing GET /api/admin/tags ---');
    const getRes = await fetch(`http://localhost:${port}/api/admin/tags`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const getJson = await getRes.json();
    console.log(`Status: ${getRes.status}`);
    console.log('Response:', JSON.stringify(getJson, null, 2));

    // 5. Test POST /api/admin/tags
    console.log('\n--- 3. Testing POST /api/admin/tags ---');
    const postRes = await fetch(`http://localhost:${port}/api/admin/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ tag: 'dynamic-programming' }),
    });
    const postJson = await postRes.json();
    console.log(`Status: ${postRes.status}`);
    console.log('Response:', JSON.stringify(postJson, null, 2));

    // 6. Verify duplicate conflict error
    console.log('\n--- 4. Testing POST duplicate /api/admin/tags ---');
    const dupRes = await fetch(`http://localhost:${port}/api/admin/tags`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ tag: 'dynamic-programming' }),
    });
    const dupJson = await dupRes.json();
    console.log(`Status: ${dupRes.status}`);
    console.log('Response:', JSON.stringify(dupJson, null, 2));

    // 7. Test DELETE /api/admin/tags/:id
    console.log('\n--- 5. Testing DELETE /api/admin/tags/dynamic-programming ---');
    const delRes = await fetch(`http://localhost:${port}/api/admin/tags/dynamic-programming`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const delJson = await delRes.json();
    console.log(`Status: ${delRes.status}`);
    console.log('Response:', JSON.stringify(delJson, null, 2));

    // 8. Test DELETE non-existent tag
    console.log('\n--- 6. Testing DELETE non-existent /api/admin/tags/no-such-tag ---');
    const del404Res = await fetch(`http://localhost:${port}/api/admin/tags/no-such-tag`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const del404Json = await del404Res.json();
    console.log(`Status: ${del404Res.status}`);
    console.log('Response:', JSON.stringify(del404Json, null, 2));
  } catch (err) {
    console.error('Error during test execution:', err);
  } finally {
    server.close();
    await disconnectDB();
  }
}

run();
