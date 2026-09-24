import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { useAuth } from '../../lib/authContext.jsx';
import { MarkdownRenderer } from '../../components/shared/MarkdownRenderer.jsx';
import { ComplexityPills } from '../../components/shared/ComplexityPills.jsx';
import { PatternTags } from '../../components/shared/PatternTags.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { Clipboard, Pencil, Trash2, Flag, History, ExternalLink } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

export function NoteDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const toast = useToast();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: note, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.note(id),
    queryFn: () => api.notes.get(id),
  });

  const versionsQuery = useQuery({
    queryKey: [...queryKeys.note(id), 'versions'],
    queryFn: () => api.notes.versions(id),
    enabled: showVersions,
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.notes.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.notes() });
      toast.push('Note deleted', { type: 'success' });
      navigate('/vault');
    },
    onError: (err) => toast.push(`Failed to delete note: ${err.message}`, { type: 'error' }),
  });

  const reportMutation = useMutation({
    mutationFn: (reason) => api.notes.report(id, reason),
    onSuccess: () => toast.push('Report submitted — thanks for flagging it.', { type: 'success' }),
    onError: (err) => toast.push(`Failed to report: ${err.message}`, { type: 'error' }),
  });

  const handleDelete = () => {
    if (window.confirm('Delete this note? This cannot be undone.')) {
      deleteMutation.mutate();
    }
  };

  const handleReport = () => {
    const reason = window.prompt('Why are you reporting this note?');
    if (reason && reason.trim()) reportMutation.mutate(reason.trim());
  };

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load note: {error.message}</p>;

  const isOwner = note.ownerId === user?.id;
  const firstBlock = note.codeBlocks?.[0] || {};
  const codeSnippet = firstBlock.code || '';
  const timeComplexity = firstBlock.timeComplexity || 'O(N)';
  const spaceComplexity = firstBlock.spaceComplexity || 'O(N)';

  const handleCopyCode = () => {
    if (!codeSnippet) return;
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    toast.push('Code snippet copied to clipboard!', { type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (code, lang) => {
    const safeLang = lang || 'python';
    const grammar = Prism.languages[safeLang] || Prism.languages.python;
    return Prism.highlight(code, grammar, safeLang);
  };

  return (
    <div className="av-note-detail" style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link to="/vault" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ← Back to Vault
        </Link>
      </div>

      <div className="mono-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
          <div>
            <h1 className="text-mono-title" style={{ margin: '0 0 12px', fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.02em' }}>{note.title}</h1>
            <PatternTags tags={note.patternTags} />
            {note.problem && (
              <a
                href={note.problem.url}
                target="_blank"
                rel="noreferrer"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)', textDecoration: 'none' }}
              >
                <ExternalLink size={12} /> {note.problem.title} ({note.problem.platform})
              </a>
            )}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <div style={{ filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
              <ComplexityPills
                timeComplexity={timeComplexity}
                spaceComplexity={spaceComplexity}
              />
            </div>
            {isOwner ? (
              <>
                <button
                  onClick={() => setShowVersions((v) => !v)}
                  className="btn-mono-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <History size={14} /> History
                </button>
                <Link to={`/note/${note.id}/edit`} className="btn-mono-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
                  <Pencil size={14} /> Edit
                </Link>
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="btn-mono-secondary"
                  aria-label="Delete note"
                  style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <button
                onClick={handleReport}
                disabled={reportMutation.isPending}
                className="btn-mono-secondary"
                style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Flag size={14} /> Report
              </button>
            )}
          </div>
        </div>

        {showVersions && (
          <div style={{ marginBottom: '24px', padding: '16px 20px', border: '1px solid var(--border-color)', borderRadius: '10px', background: theme === 'light' ? '#f4f4f5' : '#050505' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: '0.95rem', fontWeight: 700 }}>Version History</h3>
            {versionsQuery.isLoading && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Loading versions…</p>}
            {versionsQuery.data?.versions?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {[...versionsQuery.data.versions].reverse().map((v, idx) => (
                  <div key={idx} style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{v.title}</span>
                    <span>{new Date(v.savedAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              !versionsQuery.isLoading && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
                  No earlier versions yet — every edit to the title or content is snapshotted here.
                </p>
              )
            )}
          </div>
        )}

        {/* Code Snippet Box with Floating Copy Button */}
        {codeSnippet && (
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            background: theme === 'light' ? '#f4f4f5' : '#050505',
            overflow: 'hidden',
            marginTop: '28px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ fontWeight: 650 }}>Solution Snippet ({firstBlock.language || 'Python 3'})</span>
              <button className="btn-mono-secondary" onClick={handleCopyCode} style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {copied ? '✓ Copied!' : <><Clipboard size={14} /> Copy Code</>}
              </button>
            </div>
            <pre style={{ margin: 0, padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: theme === 'light' ? '#09090b' : '#fafafa', overflowX: 'auto' }}>
              <code 
                className={`language-${firstBlock.language || 'python'}`}
                dangerouslySetInnerHTML={{ __html: highlightCode(codeSnippet, firstBlock.language) }}
              />
            </pre>
          </div>
        )}

        <div style={{ marginTop: '32px', color: 'var(--text-primary)' }}>
          <MarkdownRenderer content={note.contentMarkdown} />
        </div>
      </div>
    </div>
  );
}
