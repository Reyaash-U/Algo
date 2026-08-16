import React from 'react';

export function ComplexityPills({ timeComplexity, spaceComplexity }) {
  if (!timeComplexity && !spaceComplexity) return null;

  return (
    <div className="inline-flex gap-2 items-center">
      {timeComplexity && (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-medium"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
          title="Time Complexity"
        >
          ⚡ Time: {timeComplexity}
        </span>
      )}
      {spaceComplexity && (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-medium"
          style={{
            background: 'var(--bg-secondary)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-color)',
          }}
          title="Space Complexity"
        >
          💾 Space: {spaceComplexity}
        </span>
      )}
    </div>
  );
}
