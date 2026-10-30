import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ExternalLink, RefreshCw, Unplug, Award, Trophy, Code2 } from 'lucide-react';
import { api } from '../../../api/apiClient.js';
import { useToast } from '../../../components/shared/Toast.jsx';
import { useTheme } from '../../../lib/themeContext.jsx';
import { SkeletonCard } from '../../../components/shared/Skeleton.jsx';

const LC_KEY = ['lc', 'stats'];
const DIFFICULTY = [
  { key: 'easy', label: 'Easy', color: '#22c55e' },
  { key: 'medium', label: 'Medium', color: '#f59e0b' },
  { key: 'hard', label: 'Hard', color: '#ef4444' },
];

const muted = { color: 'var(--text-secondary)' };
const labelStyle = { fontSize: '0.78rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', ...muted };

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

// Last ~53 weeks of the LeetCode submission calendar as a GitHub-style grid.
function ActivityGrid({ calendar, isLight }) {
  const { weeks, total, activeDays } = useMemo(() => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const start = new Date(today);
    start.setUTCDate(start.getUTCDate() - 52 * 7 - start.getUTCDay());
    const cols = [];
    let sum = 0;
    let active = 0;
    for (let d = new Date(start); d <= today; ) {
      const week = [];
      for (let i = 0; i < 7; i++) {
        const key = d.toISOString().slice(0, 10);
        const count = d > today ? null : calendar?.[key] ?? 0;
        if (count) {
          sum += count;
          active += 1;
        }
        week.push({ key, count });
        d = new Date(d.getTime() + 86400000);
      }
      cols.push(week);
    }
    return { weeks: cols, total: sum, activeDays: active };
  }, [calendar]);

  const shade = (n) => {
    if (n === null) return 'transparent';
    if (n === 0) return isLight ? '#ebedf0' : '#222';
    if (n <= 2) return '#0e4429';
    if (n <= 5) return '#006d32';
    if (n <= 9) return '#26a641';
    return '#5ee289';
  };

  return (
    <div>
      <div style={{ ...muted, fontSize: '0.85rem', marginBottom: '10px' }}>
        <strong style={{ color: 'var(--text-primary)' }}>{total}</strong> submissions in the past year · {activeDays} active days
      </div>
      <div style={{ display: 'flex', gap: '3px', overflowX: 'auto', paddingBottom: '6px' }}>
        {weeks.map((week) => (
          <div key={week[0].key} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
            {week.map((cell) => (
              <div
                key={cell.key}
                title={cell.count === null ? '' : `${cell.count} submission${cell.count === 1 ? '' : 's'} on ${cell.key}`}
                style={{ width: 11, height: 11, borderRadius: 2, background: shade(cell.count) }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function ConnectCard({ onConnect, pending }) {
  const [username, setUsername] = useState('');
  return (
    <div className="mono-card" style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Code2 size={22} /> Connect LeetCode
      </h2>
      <p className="text-mono-desc" style={{ margin: 0 }}>
        Enter your public LeetCode username to see your solved counts, contest rating, topics and activity here.
      </p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (username.trim()) onConnect(username.trim());
        }}
        style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}
      >
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="LeetCode username"
          autoComplete="off"
          style={{ flex: 1, minWidth: '200px', background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '10px 14px', borderRadius: '8px', outline: 'none' }}
        />
        <button type="submit" className="btn-mono-primary" disabled={pending || !username.trim()} style={{ padding: '10px 20px' }}>
          {pending ? 'Connecting…' : 'Connect'}
        </button>
      </form>
    </div>
  );
}

export function LeetCodeDashboard() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: LC_KEY,
    queryFn: () => api.lc.stats(),
  });

  const syncMutation = useMutation({
    mutationFn: (username) => api.lc.sync(username),
    onSuccess: (data) => {
      queryClient.setQueryData(LC_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.push('LeetCode stats synced!', { type: 'success' });
    },
    onError: (err) => toast.push(err.message || 'LeetCode sync failed', { type: 'error' }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.lc.disconnect(),
    onSuccess: () => {
      queryClient.setQueryData(LC_KEY, null);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.push('LeetCode disconnected', { type: 'success' });
    },
    onError: (err) => toast.push(err.message || 'Could not disconnect', { type: 'error' }),
  });

  if (isLoading) return <SkeletonCard />;
  if (isError) return <p className="av-form-error">Failed to load LeetCode stats: {error.message}</p>;
  if (!stats) return <ConnectCard onConnect={(u) => syncMutation.mutate(u)} pending={syncMutation.isPending} />;

  const { solved, totals, contest, contestHistory, topics, recent, badges, profile } = stats;
  const maxTopic = Math.max(1, ...topics.map((t) => t.solved));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Profile header */}
      <div className="mono-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {profile?.avatar && <img src={profile.avatar} alt="" width={56} height={56} style={{ borderRadius: '50%' }} />}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <a href={`https://leetcode.com/u/${stats.handle}/`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.25rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {stats.handle} <ExternalLink size={14} />
          </a>
          <div style={{ ...muted, fontSize: '0.85rem', marginTop: '2px' }}>
            {[profile?.realName, profile?.country].filter(Boolean).join(' · ')}
            {stats.ranking ? ` · Global rank #${stats.ranking.toLocaleString()}` : ''}
          </div>
          <div style={{ ...muted, fontSize: '0.75rem', marginTop: '2px' }}>Synced {timeAgo(stats.syncedAt)}</div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button type="button" className="btn-mono-secondary" disabled={syncMutation.isPending} onClick={() => syncMutation.mutate(stats.handle)} style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <RefreshCw size={14} className={syncMutation.isPending ? 'animate-spin' : ''} /> {syncMutation.isPending ? 'Syncing…' : 'Sync'}
          </button>
          <button
            type="button"
            className="btn-mono-secondary"
            disabled={disconnectMutation.isPending}
            onClick={() => window.confirm('Disconnect LeetCode? Your synced stats will be removed.') && disconnectMutation.mutate()}
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Unplug size={14} /> Disconnect
          </button>
        </div>
      </div>

      {/* Solved + contest summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <span style={labelStyle}>Problems solved</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>
            {solved.total} <span style={{ ...muted, fontSize: '1rem', fontWeight: 600 }}>/ {totals.total || '—'}</span>
          </div>
          {DIFFICULTY.map(({ key, label, color }) => {
            const pct = totals[key] ? Math.min(100, Math.round((solved[key] / totals[key]) * 100)) : 0;
            return (
              <div key={key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', marginBottom: '4px' }}>
                  <span style={{ color, fontWeight: 700 }}>{label}</span>
                  <span style={muted}>{solved[key]} / {totals[key] || '—'}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: isLight ? '#e5e7eb' : '#262626' }}>
                  <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: color }} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Trophy size={14} /> Contest rating</span>
          {contest ? (
            <>
              <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{contest.rating}</div>
              <div style={{ ...muted, fontSize: '0.85rem' }}>
                {contest.attended} contests · global rank #{contest.globalRanking.toLocaleString()}
                {contest.topPercentage ? ` · top ${contest.topPercentage}%` : ''}
                {contest.badge ? ` · ${contest.badge}` : ''}
              </div>
              {contestHistory.length > 1 && (
                <div style={{ height: 160 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={contestHistory.map((c) => ({ ...c, date: c.at.slice(0, 10) }))}>
                      <CartesianGrid stroke={isLight ? '#e5e7eb' : '#262626'} vertical={false} />
                      <XAxis dataKey="date" hide />
                      <YAxis domain={['dataMin - 50', 'dataMax + 50']} width={40} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                      <Tooltip
                        contentStyle={{ background: isLight ? '#fff' : '#111', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                        formatter={(v) => [v, 'Rating']}
                        labelFormatter={(_, p) => p?.[0]?.payload?.title ?? ''}
                      />
                      <Line type="monotone" dataKey="rating" stroke="#f59e0b" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </>
          ) : (
            <p className="text-mono-desc" style={{ margin: 0 }}>No contests attended yet.</p>
          )}
        </div>
      </div>

      {/* Activity */}
      <div className="mono-card">
        <span style={{ ...labelStyle, display: 'block', marginBottom: '12px' }}>Submission activity</span>
        <ActivityGrid calendar={stats.calendar} isLight={isLight} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        {/* Topics */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={labelStyle}>Top topics</span>
          {topics.length === 0 && <p className="text-mono-desc" style={{ margin: 0 }}>No solved problems yet.</p>}
          {topics.map((t) => (
            <div key={t.tag} style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.85rem' }}>
              <span style={{ width: '38%', color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.tag}</span>
              <div style={{ flex: 1, height: 6, borderRadius: 3, background: isLight ? '#e5e7eb' : '#262626' }}>
                <div style={{ width: `${(t.solved / maxTopic) * 100}%`, height: '100%', borderRadius: 3, background: '#38bdf8' }} />
              </div>
              <span style={{ ...muted, width: 32, textAlign: 'right' }}>{t.solved}</span>
            </div>
          ))}
        </div>

        {/* Recent accepted */}
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={labelStyle}>Recent accepted</span>
          {recent.length === 0 && <p className="text-mono-desc" style={{ margin: 0 }}>No recent accepted submissions.</p>}
          {recent.map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noreferrer" style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.88rem', padding: '6px 0', borderBottom: '1px solid var(--border-color)' }}>
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.title}</span>
              <span style={{ ...muted, flexShrink: 0 }}>{timeAgo(s.at)}</span>
            </a>
          ))}
        </div>
      </div>

      {badges.length > 0 && (
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Award size={14} /> Badges</span>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            {badges.map((b) => (
              <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                {b.icon && <img src={b.icon} alt="" width={32} height={32} />} {b.name}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
