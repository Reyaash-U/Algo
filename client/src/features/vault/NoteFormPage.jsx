import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import {
  Save,
  ArrowLeft,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  Clock,
  Lock,
  Globe,
  Link as LinkIcon,
  Plus,
  Trash2,
  Code2,
  Zap,
  HardDrive,
} from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/themes/prism-tomorrow.css';

const SUPPORTED_LANGUAGES = [
  { id: 'python', label: 'Python 3', defaultSnippet: 'class Solution:\n    def solve(self):\n        pass\n' },
  { id: 'java', label: 'Java', defaultSnippet: 'class Solution {\n    public void solve() {\n        \n    }\n}\n' },
  { id: 'cpp', label: 'C++', defaultSnippet: '#include <bits/stdc++.h>\nusing namespace std;\n\nclass Solution {\npublic:\n    void solve() {\n        \n    }\n};\n' },
  { id: 'c', label: 'C', defaultSnippet: '#include <stdio.h>\n\nvoid solve() {\n    \n}\n' },
  { id: 'javascript', label: 'JavaScript', defaultSnippet: 'function solve() {\n  \n}\n' },
  { id: 'typescript', label: 'TypeScript', defaultSnippet: 'function solve(): void {\n  \n}\n' },
  { id: 'go', label: 'Go', defaultSnippet: 'package main\n\nfunc solve() {\n\t\n}\n' },
  { id: 'rust', label: 'Rust', defaultSnippet: 'impl Solution {\n    pub fn solve() {\n        \n    }\n}\n' },
];

const APPROACH_PRESETS = [
  { id: 'brute_force', label: 'Brute Force', color: '#ef4444', icon: '🔴', defaultTitle: 'Brute Force' },
  { id: 'better', label: 'Better', color: '#f59e0b', icon: '🟡', defaultTitle: 'Better' },
  { id: 'optimal', label: 'Optimal', color: '#10b981', icon: '🟢', defaultTitle: 'Optimal' },
  { id: 'custom', label: 'Custom', color: '#8b5cf6', icon: '🟣', defaultTitle: 'Custom Approach' },
];

