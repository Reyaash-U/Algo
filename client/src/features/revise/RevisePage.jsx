import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';

export function RevisePage() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();

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
    <div className="av-revise-page" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>🧠 Spaced Repetition Queue</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Review notes using SM-2 algorithm to lock DSA patterns into long-term memory.
          </p>
        </div>
        <span className="av-complexity-pill av-complexity-pill--time">
          {currentIndex + 1} / {items.length} Due
        </span>
      </div>

      {items.length === 0 ? (
        <EmptyState title="Nothing due today 🎉" description="Come back tomorrow or enroll more notes from your Vault!" />
      ) : (
        <div className="av-flashcard-stack">
          <div className="av-flashcard av-card--glow">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-warning)', letterSpacing: '0.05em' }}>
                ⚡ DUE FOR REVIEW TODAY
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                {(currentCard.patternTags ?? []).map((t) => (
                  <span key={t} className="av-pattern-tag">#{t}</span>
                ))}
              </div>
            </div>

            <h2 style={{ margin: '0 0 16px', fontSize: '1.35rem', color: '#fff' }}>
              {currentCard.noteTitle ?? currentCard.title}
            </h2>

            <div style={{ minHeight: '140px', background: 'rgba(0,0,0,0.3)', padding: '16px', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
              {showAnswer ? (
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: '#e5e7eb', whitespace: 'pre-wrap' }}>
                  {currentCard.contentMarkdown}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '120px', gap: '12px' }}>
                  <span style={{ fontSize: '1.8rem' }}>🔒</span>
                  <button className="av-btn av-btn--secondary" onClick={() => setShowAnswer(true)}>
                    Show Solution & Intuition
                  </button>
                </div>
              )}
            </div>

            {showAnswer && (
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                  Rate Recall Confidence (1 = Forgot, 5 = Mastered):
                </span>
                <div className="av-confidence-group">
                  <button className="av-confidence-btn av-confidence-btn--1" onClick={() => handleRate(1)}>
                    1 <span>Forgot</span>
                  </button>
                  <button className="av-confidence-btn av-confidence-btn--2" onClick={() => handleRate(2)}>
                    2 <span>Hard</span>
                  </button>
                  <button className="av-confidence-btn av-confidence-btn--3" onClick={() => handleRate(3)}>
                    3 <span>Fair</span>
                  </button>
                  <button className="av-confidence-btn av-confidence-btn--4" onClick={() => handleRate(4)}>
                    4 <span>Good</span>
                  </button>
                  <button className="av-confidence-btn av-confidence-btn--5" onClick={() => handleRate(5)}>
                    5 <span>Easy</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
