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
} from 'lucide-react';
import Editor from 'react-simple-code-editor';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/themes/prism-tomorrow.css';

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
    timeComplexity: '',
    spaceComplexity: '',
    codeSnippet: '',
    contentMarkdown: '',
    visibility: 'private',
  });

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
      const firstBlock = note.codeBlocks?.[0] || {};
      const initialData = {
        title: note.title || '',
        patternTags: Array.isArray(note.patternTags) ? note.patternTags.join(', ') : '',
        timeComplexity: firstBlock.timeComplexity || '',
        spaceComplexity: firstBlock.spaceComplexity || '',
        codeSnippet: firstBlock.code || '',
        contentMarkdown: note.contentMarkdown || '',
        visibility: note.visibility || 'private',
      };
      setFormData(initialData);
      lastSavedPayload.current = JSON.stringify(initialData);
      initialLoaded.current = true;
      setSaveStatus('saved');
    }
  }, [note]);

  // Helper to format payload
  const buildPayload = useCallback((data) => {
    const tagsArray = data.patternTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const codeBlocks = data.codeSnippet || data.timeComplexity || data.spaceComplexity
      ? [{
          language: 'python',
          code: data.codeSnippet,
          timeComplexity: data.timeComplexity,
          spaceComplexity: data.spaceComplexity,
        }]
      : [];

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

      // Silently invalidate note list, explore search & dashboard in the background
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
        // Transition to edit mode so autosave is active immediately
        navigate(`/note/${savedNote.id}/edit`, { replace: true });
      }
    },
    onError: (err) => {
      setSaveStatus('error');
      toast.push(`Failed to save note: ${err.message}`, { type: 'error' });
    },
  });

  const handleSubmit = (e) => {
    if (e) e.preventDefault();
    manualMutation.mutate(formData);
  };

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
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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

  // Render status badge
  const renderStatusBadge = () => {
    if (!isEditMode) return null;

    if (saveStatus === 'saving') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '0.8rem',
            color: '#3b82f6',
            fontWeight: 600,
          }}
        >
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
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.8rem',
            color: '#10b981',
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={14} />
          Saved {timeStr && `at ${timeStr}`}
        </span>
      );
    }

    if (saveStatus === 'unsaved') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.8rem',
            color: '#eab308',
            fontWeight: 600,
          }}
        >
          <Clock size={13} />
          Unsaved changes...
        </span>
      );
    }

    if (saveStatus === 'error') {
      return (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            fontSize: '0.8rem',
            color: '#ef4444',
            fontWeight: 600,
          }}
        >
          <AlertCircle size={14} />
          Autosave failed
        </span>
      );
    }

    return null;
  };

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

      <form onSubmit={handleSubmit} className="mono-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '22px' }}>
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
                      ? (theme === 'light' ? 'rgba(0, 0, 0, 0.03)' : 'rgba(255, 255, 255, 0.05)')
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

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Time Complexity
            </label>
            <input
              type="text"
              name="timeComplexity"
              value={formData.timeComplexity}
              onChange={handleChange}
              placeholder="e.g. O(N)"
              style={inputStyle}
            />
          </div>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Space Complexity
            </label>
            <input
              type="text"
              name="spaceComplexity"
              value={formData.spaceComplexity}
              onChange={handleChange}
              placeholder="e.g. O(N)"
              style={inputStyle}
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Code Snippet (Python)
          </label>
          <div style={{ ...inputStyle, padding: 0, overflow: 'hidden', background: '#1e1e1e', borderRadius: '8px' }}>
            <Editor
              value={formData.codeSnippet}
              onValueChange={(code) => setFormData((prev) => ({ ...prev, codeSnippet: code }))}
              highlight={(code) => Prism.highlight(code, Prism.languages.python, 'python')}
              padding={16}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                minHeight: '220px',
                color: '#f8f8f2',
              }}
              textareaClassName="av-code-editor-textarea"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 700, color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            Markdown Content (Intuition & Approach)
          </label>
          <textarea
            name="contentMarkdown"
            value={formData.contentMarkdown}
            onChange={handleChange}
            placeholder="### 💡 Intuition & Approach&#10;Write down your thought process, state transitions, edge cases..."
            rows={12}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.6 }}
          />
        </div>

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
