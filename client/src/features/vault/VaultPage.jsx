import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { PatternTags } from '../../components/shared/PatternTags.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { Archive, Trash2 } from 'lucide-react';

export function VaultPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.notes(),
    queryFn: () => api.notes.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.notes.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes() });
      toast.push('Note deleted', { type: 'success' });
    },
    onError: (err) => toast.push(`Failed to delete note: ${err.message}`, { type: 'error' }),
  });

  const handleDelete = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this note? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

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

  const notes = data?.items ?? [];

  return (
    <div className="av-vault-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Archive size={32} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} /> My Solution Vault
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Curated DSA problem notes, intuition breakdown, and complexity notes.
          </p>
        </div>
        <Link to="/note/new" className="btn-mono-primary" style={{ textDecoration: 'none' }}>
          + New Note
        </Link>
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
                <span>Saved {n.createdAt?.slice(0, 10)}</span>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={(e) => handleDelete(e, n.id)}
                    className="btn-mono-secondary"
                    aria-label="Delete note"
                    disabled={deleteMutation.isPending}
                    style={{ padding: '6px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center' }}
                  >
                    <Trash2 size={14} />
                  </button>
                  <Link to={`/note/${n.id}`} className="btn-mono-secondary" style={{ padding: '6px 12px', fontSize: '0.75rem', textDecoration: 'none' }}>
                    Open →
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
