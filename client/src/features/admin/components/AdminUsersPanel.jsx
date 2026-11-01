import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Users, Search, Flame, BookOpen, ChevronLeft, ChevronRight, X, Trophy, CheckCircle2, Mail } from 'lucide-react';
import { api } from '../../../api/apiClient.js';
import { useTheme } from '../../../lib/themeContext.jsx';

function timeAgo(iso) {
  if (!iso) return 'never';
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

const platformBadge = (label, text, color) => (
  <span style={{ padding: '2px 8px', borderRadius: '10px', fontSize: '0.72rem', fontWeight: 700, color, background: `${color}1a`, border: `1px solid ${color}40`, whiteSpace: 'nowrap' }}>
    {label}: {text}
  </span>
);

function UserDetailModal({ userId, onClose }) {
  const { theme } = useTheme();
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'users', userId],
    queryFn: () => api.admin.getUser(userId),
    enabled: !!userId,
  });

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100, display: 'flex', justifyContent: 'center', alignItems: 'flex-start', padding: '48px 16px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} className="mono-card" style={{ maxWidth: '720px', width: '100%', padding: '28px', display: 'flex', flexDirection: 'column', gap: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem' }}>User progress</h2>
          <button type="button" onClick={onClose} className="btn-mono-secondary" style={{ padding: '6px 10px' }}><X size={14} /></button>
        </div>
        {isLoading && <p className="text-mono-desc">Loading…</p>}
        {isError && <p className="av-form-error">Failed to load: {error?.message}</p>}
        {data && (
          <>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {data.user.avatarUrl && <img src={data.user.avatarUrl} alt="" width={48} height={48} style={{ borderRadius: '50%' }} />}
                <div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800 }}>{data.user.displayName}</div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Mail size={12} /> {data.user.email} {data.user.emailVerified && <CheckCircle2 size={12} style={{ color: '#22c55e' }} />}
                    {data.user.role === 'admin' && <span style={{ color: '#8b5cf6', fontWeight: 700 }}> · ADMIN</span>}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: 2 }}>
                    Joined {timeAgo(data.user.joinedAt)} · Last active {timeAgo(data.streak.lastActiveAt)}
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '12px' }}>
              {[['Notes', data.counts.notes], ['Sheets', data.counts.sheets], ['Revisions', data.counts.revisions], ['Due now', data.counts.dueNow], ['Streak', `${data.streak.current} / ${data.streak.longest}`]].map(([label, value]) => (
                <div key={label} style={{ padding: '12px', borderRadius: '8px', background: theme === 'light' ? '#f8fafc' : '#0b0b0e', border: '1px solid var(--border-color)' }}>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 700, textTransform: 'uppercase' }}>{label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900 }}>{value}</div>
                </div>
              ))}
            </div>
            {(data.platforms.codeforces || data.platforms.leetcode || data.platforms.codechef) && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {data.platforms.codeforces && platformBadge('Codeforces', `${data.platforms.codeforces.handle} (${data.platforms.codeforces.currentRating ?? '—'})`, '#1e88e5')}
                {data.platforms.leetcode && platformBadge('LeetCode', `${data.platforms.leetcode.handle} (${data.platforms.leetcode.solved?.total ?? '—'} solved)`, '#eab308')}
                {data.platforms.codechef && platformBadge('CodeChef', `${data.platforms.codechef.handle} (${data.platforms.codechef.rating ?? 'Unrated'})`, '#22c55e')}
              </div>
            )}
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Recent notes</div>
              {data.recentNotes.length === 0 && <p className="text-mono-desc" style={{ margin: 0 }}>No notes yet.</p>}
              {data.recentNotes.map((n) => (
                <div key={n.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{n.title}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>{timeAgo(n.updatedAt)}</span>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: 8 }}>Recent revisions</div>
              {data.recentReviews.length === 0 && <p className="text-mono-desc" style={{ margin: 0 }}>No reviews yet.</p>}
              {data.recentReviews.map((r) => (
                <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.88rem' }}>
                  <span style={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.noteTitle}</span>
                  <span style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', whiteSpace: 'nowrap' }}>interval {r.intervalDays}d · {timeAgo(r.reviewedAt)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function AdminUsersPanel() {
  const { theme } = useTheme();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState('recent');
  const [selectedId, setSelectedId] = useState(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['admin', 'users', { query, page, sort }],
    queryFn: () => api.admin.listUsers({ q: query, page, sort, limit: 25 }),
    keepPreviousData: true,
  });

  const items = data?.items ?? [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div className="mono-card" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center', padding: '14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '220px' }}>
          <Search size={16} style={{ color: 'var(--text-secondary)' }} />
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(1); }}
            placeholder="Search by name or email"
            style={{ flex: 1, background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '8px', fontSize: '0.9rem' }}
          />
        </div>
        <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(1); }} style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', background: 'transparent', color: 'var(--text-primary)', fontSize: '0.85rem' }}>
          <option value="recent">Most recently active</option>
          <option value="newest">Most recently joined</option>
          <option value="name">Name A–Z</option>
        </select>
        <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          {data ? `${data.total} user${data.total === 1 ? '' : 's'}` : '—'}
        </span>
      </div>

      {isLoading && <p className="text-mono-desc">Loading users…</p>}
      {isError && <p className="av-form-error">Failed to load: {error?.message}</p>}

      {items.length > 0 && (
        <div className="mono-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1.6fr) repeat(4, minmax(80px, 1fr)) 1.6fr', gap: '0', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', padding: '12px 14px', borderBottom: '1px solid var(--border-color)', background: theme === 'light' ? '#f8fafc' : '#0a0a0a' }}>
            <div>User</div><div>Notes</div><div>Sheets</div><div>Streak</div><div>7d subs</div><div>Platforms</div>
          </div>
          {items.map((u) => (
            <button
              type="button"
              key={u.id}
              onClick={() => setSelectedId(u.id)}
              style={{
                display: 'grid', gridTemplateColumns: 'minmax(220px, 1.6fr) repeat(4, minmax(80px, 1fr)) 1.6fr',
                padding: '14px', borderBottom: '1px solid var(--border-color)', background: 'transparent', border: 'none', textAlign: 'left', cursor: 'pointer', color: 'var(--text-primary)', fontSize: '0.88rem', alignItems: 'center', gap: 0,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = theme === 'light' ? '#f1f5f9' : '#111')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {u.displayName}
                  {u.role === 'admin' && <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#8b5cf6', background: 'rgba(139, 92, 246, 0.12)', padding: '1px 6px', borderRadius: '10px' }}>ADMIN</span>}
                  {!u.emailVerified && <span title="Email not verified" style={{ fontSize: '0.65rem', color: '#f59e0b' }}>unverified</span>}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  {u.email} · last active {timeAgo(u.lastActiveAt)}
                </div>
              </div>
              <div><BookOpen size={12} style={{ marginRight: 4, color: 'var(--text-secondary)' }} />{u.noteCount}</div>
              <div>{u.sheetCount}</div>
              <div><Flame size={12} style={{ marginRight: 4, color: '#f59e0b' }} />{u.streakCurrent} / {u.streakLongest}</div>
              <div>{u.submissions7d}</div>
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                {u.platforms.codeforces && <span style={{ fontSize: '0.68rem', color: '#1e88e5', fontWeight: 700 }}>CF {u.platforms.codeforces.currentRating ?? ''}</span>}
                {u.platforms.leetcode && <span style={{ fontSize: '0.68rem', color: '#eab308', fontWeight: 700 }}>LC {u.platforms.leetcode.solved?.total ?? ''}</span>}
                {u.platforms.codechef && <span style={{ fontSize: '0.68rem', color: '#22c55e', fontWeight: 700 }}>CC {u.platforms.codechef.rating ?? ''}</span>}
                {!u.platforms.codeforces && !u.platforms.leetcode && !u.platforms.codechef && <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>—</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      {data?.totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '12px' }}>
          <button type="button" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="btn-mono-secondary" style={{ padding: '6px 10px' }}><ChevronLeft size={14} /></button>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Page {page} of {data.totalPages}</span>
          <button type="button" onClick={() => setPage((p) => Math.min(data.totalPages, p + 1))} disabled={page >= data.totalPages} className="btn-mono-secondary" style={{ padding: '6px 10px' }}><ChevronRight size={14} /></button>
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <p className="text-mono-desc" style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
          {query ? 'No users match that search.' : 'No users yet.'}
        </p>
      )}

      {selectedId && <UserDetailModal userId={selectedId} onClose={() => setSelectedId(null)} />}
    </div>
  );
}
