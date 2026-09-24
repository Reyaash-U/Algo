import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { ClipboardList, Trash2, X } from 'lucide-react';

export function SheetsPage() {
  const { theme } = useTheme();
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');

  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sheets,
    queryFn: () => api.sheets.list(),
  });

  const createMutation = useMutation({
    mutationFn: (body) => api.sheets.create(body),
    onSuccess: (sheet) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      toast.push('Sheet created!', { type: 'success' });
      setShowCreate(false);
      setNewTitle('');
      setNewDescription('');
      navigate(`/sheets/${sheet.id}`);
    },
    onError: (err) => toast.push(`Failed to create sheet: ${err.message}`, { type: 'error' }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.sheets.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      toast.push('Sheet deleted', { type: 'success' });
    },
    onError: (err) => toast.push(`Failed to delete sheet: ${err.message}`, { type: 'error' }),
  });

  const handleDelete = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Delete this sheet? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreate = (e) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate({ title: newTitle.trim(), description: newDescription.trim() });
  };

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load sheets: {error.message}</p>;

  const sheets = data?.items ?? [];

  return (
    <div className="av-sheets-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ClipboardList size={32} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} /> Problem Trackers & Sheets
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Track progress across popular DSA sheets and custom curated problem sets.
          </p>
        </div>
        <button className="btn-mono-primary" onClick={() => setShowCreate(true)}>
          + Create Custom Sheet
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="mono-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 800 }}>New Sheet</h3>
            <button type="button" onClick={() => setShowCreate(false)} className="btn-mono-secondary" style={{ padding: '4px 8px' }}>
              <X size={14} />
            </button>
          </div>
          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Sheet title"
            required
            style={{ width: '100%', background: theme === 'light' ? '#ffffff' : '#050505', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
          />
          <textarea
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            placeholder="Description (optional)"
            rows={3}
            style={{ width: '100%', background: theme === 'light' ? '#ffffff' : '#050505', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}
          />
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn-mono-primary" disabled={createMutation.isPending}>
              {createMutation.isPending ? 'Creating…' : 'Create Sheet'}
            </button>
          </div>
        </form>
      )}

      {sheets.length === 0 ? (
        <EmptyState title="No sheets yet" description="Create a new sheet to track your problem-solving progress." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {sheets.map((s) => {
            const solvedPct = s.progressPct ?? 0;
            const total = s.items?.length ?? 0;
            const solved = s.items?.filter((i) => i.status === 'done').length ?? 0;
            const inProgress = s.items?.filter((i) => i.status === 'in_progress').length ?? 0;
            const inProgressPct = total === 0 ? 0 : Math.round((inProgress / total) * 100);
            const todoPct = 100 - solvedPct - inProgressPct;

            return (
              <div key={s.id} className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <Link
                      to={`/sheets/${s.id}`}
                      style={{ textDecoration: 'none', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}
                    >
                      {s.title}
                    </Link>
                    <button
                      onClick={(e) => handleDelete(e, s.id)}
                      className="btn-mono-secondary"
                      aria-label="Delete sheet"
                      disabled={deleteMutation.isPending}
                      style={{ padding: '6px 8px', flexShrink: 0 }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '12px 0 20px', lineHeight: 1.5 }}>
                    {s.description}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{solvedPct}% Solved</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{solved}</strong> solved • <strong>{inProgress}</strong> in progress • {total} total
                    </span>
                  </div>

                  {/* Multi-segment Progress Bar Override */}
                  <div className="progress-mono" style={{ height: '8px', marginBottom: '20px' }}>
                    <div className="progress-mono-solved" style={{ width: `${solvedPct}%` }} title={`Solved: ${solvedPct}%`} />
                    <div className="progress-mono-progress" style={{ width: `${inProgressPct}%` }} title={`In Progress: ${inProgressPct}%`} />
                    <div className="progress-mono-todo" style={{ width: `${todoPct}%` }} title={`Todo: ${todoPct}%`} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <Link to={`/sheets/${s.id}`} className="btn-mono-secondary" style={{ padding: '6px 14px', fontSize: '0.8rem', textDecoration: 'none' }}>
                      Open Tracker →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
