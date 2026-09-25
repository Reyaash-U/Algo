import { useState } from 'react';
import { ExternalLink, Trophy, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { useTheme } from '../../../lib/themeContext.jsx';
import { getRankTier } from '../services/codeforcesService.js';

export function CodeforcesRecentContests({ contests = [] }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [showAll, setShowAll] = useState(false);

  if (!contests || contests.length === 0) {
    return null;
  }

  // Contests in reverse chronological order (newest first)
  const reversed = [...contests].reverse();
  const displayed = showAll ? reversed : reversed.slice(0, 8);

  return (
    <div
      className="mono-card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
            Recent Contests
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Performance and rating delta across individual contest rounds.
          </span>
        </div>

        {reversed.length > 8 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="btn-mono-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {showAll ? 'Show Less' : `View All (${reversed.length})`}
          </button>
        )}
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '600px' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.78rem',
                color: 'var(--text-secondary)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              <th style={{ padding: '12px 14px' }}>Contest</th>
              <th style={{ padding: '12px 14px' }}>Date</th>
              <th style={{ padding: '12px 14px' }}>Rank</th>
              <th style={{ padding: '12px 14px' }}>Before</th>
              <th style={{ padding: '12px 14px' }}>Change</th>
              <th style={{ padding: '12px 14px' }}>Rating</th>
              <th style={{ padding: '12px 14px', textAlign: 'center' }}>Status</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((c) => {
              const isPositive = c.ratingChange > 0;
              const isNegative = c.ratingChange < 0;
              const rankTier = getRankTier(c.ratingAfter);

              return (
                <tr
                  key={c.contestId}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    fontSize: '0.88rem',
                    transition: 'background 0.1s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isLight ? 'rgba(0,0,0,0.02)' : 'rgba(255,255,255,0.02)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                    <a
                      href={`https://codeforces.com/contest/${c.contestId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: 'var(--text-primary)',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      {c.contestName}
                      <ExternalLink size={12} style={{ color: 'var(--text-secondary)', opacity: 0.7 }} />
                    </a>
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {c.date}
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 650, color: 'var(--text-primary)' }}>
                    #{c.rank}
                  </td>
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)' }}>
                    {c.ratingBefore}
                  </td>
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontWeight: 800,
                        fontSize: '0.82rem',
                        background: isPositive
                          ? 'rgba(16, 185, 129, 0.12)'
                          : isNegative
                          ? 'rgba(239, 68, 68, 0.12)'
                          : 'rgba(156, 163, 175, 0.12)',
                        color: isPositive ? '#10b981' : isNegative ? '#ef4444' : 'var(--text-secondary)',
                        border: `1px solid ${
                          isPositive
                            ? 'rgba(16, 185, 129, 0.25)'
                            : isNegative
                            ? 'rgba(239, 68, 68, 0.25)'
                            : 'transparent'
                        }`,
                      }}
                    >
                      {isPositive ? <TrendingUp size={12} /> : isNegative ? <TrendingDown size={12} /> : <Minus size={12} />}
                      {isPositive ? `+${c.ratingChange}` : c.ratingChange}
                    </span>
                  </td>
                  <td style={{ padding: '12px 14px', fontWeight: 800, color: rankTier.color }}>
                    {c.ratingAfter}
                  </td>
                  <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                    <span
                      style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        color: rankTier.color,
                        background: rankTier.bgColor,
                        padding: '2px 8px',
                        borderRadius: '12px',
                        border: `1px solid ${rankTier.color}30`,
                      }}
                    >
                      {rankTier.name}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
