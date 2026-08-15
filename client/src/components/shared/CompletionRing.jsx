import React from 'react';

export function CompletionRing({ streak = 7, target = 10, current = 7, size = 120, strokeWidth = 10, monochrome = false, theme = 'dark' }) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const percentage = Math.min(100, Math.max(0, (current / target) * 100));
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const trackStroke = monochrome
    ? theme === 'light'
      ? '#e4e4e7'
      : '#27272a'
    : 'rgba(255, 255, 255, 0.08)';

  const ringStroke = monochrome
    ? theme === 'light'
      ? '#09090b'
      : '#ffffff'
    : 'url(#completion-gradient)';

  const textHeadingColor = monochrome
    ? theme === 'light'
      ? '#09090b'
      : '#ffffff'
    : '#fff';

  const textMutedColor = monochrome
    ? theme === 'light'
      ? '#71717a'
      : '#a1a1aa'
    : '#9ca3af';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div style={{ position: 'relative', width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {/* Background Track */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={trackStroke}
            strokeWidth={strokeWidth}
            fill="transparent"
          />
          {/* Progress Circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={ringStroke}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            fill="transparent"
            style={{ transition: 'stroke-dashoffset 0.8s ease-in-out' }}
          />
          {!monochrome && (
            <defs>
              <linearGradient id="completion-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#8b5cf6" />
                <stop offset="100%" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          )}
        </svg>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '1.5rem', fontWeight: 800, color: textHeadingColor }}>
            🔥 {streak}
          </span>
          <span style={{ fontSize: '0.68rem', color: textMutedColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Day Streak
          </span>
        </div>
      </div>
      <div style={{ fontSize: '0.85rem', color: textMutedColor }}>
        Target: <strong style={{ color: textHeadingColor }}>{current}/{target}</strong> problems
      </div>
    </div>
  );
}
