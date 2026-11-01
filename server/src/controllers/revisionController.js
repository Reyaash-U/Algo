import { ok } from '../utils/apiResponse.js';
import { asyncHandler } from '../utils/apiError.js';
import { prisma } from '../config/db.js';
import { toRevisionDTO } from '../models/Revision.js';
import {
  enrollNote,
  getDueRevisions,
  submitReview,
  getRevisionStats,
  findOwnedRevision,
} from '../services/revisionServiceDb.js';
import { generateMCQs } from '../services/mcqGeneratorService.js';
import { getAiMcqsForNote } from '../services/aiMcqService.js';

export const enroll = asyncHandler(async (req, res) => {
  const revision = await enrollNote(req.user.id, req.body?.noteId);
  res.status(200).json(ok(toRevisionDTO(revision)));
});

export const due = asyncHandler(async (req, res) => {
  const items = await getDueRevisions(req.user.id, { all: req.query?.all === 'true' });
  res.status(200).json(
    ok({
      items: items.map(toRevisionDTO),
      count: items.length,
    }),
  );
});

export const review = asyncHandler(async (req, res) => {
  const revision = await submitReview(req.user.id, req.params.id, req.body?.rating, { mcqResult: req.body?.mcqResult });
  res.status(200).json(ok(toRevisionDTO(revision)));
});

export const stats = asyncHandler(async (req, res) => {
  const result = await getRevisionStats(req.user.id);
  res.status(200).json(ok(result));
});

// GET /revisions/:id/mcqs — multiple-choice questions generated from the note's own
// metadata (tags, code block complexity, difficulty) plus the student's own keyInsight
// and edgeCase. Distractors for the student-authored questions are pulled from the
// user's OTHER notes, so a well-used account produces truly problem-specific quizzes.
// The quiz is self-marked; the user still submits a rating through POST /revisions/:id/review.
export const mcqs = asyncHandler(async (req, res) => {
  const revision = await findOwnedRevision(req.user.id, req.params.id);
  const others = await prisma.note.findMany({
    where: {
      ownerId: req.user.id,
      id: { not: revision.noteId },
      deletedAt: null,
      OR: [{ keyInsight: { not: null } }, { edgeCase: { not: null } }],
    },
    select: { keyInsight: true, edgeCase: true },
    take: 50,
  });
  const distractors = {
    insight: others.map((n) => n.keyInsight).filter(Boolean),
    edge: others.map((n) => n.edgeCase).filter(Boolean),
  };
  // Run AI generation alongside the deterministic templates. The AI call has its own
  // timeout and fail-safe fallback (returns []), so a slow or broken Gemini never blocks the quiz.
  const [aiQuestions, templated] = await Promise.all([getAiMcqsForNote(revision.note), Promise.resolve(generateMCQs(revision.note, distractors))]);

  // Cap the quiz at 5 questions, chosen by specificity:
  //   1) student-authored (keyInsight / edgeCase)
  //   2) AI-generated (problem-specific, reads the actual code and notes)
  //   3) templated (data-structure / algorithm / complexity patterns)
  const QUIZ_SIZE = 5;
  const isStudentAuthored = (q) => q.category === 'Key Insight (your own)' || q.category === 'Edge Case (your own)';
  const studentAuthored = templated.filter(isStudentAuthored);
  const templatedRest = templated.filter((q) => !isStudentAuthored(q));
  const questions = [...studentAuthored, ...aiQuestions, ...templatedRest].slice(0, QUIZ_SIZE);
  const aiCount = questions.filter((q) => q.aiGenerated).length;
  res.status(200).json(ok({ revisionId: revision.id, noteId: revision.noteId, questions, aiCount }));
});
