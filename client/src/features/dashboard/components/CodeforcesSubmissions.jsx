import { useState } from 'react';
import { CheckCircle2, XCircle, Clock, AlertTriangle, ExternalLink } from 'lucide-react';
import { useTheme } from '../../../lib/themeContext.jsx';

export function CodeforcesSubmissions({ submissions = [] }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [showAll, setShowAll] = useState(false);

  if (!submissions || submissions.length === 0) {
    return null;
  }

  const displayed = showAll ? submissions : submissions.slice(0, 10);

  const getVerdictBadge = (verdict) => {
    switch (verdict) {
      case 'OK':
        return {
          icon: <CheckCircle2 size={15} style={{ color: '#10b981' }} />,
          label: 'Accepted',
          color: '#10b981',
          bg: 'rgba(16, 185, 129, 0.12)',
        };
      case 'WRONG_ANSWER':
        return {
          icon: <XCircle size={15} style={{ color: '#ef4444' }} />,
          label: 'Wrong Answer',
          color: '#ef4444',
          bg: 'rgba(239, 68, 68, 0.12)',
        };
      case 'TIME_LIMIT_EXCEEDED':
        return {
          icon: <Clock size={15} style={{ color: '#f59e0b' }} />,
          label: 'Time Limit',
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
        };
      case 'MEMORY_LIMIT_EXCEEDED':
        return {
          icon: <AlertTriangle size={15} style={{ color: '#f59e0b' }} />,
          label: 'Memory Limit',
          color: '#f59e0b',
          bg: 'rgba(245, 158, 11, 0.12)',
        };
      default:
        return {
          icon: <XCircle size={15} style={{ color: '#9ca3af' }} />,
          label: verdict ? verdict.replace(/_/g, ' ') : 'Failed',
          color: '#9ca3af',
          bg: 'rgba(156, 163, 175, 0.12)',
        };
    }
  };

  const formatSubmissionTime = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const diffHours = Math.round((now - date) / (1000 * 60 * 60));

    if (diffHours < 24) {
      return `${Math.max(1, diffHours)}h ago`;
    }
    const diffDays = Math.round(diffHours / 24);
    if (diffDays < 30) {
      return `${diffDays}d ago`;
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div
      className="mono-card"
      style={{
        padding: '24px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
            Recent Submissions
          </h3>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            Latest code solutions submitted across contest and practice problems.
          </span>
        </div>

        {submissions.length > 10 && (
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="btn-mono-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer' }}
          >
            {showAll ? 'Show Less' : `View All (${submissions.length})`}
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
              <th style={{ padding: '12px 14px' }}>Status</th>
              <th style={{ padding: '12px 14px' }}>Problem</th>
              <th style={{ padding: '12px 14px' }}>Language</th>
              <th style={{ padding: '12px 14px' }}>Difficulty</th>
              <th style={{ padding: '12px 14px' }}>Time / Memory</th>
              <th style={{ padding: '12px 14px', textAlign: 'right' }}>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {displayed.map((s) => {
              const verdictInfo = getVerdictBadge(s.verdict);
              const problemUrl = s.contestId && s.problemIndex
                ? `https://codeforces.com/contest/${s.contestId}/problem/${s.problemIndex}`
                : null;

              return (
                <tr
                  key={s.id}
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
                  {/* Status Indicator */}
                  <td style={{ padding: '12px 14px' }}>
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        padding: '3px 8px',
                        borderRadius: '6px',
                        fontSize: '0.78rem',
                        fontWeight: 750,
                        background: verdictInfo.bg,
                        color: verdictInfo.color,
                      }}
                    >
                      {verdictInfo.icon}
                      {verdictInfo.label}
                    </span>
                  </td>

                  {/* Problem Name & Contest Index */}
                  <td style={{ padding: '12px 14px', fontWeight: 700 }}>
                    {problemUrl ? (
                      <a
                        href={problemUrl}
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
                        <span>
                          {s.contestId && s.problemIndex ? `${s.contestId}${s.problemIndex} - ` : ''}
                          {s.problemName}
                        </span>
                        <ExternalLink size={12} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
                      </a>
                    ) : (
                      <span>{s.problemName}</span>
                    )}
                  </td>

                  {/* Programming Language */}
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    <span
                      style={{
                        background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
                        padding: '2px 8px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '0.78rem',
                        fontWeight: 600,
                      }}
                    >
                      {s.language}
                    </span>
                  </td>

                  {/* Rating / Difficulty */}
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {s.problemRating ? (
                      <span style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                        ★ {s.problemRating}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>

                  {/* Execution Metrics */}
                  <td style={{ padding: '12px 14px', color: 'var(--text-secondary)', fontSize: '0.8rem', fontFamily: 'monospace' }}>
                    {s.timeConsumedMillis != null ? `${s.timeConsumedMillis}ms` : '—'}
                    {s.memoryConsumedBytes != null
                      ? ` / ${Math.round(s.memoryConsumedBytes / 1024)}KB`
                      : ''}
                  </td>

                  {/* Time Submitted */}
                  <td style={{ padding: '12px 14px', textAlign: 'right', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
                    {formatSubmissionTime(s.submittedAt)}
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
