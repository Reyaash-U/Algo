import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { useTheme } from '../../lib/themeContext.jsx';
import {
  Search,
  X,
  FileText,
  ClipboardList,
  Code2,
  ExternalLink,
  Zap,
  BarChart3,
  Compass,
  Plus,
  ArrowRight,
  Sparkles,
  Command,
} from 'lucide-react';

const QUICK_ACTIONS = [
  { id: 'action-vault', type: 'action', title: 'Open Vault', subtitle: 'View all your saved solution notes', path: '/vault', icon: FileText, category: 'Actions' },
  { id: 'action-new-note', type: 'action', title: 'Create New Note', subtitle: 'Add a new problem note & solutions', path: '/note/new', icon: Plus, category: 'Actions' },
  { id: 'action-sheets', type: 'action', title: 'Open Sheets', subtitle: 'Practice trackers & problem collections', path: '/sheets', icon: ClipboardList, category: 'Actions' },
  { id: 'action-revise', type: 'action', title: 'Start Revision', subtitle: 'Spaced repetition review session', path: '/revise', icon: Zap, category: 'Actions' },
  { id: 'action-dashboard', type: 'action', title: 'Analytics Dashboard', subtitle: 'Streaks, Codeforces & practice metrics', path: '/dashboard', icon: BarChart3, category: 'Actions' },
  { id: 'action-explore', type: 'action', title: 'Explore Community', subtitle: 'Discover public notes & shared sheets', path: '/explore', icon: Compass, category: 'Actions' },
];

