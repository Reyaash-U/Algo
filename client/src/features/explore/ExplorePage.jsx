import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { PatternTags } from '../../components/shared/PatternTags.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/shared/Toast.jsx';
import { useState } from 'react';
import { FileText, StickyNote, GitFork } from 'lucide-react';

export function ExplorePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [forkingId, setForkingId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', ''],
    queryFn: () => api.search.query(''),
  });

  const forkNoteMutation = useMutation({
    mutationFn: (id) => api.notes.fork(id),
    onMutate: (id) => setForkingId(id),
    onSuccess: (newNote) => {
      setForkingId(null);
      toast.push('Note forked to your Vault!', { type: 'success' });
      navigate(`/note/${newNote.id}`);
    },
    onError: (err) => {
      setForkingId(null);
      toast.push(`Failed to fork: ${err.message}`, { type: 'error' });
    },
  });

  const forkSheetMutation = useMutation({
    mutationFn: (id) => api.sheets.fork(id),
    onMutate: (id) => setForkingId(id),
    onSuccess: (newSheet) => {
      setForkingId(null);
      toast.push('Sheet forked successfully!', { type: 'success' });
      navigate(`/sheet/${newSheet.id}`);
    },
    onError: (err) => {
      setForkingId(null);
      toast.push(`Failed to fork: ${err.message}`, { type: 'error' });
    },
  });

  const handleFork = (e, r) => {
    e.preventDefault(); // prevent triggering any parent link if we wrap it
    if (r.type === 'note') forkNoteMutation.mutate(r.id);
    else forkSheetMutation.mutate(r.id);
  };

  if (isLoading) {
    return (
      <div className="av-explore-page" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850 }}>Explore</h1>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px', marginTop: '20px' }}>
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load public resources: {error.message}</p>;

  const results = data?.results ?? [];

  return (
    <div className="av-explore-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div>
        <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em' }}>Explore</h1>
        <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
          Public sheets and notes from the community. Fork them to your Vault.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
        {results.map((r) => (
          <div key={r.id} className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '180px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {r.type === 'sheet' ? <><FileText size={14} /> Sheet</> : <><StickyNote size={14} /> Note</>}
                </span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <GitFork size={14} /> {r.forkCount ?? 0}
                </span>
              </div>
              <Link
                to={r.type === 'sheet' ? `/sheet/${r.id}` : `/note/${r.id}`}
                style={{ textDecoration: 'none', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}
              >
                {r.title}
              </Link>
              {r.type === 'note' && r.patternTags && r.patternTags.length > 0 && (
                <div style={{ marginTop: '14px' }}>
                  <PatternTags tags={r.patternTags} />
                </div>
              )}
              {r.type === 'sheet' && r.description && (
                <p style={{ marginTop: '14px', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {r.description.slice(0, 120)}{r.description.length > 120 ? '...' : ''}
                </p>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '12px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--border-color)' }}>
              <button 
                className="btn-mono-primary" 
                onClick={(e) => handleFork(e, r)}
                disabled={forkingId !== null}
                style={{ padding: '6px 14px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                {forkingId === r.id ? 'Forking...' : <><GitFork size={14} /> Fork</>}
              </button>
              <Link to={r.type === 'sheet' ? `/sheet/${r.id}` : `/note/${r.id}`} className="btn-mono-secondary" style={{ padding: '6px 14px', fontSize: '0.75rem', textDecoration: 'none' }}>
                View →
              </Link>
            </div>
          </div>
        ))}
        {results.length === 0 && (
          <p style={{ color: 'var(--text-secondary)' }}>No public resources found.</p>
        )}
      </div>
    </div>
  );
}
