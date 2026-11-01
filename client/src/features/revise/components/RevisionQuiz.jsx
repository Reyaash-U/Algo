import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, XCircle, ChevronRight, Loader2, SkipForward, Trophy, AlertTriangle } from 'lucide-react';
import { api } from '../../../api/apiClient.js';
import { useTheme } from '../../../lib/themeContext.jsx';

// Replicated from the server's ratingFromQuizResult. Kept in a shared contract would be
// nicer, but the client only shows the resulting rating; the server does the real
// mapping again before persisting, so these two must stay in sync by convention.
export function ratingFromQuizResult({ total, correct, confidentEasy = false }) {
  if (!total) return null;
  const accuracy = correct / total;
  if (accuracy < 0.5) return 0;
  if (accuracy < 1) return 1;
  return confidentEasy ? 3 : 2;
}

const RATING_LABELS = ['Again', 'Hard', 'Good', 'Easy'];
const RATING_COLORS = ['#f43f5e', '#f59e0b', '#38bdf8', '#22c55e'];

/**
 * MCQ-based active recall for a single revision card. The parent (RevisePage) still
 * owns the rateMutation; this component only decides what rating to submit based on
 * the user's quiz answers and whether they say the recall felt easy.
 *
 * Props:
 *   card: the current revision item (uses id, noteTitle)
 *   onComplete({ rating, mcqResult }): called once per card when the user submits the rating
 *   onSkip(): fall back to the plain reveal-and-rate flow for this card
 *   submitting: boolean (true while the parent's rateMutation is pending)
 */
