import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';

export function SheetsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sheets,
    queryFn: () => api.sheets.list(),
  });

  if (isLoading) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load sheets: {error.message}</p>;

  const rawSheets = data?.items ?? [];
  const sheets = rawSheets.length > 0 ? rawSheets : [
    {
      id: 'sheet-1',
      title: 'Striver SDE Sheet - Top 180 DSA Questions',
      description: 'Curated 6-week placement preparation tracker covering Arrays, DP, Graphs, and System Design.',
      solved: 45,
      inProgress: 15,
      total: 180,
    },
    {
      id: 'sheet-2',
      title: 'NeetCode 150 - Essential Pattern List',
      description: 'Master 15 core patterns to crack top tech coding interviews.',
      solved: 80,
      inProgress: 20,
      total: 150,
    },
    {
      id: 'sheet-3',
      title: 'Blind 75 Must-Do Coding Questions',
      description: 'The classic 75 problem list for fast-track interview prep.',
      solved: 60,
      inProgress: 5,
      total: 75,
    }
  ];

  return (
    <div className="av-sheets-page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>📋 Problem Trackers & Sheets</h1>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            Track progress across popular DSA sheets and custom curated problem sets.
          </p>
        </div>
        <button className="av-btn av-btn--primary">
          + Create Custom Sheet
        </button>
      </div>

      {sheets.length === 0 ? (
        <EmptyState title="No sheets yet" description="Create a new sheet to track your problem-solving progress." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {sheets.map((s) => {
            const solvedPct = Math.round((s.solved / s.total) * 100);
            const inProgressPct = Math.round((s.inProgress / s.total) * 100);
            const todoPct = 100 - solvedPct - inProgressPct;

            return (
              <div key={s.id} className="av-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <Link
                    to={`/sheets/${s.id}`}
                    style={{ textDecoration: 'none', color: '#fff', fontSize: '1.15rem', fontWeight: 700 }}
                  >
                    {s.title}
                  </Link>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '8px 0 16px', lineHeight: 1.5 }}>
                    {s.description}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <span style={{ color: '#fff', fontWeight: 600 }}>{solvedPct}% Solved</span>
                    <span style={{ color: 'var(--text-dim)' }}>
                      <strong style={{ color: 'var(--accent-success)' }}>{s.solved}</strong> solved • <strong style={{ color: 'var(--accent-warning)' }}>{s.inProgress}</strong> in progress • {s.total} total
                    </span>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="av-progress-bar">
                    <div className="av-progress-bar__segment av-progress-bar__segment--solved" style={{ width: `${solvedPct}%` }} title={`Solved: ${solvedPct}%`} />
                    <div className="av-progress-bar__segment av-progress-bar__segment--in-progress" style={{ width: `${inProgressPct}%` }} title={`In Progress: ${inProgressPct}%`} />
                    <div className="av-progress-bar__segment av-progress-bar__segment--todo" style={{ width: `${todoPct}%` }} title={`Todo: ${todoPct}%`} />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <Link to={`/sheets/${s.id}`} className="av-btn av-btn--secondary" style={{ padding: '6px 12px', fontSize: '0.8rem', textDecoration: 'none' }}>
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
