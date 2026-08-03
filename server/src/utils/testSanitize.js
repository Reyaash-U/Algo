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

    if (!user) {
      console.error('Demo user not found. Please run seed script first.');
      return;
    }

    const token = signAccessToken(user);

    // 2. Send dangerous payload to create a note
    const dangerousPayload = `
# Dangerous Note
This is some safe text.
<script>alert('dangerous XSS script');</script>
<iframe src="javascript:alert(1)"></iframe>
[Harmless Link](https://google.com)
[Dangerous Link](javascript:alert(2))
<p onclick="runExploit()">Interactive exploit paragraph</p>
`;

    console.log('\n--- Sending dangerous note payload (POST /notes) ---');
    const res = await fetch(`http://localhost:${port}/api/notes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title: 'XSS Test Note',
        contentMarkdown: dangerousPayload,
      }),
    });

    const json = await res.json();
    console.log(`Status: ${res.status}`);

    if (!json.ok) {
      console.error('FAIL: Request failed:', json.error);
      return;
    }

    const savedMarkdown = json.data.contentMarkdown;
    console.log('\n--- Returned / Stored Markdown ---');
    console.log(savedMarkdown);
    console.log('----------------------------------');

    const containsScript = savedMarkdown.includes('<script>');
    const containsIframe = savedMarkdown.includes('<iframe>') || savedMarkdown.includes('<iframe');
    const containsOnclick = savedMarkdown.includes('onclick');
    const containsJsProtocol = savedMarkdown.includes('javascript:');

    if (containsScript || containsIframe || containsOnclick || containsJsProtocol) {
      console.error('FAIL: Markdown contains un-sanitized dangerous tags/attributes!');
    } else {
      console.log('SUCCESS: All dangerous XSS elements were stripped/sanitized by isomorphic-dompurify!');
    }
  } catch (err) {
    console.error('Error during sanitization test:', err);
  } finally {
    server.close();
    await disconnectDB();
  }
}

run();