export function RevisionQuiz({ card, onComplete, onSkip, submitting }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['revisions', 'mcqs', card.id],
    queryFn: () => api.revisions.mcqs(card.id),
    staleTime: 60_000,
  });
  const questions = useMemo(() => data?.questions ?? [], [data]);

  // Per-card state resets whenever we move to a new card.
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answers, setAnswers] = useState([]); // array of booleans, correct?
  const [submittedThisQuestion, setSubmittedThisQuestion] = useState(false);
  const [confidentEasy, setConfidentEasy] = useState(false);
  const [handedOff, setHandedOff] = useState(false); // guard against double submit

  useEffect(() => {
    setIndex(0);
    setSelected(null);
    setAnswers([]);
    setSubmittedThisQuestion(false);
    setConfidentEasy(false);
    setHandedOff(false);
  }, [card.id]);

  if (isLoading) {
    return (
      <div className="mono-card" style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-secondary)' }}>
        <Loader2 size={16} className="animate-spin" /> Preparing quiz questions...
      </div>
    );
  }

  // No questions could be generated for this note (missing metadata) — hand off
  // immediately to the plain reveal-and-rate flow instead of blocking the user.
  if (isError || questions.length === 0) {
    return (
      <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <AlertTriangle size={16} />
          {isError
            ? `Could not load the quiz: ${error?.message || 'unknown error'}`
            : 'No quiz questions could be generated for this note (missing tags or complexity).'}
        </div>
        <button type="button" onClick={onSkip} className="btn-mono-primary" style={{ padding: '8px 16px', alignSelf: 'flex-start' }}>
          Continue with the plain reveal-and-rate flow
        </button>
      </div>
    );
  }

  const finished = answers.length === questions.length;
  const correctCount = answers.filter(Boolean).length;

  const handleSubmitAnswer = () => {
    if (selected === null || submittedThisQuestion) return;
    const isCorrect = selected === questions[index].correctIndex;
    setAnswers((prev) => [...prev, isCorrect]);
    setSubmittedThisQuestion(true);
  };

  const handleNext = () => {
    setIndex((i) => i + 1);
    setSelected(null);
    setSubmittedThisQuestion(false);
  };

  const handleFinish = () => {
    if (handedOff || submitting) return;
    setHandedOff(true);
    const result = { total: questions.length, correct: correctCount, confidentEasy };
    const rating = ratingFromQuizResult(result);
    onComplete({ rating, mcqResult: result });
  };

  // Results screen (shown after the last question has been submitted).
  if (finished) {
    const accuracy = Math.round((correctCount / questions.length) * 100);
    const previewRating = ratingFromQuizResult({ total: questions.length, correct: correctCount, confidentEasy });
    const canClaimEasy = correctCount === questions.length;
    return (
      <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Trophy size={22} style={{ color: '#eab308' }} />
          <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.1rem' }}>Quiz complete</h3>
        </div>
        <div style={{ display: 'flex', gap: '18px', fontSize: '0.95rem', flexWrap: 'wrap' }}>
          <div><strong>{correctCount}</strong> / {questions.length} correct</div>
          <div><strong>{accuracy}%</strong> accuracy</div>
          <div>
            Rating:{' '}
            <strong style={{ color: RATING_COLORS[previewRating] }}>
              {RATING_LABELS[previewRating]}
            </strong>
          </div>
        </div>
        {canClaimEasy && (
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={confidentEasy} onChange={(e) => setConfidentEasy(e.target.checked)} />
            That felt easy — mark as <strong style={{ color: RATING_COLORS[3] }}>Easy</strong> so the next review is pushed further out
          </label>
        )}
        <div style={{ display: 'flex', gap: '10px' }}>
          <button type="button" className="btn-mono-primary" onClick={handleFinish} disabled={submitting || handedOff} style={{ padding: '10px 20px' }}>
            {submitting ? 'Saving...' : 'Submit rating'}
          </button>
          <button type="button" className="btn-mono-secondary" onClick={onSkip} disabled={submitting} style={{ padding: '10px 20px' }}>
            Reveal solution instead
          </button>
        </div>
      </div>
    );
  }

  const q = questions[index];
  const isCorrect = submittedThisQuestion && selected === q.correctIndex;
  return (
    <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
          Question {index + 1} of {questions.length} &middot; {q.category}
        </span>
        <button type="button" onClick={onSkip} disabled={submitting} title="Skip the quiz and reveal the solution directly"
          style={{ background: 'none', border: 0, color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '0.8rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
          <SkipForward size={14} /> Skip
        </button>
      </div>
      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 2, background: isLight ? '#e5e7eb' : '#262626', overflow: 'hidden' }}>
        <div style={{ width: `${((answers.length) / questions.length) * 100}%`, height: '100%', background: '#38bdf8', transition: 'width 0.3s' }} />
      </div>

      <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.4 }}>{q.question}</h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {q.options.map((option, i) => {
          const chosen = selected === i;
          const correct = submittedThisQuestion && i === q.correctIndex;
          const wrongChoice = submittedThisQuestion && chosen && i !== q.correctIndex;
          const borderColor = correct ? '#22c55e' : wrongChoice ? '#f43f5e' : chosen ? '#38bdf8' : 'var(--border-color)';
          const background = correct ? 'rgba(34, 197, 94, 0.08)' : wrongChoice ? 'rgba(244, 63, 94, 0.08)' : chosen ? 'rgba(56, 189, 248, 0.08)' : 'transparent';
          return (
            <button
              key={i}
              type="button"
              onClick={() => !submittedThisQuestion && setSelected(i)}
              disabled={submittedThisQuestion}
              style={{
                textAlign: 'left', padding: '12px 14px', borderRadius: '8px', border: `1.5px solid ${borderColor}`, background,
                color: 'var(--text-primary)', fontSize: '0.92rem', cursor: submittedThisQuestion ? 'default' : 'pointer',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px',
              }}
            >
              <span><strong style={{ marginRight: '10px', color: 'var(--text-secondary)' }}>{String.fromCharCode(65 + i)}.</strong>{option}</span>
              {correct && <CheckCircle2 size={18} style={{ color: '#22c55e', flexShrink: 0 }} />}
              {wrongChoice && <XCircle size={18} style={{ color: '#f43f5e', flexShrink: 0 }} />}
            </button>
          );
        })}
      </div>

      {submittedThisQuestion && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: isCorrect ? 'rgba(34, 197, 94, 0.08)' : 'rgba(244, 63, 94, 0.08)', fontSize: '0.88rem', color: 'var(--text-primary)' }}>
          <strong style={{ color: isCorrect ? '#22c55e' : '#f43f5e' }}>{isCorrect ? 'Correct' : 'Incorrect'}.</strong>{' '}
          {q.explanation}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
        {!submittedThisQuestion ? (
          <button type="button" className="btn-mono-primary" onClick={handleSubmitAnswer} disabled={selected === null} style={{ padding: '9px 18px' }}>
            Submit Answer
          </button>
        ) : (
          <button type="button" className="btn-mono-primary" onClick={handleNext} style={{ padding: '9px 18px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {index === questions.length - 1 ? 'See Results' : 'Next Question'} <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
