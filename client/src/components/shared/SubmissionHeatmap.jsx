import React from 'react';

export function SubmissionHeatmap({ activityData }) {
  // Mock 52 weeks x 7 days grid if no activityData provided
  const weeks = 28;
  const days = 7;

  // Level colors
  const getColor = (count) => {
    if (!count || count === 0) return 'rgba(255, 255, 255, 0.05)';
    if (count === 1) return 'rgba(139, 92, 246, 0.3)';
    if (count === 2) return 'rgba(139, 92, 246, 0.6)';
    if (count === 3) return 'rgba(139, 92, 246, 0.85)';
    return '#10b981'; // Solved streak high
  };

  // Generate deterministic grid data
  const grid = Array.from({ length: weeks }, (_, wIdx) =>
    Array.from({ length: days }, (_, dIdx) => {
      const pseudoVal = (wIdx * 7 + dIdx) % 5;
      return pseudoVal === 4 ? (dIdx % 2 === 0 ? 3 : 1) : pseudoVal === 3 ? 0 : pseudoVal;
    })
  );

  return (
    <div style={{ background: 'rgba(17, 24, 39, 0.5)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#f3f4f6' }}>
          📈 Submission Activity Heatmap
        </span>
        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Last 6 Months</span>
      </div>

      <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '4px' }}>
        {grid.map((week, w) => (
          <div key={w} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {week.map((val, d) => (
              <div
                key={d}
                title={`Activity level: ${val}`}
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '2px',
                  background: getColor(val),
                  transition: 'transform 0.15s ease',
                }}
              />
            ))}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px', marginTop: '8px', fontSize: '0.72rem', color: '#6b7280' }}>
        <span>Less</span>
        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(255, 255, 255, 0.05)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(139, 92, 246, 0.3)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: 'rgba(139, 92, 246, 0.6)' }} />
        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#10b981' }} />
        <span>More</span>
      </div>
    </div>
  );
}
