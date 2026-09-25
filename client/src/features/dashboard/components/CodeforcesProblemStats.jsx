import { useTheme } from '../../../lib/themeContext.jsx';
import { CheckCircle2, Target, BarChart2, Layers } from 'lucide-react';

export function CodeforcesProblemStats({ problemStats }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  if (!problemStats || problemStats.totalSolved === 0) {
    return null;
  }

  const { totalSolved, totalSubmissions, acceptedSubmissions, acceptanceRate, byDifficulty, ranges } = problemStats;

  // Find max count for relative bar scaling in ranges
  const maxRangeCount = Math.max(1, ...ranges.map((r) => r.count));
  // Find max count for difficulty breakdown
  const maxDiffCount = Math.max(1, ...byDifficulty.map((d) => d.count));

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '20px',
      }}
    >
      {/* Problem Solving Overview & Difficulty Breakdown */}
      <div
        className="mono-card"
        style={{
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
              Problem Solving Overview
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Breakdown of solved problems and submissions.
            </span>
          </div>
          <span
            style={{
              padding: '3px 10px',
              borderRadius: '20px',
              fontSize: '0.78rem',
              fontWeight: 800,
              background: 'rgba(16, 185, 129, 0.12)',
              color: '#10b981',
              border: '1px solid rgba(16, 185, 129, 0.25)',
            }}
          >
            {acceptanceRate}% AC Rate
          </span>
        </div>

        {/* 3 mini stat boxes */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
              Unique Solved
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 850, color: 'var(--text-primary)' }}>
              {totalSolved}
            </span>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
              Accepted
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 850, color: '#10b981' }}>
              {acceptedSubmissions}
            </span>
          </div>

          <div
            style={{
              padding: '12px',
              borderRadius: '8px',
              background: isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)',
              textAlign: 'center',
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
              Submissions
            </span>
            <span style={{ fontSize: '1.4rem', fontWeight: 850, color: 'var(--text-secondary)' }}>
              {totalSubmissions}
            </span>
          </div>
        </div>

        {/* Problems Solved by Difficulty Bars */}
        <div>
          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '10px' }}>
            Problems Solved by Exact Rating
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '220px', overflowY: 'auto', paddingRight: '4px' }}>
            {byDifficulty.map((item) => {
              const widthPct = Math.max(8, Math.round((item.count / maxDiffCount) * 100));
              return (
                <div key={item.rating} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.82rem' }}>
                  <span style={{ width: '42px', fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-secondary)' }}>
                    {item.rating}
                  </span>
                  <div
                    style={{
                      flex: 1,
                      height: '18px',
                      background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                      borderRadius: '4px',
                      overflow: 'hidden',
                      position: 'relative',
                    }}
                  >
                    <div
                      style={{
                        width: `${widthPct}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, #3b82f6, #60a5fa)',
                        borderRadius: '4px',
                        transition: 'width 0.4s ease',
                      }}
                    />
                  </div>
                  <span style={{ width: '32px', textAlign: 'right', fontWeight: 750, color: 'var(--text-primary)' }}>
                    {item.count}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Problem Rating Distribution Chart */}
      <div
        className="mono-card"
        style={{
          padding: '24px',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '18px',
        }}
      >
        <div>
          <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>
            Problem Rating Distribution
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Distribution grouped into standard competitive difficulty tiers.
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ranges.map((range) => {
            const widthPct = Math.max(6, Math.round((range.count / maxRangeCount) * 100));
            const sharePct = totalSolved > 0 ? ((range.count / totalSolved) * 100).toFixed(0) : 0;

            return (
              <div key={range.label} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: range.color,
                      }}
                    />
                    {range.label}
                  </span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }}>
                    <strong>{range.count}</strong> solved ({sharePct}%)
                  </span>
                </div>

                <div
                  style={{
                    height: '14px',
                    width: '100%',
                    background: isLight ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${widthPct}%`,
                      background: range.color,
                      borderRadius: '6px',
                      transition: 'width 0.4s ease',
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
