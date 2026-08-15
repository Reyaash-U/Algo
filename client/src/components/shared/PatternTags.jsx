import React from 'react';

export function PatternTags({ tags = [], onTagClick }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 my-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          onClick={() => onTagClick && onTagClick(tag)}
          className="inline-block px-2.5 py-0.5 rounded-full bg-white/5 text-gray-300 border border-white/10 text-xs font-medium hover:bg-violet-500/20 hover:text-violet-200 hover:border-violet-500/40 transition-all cursor-pointer"
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
