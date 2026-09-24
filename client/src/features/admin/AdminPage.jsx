import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { useToast } from '../../components/shared/Toast.jsx';
import { Trash2, Plus, Check, X } from 'lucide-react';

export function AdminPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [newTag, setNewTag] = useState('');

  const tagsQuery = useQuery({
    queryKey: queryKeys.adminTags,
    queryFn: () => api.admin.listTags(),
  });

  const reportsQuery = useQuery({
    queryKey: queryKeys.adminReports,
    queryFn: () => api.admin.reports(),
  });

  const createTagMutation = useMutation({
    mutationFn: (tag) => api.admin.createTag(tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTags });
      toast.push('Tag added', { type: 'success' });
      setNewTag('');
    },
    onError: (err) => toast.push(`Failed to add tag: ${err.message}`, { type: 'error' }),
  });

  const deleteTagMutation = useMutation({
    mutationFn: (tag) => api.admin.deleteTag(tag),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminTags });
      toast.push('Tag deleted', { type: 'success' });
    },
    onError: (err) => toast.push(`Failed to delete tag: ${err.message}`, { type: 'error' }),
  });

  const resolveReportMutation = useMutation({
    mutationFn: ({ id, status }) => api.admin.resolveReport(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.adminReports });
      toast.push('Report updated', { type: 'success' });
    },
    onError: (err) => toast.push(`Failed to update report: ${err.message}`, { type: 'error' }),
  });

  const handleAddTag = (e) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    createTagMutation.mutate(newTag.trim());
  };

  if (tagsQuery.isLoading) return <p className="text-mono-desc">Loading tags…</p>;
  if (tagsQuery.isError) {
    return (
      <p className="av-form-error" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
        Failed to load tags: {tagsQuery.error.message}
      </p>
    );
  }

  const openReports = reportsQuery.data?.reports ?? [];

  return (
    <div className="av-admin-page" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850 }}>Admin</h1>

      <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Tag Taxonomy</h2>

        <form onSubmit={handleAddTag} style={{ display: 'flex', gap: '10px' }}>
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="New tag name"
            style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', outline: 'none' }}
          />
          <button type="submit" className="btn-mono-primary" disabled={createTagMutation.isPending} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={14} /> Add
          </button>
        </form>

        <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
          {(tagsQuery.data.tags ?? []).map((t) => (
            <li key={t} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontWeight: 500, padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              {t}
              <button
                onClick={() => deleteTagMutation.mutate(t)}
                disabled={deleteTagMutation.isPending}
                className="btn-mono-secondary"
                aria-label={`Delete tag ${t}`}
                style={{ padding: '4px 8px' }}
              >
                <Trash2 size={13} />
              </button>
            </li>
          ))}
          {(tagsQuery.data.tags ?? []).length === 0 && (
            <li style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>No tags yet.</li>
          )}
        </ul>
      </div>

      <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Reported Content</h2>

        {reportsQuery.isLoading && <p className="text-mono-desc">Loading reports…</p>}
        {reportsQuery.isError && (
          <p className="av-form-error" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
            Failed to load reports: {reportsQuery.error.message}
          </p>
        )}

        {!reportsQuery.isLoading && openReports.length === 0 && (
          <p style={{ color: 'var(--text-secondary)', fontStyle: 'italic', margin: 0 }}>No open reports.</p>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {openReports.map((r) => (
            <div
              key={r.id}
              style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px',
                padding: '14px 16px', border: '1px solid var(--border-color)', borderRadius: '8px', flexWrap: 'wrap',
              }}
            >
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {r.targetType}: {r.targetDetails?.title ?? r.targetId}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Reported by {r.reporter?.displayName ?? r.reporterId}: "{r.reason}"
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => resolveReportMutation.mutate({ id: r.id, status: 'resolved' })}
                  disabled={resolveReportMutation.isPending}
                  className="btn-mono-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <Check size={13} /> Resolve
                </button>
                <button
                  onClick={() => resolveReportMutation.mutate({ id: r.id, status: 'dismissed' })}
                  disabled={resolveReportMutation.isPending}
                  className="btn-mono-secondary"
                  style={{ padding: '6px 12px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <X size={13} /> Dismiss
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
