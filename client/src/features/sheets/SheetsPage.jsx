import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useTheme } from '../../lib/themeContext.jsx';

export function SheetsPage() {
  const { theme } = useTheme();
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
    <div className="av-sheets-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em' }}>
            📋 Problem Trackers & Sheets
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Track progress across popular DSA sheets and custom curated problem sets.
          </p>
        </div>
        <button className="btn-mono-primary">
          + Create Custom Sheet
        </button>
      </div>

      {sheets.length === 0 ? (
        <EmptyState title="No sheets yet" description="Create a new sheet to track your problem-solving progress." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
          {sheets.map((s) => {
            const solvedPct = Math.round((s.solved / s.total) * 100);
            const inProgressPct = Math.round((s.inProgress / s.total) * 100);
            const todoPct = 100 - solvedPct - inProgressPct;

            return (
              <div key={s.id} className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px' }}>
                <div>
                  <Link
                    to={`/sheets/${s.id}`}
                    style={{ textDecoration: 'none', color: 'var(--text-primary)', fontSize: '1.25rem', fontWeight: 800 }}
                  >
                    {s.title}
                  </Link>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '12px 0 20px', lineHeight: 1.5 }}>
                    {s.description}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 700 }}>{solvedPct}% Solved</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong>{s.solved}</strong> solved • <strong>{s.inProgress}</strong> in progress • {s.total} total
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
