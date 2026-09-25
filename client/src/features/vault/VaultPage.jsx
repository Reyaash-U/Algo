import { useState, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { PatternTags } from '../../components/shared/PatternTags.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import {
  Archive,
  Search,
  X,
  Filter,
  Eye,
  Lock,
  Globe,
  Link as LinkIcon,
  Tag as TagIcon,
} from 'lucide-react';

const COMMON_PATTERNS = [
  'dp',
  'graphs',
  'two-pointers',
  'sliding-window',
  'binary-search',
  'greedy',
  'topological-sort',
  'trie',
  'stack',
  'heap',
  'math',
  'strings',
  'linked-list',
  'sorting',
  'array',
  'hashmap',
];

export function VaultPage() {
  const { theme } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();

  const activeTag = searchParams.get('tag') || '';
  const activeQ = searchParams.get('q') || '';
  const activeVisibility = searchParams.get('visibility') || 'all';

  // Local state for search input text to keep typing immediate
  const [searchInput, setSearchInput] = useState(activeQ);

  useEffect(() => {
    setSearchInput(activeQ);
  }, [activeQ]);

  // Debounce updating URL query param for search text
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchInput !== activeQ) {
        updateFilter('q', searchInput);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const updateFilter = (key, value) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (!value || value === 'all') {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      return next;
    });
  };

  const clearFilters = () => {
    setSearchParams({});
    setSearchInput('');
  };

  // Fetch notes with real filters passed to backend
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.notes({
      q: activeQ,
      tag: activeTag,
      visibility: activeVisibility === 'all' ? undefined : activeVisibility,
    }),
    queryFn: () =>
      api.notes.list({
        q: activeQ || undefined,
        tag: activeTag || undefined,
        visibility: activeVisibility === 'all' ? undefined : activeVisibility,
        limit: 100,
      }),
  });

  const notes = data?.items ?? [];
  const totalNotesCount = data?.total ?? notes.length;

  const hasActiveFilters = Boolean(activeQ || activeTag || (activeVisibility && activeVisibility !== 'all'));

  // Collect all unique tags present across fetched notes to enrich the tag selector
  const availableTags = useMemo(() => {
    const tagSet = new Set(COMMON_PATTERNS);
    notes.forEach((n) => {
      if (Array.isArray(n.patternTags)) {
        n.patternTags.forEach((t) => tagSet.add(t));
      }
    });
    if (activeTag) tagSet.add(activeTag);
    return Array.from(tagSet);
  }, [notes, activeTag]);

  const getVisibilityIcon = (visibility) => {
    switch (visibility) {
      case 'public':
        return <Globe size={13} style={{ color: '#10b981' }} />;
      case 'link':
        return <LinkIcon size={13} style={{ color: '#3b82f6' }} />;
      case 'private':
      default:
        return <Lock size={13} style={{ color: 'var(--text-secondary)' }} />;
    }
  };

  return (
    <div className="av-vault-page" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Archive size={32} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} /> My Solution Vault
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Curated DSA problem notes, intuition breakdowns, and code solutions.
          </p>
        </div>
        <Link to="/note/new" className="btn-mono-primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          + New Note
        </Link>
      </div>

      {/* Filter and Search Bar Controls */}
      <div className="mono-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
          {/* Keyword Search Input */}
          <div style={{ flex: '1 1 300px', position: 'relative' }}>
            <Search
              size={18}
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)',
                pointerEvents: 'none',
              }}
            />
            <input
              type="text"
              placeholder="Search notes by problem title, intuition, or code..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 36px 10px 38px',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                background: theme === 'light' ? '#ffffff' : '#080808',
                color: 'var(--text-primary)',
                fontSize: '0.9rem',
                outline: 'none',
              }}
            />
            {searchInput && (
              <button
                type="button"
                onClick={() => {
                  setSearchInput('');
                  updateFilter('q', '');
                }}
                title="Clear search"
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-secondary)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <X size={16} />
              </button>
            )}
          </div>

          {/* Tag Dropdown & Visibility Selector */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Tag Filter Dropdown */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <TagIcon size={16} style={{ color: 'var(--text-secondary)' }} />
              <select
                value={activeTag}
                onChange={(e) => updateFilter('tag', e.target.value)}
                style={{
                  padding: '9px 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  background: theme === 'light' ? '#ffffff' : '#080808',
                  color: 'var(--text-primary)',
                  fontSize: '0.88rem',
                  outline: 'none',
                  cursor: 'pointer',
                  fontWeight: activeTag ? 700 : 500,
                }}
              >
                <option value="">All Pattern Tags</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag.replace(/-/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Visibility Pills */}
            <div
              style={{
                display: 'inline-flex',
                padding: '2px',
                borderRadius: '8px',
                background: theme === 'light' ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                border: '1px solid var(--border-color)',
              }}
            >
              {[
                { id: 'all', label: 'All' },
                { id: 'private', label: 'Private' },
                { id: 'link', label: 'Link' },
                { id: 'public', label: 'Public' },
              ].map((vis) => {
                const isSelected = activeVisibility === vis.id;
                return (
                  <button
                    key={vis.id}
                    type="button"
                    onClick={() => updateFilter('visibility', vis.id)}
                    style={{
                      padding: '5px 11px',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      background: isSelected ? (theme === 'light' ? '#ffffff' : 'rgba(255,255,255,0.18)') : 'transparent',
                      color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    {vis.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active Filter Chips Banner */}
        {hasActiveFilters && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px',
              paddingTop: '12px',
              borderTop: '1px solid var(--border-color)',
              fontSize: '0.85rem',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Filter size={14} /> Active filters:
              </span>

              {activeTag && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: '#8b5cf6',
                    color: '#ffffff',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  Tag: {activeTag.replace(/-/g, ' ')}
                  <button
                    type="button"
                    onClick={() => updateFilter('tag', '')}
                    style={{ background: 'transparent', border: 'none', color: '#ffffff', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </span>
              )}

              {activeQ && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  Search: "{activeQ}"
                  <button
                    type="button"
                    onClick={() => {
                      setSearchInput('');
                      updateFilter('q', '');
                    }}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </span>
              )}

              {activeVisibility !== 'all' && (
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: 'var(--border-color)',
                    color: 'var(--text-primary)',
                    fontSize: '0.78rem',
                    fontWeight: 700,
                  }}
                >
                  Visibility: {activeVisibility}
                  <button
                    type="button"
                    onClick={() => updateFilter('visibility', 'all')}
                    style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0, display: 'flex' }}
                  >
                    <X size={14} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={clearFilters}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  fontSize: '0.8rem',
                  marginLeft: '4px',
                }}
              >
                Clear all
              </button>
            </div>

            <div style={{ color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
              Showing <strong>{notes.length}</strong> {notes.length === 1 ? 'note' : 'notes'}
            </div>
          </div>
        )}
      </div>

      {/* Loading Skeleton State */}
      {isLoading && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {/* Error State */}
      {isError && !isLoading && (
        <p className="av-form-error">Failed to load notes: {error?.message}</p>
      )}

      {/* Empty State vs Notes Grid */}
      {!isLoading && !isError && notes.length === 0 && (
        <div className="mono-card" style={{ padding: '40px', textAlign: 'center' }}>
          {hasActiveFilters ? (
            <EmptyState
              title="No notes match your filters"
              description={`We couldn't find any notes matching ${activeTag ? `tag "${activeTag}"` : ''} ${activeQ ? `search "${activeQ}"` : ''}.`}
              action={
                <button type="button" onClick={clearFilters} className="btn-mono-secondary" style={{ marginTop: '12px' }}>
                  Clear Filters & Show All
                </button>
              }
            />
          ) : (
            <EmptyState
              title="No notes yet"
              description="Capture your first DSA problem approach, intuition, and solution snippet."
              action={
                <Link to="/note/new" className="btn-mono-primary" style={{ marginTop: '12px', textDecoration: 'none' }}>
                  + Create Your First Note
                </Link>
              }
            />
          )}
        </div>
      )}

      {/* Notes Grid */}
      {!isLoading && !isError && notes.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
          {notes.map((n) => {
            const formattedDate = n.createdAt ? n.createdAt.slice(0, 10) : '';
            return (
              <div
                key={n.id}
                className="mono-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  minHeight: '200px',
                  padding: '24px',
                  transition: 'border-color 0.15s ease, transform 0.15s ease',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                    <Link
                      to={`/note/${n.id}`}
                      style={{
                        textDecoration: 'none',
                        color: 'var(--text-primary)',
                        fontSize: '1.18rem',
                        fontWeight: 800,
                        lineHeight: 1.3,
                      }}
                    >
                      {n.title}
                    </Link>
                    <span
                      title={`Visibility: ${n.visibility}`}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.72rem',
                        color: 'var(--text-secondary)',
                        padding: '2px 6px',
                        borderRadius: '4px',
                        background: 'var(--border-color)',
                      }}
                    >
                      {getVisibilityIcon(n.visibility)}
                    </span>
                  </div>

                  {/* Pattern tags - clicking filters by tag */}
                  <div style={{ marginTop: '14px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {Array.isArray(n.patternTags) && n.patternTags.map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          updateFilter('tag', tag);
                        }}
                        style={{
                          background: activeTag === tag ? '#8b5cf6' : (theme === 'light' ? '#f1f5f9' : 'rgba(255,255,255,0.06)'),
                          color: activeTag === tag ? '#ffffff' : 'var(--text-secondary)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '12px',
                          padding: '2px 8px',
                          fontSize: '0.72rem',
                          fontWeight: 600,
                          cursor: 'pointer',
                          transition: 'all 0.1s ease',
                        }}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '20px',
                    paddingTop: '16px',
                    borderTop: '1px solid var(--border-color)',
                    fontSize: '0.8rem',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span>Saved {formattedDate}</span>
                  <Link
                    to={`/note/${n.id}`}
                    className="btn-mono-secondary"
                    style={{ padding: '5px 12px', fontSize: '0.75rem', textDecoration: 'none' }}
                  >
                    Open →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