export function GlobalSearchModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all'); // 'all' | 'notes' | 'sheets' | 'problems'
  const [selectedIndex, setSelectedIndex] = useState(0);

  const { theme } = useTheme();
  const isLight = theme === 'light';
  const navigate = useNavigate();

  const inputRef = useRef(null);
  const listContainerRef = useRef(null);
  const isMac = useMemo(() => {
    return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform);
  }, []);

  // Debounce search query (180ms)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 180);
    return () => clearTimeout(timer);
  }, [query]);

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    const handleCustomOpen = () => setIsOpen(true);

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-global-search', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-global-search', handleCustomOpen);
    };
  }, []);

  // Lock body scroll and focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      setSelectedIndex(0);
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => {
        clearTimeout(timer);
        document.body.style.overflow = '';
      };
    } else {
      document.body.style.overflow = '';
      setQuery('');
      setDebouncedQuery('');
      setActiveCategory('all');
    }
  }, [isOpen]);

  // Fetch search results from backend
  const { data: searchData, isLoading } = useQuery({
    queryKey: ['global-search', debouncedQuery],
    queryFn: () => api.search.global(debouncedQuery),
    enabled: isOpen,
    staleTime: 30_000,
  });

  const notesList = useMemo(() => searchData?.grouped?.notes ?? [], [searchData]);
  const sheetsList = useMemo(() => searchData?.grouped?.sheets ?? [], [searchData]);
  const problemsList = useMemo(() => searchData?.grouped?.problems ?? [], [searchData]);

  // Filtered quick actions matching query
  const matchingActions = useMemo(() => {
    if (!debouncedQuery) return QUICK_ACTIONS;
    const lower = debouncedQuery.toLowerCase();
    return QUICK_ACTIONS.filter(
      (a) => a.title.toLowerCase().includes(lower) || a.subtitle.toLowerCase().includes(lower),
    );
  }, [debouncedQuery]);

  // Build flattened selectable items list according to active category
  const flatItems = useMemo(() => {
    const items = [];

    if (activeCategory === 'all' || activeCategory === 'notes') {
      notesList.forEach((n) => items.push({ ...n, itemType: 'note' }));
    }
    if (activeCategory === 'all' || activeCategory === 'sheets') {
      sheetsList.forEach((s) => items.push({ ...s, itemType: 'sheet' }));
    }
    if (activeCategory === 'all' || activeCategory === 'problems') {
      problemsList.forEach((p) => items.push({ ...p, itemType: 'problem' }));
    }
    if (activeCategory === 'all' && matchingActions.length > 0) {
      matchingActions.forEach((a) => items.push({ ...a, itemType: 'action' }));
    }

    return items;
  }, [activeCategory, notesList, sheetsList, problemsList, matchingActions]);

  // Keep selected index within bounds
  useEffect(() => {
    if (selectedIndex >= flatItems.length) {
      setSelectedIndex(Math.max(0, flatItems.length - 1));
    }
  }, [flatItems.length, selectedIndex]);

  // Scroll selected item into view smoothly
  useEffect(() => {
    if (!listContainerRef.current) return;
    const activeEl = listContainerRef.current.querySelector(`[data-index="${selectedIndex}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex]);

  // Handle item selection/action execution
  const handleSelectItem = (item) => {
    if (!item) return;
    setIsOpen(false);

    if (item.itemType === 'note') {
      navigate(`/note/${item.id}`);
    } else if (item.itemType === 'sheet') {
      navigate(`/sheets/${item.id}`);
    } else if (item.itemType === 'problem') {
      if (item.url) {
        window.open(item.url, '_blank', 'noopener,noreferrer');
      } else {
        navigate(`/vault?q=${encodeURIComponent(item.title)}`);
      }
    } else if (item.itemType === 'action') {
      navigate(item.path);
    }
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      setIsOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (flatItems.length === 0) return;
      setSelectedIndex((prev) => (prev + 1) % flatItems.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (flatItems.length === 0) return;
      setSelectedIndex((prev) => (prev - 1 + flatItems.length) % flatItems.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems.length > 0 && flatItems[selectedIndex]) {
        handleSelectItem(flatItems[selectedIndex]);
      }
      return;
    }

    // Tab key switches active category filters
    if (e.key === 'Tab') {
      e.preventDefault();
      const categories = ['all', 'notes', 'sheets', 'problems'];
      const nextIdx = (categories.indexOf(activeCategory) + (e.shiftKey ? -1 : 1) + categories.length) % categories.length;
      setActiveCategory(categories[nextIdx]);
      setSelectedIndex(0);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Global Quick Search"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '16px',
        paddingTop: 'min(12vh, 100px)',
      }}
      onClick={() => setIsOpen(false)}
    >
      <div
        className="mono-card av-search-dialog"
        style={{
          width: '100%',
          maxWidth: '680px',
          background: isLight ? '#ffffff' : '#0e1117',
          border: isLight ? '1px solid #e4e4e7' : '1px solid rgba(255, 255, 255, 0.12)',
          borderRadius: '16px',
          boxShadow: isLight
            ? '0 25px 60px -15px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            : '0 25px 70px -15px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideDown 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: isLight ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.07)',
          }}
        >
          <Search
            size={20}
            strokeWidth={2.4}
            style={{
              color: isLight ? '#64748b' : '#94a3b8',
              flexShrink: 0,
            }}
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search notes, sheets, and problems..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              fontSize: '1.05rem',
              fontWeight: 500,
              color: isLight ? '#09090b' : '#f8fafc',
              fontFamily: 'inherit',
            }}
          />
          {query ? (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: isLight ? '#94a3b8' : '#64748b',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
              title="Clear search"
            >
              <X size={16} />
            </button>
          ) : (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                fontSize: '0.72rem',
                color: isLight ? '#94a3b8' : '#64748b',
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
                padding: '2px 7px',
                borderRadius: '6px',
                border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.1)',
                fontFamily: 'var(--font-mono, monospace)',
                fontWeight: 600,
              }}
            >
              ESC
            </div>
          )}
        </div>

        {/* Category Filter Tabs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 20px',
            background: isLight ? '#fafafa' : 'rgba(255, 255, 255, 0.02)',
            borderBottom: isLight ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.05)',
            fontSize: '0.78rem',
            overflowX: 'auto',
          }}
        >
          <span style={{ color: isLight ? '#94a3b8' : '#64748b', fontWeight: 650, marginRight: '4px' }}>
            Filter:
          </span>
          {[
            { id: 'all', label: 'All Results', count: flatItems.length },
            { id: 'notes', label: 'Notes', count: notesList.length },
            { id: 'sheets', label: 'Sheets', count: sheetsList.length },
            { id: 'problems', label: 'Problems', count: problemsList.length },
          ].map((cat) => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => {
                  setActiveCategory(cat.id);
                  setSelectedIndex(0);
                }}
                style={{
                  border: 'none',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '0.76rem',
                  fontWeight: 650,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease',
                  background: isActive
                    ? (isLight ? '#09090b' : '#f8fafc')
                    : (isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)'),
                  color: isActive
                    ? (isLight ? '#ffffff' : '#09090b')
                    : (isLight ? '#64748b' : '#94a3b8'),
                }}
              >
                <span>{cat.label}</span>
                <span
                  style={{
                    fontSize: '0.7rem',
                    opacity: 0.85,
                    padding: '1px 5px',
                    borderRadius: '999px',
                    background: isActive
                      ? (isLight ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)')
                      : (isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.1)'),
                  }}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Results List */}
        <div
          ref={listContainerRef}
          style={{
            maxHeight: '440px',
            overflowY: 'auto',
            padding: '10px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
        >
          {isLoading ? (
            <div style={{ padding: '32px 20px', textAlign: 'center', color: isLight ? '#64748b' : '#94a3b8', fontSize: '0.9rem' }}>
              <div
                style={{
                  display: 'inline-block',
                  width: '24px',
                  height: '24px',
                  border: '2px solid var(--border-color)',
                  borderTopColor: 'var(--text-primary)',
                  borderRadius: '50%',
                  animation: 'spin 0.6s linear infinite',
                  marginBottom: '10px',
                }}
              />
              <div>Searching AlgoVault...</div>
            </div>
          ) : flatItems.length === 0 ? (
            <div style={{ padding: '40px 20px', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: 650, color: 'var(--text-primary)' }}>
                No results found for &ldquo;{query}&rdquo;
              </p>
              <p style={{ margin: '6px 0 0', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                Try searching for different keywords, topics (e.g. &ldquo;binary search&rdquo;), or problem titles.
              </p>
            </div>
          ) : (
            flatItems.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              return (
                <div
                  key={`${item.itemType}-${item.id}`}
                  data-index={idx}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  onClick={() => handleSelectItem(item)}
                  style={{
                    padding: '10px 14px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    transition: 'background 0.12s ease',
                    background: isSelected
                      ? (isLight ? '#f4f4f5' : '#1c1f26')
                      : 'transparent',
                    border: isSelected
                      ? (isLight ? '1px solid #e4e4e7' : '1px solid rgba(255, 255, 255, 0.1)')
                      : '1px solid transparent',
                  }}
                >
                  {/* Left: Icon & Title/Details */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        width: '34px',
                        height: '34px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                        background:
                          item.itemType === 'note'
                            ? (isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.12)')
                            : item.itemType === 'sheet'
                            ? (isLight ? '#eff6ff' : 'rgba(59, 130, 246, 0.12)')
                            : item.itemType === 'problem'
                            ? (isLight ? '#fef3c7' : 'rgba(245, 158, 11, 0.12)')
                            : (isLight ? '#f3f4f6' : 'rgba(255, 255, 255, 0.08)'),
                        color:
                          item.itemType === 'note'
                            ? '#10b981'
                            : item.itemType === 'sheet'
                            ? '#3b82f6'
                            : item.itemType === 'problem'
                            ? '#f59e0b'
                            : (isLight ? '#4b5563' : '#d1d5db'),
                      }}
                    >
                      {item.itemType === 'note' && <FileText size={17} />}
                      {item.itemType === 'sheet' && <ClipboardList size={17} />}
                      {item.itemType === 'problem' && <Code2 size={17} />}
                      {item.itemType === 'action' && <item.icon size={17} />}
                    </div>

                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            fontWeight: 650,
                            fontSize: '0.92rem',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {item.title}
                        </span>

                        {/* Badges for Note */}
                        {item.itemType === 'note' && (
                          <>
                            {item.isMine ? (
                              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                                My Note
                              </span>
                            ) : (
                              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6', fontWeight: 600 }}>
                                Community
                              </span>
                            )}
                            {item.problemDifficulty && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                  background:
                                    item.problemDifficulty.toLowerCase() === 'easy'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : item.problemDifficulty.toLowerCase() === 'hard'
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : 'rgba(245, 158, 11, 0.15)',
                                  color:
                                    item.problemDifficulty.toLowerCase() === 'easy'
                                      ? '#10b981'
                                      : item.problemDifficulty.toLowerCase() === 'hard'
                                      ? '#ef4444'
                                      : '#f59e0b',
                                }}
                              >
                                {item.problemDifficulty}
                              </span>
                            )}
                          </>
                        )}

                        {/* Badges for Sheet */}
                        {item.itemType === 'sheet' && (
                          <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontWeight: 600 }}>
                            {item.problemCount} {item.problemCount === 1 ? 'problem' : 'problems'}
                          </span>
                        )}

                        {/* Badges for Problem */}
                        {item.itemType === 'problem' && (
                          <>
                            {item.platform && (
                              <span style={{ fontSize: '0.68rem', padding: '1px 6px', borderRadius: '4px', background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'capitalize' }}>
                                {item.platform}
                              </span>
                            )}
                            {item.difficulty && (
                              <span
                                style={{
                                  fontSize: '0.68rem',
                                  padding: '1px 6px',
                                  borderRadius: '4px',
                                  fontWeight: 700,
                                  textTransform: 'capitalize',
                                  background:
                                    item.difficulty.toLowerCase() === 'easy'
                                      ? 'rgba(16, 185, 129, 0.15)'
                                      : item.difficulty.toLowerCase() === 'hard'
                                      ? 'rgba(239, 68, 68, 0.15)'
                                      : 'rgba(245, 158, 11, 0.15)',
                                  color:
                                    item.difficulty.toLowerCase() === 'easy'
                                      ? '#10b981'
                                      : item.difficulty.toLowerCase() === 'hard'
                                      ? '#ef4444'
                                      : '#f59e0b',
                                }}
                              >
                                {item.difficulty}
                              </span>
                            )}
                          </>
                        )}
                      </div>

                      {/* Subtitle / Details snippet */}
                      <div
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-secondary)',
                          marginTop: '3px',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {item.itemType === 'note' && (
                          item.patternTags?.length > 0
                            ? item.patternTags.map((t) => `#${t}`).join(' ')
                            : item.contentMarkdown || 'Note'
                        )}
                        {item.itemType === 'sheet' && (
                          item.description || 'Collection tracker sheet'
                        )}
                        {item.itemType === 'problem' && (
                          item.url || 'Algorithm problem'
                        )}
                        {item.itemType === 'action' && item.subtitle}
                      </div>
                    </div>
                  </div>

                  {/* Right indicator */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
                    {isSelected && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          color: isLight ? '#09090b' : '#ffffff',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: isLight ? '#e4e4e7' : 'rgba(255, 255, 255, 0.15)',
                          padding: '3px 8px',
                          borderRadius: '6px',
                        }}
                      >
                        Select <ArrowRight size={12} />
                      </span>
                    )}
                    {item.itemType === 'problem' && item.url && !isSelected && (
                      <ExternalLink size={14} style={{ color: 'var(--text-secondary)' }} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div
          style={{
            padding: '10px 20px',
            background: isLight ? '#f8fafc' : 'rgba(255, 255, 255, 0.02)',
            borderTop: isLight ? '1px solid #f1f5f9' : '1px solid rgba(255, 255, 255, 0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: isLight ? '#64748b' : '#94a3b8',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd style={{ padding: '2px 5px', borderRadius: '4px', border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)', background: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 650 }}>↑</kbd>
              <kbd style={{ padding: '2px 5px', borderRadius: '4px', border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)', background: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 650 }}>↓</kbd>
              <span>to navigate</span>
            </span>

            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd style={{ padding: '2px 6px', borderRadius: '4px', border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)', background: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 650 }}>↵</kbd>
              <span>to open</span>
            </span>

            <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <kbd style={{ padding: '2px 6px', borderRadius: '4px', border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)', background: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 650 }}>esc</kbd>
              <span>to close</span>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={13} style={{ color: '#8b5cf6' }} />
            <span>AlgoVault Spotlight</span>
            <kbd style={{ padding: '2px 6px', borderRadius: '4px', border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.15)', background: isLight ? '#ffffff' : 'rgba(255,255,255,0.06)', fontFamily: 'var(--font-mono, monospace)', fontWeight: 650, display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
              {isMac ? <Command size={10} /> : 'Ctrl'} K
            </kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
