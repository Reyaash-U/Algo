import React from 'react';

export function ComplexityPills({ timeComplexity, spaceComplexity }) {
  if (!timeComplexity && !spaceComplexity) return null;

  return (
    <div className="inline-flex gap-2 items-center">
      {timeComplexity && (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-medium bg-violet-500/15 text-violet-300 border border-violet-500/30"
          title="Time Complexity"
        >
          ⚡ Time: {timeComplexity}
        </span>
      )}
      {spaceComplexity && (
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-mono text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30"
          title="Space Complexity"
        >
          💾 Space: {spaceComplexity}
        </span>
      )}
    </div>
  );
}
