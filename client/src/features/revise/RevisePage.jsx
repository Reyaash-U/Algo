import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';

export function RevisePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.revisionsDue,
    queryFn: () => api.revisions.due(),
  });

  const rateMutation = useMutation({
    mutationFn: ({ noteId, rating }) => api.revisions.review(noteId, rating),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.revisionsDue });
      toast.push('Revision recorded successfully!', { type: 'success' });
      setShowAnswer(false);
      if (items && currentIndex < items.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      }
    },
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load queue: {error.message}</p>;

  // Provide mock fallback items if backend queue is empty for demo/scaffold purposes
  const rawItems = data?.items ?? [];
  const items = rawItems.length > 0 ? rawItems : [
    {
      id: 'rev-1',
      noteId: 'note-1',
      noteTitle: 'Two Sum - Hash Map Approach',
      patternTags: ['HashTable', 'Array'],
      contentMarkdown: '### Intuition\nUse a hash map to store `target - num` as we iterate.\n\n```python\ndef twoSum(nums, target):\n    seen = {}\n    for i, num in enumerate(nums):\n        diff = target - num\n        if diff in seen:\n            return [seen[diff], i]\n        seen[num] = i\n```',
      repetitions: 2,
    },
    {
      id: 'rev-2',
      noteId: 'note-2',
      noteTitle: '3Sum - Two Pointer Technique',
      patternTags: ['TwoPointers', 'Sorting'],
      contentMarkdown: '### Intuition\nSort the array first, fix one element, and run 2-pointer scan on the rest.\n\n```cpp\n// Time: O(N^2), Space: O(1)\n```',
      repetitions: 1,
    }
  ];

  const currentCard = items[currentIndex];

  const handleRate = (rating) => {
    rateMutation.mutate({ noteId: currentCard.noteId, rating });
  };

  return (
    <div className="av-revise-page" style={{ maxWidth: '680px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em' }}>🧠 Spaced Repetition Queue</h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Review notes using SM-2 algorithm to lock DSA patterns into long-term memory.
          </p>
        </div>
        <span className="btn-mono-secondary" style={{ pointerEvents: 'none', padding: '6px 14px', borderRadius: '20px' }}>
          {currentIndex + 1} / {items.length} Due
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing due today 🎉" description="Come back tomorrow or enroll more notes from your Vault!" />
      ) : (
        <div className="av-flashcard-stack">
          <div className="mono-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '0.05em' }}>
                ⚡ DUE FOR REVIEW TODAY
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(currentCard.patternTags ?? []).map((t) => (
                  <span key={t} className="btn-mono-secondary" style={{ padding: '3px 8px', fontSize: '0.72rem', borderRadius: '4px' }}>#{t}</span>
                ))}
              </div>
            </div>

            <h2 className="text-mono-title" style={{ margin: '0 0 20px', fontSize: '1.5rem', fontWeight: 800 }}>
              {currentCard.noteTitle ?? currentCard.title}
            </h2>

            <div style={{ minHeight: '160px', background: theme === 'light' ? '#ffffff' : '#050505', padding: '24px', borderRadius: '10px', border: '1px solid var(--border-color)', marginBottom: '24px' }}>
              {showAnswer ? (
                <pre style={{ margin: 0, fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: 'var(--text-primary)', whiteSpace: 'pre-wrap' }}>
                  {currentCard.contentMarkdown}
                </pre>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '140px', gap: '14px' }}>
                  <span style={{ fontSize: '2rem' }}>🔒</span>
                  <button className="btn-mono-secondary" onClick={() => setShowAnswer(true)}>
                    Show Solution & Intuition
                  </button>
                </div>
              )}
            </div>

            {showAnswer && (
              <div style={{ marginTop: '28px', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 650, display: 'block', marginBottom: '16px' }}>
                  Rate Recall Confidence (1 = Forgot, 5 = Mastered):
                </span>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '10px' }}>
                  {[
                    { val: 1, label: 'Forgot' },
                    { val: 2, label: 'Hard' },
                    { val: 3, label: 'Fair' },
                    { val: 4, label: 'Good' },
                    { val: 5, label: 'Easy' }
                  ].map((btn) => (
                    <button
                      key={btn.val}
                      className="btn-mono-secondary"
                      onClick={() => handleRate(btn.val)}
                      style={{
                        flexDirection: 'column',
                        padding: '12px 6px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-color)'
                      }}
                    >
                      <strong style={{ fontSize: '1.1rem' }}>{btn.val}</strong>
                      <span style={{ fontSize: '0.7rem', opacity: 0.8, fontWeight: 500, marginTop: '2px' }}>{btn.label}</span>
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
