import { useQuery, useMutation } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { PatternTags } from '../../components/shared/PatternTags.jsx';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { useState, useEffect, useMemo } from 'react';
import { FileText, StickyNote, GitFork, Search, X, Filter } from 'lucide-react';

const TYPE_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'note', label: 'Notes' },
  { key: 'sheet', label: 'Sheets' },
];

export function ExplorePage() {
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const [forkingId, setForkingId] = useState(null);

  // Search state
  const [searchInput, setSearchInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  // Debounce search input (300ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchInput);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch with debounced query
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['search', debouncedQuery],
    queryFn: () => api.search.query(debouncedQuery),
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
      navigate(`/sheets/${newSheet.id}`);
    },
    onError: (err) => {
      setForkingId(null);
      toast.push(`Failed to fork: ${err.message}`, { type: 'error' });
    },
  });

  const handleFork = (e, r) => {
    e.preventDefault();
    if (r.type === 'note') forkNoteMutation.mutate(r.id);
    else forkSheetMutation.mutate(r.id);
  };

  // Filter results by type on the client side
  const allResults = data?.results ?? [];
  const filteredResults = useMemo(() => {
    if (typeFilter === 'all') return allResults;
    return allResults.filter((r) => r.type === typeFilter);
  }, [allResults, typeFilter]);

  const isLight = theme === 'light';

  const clearSearch = () => {
    setSearchInput('');
    setDebouncedQuery('');
  };

  return (
    <div className="av-explore-page" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div>
        <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em' }}>Explore</h1>
        <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
          Public sheets and notes from the community. Fork them to your Vault.
        </p>
      </div>

      {/* Search Bar + Type Filters */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Search Input */}
        <div style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
        }}>
          <Search
            size={18}
            style={{
              position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)',
              color: isLight ? '#a1a1aa' : '#71717a',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search notes, sheets, topics..."
            style={{
              width: '100%',
              padding: '12px 42px 12px 44px',
              borderRadius: 12,
              border: `1.5px solid ${isLight ? '#e4e4e7' : '#3f3f46'}`,
              background: isLight ? '#fff' : '#1c1c1e',
              color: isLight ? '#18181b' : '#fafafa',
              fontSize: '0.92rem',
              outline: 'none',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#6366f1';
              e.target.style.boxShadow = '0 0 0 3px rgba(99,102,241,0.12)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = isLight ? '#e4e4e7' : '#3f3f46';
              e.target.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)';
            }}
          />
          {searchInput && (
            <button
              onClick={clearSearch}
              style={{
                position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                background: isLight ? '#f4f4f5' : '#27272a',
                border: 'none', borderRadius: 6, padding: 4,
                cursor: 'pointer', display: 'flex', alignItems: 'center',
                color: isLight ? '#71717a' : '#a1a1aa',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.target.style.background = isLight ? '#e4e4e7' : '#3f3f46'}
              onMouseLeave={(e) => e.target.style.background = isLight ? '#f4f4f5' : '#27272a'}
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Type Filter Pills */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Filter size={14} style={{ color: isLight ? '#a1a1aa' : '#71717a' }} />
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setTypeFilter(f.key)}
              style={{
                padding: '5px 14px',
                borderRadius: 999,
                border: `1.5px solid ${typeFilter === f.key ? '#6366f1' : (isLight ? '#e4e4e7' : '#3f3f46')}`,
                background: typeFilter === f.key
                  ? 'rgba(99,102,241,0.1)'
                  : 'transparent',
                color: typeFilter === f.key
                  ? '#6366f1'
                  : (isLight ? '#71717a' : '#a1a1aa'),
                fontWeight: typeFilter === f.key ? 700 : 500,
                fontSize: '0.78rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                textTransform: 'uppercase',
                letterSpacing: '0.03em',
              }}
            >
              {f.label}
            </button>
          ))}
          {debouncedQuery && (
            <span style={{
              marginLeft: 8, fontSize: '0.78rem',
              color: isLight ? '#a1a1aa' : '#71717a',
            }}>
              {filteredResults.length} result{filteredResults.length !== 1 ? 's' : ''}
              {debouncedQuery ? ` for "${debouncedQuery}"` : ''}
            </span>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error State */}
      {isError && (
        <p className="av-form-error">Failed to load public resources: {error.message}</p>
      )}

      {/* Results Grid */}
      {!isLoading && !isError && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '24px' }}>
          {filteredResults.map((r) => (
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
        </div>
      )}

      {/* No Results Message */}
      {!isLoading && !isError && filteredResults.length === 0 && (
        <EmptyState
          title={debouncedQuery ? 'No results found' : 'No public resources yet'}
          description={
            debouncedQuery
              ? `No ${typeFilter === 'all' ? 'notes or sheets' : typeFilter + 's'} matched "${debouncedQuery}". Try a different search term.`
              : 'Public sheets and notes from the community will appear here.'
          }
          action={debouncedQuery ? (
            <button
              onClick={clearSearch}
              className="btn-mono-secondary"
              style={{ padding: '8px 18px', fontSize: '0.82rem' }}
            >
              Clear Search
            </button>
          ) : null}
        />
      )}
    </div>
  );
}
