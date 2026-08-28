import React from 'react';

export function Skeleton({ width = '100%', height = '20px', borderRadius = '6px', style = {} }) {
  return (
    <div
      className="av-skeleton"
      style={{
        width,
        height,
        borderRadius,
        ...style,
      }}
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="av-card flex flex-col gap-3 p-5">
      <Skeleton width="40%" height="24px" />
      <Skeleton width="80%" height="16px" />
      <div className="flex gap-2 mt-2">
        <Skeleton width="60px" height="20px" borderRadius="12px" />
        <Skeleton width="60px" height="20px" borderRadius="12px" />
      </div>
    </div>
  );
}
