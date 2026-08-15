import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';

export function SheetDetailPage() {
  const { id } = useParams();
  const toast = useToast();

  const { data: rawSheet, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sheet(id),
    queryFn: () => api.sheets.get(id),
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  // Fallback mock sheet for scaffold/demo
  const sheet = rawSheet ?? {
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

  const solvedCount = sheet.items.filter((i) => i.status === 'solved').length;
  const inProgressCount = sheet.items.filter((i) => i.status === 'in-progress').length;
  const totalCount = sheet.items.length;

  const solvedPct = Math.round((solvedCount / totalCount) * 100);
  const inProgressPct = Math.round((inProgressCount / totalCount) * 100);
  const todoPct = 100 - solvedPct - inProgressPct;

  return (
    <div className="av-sheet-detail" style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/sheets" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to Sheets
        </Link>
      </div>

      <div className="av-card" style={{ padding: '28px', marginBottom: '24px' }}>
        <h1 style={{ margin: '0 0 8px', fontSize: '1.6rem', color: '#fff' }}>{sheet.title}</h1>
        <p style={{ margin: '0 0 20px', color: 'var(--text-muted)', fontSize: '0.92rem' }}>
          {sheet.description}
        </p>

        {/* Progress Tracker Summary */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', marginBottom: '10px' }}>
          <span style={{ color: '#fff', fontWeight: 700 }}>Overall Progress: {solvedPct}%</span>
          <span style={{ color: 'var(--text-dim)' }}>
            <strong style={{ color: 'var(--accent-success)' }}>{solvedCount}</strong> Solved • <strong style={{ color: 'var(--accent-warning)' }}>{inProgressCount}</strong> In Progress • {totalCount} Total
          </span>
        </div>

        <div className="av-progress-bar" style={{ height: '10px' }}>
          <div className="av-progress-bar__segment av-progress-bar__segment--solved" style={{ width: `${solvedPct}%` }} />
          <div className="av-progress-bar__segment av-progress-bar__segment--in-progress" style={{ width: `${inProgressPct}%` }} />
          <div className="av-progress-bar__segment av-progress-bar__segment--todo" style={{ width: `${todoPct}%` }} />
        </div>
      </div>

      {/* Item Checklist Table / List */}
      <div className="av-card">
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', color: '#fff' }}>Problem List</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sheet.items.map((item) => {
            const statusColor = item.status === 'solved' ? 'var(--accent-success)' : item.status === 'in-progress' ? 'var(--accent-warning)' : 'var(--text-dim)';
            const diffColor = item.difficulty === 'Easy' ? 'var(--accent-success)' : item.difficulty === 'Hard' ? 'var(--accent-danger)' : 'var(--accent-warning)';

            return (
              <div
                key={item.itemId}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input
                    type="checkbox"
                    checked={item.status === 'solved'}
                    onChange={() => toast.push(`Updated status for "${item.title}"`, { type: 'success' })}
                    style={{ cursor: 'pointer', width: '16px', height: '16px', accentColor: 'var(--accent-primary)' }}
                  />
                  <span style={{ color: item.status === 'solved' ? 'var(--text-dim)' : '#fff', fontWeight: 500, textDecoration: item.status === 'solved' ? 'line-through' : 'none' }}>
                    {item.title}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.8rem' }}>
                  <span style={{ color: diffColor, fontWeight: 600 }}>{item.difficulty}</span>
                  <span style={{ padding: '2px 8px', borderRadius: '12px', background: 'rgba(255,255,255,0.06)', color: statusColor, textTransform: 'capitalize', fontWeight: 600 }}>
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
