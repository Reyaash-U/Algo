import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { PatternTags } from '../../components/shared/PatternTags.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';

export function VaultPage() {
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
    <div className="av-vault-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>📦 My Solution Vault</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Curated DSA problem notes, intuition breakdown, and complexity notes.
          </p>
        </div>
        <button className="av-btn av-btn--primary">
          + New Note
        </button>
      </div>

      {notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Paste a problem link to create your first note." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {notes.map((n) => (
            <div key={n.id} className="av-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <Link
                  to={`/note/${n.id}`}
                  style={{ textDecoration: 'none', color: '#fff', fontSize: '1.1rem', fontWeight: 600 }}
                >
                  {n.title}
                </Link>
                <div style={{ marginTop: '12px' }}>
                  <PatternTags tags={n.patternTags} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '12px', borderTop: '1px solid var(--border-subtle)', fontSize: '0.78rem', color: 'var(--text-dim)' }}>
                <span>Saved {n.createdAt}</span>
                <Link to={`/note/${n.id}`} className="av-btn av-btn--secondary" style={{ padding: '4px 10px', fontSize: '0.75rem', textDecoration: 'none' }}>
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
