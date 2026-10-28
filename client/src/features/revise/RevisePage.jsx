import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { Brain, Zap, Lock, CheckCircle2, RotateCw, BookOpen, Plus, Sparkles, Clock, LogOut } from 'lucide-react';
import { RevisionSummaryScreen, formatTimeSpent } from './components/RevisionSummaryScreen.jsx';

export function RevisePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const [practiceMode, setPracticeMode] = useState(false);

  // Session stats & wall-clock timer (prevents any fast-ticking / drift)
  const startTimeRef = useRef(Date.now());
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [sessionActive, setSessionActive] = useState(true);
  const [isSessionComplete, setIsSessionComplete] = useState(false);
  const [sessionReviewed, setSessionReviewed] = useState([]);
  const [initialQueueCount, setInitialQueueCount] = useState(null);

  const toast = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: [...queryKeys.revisionsDue, { practiceMode }],
    queryFn: () => api.revisions.due(practiceMode ? { all: 'true' } : {}),
  });

  const rawItems = data?.items ?? [];
  const items = rawItems;
  const safeIndex = items.length > 0 ? Math.min(currentIndex, items.length - 1) : 0;
  const currentCard = items[safeIndex];

  // Set initial queue count when data first loads
  useEffect(() => {
    if (data?.items && initialQueueCount === null && data.items.length > 0) {
      setInitialQueueCount(data.items.length);
    }
  }, [data?.items, initialQueueCount]);

  // Wall-clock accurate timer: checks Date.now() against startTimeRef
  useEffect(() => {
    if (!sessionActive || isSessionComplete) return;

    const tick = () => {
      const elapsed = Math.max(0, Math.floor((Date.now() - startTimeRef.current) / 1000));
      setSessionSeconds(elapsed);
    };

    tick();
    const interval = setInterval(tick, 500);
    return () => clearInterval(interval);
  }, [sessionActive, isSessionComplete]);

  // Reset index when mode or items change
  useEffect(() => {
    if (currentIndex >= items.length) {
      setCurrentIndex(Math.max(0, items.length - 1));
    }
  }, [items.length, currentIndex]);

  const rateMutation = useMutation({
    mutationFn: ({ id, rating, card }) =>
      api.revisions.review(id, rating).then((res) => ({ res, rating, card })),
    onSuccess: async ({ rating, card }) => {
      // Record this card into session history
      const newReviewedItem = {
        id: card.id,
        noteId: card.noteId,
        problemId: card.problemId || null,
        noteTitle: card.noteTitle || card.title,
        rating,
        reviewedAt: Date.now(),
      };
      setSessionReviewed((prev) => [...prev, newReviewedItem]);

      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.revisionsDue });
      queryClient.invalidateQueries({ queryKey: queryKeys.revisionStats });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'activityHeatmap'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });

      toast.push('Revision recorded successfully!', { type: 'success' });
      setShowAnswer(false);

      // Check if session is completed after this card
      if (practiceMode) {
        if (safeIndex >= items.length - 1) {
          setIsSessionComplete(true);
          setSessionActive(false);
        } else {
          setCurrentIndex((prev) => prev + 1);
        }
      } else {
        // Due queue: if current queue has 1 or fewer items left, this was the last due card!
        if (items.length <= 1) {
          setIsSessionComplete(true);
          setSessionActive(false);
        } else {
          setCurrentIndex(0);
        }
      }

      await refetch();
    },
    onError: (err) => {
      toast.push(`Failed to save rating: ${err.message}`, { type: 'error' });
    }
  });

  const handleRate = (rating) => {
    if (!currentCard?.id) return;
    rateMutation.mutate({ id: currentCard.id, rating, card: currentCard });
  };

  const handleStartAnotherSession = () => {
    startTimeRef.current = Date.now();
    setSessionReviewed([]);
    setSessionSeconds(0);
    setIsSessionComplete(false);
    setSessionActive(true);
    setInitialQueueCount(null);
    setCurrentIndex(0);
    setShowAnswer(false);

    // If no due cards remain, enable practice mode so cards are available to revise
    if (rawItems.length === 0 && !practiceMode) {
      setPracticeMode(true);
    }
    refetch();
  };

  const handleFinishEarly = () => {
    setIsSessionComplete(true);
    setSessionActive(false);
  };

  // Metrics computation for summary screen & progress tracking
  const sessionReviewedCount = sessionReviewed.length;
  const totalInSession = Math.max(initialQueueCount ?? items.length, sessionReviewedCount + items.length);
  const currentCardNumber = Math.min(totalInSession, sessionReviewedCount + 1);
  const dueRemaining = items.length;

  const uniqueProblems = new Set();
  sessionReviewed.forEach((item) => {
    if (item.problemId) {
      uniqueProblems.add(item.problemId);
    } else if (item.noteTitle) {
      uniqueProblems.add(item.noteTitle);
    } else if (item.noteId) {
      uniqueProblems.add(item.noteId);
    }
  });
  const problemsRevisedCount = uniqueProblems.size;
  const uniqueNotes = new Set(sessionReviewed.map((i) => i.noteId || i.id));
  const notesReviewedCount = uniqueNotes.size || sessionReviewed.length;

  const completionPercentage = Math.min(
    100,
    Math.round((notesReviewedCount / Math.max(1, totalInSession)) * 100)
  );

  const ratingBreakdown = { 0: 0, 1: 0, 2: 0, 3: 0 };
  sessionReviewed.forEach((item) => {
    if (ratingBreakdown[item.rating] !== undefined) {
      ratingBreakdown[item.rating] += 1;
    }
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return (
      <div style={{ maxWidth: '680px', margin: '0 auto', padding: '24px', textAlign: 'center' }}>
        <p className="av-form-error">Failed to load revision queue: {error.message}</p>
        <button className="btn-mono-secondary" onClick={() => refetch()} style={{ marginTop: '12px' }}>
          <RotateCw size={14} style={{ marginRight: '6px' }} /> Retry
        </button>
      </div>
    );
  }

  // Render Summary Screen if session is completed
  if (isSessionComplete) {
    return (
      <div className="av-revise-page" style={{ maxWidth: '680px', margin: '0 auto' }}>
        <RevisionSummaryScreen
          totalSeconds={sessionSeconds}
          problemsRevisedCount={problemsRevisedCount}
          notesReviewedCount={notesReviewedCount}
          completionPercentage={completionPercentage}
          ratingBreakdown={ratingBreakdown}
          reviewedItems={sessionReviewed}
          onStartAnotherSession={handleStartAnotherSession}
        />
      </div>
    );
  }

  return (
    <div className="av-revise-page" style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Brain size={32} strokeWidth={2.5} style={{ color: '#ec4899' }} /> Spaced Repetition Queue
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Review notes using SM-2 algorithm to lock DSA patterns into long-term memory.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {/* Wall-Clock Accurate Live Timer */}
          <span
            className="btn-mono-secondary"
            style={{
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontWeight: 650,
            }}
            title="Time spent in current revision session"
          >
            <Clock size={14} style={{ color: '#38bdf8' }} />
            {formatTimeSpent(sessionSeconds)}
          </span>

          {/* Practice Mode Toggle */}
          <button
            onClick={() => {
              setPracticeMode(!practiceMode);
              setCurrentIndex(0);
              setShowAnswer(false);
              setInitialQueueCount(null);
            }}
            className={practiceMode ? 'btn-mono-primary' : 'btn-mono-secondary'}
            style={{
              padding: '6px 14px',
              fontSize: '0.8rem',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
            title={practiceMode ? 'Switch back to due cards only' : 'Practice all cards regardless of due date'}
          >
            <Sparkles size={14} />
            {practiceMode ? 'Mode: All Notes' : 'Practice Ahead'}
          </button>

          {/* Clear Progress & Remaining Badges */}
          {items.length > 0 ? (
            <>
              <span
                className="btn-mono-secondary"
                style={{
                  pointerEvents: 'none',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  border: '1px solid var(--border-color)',
                }}
              >
                Card {currentCardNumber} of {totalInSession}
              </span>
              <span
                className="btn-mono-secondary"
                style={{
                  pointerEvents: 'none',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: '#22c55e',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  background: 'rgba(34, 197, 94, 0.08)',
                }}
              >
                {dueRemaining} {practiceMode ? 'Left' : 'Due'}
              </span>
            </>
          ) : (
            <span className="btn-mono-secondary" style={{ pointerEvents: 'none', padding: '6px 14px', borderRadius: '20px', fontWeight: 700 }}>
              0 Due
            </span>
          )}

          {/* Finish session button if at least 1 card has been reviewed */}
          {sessionReviewed.length > 0 && (
            <button
              onClick={handleFinishEarly}
              className="btn-mono-secondary"
              style={{
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.8rem',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                color: 'var(--text-secondary)',
              }}
              title="End session and see your workout summary"
            >
              <LogOut size={13} /> Finish Session
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar during active workout */}
      {items.length > 0 && totalInSession > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            <span>Workout Progress: {sessionReviewedCount} of {totalInSession} completed</span>
            <span style={{ color: 'var(--text-primary)' }}>{Math.round((sessionReviewedCount / totalInSession) * 100)}%</span>
          </div>
          <div
            style={{
              width: '100%',
              height: '6px',
              borderRadius: '999px',
              background: theme === 'light' ? '#e2e8f0' : '#1e293b',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${Math.min(100, Math.round((sessionReviewedCount / totalInSession) * 100))}%`,
                height: '100%',
                borderRadius: '999px',
                background: 'linear-gradient(90deg, #ec4899, #38bdf8)',
                transition: 'width 0.4s ease-out',
              }}
            />
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div
          className="mono-card"
          style={{
            padding: '48px 32px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '18px',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              background: 'rgba(34, 197, 94, 0.12)',
              border: '1px solid rgba(34, 197, 94, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#22c55e',
            }}
          >
            <CheckCircle2 size={36} strokeWidth={2.5} />
          </div>

          <div>
            <h2 className="text-mono-title" style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: 800 }}>
              {practiceMode ? 'No Notes Found in Your Vault' : "You're All Caught Up for Today!"}
            </h2>
            <p className="text-mono-desc" style={{ margin: 0, maxWidth: '440px', fontSize: '0.92rem', lineHeight: 1.5 }}>
              {practiceMode
                ? 'Create DSA notes with solutions and pattern tags to begin practicing.'
                : 'No cards are due for review right now. Great job keeping your memory fresh! You can practice ahead or add new notes to your vault.'}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center', marginTop: '8px' }}>
            {!practiceMode && (
              <button
                className="btn-mono-primary"
                onClick={() => {
                  setPracticeMode(true);
                  setCurrentIndex(0);
                  setShowAnswer(false);
                  setInitialQueueCount(null);
                }}
                style={{ padding: '8px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
              >
                <Sparkles size={16} /> Practice All Notes Ahead
              </button>
            )}
            <Link
              to="/vault"
              className="btn-mono-secondary"
              style={{ textDecoration: 'none', padding: '8px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <BookOpen size={16} /> Browse Vault
            </Link>
            <Link
              to="/notes/new"
              className="btn-mono-secondary"
              style={{ textDecoration: 'none', padding: '8px 18px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '8px' }}
            >
              <Plus size={16} /> Create Note
            </Link>
          </div>
        </div>
      ) : (
        <div className="av-flashcard-stack">
          <div className="mono-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Zap size={16} strokeWidth={2.5} style={{ color: '#eab308' }} />
                {practiceMode ? 'PRACTICE AHEAD MODE' : 'DUE FOR REVIEW TODAY'} • {dueRemaining} REMAINING
              </span>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {(currentCard.patternTags ?? []).map((t) => (
                  <span key={t} className="btn-mono-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '4px' }}>
                    #{t}
                  </span>
                ))}
              </div>
            </div>

            <h2 className="text-mono-title" style={{ margin: '0 0 20px', fontSize: '1.5rem', fontWeight: 800 }}>
              {currentCard.noteTitle || currentCard.title || 'Untitled Problem Note'}
            </h2>

            <div
              style={{
                minHeight: '160px',
                background: theme === 'light' ? '#ffffff' : '#050505',
                padding: '24px',
                borderRadius: '10px',
                border: '1px solid var(--border-color)',
                marginBottom: '24px',
              }}
            >
              {showAnswer ? (
                <pre
                  style={{
                    margin: 0,
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.88rem',
                    color: 'var(--text-primary)',
                    whiteSpace: 'pre-wrap',
                    lineHeight: 1.6,
                  }}
                >
                  {currentCard.contentMarkdown || 'No solution markdown written for this note yet.'}
                </pre>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', gap: '14px' }}>
                  <Lock size={32} style={{ color: 'var(--text-secondary)' }} />
                  <button className="btn-mono-secondary" onClick={() => setShowAnswer(true)}>
                    Show Solution & Intuition
                  </button>
                </div>
              )}
            </div>

            {showAnswer && (
              <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 650, display: 'block', marginBottom: '16px' }}>
                  Rate Recall Confidence:
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
                  {[
                    { val: 0, label: 'Again', desc: 'Forgot it' },
                    { val: 1, label: 'Hard', desc: 'Recalled with effort' },
                    { val: 2, label: 'Good', desc: 'Recalled easily' },
                    { val: 3, label: 'Easy', desc: 'Perfect recall' },
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      className="btn-mono-secondary"
                      onClick={() => handleRate(btn.val)}
                      style={{
                        flexDirection: 'column',
                        padding: '16px 8px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)',
                        gap: '4px',
                        cursor: rateMutation.isPending ? 'not-allowed' : 'pointer',
                      }}
                      disabled={rateMutation.isPending}
                    >
                      <strong style={{ fontSize: '1.1rem' }}>{btn.label}</strong>
                      <span style={{ fontSize: '0.7rem', opacity: 0.7, fontWeight: 500, textAlign: 'center' }}>{btn.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}


