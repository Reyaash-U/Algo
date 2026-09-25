import { useState, useMemo, useRef } from 'react';
import { useTheme } from '../../../lib/themeContext.jsx';
import { getRankTier } from '../services/codeforcesService.js';
import { Calendar, TrendingUp, Award, Clock } from 'lucide-react';

export function CodeforcesRatingChart({ ratingHistory = [] }) {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [timeRange, setTimeRange] = useState('All'); // 'All' | '1Y' | '6M' | '3M'
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const containerRef = useRef(null);

  // Filter history according to timeRange
  const filteredHistory = useMemo(() => {
    if (!Array.isArray(ratingHistory) || ratingHistory.length === 0) return [];
    if (timeRange === 'All') return ratingHistory;

    const now = Date.now();
    const months = timeRange === '1Y' ? 12 : timeRange === '6M' ? 6 : 3;
    const cutoff = now - months * 30 * 24 * 60 * 60 * 1000;

    const filtered = ratingHistory.filter((c) => c.timestamp >= cutoff);
    // If filtering leaves fewer than 2 contests, return all available contests in that range or fallback
    return filtered.length > 0 ? filtered : ratingHistory.slice(-5);
  }, [ratingHistory, timeRange]);

  // Chart dimensions & scaling
  const chartConfig = useMemo(() => {
    if (filteredHistory.length === 0) return null;

    const padding = { top: 30, right: 30, bottom: 40, left: 55 };
    const width = 800;
    const height = 340;

    const ratings = filteredHistory.map((c) => c.ratingAfter);
    const minRatingRaw = Math.min(...ratings);
    const maxRatingRaw = Math.max(...ratings);

    // Round min down to nearest 100, max up to nearest 100 with padding
    const minRating = Math.max(0, Math.floor((minRatingRaw - 80) / 100) * 100);
    const maxRating = Math.ceil((maxRatingRaw + 80) / 100) * 100;
    const ratingRange = Math.max(100, maxRating - minRating);

    const plotWidth = width - padding.left - padding.right;
    const plotHeight = height - padding.top - padding.bottom;

    const points = filteredHistory.map((c, i) => {
      const x =
        filteredHistory.length === 1
          ? padding.left + plotWidth / 2
          : padding.left + (i / (filteredHistory.length - 1)) * plotWidth;
      const y = padding.top + plotHeight - ((c.ratingAfter - minRating) / ratingRange) * plotHeight;
      return { ...c, x, y };
    });

    // Generate smooth SVG curve path (cubic bezier)
    let pathD = '';
    if (points.length === 1) {
      pathD = `M ${points[0].x} ${points[0].y}`;
    } else if (points.length > 1) {
      pathD = `M ${points[0].x} ${points[0].y}`;
      for (let i = 0; i < points.length - 1; i++) {
        const p0 = i > 0 ? points[i - 1] : points[i];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = i < points.length - 2 ? points[i + 2] : p2;

        const cp1x = p1.x + (p2.x - p0.x) / 6;
        const cp1y = p1.y + (p2.y - p0.y) / 6;
        const cp2x = p2.x - (p3.x - p1.x) / 6;
        const cp2y = p2.y - (p3.y - p1.y) / 6;

        pathD += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
      }
    }

    // Area fill path
    const areaD =
      points.length > 1
        ? `${pathD} L ${points[points.length - 1].x} ${padding.top + plotHeight} L ${points[0].x} ${
            padding.top + plotHeight
          } Z`
        : '';

    // Horizontal grid ticks (4-6 steps)
    const tickStep = ratingRange > 1000 ? 200 : 100;
    const yTicks = [];
    for (let r = Math.ceil(minRating / tickStep) * tickStep; r <= maxRating; r += tickStep) {
      const y = padding.top + plotHeight - ((r - minRating) / ratingRange) * plotHeight;
      const rank = getRankTier(r);
      yTicks.push({ rating: r, y, rankName: rank.name, rankColor: rank.color });
    }

    // X-axis date labels (pick ~4-6 spaced labels)
    const xTicks = [];
    if (points.length > 0) {
      const step = Math.max(1, Math.floor(points.length / 5));
      for (let i = 0; i < points.length; i += step) {
        xTicks.push(points[i]);
      }
      if (points.length > 1 && xTicks[xTicks.length - 1] !== points[points.length - 1]) {
        xTicks.push(points[points.length - 1]);
      }
    }

    return {
      width,
      height,
      padding,
      plotWidth,
      plotHeight,
      minRating,
      maxRating,
      points,
      pathD,
      areaD,
      yTicks,
      xTicks,
    };
  }, [filteredHistory]);

  // If no contest rating history
  if (!ratingHistory || ratingHistory.length === 0) {
    return (
      <div
        className="mono-card"
        style={{
          padding: '40px 24px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '12px',
          border: '1px dashed var(--border-color)',
          borderRadius: '12px',
        }}
      >
        <div
          style={{
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: isLight ? 'rgba(0,0,0,0.04)' : 'rgba(255,255,255,0.06)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
          }}
        >
          <Calendar size={22} />
        </div>
        <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>
          No contest rating history yet.
        </h3>
        <p className="text-mono-desc" style={{ margin: 0, maxWidth: '400px', fontSize: '0.9rem' }}>
          Participate in a Codeforces contest to start building your rating history.
        </p>
      </div>
    );
  }

  const latestPoint = chartConfig?.points[chartConfig.points.length - 1];
  const activeTooltip = hoveredPoint || latestPoint;
  const activeRankTier = activeTooltip ? getRankTier(activeTooltip.ratingAfter) : null;

  return (
    <div
      ref={containerRef}
      className="mono-card"
      style={{
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        borderRadius: '12px',
        border: '1px solid var(--border-color)',
        position: 'relative',
      }}
    >
      {/* Chart Top Header & Time-Range Switcher */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <TrendingUp size={18} style={{ color: activeRankTier?.color || '#3b82f6' }} />
            <h3 className="text-mono-title" style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>
              Rating History
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              ({filteredHistory.length} {filteredHistory.length === 1 ? 'contest' : 'contests'})
            </span>
          </div>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
            Hover over any contest point to inspect performance metrics.
          </span>
        </div>

        {/* Time-range selector: All | 1Y | 6M | 3M */}
        <div
          style={{
            display: 'inline-flex',
            padding: '3px',
            background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.06)',
            borderRadius: '8px',
            border: '1px solid var(--border-color)',
            gap: '2px',
          }}
        >
          {['All', '1Y', '6M', '3M'].map((range) => (
            <button
              key={range}
              type="button"
              onClick={() => setTimeRange(range)}
              style={{
                padding: '4px 12px',
                fontSize: '0.78rem',
                fontWeight: 700,
                borderRadius: '6px',
                border: 'none',
                cursor: 'pointer',
                background: timeRange === range ? 'var(--text-primary)' : 'transparent',
                color: timeRange === range ? 'var(--bg-primary)' : 'var(--text-secondary)',
                transition: 'all 0.15s ease',
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive SVG Chart Container */}
      <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
        <svg
          viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
          style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }}
          onMouseLeave={() => setHoveredPoint(null)}
        >
          <defs>
            <linearGradient id="cfRatingGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={activeRankTier?.color || '#3b82f6'} stopOpacity="0.35" />
              <stop offset="100%" stopColor={activeRankTier?.color || '#3b82f6'} stopOpacity="0.0" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Grid lines and Y-axis labels */}
          {chartConfig.yTicks.map((tick) => (
            <g key={tick.rating}>
              <line
                x1={chartConfig.padding.left}
                y1={tick.y}
                x2={chartConfig.width - chartConfig.padding.right}
                y2={tick.y}
                stroke={isLight ? 'rgba(0, 0, 0, 0.06)' : 'rgba(255, 255, 255, 0.06)'}
                strokeDasharray="4 4"
                strokeWidth="1"
              />
              <text
                x={chartConfig.padding.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                fontSize="11"
                fill="var(--text-secondary)"
                fontFamily="monospace"
                fontWeight="600"
              >
                {tick.rating}
              </text>
            </g>
          ))}

          {/* Area under curve */}
          {chartConfig.areaD && <path d={chartConfig.areaD} fill="url(#cfRatingGradient)" />}

          {/* Line connecting points */}
          {chartConfig.pathD && (
            <path
              d={chartConfig.pathD}
              fill="none"
              stroke={activeRankTier?.color || '#3b82f6'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Individual Contest Rating Points */}
          {chartConfig.points.map((pt, i) => {
            const isLatest = i === chartConfig.points.length - 1;
            const isHovered = hoveredPoint?.contestId === pt.contestId;
            const ptRank = getRankTier(pt.ratingAfter);

            return (
              <g
                key={pt.contestId}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredPoint(pt)}
              >
                {/* Invisible hover hitbox */}
                <circle cx={pt.x} cy={pt.y} r="14" fill="transparent" />

                {/* Outer ring for latest or hovered */}
                {(isLatest || isHovered) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 9 : 7}
                    fill={ptRank.color}
                    fillOpacity="0.25"
                    filter="url(#glow)"
                  />
                )}

                {/* Point dot */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 5.5 : isLatest ? 4.5 : 3}
                  fill={isHovered ? '#ffffff' : ptRank.color}
                  stroke={ptRank.color}
                  strokeWidth={isHovered ? '2.5' : '1.5'}
                  transition="all 0.1s ease"
                />
              </g>
            );
          })}

          {/* X-axis date labels */}
          {chartConfig.xTicks.map((pt) => (
            <text
              key={pt.contestId}
              x={pt.x}
              y={chartConfig.height - 12}
              textAnchor="middle"
              fontSize="10"
              fill="var(--text-secondary)"
              fontFamily="sans-serif"
            >
              {pt.date}
            </text>
          ))}
        </svg>

        {/* Floating Tooltip Box */}
        {activeTooltip && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 18px',
              borderRadius: '8px',
              background: isLight ? '#ffffff' : '#111114',
              border: `1px solid ${activeRankTier?.color || 'var(--border-color)'}`,
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: '16px',
            }}
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    fontSize: '0.72rem',
                    fontWeight: 800,
                    textTransform: 'uppercase',
                    color: activeRankTier?.color,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: activeRankTier?.bgColor,
                    border: `1px solid ${activeRankTier?.color}40`,
                  }}
                >
                  {activeRankTier?.name}
                </span>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {activeTooltip.contestName}
                </span>
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <span>Date: <strong>{activeTooltip.date}</strong></span>
                <span>Rank: <strong>#{activeTooltip.rank}</strong></span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
                  Rating Before
                </span>
                <span style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeTooltip.ratingBefore}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
                  Change
                </span>
                <span
                  style={{
                    fontSize: '1.05rem',
                    fontWeight: 800,
                    color: activeTooltip.ratingChange >= 0 ? '#10b981' : '#ef4444',
                  }}
                >
                  {activeTooltip.ratingChange >= 0 ? `+${activeTooltip.ratingChange}` : activeTooltip.ratingChange}
                </span>
              </div>

              <div>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', textTransform: 'uppercase', display: 'block' }}>
                  Rating After
                </span>
                <span
                  style={{
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    color: activeRankTier?.color || 'var(--text-primary)',
                  }}
                >
                  {activeTooltip.ratingAfter}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
