import { Trophy, ArrowUpRight, Sparkles } from 'lucide-react';
import { useTheme } from '../../../lib/themeContext.jsx';

export function CodeforcesRatingEmptyCard({ onConnectClick }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className="mono-card av-cf-empty-card"
      style={{
        position: 'relative',
        overflow: 'hidden',
        padding: '32px 28px',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        background: isLight ? '#ffffff' : '#09090b',
      }}
    >
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '8px',
              background: isLight ? 'rgba(59, 130, 246, 0.1)' : 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6',
            }}
          >
            <Trophy size={18} />
          </div>
          <div>
            <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
              Codeforces Rating
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Competitive Programming Tracking
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onConnectClick}
          className="btn-mono-primary"
          style={{
            padding: '8px 16px',
            fontSize: '0.88rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
          }}
        >
          <Sparkles size={15} />
          Connect Codeforces
        </button>
      </div>

      {/* Placeholder Statistics Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '14px',
        }}
      >
        {[
          { label: 'Rating', value: '—' },
          { label: 'Max Rating', value: '—' },
          { label: 'Contests', value: '—' },
          { label: 'Rank', value: '—' },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '14px 16px',
              borderRadius: '8px',
              background: isLight ? 'rgba(0, 0, 0, 0.02)' : 'rgba(255, 255, 255, 0.02)',
              border: '1px solid var(--border-color)',
            }}
          >
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              {stat.label}
            </div>
            <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-secondary)', marginTop: '4px' }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* Visual Preview: Subtle faded/blurred sample line chart container */}
      <div
        style={{
          position: 'relative',
          borderRadius: '10px',
          border: '1px dashed var(--border-color)',
          height: '240px',
          overflow: 'hidden',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Subtle blurred background SVG chart preview */}
        <svg
          viewBox="0 0 600 220"
          preserveAspectRatio="none"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            opacity: isLight ? 0.22 : 0.15,
            filter: 'blur(3px)',
            pointerEvents: 'none',
          }}
        >
          <defs>
            <linearGradient id="previewGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
            </linearGradient>
          </defs>
          {/* Subtle grid lines */}
          <line x1="40" y1="40" x2="580" y2="40" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" />
          <line x1="40" y1="90" x2="580" y2="90" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" />
          <line x1="40" y1="140" x2="580" y2="140" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" />
          <line x1="40" y1="190" x2="580" y2="190" stroke="currentColor" strokeDasharray="4 4" strokeWidth="1" />
          {/* Faded curve line */}
          <path
            d="M 50 170 Q 140 160 200 135 T 320 110 T 430 75 T 560 45"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M 50 170 Q 140 160 200 135 T 320 110 T 430 75 T 560 45 L 560 200 L 50 200 Z"
            fill="url(#previewGrad)"
          />
          {/* Sample dots */}
          <circle cx="50" cy="170" r="4" fill="#3b82f6" />
          <circle cx="200" cy="135" r="4" fill="#3b82f6" />
          <circle cx="320" cy="110" r="4" fill="#3b82f6" />
          <circle cx="430" cy="75" r="4" fill="#3b82f6" />
          <circle cx="560" cy="45" r="5" fill="#3b82f6" />
        </svg>

        {/* Center overlay banner */}
        <div
          style={{
            position: 'relative',
            zIndex: 2,
            textAlign: 'center',
            maxWidth: '440px',
            padding: '24px 20px',
            background: isLight ? 'rgba(255, 255, 255, 0.92)' : 'rgba(10, 10, 12, 0.92)',
            backdropFilter: 'blur(8px)',
            borderRadius: '10px',
            border: '1px solid var(--border-color)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '10px',
          }}
        >
          <div
            style={{
              fontSize: '1.05rem',
              fontWeight: 800,
              color: 'var(--text-primary)',
              letterSpacing: '-0.01em',
            }}
          >
            Connect your Codeforces account to track your rating.
          </div>
          <div
            style={{
              fontSize: '0.86rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45,
            }}
          >
            Enter your Codeforces ID to see your rating history, contest performance, and progress.
          </div>
          <button
            type="button"
            onClick={onConnectClick}
            className="btn-mono-primary"
            style={{
              marginTop: '6px',
              padding: '8px 20px',
              fontSize: '0.9rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            Connect Codeforces
            <ArrowUpRight size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}
