import React from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Target } from 'lucide-react';

export function ConfidenceRadar({ patternCounts, theme }) {
  if (!patternCounts || patternCounts.length === 0) {
    return <div style={{ color: 'var(--text-secondary)' }}>No confidence data available yet.</div>;
  }

  const data = patternCounts.map(p => ({
    subject: p.tag.replace(/-/g, ' ').toUpperCase(),
    A: p.avgConfidence,
    fullMark: 5,
  }));

  const strokeColor = theme === 'light' ? '#000000' : '#ffffff';
  const fillColor = theme === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.2)';
  const gridColor = theme === 'light' ? '#e0e0e0' : '#333333';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', minHeight: '300px' }}>
      <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Target size={20} strokeWidth={2.5} style={{ color: '#ef4444' }} /> Confidence Radar
      </h3>
      <div style={{ flex: 1, width: '100%', minHeight: '250px' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="80%" data={data}>
            <PolarGrid stroke={gridColor} />
            <PolarAngleAxis dataKey="subject" tick={{ fill: 'var(--text-secondary)', fontSize: 12, fontWeight: 600 }} />
            <PolarRadiusAxis angle={30} domain={[0, 5]} tick={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)', borderRadius: '6px' }}
              itemStyle={{ color: 'var(--text-primary)', fontWeight: 700 }}
              formatter={(value) => [value.toFixed(1) + ' / 5', 'Confidence']}
            />
            <Radar name="Confidence" dataKey="A" stroke={strokeColor} fill={fillColor} fillOpacity={0.6} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
