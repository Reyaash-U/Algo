import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { PatternTags } from '../../components/shared/PatternTags.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useTheme } from '../../lib/themeContext.jsx';

export function VaultPage() {
  const { theme } = useTheme();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.notes(),
    queryFn: () => api.notes.list(),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load notes: {error.message}</p>;

  const rawNotes = data?.items ?? [];
  const notes = rawNotes.length > 0 ? rawNotes : [
    {
      id: 'note-1',
      title: 'Two Sum - Hash Map Optimal Solution',
      patternTags: ['Array', 'HashTable'],
      createdAt: '2026-08-01',
    },
    {
      id: 'note-2',
      title: 'Trapping Rain Water - Monotonic Stack',
      patternTags: ['TwoPointers', 'Stack', 'DynamicProgramming'],
      createdAt: '2026-08-03',
    },
    {
      id: 'note-3',
      title: 'LRU Cache - Doubly Linked List & Hash Map',
      patternTags: ['LinkedList', 'Design', 'HashTable'],
      createdAt: '2026-08-04',
    }
  ];

  return (
    <div className="av-vault-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em' }}>📦 My Solution Vault</h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Curated DSA problem notes, intuition breakdown, and complexity notes.
          </p>
        </div>
        <button className="btn-mono-primary">
          + New Note
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Paste a problem link to create your first note." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {notes.map((n) => (
            <div key={n.id} className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '200px' }}>
              <div>
                <Link
                  to={`/note/${n.id}`}
                  style={{ textDecoration: 'none', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800 }}
                >
                  {n.title}
                </Link>
                <div style={{ marginTop: '14px' }}>
                  <PatternTags tags={n.patternTags} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                <span>Saved {n.createdAt}</span>
                <Link to={`/note/${n.id}`} className="btn-mono-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none' }}>
                  Open →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
