import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { useAuth } from '../../lib/authContext.jsx';
import { queryKeys } from '../../lib/queryClient.js';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import {
  GitFork,
  CheckCircle2,
  Clock,
  Circle,
  Edit3,
  Save,
  Plus,
  Trash2,
  ExternalLink,
  ArrowLeft,
  Lock,
  Globe,
} from 'lucide-react';

export function SheetDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { theme } = useTheme();
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const [isEditingMeta, setIsEditingMeta] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [showAddProblem, setShowAddProblem] = useState(false);
  const [newProblemTitle, setNewProblemTitle] = useState('');
  const [newProblemUrl, setNewProblemUrl] = useState('');
  const [newProblemDiff, setNewProblemDiff] = useState('Medium');
  const [newProblemPlatform, setNewProblemPlatform] = useState('LeetCode');

  // Fetch sheet from API
  const { data: rawSheet, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sheet(id),
    queryFn: () => api.sheets.get(id),
    retry: 1,
  });

  const sheet = rawSheet;

  // Local state for items
  const [items, setItems] = useState(rawSheet?.items || []);

  useEffect(() => {
    if (rawSheet?.items) {
      setItems(rawSheet.items);
    }
  }, [rawSheet]);


  useEffect(() => {
    if (sheet) {
      setEditTitle(sheet.title || '');
      setEditDescription(sheet.description || '');
    }
  }, [sheet]);

  // Is current user the owner of this sheet?
  // NOTE: must use optional chaining — sheet can be undefined while loading
  const isOwner = Boolean(
    currentUser &&
    sheet?.ownerId &&
    (currentUser.id === sheet.ownerId || currentUser.sub === sheet.ownerId)
  );

  // Fork Sheet Mutation
  const forkMutation = useMutation({
    mutationFn: () => api.sheets.fork(sheet.id),
    onSuccess: (newSheet) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      if (newSheet?.id) {
        queryClient.setQueryData(queryKeys.sheet(newSheet.id), newSheet);
        toast.push('Sheet forked successfully to your account!', { type: 'success' });
        navigate(`/sheets/${newSheet.id}`);
      } else {
        toast.push('Sheet forked successfully!', { type: 'success' });
      }
    },
    onError: (err) => {
      const msg = err.message || 'Failed to fork sheet';
      toast.push(msg, { type: 'error' });
    },
  });

  // Update item status mutation (persists to backend if owner)
  const updateItemMutation = useMutation({
    mutationFn: ({ itemId, nextStatus }) =>
      api.sheets.updateItem(sheet.id, itemId, { status: nextStatus }),
    onSuccess: (updatedSheet) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheet(sheet.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      if (updatedSheet?.items) {
        setItems(updatedSheet.items);
      }
    },
    onError: (err) => {
      toast.push(`Failed to update item: ${err.message}`, { type: 'error' });
    },
  });

  // Update sheet metadata (title, description) mutation
  const updateMetaMutation = useMutation({
    mutationFn: ({ title, description }) =>
      api.sheets.update(sheet.id, { title, description }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheet(sheet.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      setIsEditingMeta(false);
      toast.push('Sheet updated successfully!', { type: 'success' });
    },
    onError: (err) => {
      toast.push(`Failed to update sheet: ${err.message}`, { type: 'error' });
    },
  });

  // Add problem mutation
  const addProblemMutation = useMutation({
    mutationFn: (newItem) => api.sheets.addItem(sheet.id, newItem),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheet(sheet.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      if (res?.items) {
        setItems(res.items);
      }
      setShowAddProblem(false);
      setNewProblemTitle('');
      setNewProblemUrl('');
      setNewProblemDiff('Medium');
      toast.push('Problem added to sheet!', { type: 'success' });
    },
    onError: (err) => {
      toast.push(`Failed to add problem: ${err.message}`, { type: 'error' });
    },
  });

  // Remove problem mutation
  const removeProblemMutation = useMutation({
    mutationFn: (itemId) => api.sheets.removeItem(sheet.id, itemId),
    onSuccess: (_res, itemId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheet(sheet.id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      setItems((prev) => prev.filter((i) => (i.itemId || i.id) !== itemId));
      toast.push('Problem removed from sheet', { type: 'success' });
    },
    onError: (err) => {
      toast.push(`Failed to remove problem: ${err.message}`, { type: 'error' });
    },
  });

  // Cycle status between todo -> in_progress -> done
  const cycleStatus = (itemId, currentStatus) => {
    let nextStatus = 'todo';
    if (currentStatus === 'todo') nextStatus = 'in_progress';
    else if (currentStatus === 'in_progress' || currentStatus === 'in-progress') nextStatus = 'done';
    else if (currentStatus === 'done' || currentStatus === 'solved') nextStatus = 'todo';

    // Optimistically update local state
    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, status: nextStatus } : i))
    );

    const displayStatus =
      nextStatus === 'done' ? 'Done' : nextStatus === 'in_progress' ? 'In Progress' : 'Todo';
    toast.push(`Marked as "${displayStatus}"`, { type: 'success' });

    // If owner, persist to DB
    if (isOwner && rawSheet?.id) {
      updateItemMutation.mutate({ itemId, nextStatus });
    }
  };

  const handleSaveMeta = (e) => {
    e.preventDefault();
    if (!editTitle.trim()) {
      toast.push('Title cannot be empty', { type: 'error' });
      return;
    }
    updateMetaMutation.mutate({
      title: editTitle.trim(),
      description: editDescription.trim(),
    });
  };

  const handleAddProblemSubmit = (e) => {
    e.preventDefault();
    if (!newProblemTitle.trim()) {
      toast.push('Problem title is required', { type: 'error' });
      return;
    }
    addProblemMutation.mutate({
      title: newProblemTitle.trim(),
      url: newProblemUrl.trim() || undefined,
      difficulty: newProblemDiff,
      platform: newProblemPlatform,
      status: 'todo',
    });
  };

  const handleRemoveProblem = (itemId, problemTitle) => {
    if (!isOwner) return;
    if (window.confirm(`Are you sure you want to remove "${problemTitle}" from this sheet?`)) {
      removeProblemMutation.mutate(itemId);
    }
  };

  if (isLoading || !sheet) {
    return (
      <div style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) {
    return <p className="av-form-error">Failed to load sheet: {error?.message}</p>;
  }

  const solvedCount = items.filter((i) => i.status === 'done' || i.status === 'solved').length;
  const inProgressCount = items.filter((i) => i.status === 'in_progress' || i.status === 'in-progress').length;
  const totalCount = items.length;

  const solvedPct = totalCount > 0 ? Math.round((solvedCount / totalCount) * 100) : 0;
  const inProgressPct = totalCount > 0 ? Math.round((inProgressCount / totalCount) * 100) : 0;
  const todoPct = totalCount > 0 ? Math.max(0, 100 - solvedPct - inProgressPct) : 100;

  const getDifficultyColor = (diff) => {
    const d = (diff || '').toLowerCase();
    if (d === 'easy') return '#10b981';
    if (d === 'hard') return '#f43f5e';
    return '#f59e0b'; // medium
  };

  return (
    <div className="av-sheet-detail" style={{ maxWidth: '880px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '60px' }}>
      
      {/* Top Nav / Actions Bar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <Link
          to="/sheets"
          style={{
            color: 'var(--text-secondary)',
            textDecoration: 'none',
            fontSize: '0.88rem',
            fontWeight: 650,
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'color 0.15s ease',
          }}
        >
          <ArrowLeft size={16} /> Back to Sheets
        </Link>

        {/* Top Right Action Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isOwner && (
            <button
              onClick={() => setIsEditingMeta(!isEditingMeta)}
              className="btn-mono-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '7px 14px',
                fontSize: '0.82rem',
                fontWeight: 650,
              }}
            >
              <Edit3 size={14} /> {isEditingMeta ? 'Cancel Editing' : 'Edit Details'}
            </button>
          )}

          {/* FORK SHEET BUTTON */}
          <button
            id="forkSheetBtn"
            onClick={() => forkMutation.mutate()}
            disabled={forkMutation.isPending}
            className="btn-mono-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 18px',
              fontSize: '0.88rem',
              fontWeight: 750,
              borderRadius: '8px',
              cursor: forkMutation.isPending ? 'not-allowed' : 'pointer',
              opacity: forkMutation.isPending ? 0.7 : 1,
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              transition: 'all 0.18s ease',
            }}
            title={isOwner ? 'Duplicate this sheet to create a new copy' : 'Fork this sheet under your account to customize and track your progress'}
          >
            <GitFork size={16} />
            <span>{forkMutation.isPending ? 'Forking Sheet...' : isOwner ? 'Fork (Duplicate)' : 'Fork Sheet'}</span>
            {(sheet.forkCount ?? 0) > 0 && (
              <span
                style={{
                  fontSize: '0.72rem',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  background: 'rgba(255, 255, 255, 0.22)',
                  fontWeight: 800,
                }}
              >
                {sheet.forkCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Sheet Header Card */}
      <div className="mono-card" style={{ padding: '32px' }}>
        
        {/* Meta badges: Lineage, Ownership, Visibility */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {isOwner ? (
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 750,
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(34, 197, 94, 0.12)',
                color: '#22c55e',
                border: '1px solid rgba(34, 197, 94, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <CheckCircle2 size={13} /> Your Sheet (Editable)
            </span>
          ) : (
            <span
              style={{
                fontSize: '0.74rem',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'rgba(56, 189, 248, 0.12)',
                color: '#38bdf8',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
              }}
            >
              <Globe size={13} /> Community Sheet
            </span>
          )}

          {sheet.forkOf && (
            <Link
              to={`/sheets/${sheet.forkOf}`}
              style={{
                fontSize: '0.74rem',
                fontWeight: 650,
                padding: '3px 10px',
                borderRadius: '12px',
                background: 'var(--bg-secondary)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                textDecoration: 'none',
              }}
            >
              <GitFork size={13} /> Forked from original
            </Link>
          )}

          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 650,
              padding: '3px 8px',
              borderRadius: '6px',
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              textTransform: 'capitalize',
            }}
          >
            {sheet.visibility === 'public' ? <Globe size={12} /> : <Lock size={12} />}
            {sheet.visibility || 'Private'}
          </span>
        </div>

        {/* Title & Description or Edit Mode */}
        {isEditingMeta ? (
          <form onSubmit={handleSaveMeta} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Sheet Title
              </label>
              <input
                type="text"
                className="av-input"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', fontSize: '1.05rem', fontWeight: 700 }}
                placeholder="Sheet Title"
                required
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '6px' }}>
                Description
              </label>
              <textarea
                className="av-input"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={3}
                style={{ width: '100%', padding: '10px 14px', fontSize: '0.92rem', lineHeight: 1.5, resize: 'vertical' }}
                placeholder="Describe the goal, timeline, or topics covered in this sheet..."
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="submit"
                disabled={updateMetaMutation.isPending}
                className="btn-mono-primary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}
              >
                <Save size={14} /> {updateMetaMutation.isPending ? 'Saving...' : 'Save Changes'}
              </button>
              <button
                type="button"
                onClick={() => setIsEditingMeta(false)}
                className="btn-mono-secondary"
                style={{ padding: '8px 16px', fontSize: '0.85rem', fontWeight: 650 }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            <h1
              className="text-mono-title"
              style={{
                margin: '0 0 10px',
                fontSize: '2rem',
                fontWeight: 850,
                letterSpacing: '-0.025em',
                lineHeight: 1.25,
              }}
            >
              {sheet.title}
            </h1>
            <p
              className="text-mono-desc"
              style={{
                margin: '0 0 24px',
                fontSize: '0.96rem',
                lineHeight: 1.6,
                color: 'var(--text-secondary)',
              }}
            >
              {sheet.description || 'No description provided for this tracker sheet.'}
            </p>
          </>
        )}

        {/* Progress Tracker Summary */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.9rem',
            marginBottom: '12px',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span style={{ color: 'var(--text-primary)', fontWeight: 800 }}>
            Overall Progress: {solvedPct}%
          </span>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>
            <strong style={{ color: '#10b981' }}>{solvedCount}</strong> Done •{' '}
            <strong style={{ color: '#f59e0b' }}>{inProgressCount}</strong> In Progress •{' '}
            {totalCount} Total Problems
          </span>
        </div>

        <div className="progress-mono" style={{ height: '10px' }}>
          <div className="progress-mono-solved" style={{ width: `${solvedPct}%` }} title={`Done: ${solvedPct}%`} />
          <div className="progress-mono-progress" style={{ width: `${inProgressPct}%` }} title={`In Progress: ${inProgressPct}%`} />
          <div className="progress-mono-todo" style={{ width: `${todoPct}%` }} title={`Todo: ${todoPct}%`} />
        </div>
      </div>

      {/* Item Checklist Table / List */}
      <div className="mono-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Problem Checklist ({items.length})
            </h3>
            <p className="text-mono-desc" style={{ margin: '4px 0 0', fontSize: '0.82rem' }}>
              {isOwner
                ? 'Click status buttons to cycle between Todo, In Progress, and Done.'
                : 'Fork this sheet to track your personal progress and edit checklist.'}
            </p>
          </div>

          {isOwner && (
            <button
              onClick={() => setShowAddProblem(!showAddProblem)}
              className="btn-mono-secondary"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                fontSize: '0.8rem',
                fontWeight: 650,
              }}
            >
              <Plus size={14} /> {showAddProblem ? 'Cancel' : 'Add Problem'}
            </button>
          )}
        </div>

        {/* Add Problem Form if owner */}
        {showAddProblem && isOwner && (
          <form
            onSubmit={handleAddProblemSubmit}
            style={{
              padding: '16px 20px',
              borderRadius: '8px',
              background: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              marginBottom: '20px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
            }}
          >
            <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
              Add New Problem to Sheet
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
              <input
                type="text"
                className="av-input"
                placeholder="Problem title (e.g. Subarray Sum Equals K)"
                value={newProblemTitle}
                onChange={(e) => setNewProblemTitle(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.88rem' }}
                required
              />
              <input
                type="url"
                className="av-input"
                placeholder="Problem URL (optional, e.g. LeetCode link)"
                value={newProblemUrl}
                onChange={(e) => setNewProblemUrl(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.88rem' }}
              />
              <select
                className="av-input"
                value={newProblemDiff}
                onChange={(e) => setNewProblemDiff(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.88rem' }}
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
              <select
                className="av-input"
                value={newProblemPlatform}
                onChange={(e) => setNewProblemPlatform(e.target.value)}
                style={{ padding: '8px 12px', fontSize: '0.88rem' }}
              >
                <option value="LeetCode">LeetCode</option>
                <option value="Codeforces">Codeforces</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowAddProblem(false)}
                className="btn-mono-secondary"
                style={{ padding: '6px 12px', fontSize: '0.8rem' }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addProblemMutation.isPending}
                className="btn-mono-primary"
                style={{ padding: '6px 14px', fontSize: '0.8rem', fontWeight: 700 }}
              >
                {addProblemMutation.isPending ? 'Adding...' : 'Add Problem'}
              </button>
            </div>
          </form>
        )}

        {/* Problems List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {items.map((item, index) => {
            const isSolved = item.status === 'done' || item.status === 'solved';
            const isInProgress = item.status === 'in_progress' || item.status === 'in-progress';

            const statusLabel = isSolved
              ? 'Done'
              : isInProgress
              ? 'In Progress'
              : 'Todo';

            const statusColor = isSolved
              ? '#10b981'
              : isInProgress
              ? '#f59e0b'
              : 'var(--text-secondary)';

            const statusBg = isSolved
              ? 'rgba(16, 185, 129, 0.12)'
              : isInProgress
              ? 'rgba(245, 158, 11, 0.12)'
              : 'var(--bg-secondary)';

            const statusBorder = isSolved
              ? '1px solid rgba(16, 185, 129, 0.3)'
              : isInProgress
              ? '1px solid rgba(245, 158, 11, 0.3)'
              : '1px solid var(--border-color)';

            const diffColor = getDifficultyColor(item.difficulty);

            return (
              <div
                key={item.itemId || item.id || `item-${index}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: theme === 'light' ? '#ffffff' : '#050505',
                  border: '1px solid var(--border-color)',
                  borderRadius: '10px',
                  transition: 'border-color 0.2s ease, background 0.2s ease',
                  gap: '14px',
                }}
              >
                {/* Left: Index & Problem Title */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-secondary)', minWidth: '22px' }}>
                    #{index + 1}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span
                        style={{
                          color: isSolved ? 'var(--text-secondary)' : 'var(--text-primary)',
                          fontWeight: 650,
                          fontSize: '0.96rem',
                          textDecoration: isSolved ? 'line-through' : 'none',
                        }}
                      >
                        {item.title}
                      </span>

                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: 'var(--text-secondary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                          }}
                          title="Open problem in new tab"
                        >
                          <ExternalLink size={13} />
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Badges, Interactive Status Button & Remove Problem Button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  {item.difficulty && (
                    <span
                      style={{
                        color: diffColor,
                        fontWeight: 750,
                        fontSize: '0.78rem',
                        letterSpacing: '0.02em',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        background: `${diffColor}14`,
                        border: `1px solid ${diffColor}30`,
                      }}
                    >
                      {item.difficulty}
                    </span>
                  )}

                  {/* Status Button */}
                  <button
                    onClick={() => cycleStatus(item.itemId || item.id, item.status)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      background: statusBg,
                      border: statusBorder,
                      color: statusColor,
                      cursor: 'pointer',
                      fontWeight: 750,
                      outline: 'none',
                      fontSize: '0.8rem',
                      transition: 'all 0.15s ease',
                    }}
                    title={isOwner ? 'Click to toggle status (Todo -> In Progress -> Done)' : 'Fork sheet to save personal progress'}
                  >
                    {isSolved ? (
                      <CheckCircle2 size={13} />
                    ) : isInProgress ? (
                      <Clock size={13} />
                    ) : (
                      <Circle size={13} />
                    )}
                    {statusLabel}
                  </button>

                  {/* Delete Problem Button (Owner Only) */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={() => handleRemoveProblem(item.itemId || item.id, item.title)}
                      disabled={removeProblemMutation.isPending}
                      style={{
                        background: 'transparent',
                        border: '1px solid transparent',
                        color: 'var(--text-secondary)',
                        cursor: 'pointer',
                        padding: '6px',
                        borderRadius: '6px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.backgroundColor = 'rgba(239, 68, 68, 0.12)';
                        e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--text-secondary)';
                        e.currentTarget.style.backgroundColor = 'transparent';
                        e.currentTarget.style.borderColor = 'transparent';
                      }}
                      title="Remove problem from this sheet"
                      aria-label={`Remove ${item.title}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {items.length === 0 && (
            <div style={{ textAlign: 'center', padding: '36px', color: 'var(--text-secondary)' }}>
              <p>No problems in this sheet yet.</p>
              {isOwner && (
                <button
                  onClick={() => setShowAddProblem(true)}
                  className="btn-mono-secondary"
                  style={{ marginTop: '10px', fontSize: '0.82rem' }}
                >
                  + Add the first problem
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
