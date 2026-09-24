import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { SHEET_ITEM_STATUS } from '@algovault/shared';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { useAuth } from '../../lib/authContext.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import { Pencil, Trash2, Flag, CalendarClock } from 'lucide-react';

const NEXT_STATUS = {
  [SHEET_ITEM_STATUS.TODO]: SHEET_ITEM_STATUS.IN_PROGRESS,
  [SHEET_ITEM_STATUS.IN_PROGRESS]: SHEET_ITEM_STATUS.DONE,
  [SHEET_ITEM_STATUS.DONE]: SHEET_ITEM_STATUS.TODO,
};

const STATUS_LABEL = {
  [SHEET_ITEM_STATUS.TODO]: 'Todo',
  [SHEET_ITEM_STATUS.IN_PROGRESS]: 'In Progress',
  [SHEET_ITEM_STATUS.DONE]: 'Done',
};

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const diffMs = new Date(dateStr).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0);
  return Math.round(diffMs / 86400000);
}

export function SheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTargetDate, setEditTargetDate] = useState('');

  const { data: sheet, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sheet(id),
    queryFn: () => api.sheets.get(id),
  });

  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, status }) => api.sheets.updateItem(id, itemId, { status }),
    onSuccess: (updatedSheet, { status }) => {
      queryClient.setQueryData(queryKeys.sheet(id), updatedSheet);
      toast.push(`Updated status to "${STATUS_LABEL[status]}"`, { type: 'success' });
    },
    onError: (err) => {
      toast.push(`Failed to update status: ${err.message}`, { type: 'error' });
    },
  });

  const updateSheetMutation = useMutation({
    mutationFn: (body) => api.sheets.update(id, body),
    onSuccess: (updatedSheet) => {
      queryClient.setQueryData(queryKeys.sheet(id), updatedSheet);
      toast.push('Sheet updated', { type: 'success' });
      setEditing(false);
    },
    onError: (err) => toast.push(`Failed to update sheet: ${err.message}`, { type: 'error' }),
  });

  const deleteSheetMutation = useMutation({
    mutationFn: () => api.sheets.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      toast.push('Sheet deleted', { type: 'success' });
      navigate('/sheets');
    },
    onError: (err) => toast.push(`Failed to delete sheet: ${err.message}`, { type: 'error' }),
  });

  const reportMutation = useMutation({
    mutationFn: (reason) => api.sheets.report(id, reason),
    onSuccess: () => toast.push('Report submitted — thanks for flagging it.', { type: 'success' }),
    onError: (err) => toast.push(`Failed to report: ${err.message}`, { type: 'error' }),
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load sheet: {error.message}</p>;

  const isOwner = sheet.ownerId === user?.id;
  const items = sheet.items ?? [];
  const remainingDays = daysUntil(sheet.targetDate);

  const cycleStatus = (itemId, currentStatus) => {
    const nextStatus = NEXT_STATUS[currentStatus] ?? SHEET_ITEM_STATUS.TODO;
    updateItemMutation.mutate({ itemId, status: nextStatus });
  };

  const startEdit = () => {
    setEditTitle(sheet.title);
    setEditDescription(sheet.description ?? '');
    setEditTargetDate(sheet.targetDate ? sheet.targetDate.slice(0, 10) : '');
    setEditing(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateSheetMutation.mutate({
      title: editTitle,
      description: editDescription,
      targetDate: editTargetDate || null,
    });
  };

  const handleDeleteSheet = () => {
    if (window.confirm('Delete this sheet? This cannot be undone.')) {
      deleteSheetMutation.mutate();
    }
  };

  const handleReport = () => {
    const reason = window.prompt('Why are you reporting this sheet?');
    if (reason && reason.trim()) reportMutation.mutate(reason.trim());
  };

  const solvedCount = items.filter((i) => i.status === SHEET_ITEM_STATUS.DONE).length;
  const inProgressCount = items.filter((i) => i.status === SHEET_ITEM_STATUS.IN_PROGRESS).length;
  const totalCount = items.length;

  const solvedPct = totalCount === 0 ? 0 : Math.round((solvedCount / totalCount) * 100);
  const inProgressPct = totalCount === 0 ? 0 : Math.round((inProgressCount / totalCount) * 100);
  const todoPct = 100 - solvedPct - inProgressPct;

  return (
    <div className="av-sheet-detail" style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link to="/sheets" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ← Back to Sheets
        </Link>
      </div>

      <div className="mono-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px', marginBottom: '12px' }}>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.02em' }}>{sheet.title}</h1>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            {isOwner ? (
              <>
                <button onClick={startEdit} className="btn-mono-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Pencil size={14} /> Edit
                </button>
                <button onClick={handleDeleteSheet} disabled={deleteSheetMutation.isPending} className="btn-mono-secondary" aria-label="Delete sheet" style={{ padding: '6px 12px', fontSize: '0.85rem' }}>
                  <Trash2 size={14} />
                </button>
              </>
            ) : (
              <button onClick={handleReport} disabled={reportMutation.isPending} className="btn-mono-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Flag size={14} /> Report
              </button>
            )}
          </div>
        </div>

        {editing ? (
          <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              required
              style={{ width: '100%', background: theme === 'light' ? '#ffffff' : '#050505', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
            />
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={2}
              style={{ width: '100%', background: theme === 'light' ? '#ffffff' : '#050505', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', outline: 'none', fontFamily: 'inherit' }}
            />
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Target date:</label>
              <input
                type="date"
                value={editTargetDate}
                onChange={(e) => setEditTargetDate(e.target.value)}
                style={{ background: theme === 'light' ? '#ffffff' : '#050505', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', outline: 'none' }}
              />
              <div style={{ flex: 1 }} />
              <button type="button" onClick={() => setEditing(false)} className="btn-mono-secondary" style={{ padding: '8px 16px' }}>Cancel</button>
              <button type="submit" className="btn-mono-primary" disabled={updateSheetMutation.isPending} style={{ padding: '8px 16px' }}>
                {updateSheetMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-mono-desc" style={{ margin: '0 0 16px', fontSize: '0.98rem', lineHeight: 1.6 }}>
            {sheet.description}
          </p>
        )}

        {remainingDays !== null && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', padding: '10px 16px',
            borderRadius: '8px', fontSize: '0.85rem', fontWeight: 600,
            background: remainingDays < 0 ? 'rgba(239, 68, 68, 0.1)' : theme === 'light' ? '#f4f4f5' : '#18181b',
            color: remainingDays < 0 ? '#ef4444' : 'var(--text-secondary)',
          }}>
            <CalendarClock size={16} />
            {remainingDays < 0
              ? `Target date passed ${Math.abs(remainingDays)} day${Math.abs(remainingDays) === 1 ? '' : 's'} ago`
              : remainingDays === 0
              ? 'Target date is today'
              : `${remainingDays} day${remainingDays === 1 ? '' : 's'} until target date`}
          </div>
        )}

        {/* Progress Tracker Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.9rem', marginBottom: '12px' }}>
          <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>Overall Progress: {solvedPct}%</span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <strong>{solvedCount}</strong> Solved • <strong>{inProgressCount}</strong> In Progress • {totalCount} Total
          </span>
        </div>

        <div className="progress-mono" style={{ height: '10px' }}>
          <div className="progress-mono-solved" style={{ width: `${solvedPct}%` }} />
          <div className="progress-mono-progress" style={{ width: `${inProgressPct}%` }} />
          <div className="progress-mono-todo" style={{ width: `${todoPct}%` }} />
        </div>
      </div>

      {/* Item Checklist Table / List */}
      <div className="mono-card" style={{ padding: '32px' }}>
        <h3 className="text-mono-title" style={{ margin: '0 0 20px', fontSize: '1.25rem', fontWeight: 800 }}>Problem List</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item) => {
            const isSolved = item.status === SHEET_ITEM_STATUS.DONE;
            const isInProgress = item.status === SHEET_ITEM_STATUS.IN_PROGRESS;

            const statusLabel = STATUS_LABEL[item.status] ?? 'Todo';

            const statusColor = isSolved
              ? 'var(--text-primary)'
              : isInProgress
              ? 'var(--text-secondary)'
              : 'var(--text-secondary)';

            const statusBg = isSolved
              ? (theme === 'light' ? '#e4e4e7' : '#27272a')
              : isInProgress
              ? (theme === 'light' ? '#f4f4f5' : '#18181b')
              : 'transparent';

            return (
              <div
                key={item.itemId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '16px 20px',
                  background: theme === 'light' ? '#ffffff' : '#050505',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  transition: 'border-color 0.2s ease',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <span style={{
                    color: isSolved ? 'var(--text-secondary)' : 'var(--text-primary)',
                    fontWeight: 600,
                    fontSize: '0.98rem',
                    textDecoration: isSolved ? 'line-through' : 'none'
                  }}>
                    {item.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.82rem' }}>
                  <button
                    onClick={() => cycleStatus(item.itemId, item.status)}
                    disabled={updateItemMutation.isPending}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: statusBg,
                      border: item.status === SHEET_ITEM_STATUS.TODO ? '1px solid var(--border-color)' : 'none',
                      color: statusColor,
                      cursor: 'pointer',
                      fontWeight: 700,
                      outline: 'none',
                      fontSize: '0.8rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {statusLabel}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