export function NoteFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();

  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState({
    title: '',
    patternTags: '',
    contentMarkdown: '',
    visibility: 'private',
    solutions: [
      {
        id: 'sol-1',
        title: 'Optimal',
        approach: 'optimal',
        language: 'python',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        code: '',
      },
    ],
  });

  const [activeSolutionIdx, setActiveSolutionIdx] = useState(0);

  // Autosave status: 'idle' | 'saved' | 'saving' | 'unsaved' | 'error'
  const [saveStatus, setSaveStatus] = useState('idle');
  const [lastSavedAt, setLastSavedAt] = useState(null);

  // References to prevent unwanted autosave on initial load or loops
  const initialLoaded = useRef(false);
  const lastSavedPayload = useRef(null);
  const isSavingRef = useRef(false);

  // Fetch note if in edit mode
  const { data: note, isLoading } = useQuery({
    queryKey: queryKeys.note(id),
    queryFn: () => api.notes.get(id),
    enabled: isEditMode,
  });

  // Populate form on initial load
  useEffect(() => {
    if (note && !initialLoaded.current) {
      const rawBlocks = Array.isArray(note.codeBlocks) && note.codeBlocks.length > 0
        ? note.codeBlocks
        : [];

      const loadedSolutions = rawBlocks.length > 0
        ? rawBlocks.map((b, idx) => {
            const rawTitle = b.title || '';
            const detectedApproach = b.approach || (
              rawTitle.toLowerCase().includes('brute') ? 'brute_force' :
              rawTitle.toLowerCase().includes('better') ? 'better' :
              (rawTitle.toLowerCase().includes('optim') || idx === 0) ? 'optimal' : 'custom'
            );
            return {
              id: b.id || `sol-${idx}-${Date.now()}`,
              title: rawTitle || (idx === 0 && rawBlocks.length === 1 ? 'Optimal' : `Solution ${idx + 1}`),
              approach: detectedApproach,
              language: b.language || 'python',
              timeComplexity: b.timeComplexity || '',
              spaceComplexity: b.spaceComplexity || '',
              code: b.code || '',
            };
          })
        : [
            {
              id: 'sol-1',
              title: 'Optimal',
              approach: 'optimal',
              language: 'python',
              timeComplexity: '',
              spaceComplexity: '',
              code: '',
            },
          ];

      const initialData = {
        title: note.title || '',
        patternTags: Array.isArray(note.patternTags) ? note.patternTags.join(', ') : '',
        contentMarkdown: note.contentMarkdown || '',
        visibility: note.visibility || 'private',
        solutions: loadedSolutions,
      };

      setFormData(initialData);
      setActiveSolutionIdx(0);
      lastSavedPayload.current = JSON.stringify(initialData);
      initialLoaded.current = true;
      setSaveStatus('saved');
    }
  }, [note]);

  // Helper to format payload for API
  const buildPayload = useCallback((data) => {
    const tagsArray = data.patternTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const codeBlocks = (data.solutions || [])
      .filter((s) => s.code?.trim() || s.timeComplexity?.trim() || s.spaceComplexity?.trim() || s.title?.trim())
      .map((s) => ({
        title: s.title || 'Solution',
        approach: s.approach || 'optimal',
        language: s.language || 'python',
        timeComplexity: s.timeComplexity || '',
        spaceComplexity: s.spaceComplexity || '',
        code: s.code || '',
      }));

    return {
      title: data.title.trim() || 'Untitled',
      contentMarkdown: data.contentMarkdown,
      patternTags: tagsArray,
      codeBlocks,
      visibility: data.visibility || 'private',
    };
  }, []);

  // Perform background autosave
  const performAutosave = useCallback(async (currentData) => {
    if (!isEditMode || !id || isSavingRef.current) return;
    const currentPayloadStr = JSON.stringify(currentData);
    if (currentPayloadStr === lastSavedPayload.current) {
      setSaveStatus('saved');
      return;
    }

    try {
      isSavingRef.current = true;
      setSaveStatus('saving');
      const payload = buildPayload(currentData);

      await api.notes.update(id, payload);

      lastSavedPayload.current = currentPayloadStr;
      isSavingRef.current = false;
      setSaveStatus('saved');
      setLastSavedAt(new Date());

      // Silently invalidate note list, explore search & dashboard in background
      queryClient.invalidateQueries({ queryKey: queryKeys.notes() });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'activityHeatmap'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });
    } catch (err) {
      isSavingRef.current = false;
      setSaveStatus('error');
      console.error('Autosave error:', err);
    }
  }, [id, isEditMode, buildPayload, queryClient]);

  // Debounced autosave effect (800ms)
  useEffect(() => {
    if (!isEditMode || !initialLoaded.current) return;

    const currentStr = JSON.stringify(formData);
    if (currentStr === lastSavedPayload.current) {
      return;
    }

    setSaveStatus('unsaved');
    const timer = setTimeout(() => {
      performAutosave(formData);
    }, 800);

    return () => clearTimeout(timer);
  }, [formData, isEditMode, performAutosave]);

  // Manual save mutation (button or Cmd/Ctrl+S)
  const manualMutation = useMutation({
    mutationFn: async (dataToSave) => {
      const payload = buildPayload(dataToSave);
      if (isEditMode) {
        return api.notes.update(id, payload);
      }
      return api.notes.create(payload);
    },
    onSuccess: (savedNote) => {
      lastSavedPayload.current = JSON.stringify(formData);
      setSaveStatus('saved');
      setLastSavedAt(new Date());

      queryClient.invalidateQueries({ queryKey: queryKeys.notes() });
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'activityHeatmap'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboardSummary });

      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: queryKeys.note(id) });
        toast.push('Note saved successfully!', { type: 'success' });
      } else {
        toast.push('Note created successfully! Autosave enabled.', { type: 'success' });
        navigate(`/note/${savedNote.id}/edit`, { replace: true });
      }
    },
    onError: (err) => {
      setSaveStatus('error');
      toast.push(`Failed to save note: ${err.message}`, { type: 'error' });
    },
  });

  const handleSubmit = useCallback((e) => {
    if (e) e.preventDefault();
    manualMutation.mutate(formData);
  }, [formData, manualMutation]);

  // Keyboard shortcut: Cmd+S / Ctrl+S to save
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSubmit]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ── Solution Management Handlers ─────────────────────────────────────────
  const currentSolutions = formData.solutions || [];
  const safeSolutionIdx = Math.min(activeSolutionIdx, Math.max(0, currentSolutions.length - 1));
  const activeSolution = currentSolutions[safeSolutionIdx] || {
    id: 'sol-default',
    title: 'Optimal',
    approach: 'optimal',
    language: 'python',
    timeComplexity: '',
    spaceComplexity: '',
    code: '',
  };

  const handleAddSolution = (approachId = 'optimal') => {
    const preset = APPROACH_PRESETS.find((p) => p.id === approachId) || APPROACH_PRESETS[2];
    const newSolution = {
      id: `sol-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      title: preset.defaultTitle,
      approach: preset.id,
      language: activeSolution.language || 'python',
      timeComplexity: '',
      spaceComplexity: '',
      code: '',
    };
    setFormData((prev) => ({
      ...prev,
      solutions: [...(prev.solutions || []), newSolution],
    }));
    setActiveSolutionIdx(currentSolutions.length);
    toast.push(`Added ${preset.label} solution tab`, { type: 'info' });
  };

  const updateActiveSolution = (updates) => {
    setFormData((prev) => {
      const nextSolutions = [...(prev.solutions || [])];
      nextSolutions[safeSolutionIdx] = {
        ...nextSolutions[safeSolutionIdx],
        ...updates,
      };
      return { ...prev, solutions: nextSolutions };
    });
  };

  const handleDeleteSolution = (idxToDelete, e) => {
    if (e) e.stopPropagation();
    if (currentSolutions.length <= 1) {
      // Clear the single solution instead of leaving array empty
      updateActiveSolution({
        title: 'Optimal',
        approach: 'optimal',
        timeComplexity: '',
        spaceComplexity: '',
        code: '',
      });
      toast.push('Cleared solution content', { type: 'info' });
      return;
    }

    setFormData((prev) => {
      const filtered = prev.solutions.filter((_, i) => i !== idxToDelete);
      return { ...prev, solutions: filtered };
    });

    if (activeSolutionIdx >= idxToDelete && activeSolutionIdx > 0) {
      setActiveSolutionIdx((prev) => prev - 1);
    }
    toast.push('Solution removed', { type: 'info' });
  };

  const highlightEditorCode = (code) => {
    if (!code) return '';
    const lang = (activeSolution.language || 'python').toLowerCase();
    const grammar = Prism.languages[lang] || Prism.languages.python || Prism.languages.clike;
    return Prism.highlight(code, grammar, lang);
  };

  if (isEditMode && isLoading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading note...</div>;
  }

  const inputStyle = {
    width: '100%',
    background: theme === 'light' ? '#ffffff' : '#050505',
    border: '1px solid var(--border-color)',
    color: 'var(--text-primary)',
    padding: '12px 16px',
    borderRadius: '8px',
    outline: 'none',
    fontFamily: 'var(--font-sans)',
  };

  const renderStatusBadge = () => {
    if (!isEditMode) return null;

    if (saveStatus === 'saving') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: '#3b82f6', fontWeight: 600 }}>
          <RefreshCw size={13} style={{ animation: 'spin 1s linear infinite' }} />
          Autosaving...
        </span>
      );
    }

    if (saveStatus === 'saved') {
      const timeStr = lastSavedAt
        ? lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        : '';
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#10b981', fontWeight: 600 }}>
          <CheckCircle2 size={14} />
          Saved {timeStr && `at ${timeStr}`}
        </span>
      );
    }

    if (saveStatus === 'unsaved') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#eab308', fontWeight: 600 }}>
          <Clock size={13} />
          Unsaved changes...
        </span>
      );
    }

    if (saveStatus === 'error') {
      return (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.8rem', color: '#ef4444', fontWeight: 600 }}>
          <AlertCircle size={14} />
          Autosave failed
        </span>
      );
    }

    return null;
  };

  const isLight = theme === 'light';

  return (
    <div className="av-note-form" style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Navigation & Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            to={isEditMode ? `/note/${id}` : '/vault'}
            className="btn-mono-secondary"
            style={{ padding: '8px 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <ArrowLeft size={16} /> Back
          </Link>
          <div>
            <h1 className="text-mono-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>
              {isEditMode ? 'Edit Note' : 'Create New Note'}
            </h1>
          </div>
        </div>

        {/* Autosave status indicator & View link */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {renderStatusBadge()}

          {isEditMode && (
            <Link
              to={`/note/${id}`}
              className="btn-mono-secondary"
              style={{ padding: '6px 12px', fontSize: '0.82rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <ExternalLink size={13} /> View Note
            </Link>
          )}

          <button
            type="button"
            onClick={handleSubmit}
            disabled={manualMutation.isPending}
            className="btn-mono-primary"
            style={{ padding: '8px 16px', fontSize: '0.88rem', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Save size={15} />
            {manualMutation.isPending ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="mono-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Title Input */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Problem / Note Title
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Two Sum - Hash Map Approach"
            required
            style={{ ...inputStyle, fontSize: '1.15rem', fontWeight: 700 }}
          />
        </div>

        {/* Pattern Tags */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Pattern Tags (comma separated)
          </label>
          <input
            type="text"
            name="patternTags"
            value={formData.patternTags}
            onChange={handleChange}
            placeholder="e.g. dp, two-pointers, hashmap, graphs"
            style={inputStyle}
          />
        </div>

        {/* Visibility Setting */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Note Visibility
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {[
              {
                id: 'private',
                label: 'Private',
                icon: <Lock size={16} />,
                desc: 'Only visible to you in your Vault',
                color: 'var(--text-secondary)',
              },
              {
                id: 'link',
                label: 'Link-Only',
                icon: <LinkIcon size={16} />,
                desc: 'Anyone with the direct link can view',
                color: '#3b82f6',
              },
              {
                id: 'public',
                label: 'Public',
                icon: <Globe size={16} />,
                desc: 'Discoverable by everyone on Explore',
                color: '#10b981',
              },
            ].map((option) => {
              const isSelected = formData.visibility === option.id;
              return (
                <div
                  key={option.id}
                  onClick={() => setFormData((prev) => ({ ...prev, visibility: option.id }))}
                  style={{
                    padding: '14px',
                    borderRadius: '8px',
                    border: `2px solid ${isSelected ? option.color : 'var(--border-color)'}`,
                    background: isSelected
                      ? (isLight ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)')
                      : 'transparent',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '0.9rem', color: isSelected ? option.color : 'var(--text-primary)' }}>
                    {option.icon}
                    <span>{option.label}</span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.3 }}>
                    {option.desc}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Multiple Code Solutions Section ─────────────────────────────── */}
        <div
          style={{
            border: '1px solid var(--border-color)',
            borderRadius: '12px',
            backgroundColor: isLight ? '#f9fafb' : '#0b0b0e',
            overflow: 'hidden',
          }}
        >
          {/* Section Header & Quick Add buttons */}
          <div
            style={{
              padding: '14px 18px',
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '12px',
              backgroundColor: isLight ? '#f3f4f6' : '#111116',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Code2 size={16} style={{ color: '#ff4f12' }} />
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                  Code Solutions ({currentSolutions.length})
                </span>
              </div>
              <p style={{ margin: '2px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                Attach multiple solutions (Brute Force, Better, Optimal) with language and complexity tracking
              </p>
            </div>

            {/* Quick Add Preset Buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', marginRight: '2px' }}>
                Add:
              </span>
              {APPROACH_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleAddSolution(preset.id)}
                  className="btn-mono-secondary"
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: '6px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    borderColor: preset.color,
                  }}
                  title={`Add ${preset.label} solution`}
                >
                  <Plus size={12} style={{ color: preset.color }} />
                  <span>{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Solution Tabs */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              padding: '8px 14px',
              borderBottom: '1px solid var(--border-color)',
              backgroundColor: isLight ? '#ffffff' : '#0e0e12',
              overflowX: 'auto',
            }}
          >
            {currentSolutions.map((sol, idx) => {
              const isSelected = idx === safeSolutionIdx;
              const preset = APPROACH_PRESETS.find((p) => p.id === sol.approach) || APPROACH_PRESETS[3];
              const langObj = SUPPORTED_LANGUAGES.find((l) => l.id === sol.language) || SUPPORTED_LANGUAGES[0];

              return (
                <div
                  key={sol.id || idx}
                  onClick={() => setActiveSolutionIdx(idx)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '8px',
                    border: isSelected ? `1.5px solid ${preset.color}` : '1px solid var(--border-color)',
                    backgroundColor: isSelected
                      ? (isLight ? '#f4f4f5' : '#1c1c24')
                      : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? 700 : 500,
                    whiteSpace: 'nowrap',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <span style={{ fontSize: '0.75rem' }}>{preset.icon}</span>
                  <span>{sol.title || `Solution ${idx + 1}`}</span>
                  <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '4px', background: isLight ? '#e5e7eb' : '#27272f', color: 'var(--text-secondary)' }}>
                    {langObj.label}
                  </span>
                  {currentSolutions.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteSolution(idx, e)}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: '2px',
                        cursor: 'pointer',
                        color: 'var(--text-secondary)',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      title="Remove this solution"
                    >
                      <Trash2 size={12} className="hover:text-red-500" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Active Solution Editor Body */}
          <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Row 1: Approach Presets, Title, Language */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Approach Category
                </label>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  {APPROACH_PRESETS.map((p) => {
                    const isCurrent = activeSolution.approach === p.id;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => updateActiveSolution({ approach: p.id, title: activeSolution.title === '' || APPROACH_PRESETS.some(ap => ap.defaultTitle === activeSolution.title) ? p.defaultTitle : activeSolution.title })}
                        style={{
                          padding: '6px 10px',
                          borderRadius: '6px',
                          border: `1.5px solid ${isCurrent ? p.color : 'var(--border-color)'}`,
                          background: isCurrent ? (isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)') : 'transparent',
                          color: isCurrent ? p.color : 'var(--text-secondary)',
                          fontSize: '0.78rem',
                          fontWeight: isCurrent ? 700 : 500,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                        }}
                      >
                        <span>{p.icon}</span>
                        <span>{p.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Solution Label / Title
                </label>
                <input
                  type="text"
                  value={activeSolution.title}
                  onChange={(e) => updateActiveSolution({ title: e.target.value })}
                  placeholder="e.g. Brute Force or Two Pointers"
                  style={{ ...inputStyle, padding: '9px 12px', fontSize: '0.86rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Programming Language
                </label>
                <select
                  value={activeSolution.language || 'python'}
                  onChange={(e) => updateActiveSolution({ language: e.target.value })}
                  style={{
                    ...inputStyle,
                    padding: '9px 12px',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                  }}
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 2: Complexity Inputs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  <Zap size={13} style={{ color: '#eab308' }} /> Time Complexity
                </label>
                <input
                  type="text"
                  value={activeSolution.timeComplexity}
                  onChange={(e) => updateActiveSolution({ timeComplexity: e.target.value })}
                  placeholder="e.g. O(N²), O(N log N), O(N)"
                  style={{ ...inputStyle, padding: '9px 12px', fontSize: '0.86rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  <HardDrive size={13} style={{ color: '#3b82f6' }} /> Space Complexity
                </label>
                <input
                  type="text"
                  value={activeSolution.spaceComplexity}
                  onChange={(e) => updateActiveSolution({ spaceComplexity: e.target.value })}
                  placeholder="e.g. O(1), O(N)"
                  style={{ ...inputStyle, padding: '9px 12px', fontSize: '0.86rem' }}
                />
              </div>
            </div>

            {/* Row 3: Code Editor */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
                  Code Editor ({SUPPORTED_LANGUAGES.find(l => l.id === activeSolution.language)?.label || 'Code'})
                </label>
                <button
                  type="button"
                  onClick={() => {
                    const preset = SUPPORTED_LANGUAGES.find(l => l.id === activeSolution.language);
                    if (preset && !activeSolution.code) {
                      updateActiveSolution({ code: preset.defaultSnippet });
                    }
                  }}
                  className="btn-mono-secondary"
                  style={{ padding: '2px 8px', fontSize: '0.72rem' }}
                >
                  Insert Template
                </button>
              </div>

              <div
                style={{
                  ...inputStyle,
                  padding: 0,
                  overflow: 'hidden',
                  background: isLight ? '#1e1e24' : '#050507',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                }}
              >
                <Editor
                  value={activeSolution.code || ''}
                  onValueChange={(newCode) => updateActiveSolution({ code: newCode })}
                  highlight={highlightEditorCode}
                  padding={16}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.88rem',
                    minHeight: '220px',
                    color: '#f8f8f2',
                    lineHeight: 1.55,
                  }}
                  textareaClassName="av-code-editor-textarea"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Markdown Content (Intuition & Approach) */}
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Markdown Notes (Intuition & Thought Process)
          </label>
          <textarea
            name="contentMarkdown"
            value={formData.contentMarkdown}
            onChange={handleChange}
            placeholder="### 💡 Intuition & Approach&#10;Write down your thought process, state transitions, edge cases..."
            rows={10}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.6 }}
          />
        </div>

        {/* Form Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            {isEditMode ? '⚡ Autosave is enabled (debounced 800ms) • Press Ctrl+S to save immediately' : 'Fill in the form to create your note'}
          </div>
          <button
            type="submit"
            className="btn-mono-primary"
            disabled={manualMutation.isPending}
            style={{ padding: '10px 24px', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={16} />
            {manualMutation.isPending ? 'Saving...' : (isEditMode ? 'Save Note' : 'Create Note')}
          </button>
        </div>
      </form>
    </div>
  );
}
