import { createNote } from './src/services/noteService.js';

async function run() {
  try {
    const data = {
      title: 'Test Note',
      contentMarkdown: 'hello',
      patternTags: ['Array'],
      codeBlocks: [
        {
          language: 'python',
          code: 'print("hello")',
          timeComplexity: 'O(1)',
          spaceComplexity: 'O(1)'
        }
      ]
    };
    
    // Using a fake UUID for testing, will fail foreign key constraint if users table is checked.
    // Or we can just get a real user first.
    const { prisma } = await import('./src/config/db.js');
    const user = await prisma.user.findFirst();
    
    if (!user) {
      console.log('No user found');
      return;
    }

    const note = await createNote(user.id, data);
    console.log('Success:', note);
  } catch (err) {
    console.error('Error:', err);
  } finally {
    process.exit(0);
  }
}

run();
