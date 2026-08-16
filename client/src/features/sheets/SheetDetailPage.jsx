import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';

export function SheetDetailPage() {
  const { id } = useParams();
  const toast = useToast();
  const { theme } = useTheme();

  const { data: rawSheet, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sheet(id),
    queryFn: () => api.sheets.get(id),
  });

  // Provide mock fallback note for demo/scaffold
  const sheetFallback = {
    id: id || 'sheet-1',
    title: 'Striver SDE Sheet - Top 180 DSA Questions',
    description: 'Curated 6-week placement preparation tracker covering Arrays, DP, Graphs, and System Design.',
    items: [
      { itemId: 'item-1', title: 'Set Matrix Zeroes', status: 'solved', difficulty: 'Medium', platform: 'LeetCode' },
      { itemId: 'item-2', title: 'Pascal Triangle', status: 'solved', difficulty: 'Easy', platform: 'LeetCode' },
      { itemId: 'item-3', title: 'Next Permutation', status: 'in-progress', difficulty: 'Medium', platform: 'LeetCode' },
      { itemId: 'item-4', title: 'Kadane Algorithm (Maximum Subarray)', status: 'solved', difficulty: 'Medium', platform: 'LeetCode' },
      { itemId: 'item-5', title: 'Sort an Array of 0s, 1s and 2s', status: 'todo', difficulty: 'Medium', platform: 'LeetCode' },
    ],
  };

  const sheet = rawSheet ?? sheetFallback;

  // Add local state to simulate status cycling if backend integration is stubbed
  const [items, setItems] = useState(sheet.items);

  // Sync state items when rawSheet changes/loads
  useEffect(() => {
    if (rawSheet?.items) {
      setItems(rawSheet.items);
    }
  }, [rawSheet]);

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  const cycleStatus = (itemId, currentStatus) => {
    let nextStatus = 'todo';
    if (currentStatus === 'todo') nextStatus = 'in-progress';
    else if (currentStatus === 'in-progress') nextStatus = 'solved';

    setItems((prev) =>
      prev.map((i) => (i.itemId === itemId ? { ...i, status: nextStatus } : i))
    );
    
    const displayStatus = nextStatus === 'solved' ? 'Done' : nextStatus === 'in-progress' ? 'In Progress' : 'Todo';
    toast.push(`Updated status to "${displayStatus}"`, { type: 'success' });
  };

  const solvedCount = items.filter((i) => i.status === 'solved').length;
  const inProgressCount = items.filter((i) => i.status === 'in-progress').length;
  const totalCount = items.length;

  const solvedPct = Math.round((solvedCount / totalCount) * 100);
  const inProgressPct = Math.round((inProgressCount / totalCount) * 100);
  const todoPct = 100 - solvedPct - inProgressPct;

  return (
    <div className="av-sheet-detail" style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link to="/sheets" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ← Back to Sheets
        </Link>
      </div>

      <div className="mono-card" style={{ padding: '32px' }}>
        <h1 className="text-mono-title" style={{ margin: '0 0 12px', fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.02em' }}>{sheet.title}</h1>
        <p className="text-mono-desc" style={{ margin: '0 0 24px', fontSize: '0.98rem', lineHeight: 1.6 }}>
          {sheet.description}
        </p>

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
            const isSolved = item.status === 'solved';
            const isInProgress = item.status === 'in-progress';
            
            const statusLabel = isSolved
              ? 'Done'
              : isInProgress
              ? 'In Progress'
              : 'Todo';

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

            const diffColor = theme === 'light' ? '#27272a' : '#fafafa';

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
                  <span style={{ color: diffColor, fontWeight: 700, letterSpacing: '0.02em' }}>{item.difficulty}</span>
                  <button
                    onClick={() => cycleStatus(item.itemId, item.status)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      background: statusBg,
                      border: item.status === 'todo' ? '1px solid var(--border-color)' : 'none',
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
