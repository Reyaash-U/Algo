import React from 'react';

export function getCfRankInfo(rating = 0) {
  if (rating < 1200) return { title: 'Newbie', colorClass: 'text-gray-400' };
  if (rating < 1400) return { title: 'Pupil', colorClass: 'text-emerald-400' };
  if (rating < 1600) return { title: 'Specialist', colorClass: 'text-cyan-400' };
  if (rating < 1900) return { title: 'Expert', colorClass: 'text-blue-400' };
  if (rating < 2100) return { title: 'Candidate Master', colorClass: 'text-purple-400' };
  if (rating < 2400) return { title: 'Master', colorClass: 'text-amber-400' };
  return { title: 'Grandmaster', colorClass: 'text-rose-500' };
}

export function CodeforcesBadge({ handle, rating = 1450 }) {
  const rank = getCfRankInfo(rating);

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-semibold text-xs bg-white/5 border border-white/10 ${rank.colorClass}`}>
      <span>🏆 {handle}</span>
      <span className="text-[11px] opacity-80">({rank.title} • {rating})</span>
    </div>
  );
}
