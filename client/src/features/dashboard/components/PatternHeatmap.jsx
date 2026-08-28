import React from 'react';
import { Puzzle } from 'lucide-react';

export function PatternHeatmap({ patternCounts, theme }) {
  if (!patternCounts || patternCounts.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No pattern data available yet.</div>;
  }

  // Find max count to normalize opacity
  const maxCount = Math.max(...patternCounts.map(p => p.count), 1);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Puzzle size={20} strokeWidth={2.5} style={{ color: '#8b5cf6' }} /> Pattern Distribution
      </h3>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
        gap: '12px'
      }}>
        {patternCounts.map(pattern => {
          const bgColor = theme === 'light' ? '#ffffff' : '#1e1e1e';
          const textColor = theme === 'light' ? '#000000' : '#ffffff';
          const secondaryTextColor = theme === 'light' ? 'rgba(0, 0, 0, 0.6)' : 'rgba(255, 255, 255, 0.6)';

          // We can use the intensity for a border or a subtle shadow instead to keep the "heatmap" aspect
          const intensity = 0.1 + (0.9 * (pattern.count / maxCount));
          const borderColor = theme === 'light' 
            ? `rgba(0, 0, 0, ${Math.max(0.1, intensity)})` 
            : `rgba(255, 255, 255, ${Math.max(0.1, intensity)})`;

          return (
            <div
              key={pattern.tag}
              style={{
                backgroundColor: bgColor,
                color: textColor,
                padding: '16px',
                borderRadius: '8px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                border: `2px solid ${borderColor}`,
                minHeight: '70px',
                transition: 'transform 0.1s ease',
                cursor: 'default'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <div style={{ fontWeight: 700, fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {pattern.tag.replace(/-/g, ' ')}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 900, marginTop: '8px' }}>
                {pattern.count} <span style={{ fontSize: '0.8rem', fontWeight: 500, color: secondaryTextColor }}>solved</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
