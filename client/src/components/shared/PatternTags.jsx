import React from 'react';

export function PatternTags({ tags = [], onTagClick }) {
  if (!tags || tags.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 my-1.5">
      {tags.map((tag) => (
        <span
          key={tag}
          onClick={() => onTagClick && onTagClick(tag)}
          className="inline-block px-2.5 py-0.5 rounded-full bg-white/5 text-xs font-medium transition-all cursor-pointer border border-white/10 hover:bg-zinc-200 hover:text-black hover:border-zinc-200 dark:hover:bg-white dark:hover:text-black"
          style={{
            borderColor: 'var(--border-color)',
            color: 'var(--text-secondary)',
            background: 'var(--bg-secondary)',
          }}
        >
          #{tag}
        </span>
      ))}
    </div>
  );
}
