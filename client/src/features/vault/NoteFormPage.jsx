import { useState, useEffect } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { Save, ArrowLeft } from 'lucide-react';
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
  });

  // Fetch note if in edit mode
  const { data: note, isLoading } = useQuery({
    queryKey: queryKeys.note(id),
    queryFn: () => api.notes.get(id),
    enabled: isEditMode,
  });

  useEffect(() => {
    if (note) {
      const firstBlock = note.codeBlocks?.[0] || {};
      setFormData({
        title: note.title || '',
        patternTags: note.patternTags ? note.patternTags.join(', ') : '',
        timeComplexity: firstBlock.timeComplexity || '',
        spaceComplexity: firstBlock.spaceComplexity || '',
        codeSnippet: firstBlock.code || '',
        contentMarkdown: note.contentMarkdown || '',
      });
    }
  }, [note]);

  const mutationFn = isEditMode
    ? (data) => api.notes.update(id, data)
    : (data) => api.notes.create(data);

  const mutation = useMutation({
    mutationFn,
    onSuccess: (savedNote) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes() });
      if (isEditMode) {
        queryClient.invalidateQueries({ queryKey: queryKeys.note(id) });
      }
      toast.push(`Note ${isEditMode ? 'updated' : 'created'} successfully!`, { type: 'success' });
      navigate(`/note/${savedNote.id}`);
    },
    onError: (err) => {
      toast.push(`Failed to save note: ${err.message}`, { type: 'error' });
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Process pattern tags into array
    const tagsArray = formData.patternTags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const codeBlocks = formData.codeSnippet || formData.timeComplexity || formData.spaceComplexity
      ? [{
          language: 'python',
          code: formData.codeSnippet,
          timeComplexity: formData.timeComplexity,
          spaceComplexity: formData.spaceComplexity
        }]
      : [];

    mutation.mutate({
      title: formData.title,
      contentMarkdown: formData.contentMarkdown,
      patternTags: tagsArray,
      codeBlocks: codeBlocks,
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (isEditMode && isLoading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading note...</div>;
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

  return (
    <div className="av-note-form" style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <Link
          to={isEditMode ? `/note/${id}` : '/vault'}
          className="btn-mono-secondary"
          style={{ padding: '8px 12px', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
        >
          <ArrowLeft size={16} /> Back
        </Link>
        <h1 className="text-mono-title" style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800 }}>
          {isEditMode ? 'Edit Note' : 'Create New Note'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="mono-card" style={{ padding: '32px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Title</label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="e.g. Two Sum - Hash Map Approach"
            required
            style={{ ...inputStyle, fontSize: '1.1rem', fontWeight: 600 }}
          />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Pattern Tags (comma separated)</label>
          <input
            type="text"
            name="patternTags"
            value={formData.patternTags}
            onChange={handleChange}
            placeholder="e.g. Array, HashTable, TwoPointers"
            style={inputStyle}
          />
        </div>

        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 200px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Time Complexity</label>
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
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Space Complexity</label>
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
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Code Snippet</label>
          <div style={{ ...inputStyle, padding: 0, overflow: 'hidden', background: '#2d2d2d' }}>
            <Editor
              value={formData.codeSnippet}
              onValueChange={code => setFormData(prev => ({ ...prev, codeSnippet: code }))}
              highlight={code => Prism.highlight(code, Prism.languages.python, 'python')}
              padding={16}
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                minHeight: '200px',
                color: '#f8f8f2'
              }}
              textareaClassName="av-code-editor-textarea"
            />
          </div>
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, color: 'var(--text-secondary)' }}>Markdown Content (Intuition & Approach)</label>
          <textarea
            name="contentMarkdown"
            value={formData.contentMarkdown}
            onChange={handleChange}
            placeholder="### Intuition\nWrite down your thought process..."
            rows={12}
            style={{ ...inputStyle, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', lineHeight: 1.5 }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button
            type="submit"
            className="btn-mono-primary"
            disabled={mutation.isPending}
            style={{ padding: '12px 24px', fontSize: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Save size={18} />
            {mutation.isPending ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
