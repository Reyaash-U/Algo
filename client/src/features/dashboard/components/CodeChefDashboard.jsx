import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { ExternalLink, RefreshCw, Unplug, Trophy, ChefHat, Star } from 'lucide-react';
import { api } from '../../../api/apiClient.js';
import { useToast } from '../../../components/shared/Toast.jsx';
import { useTheme } from '../../../lib/themeContext.jsx';
import { SkeletonCard } from '../../../components/shared/Skeleton.jsx';

const CC_KEY = ['cc', 'stats'];
const STATUS_STYLE = {
  accepted: { color: '#22c55e', label: 'Accepted' },
  'wrong answer': { color: '#ef4444', label: 'Wrong answer' },
};

const STAR_COLORS = ['#666', '#666', '#1e7d22', '#3366cc', '#684273', '#ffbf00', '#ff7f00', '#d0011b'];

const muted = { color: 'var(--text-secondary)' };
const labelStyle = { fontSize: '0.78rem', fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.05em', ...muted };

function timeAgo(iso) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `${mins || 1}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return `${Math.round(mins / 1440)}d ago`;
}

function ConnectCard({ onConnect, pending }) {
  const [username, setUsername] = useState('');
  return (
    <div className="mono-card" style={{ maxWidth: '520px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.3rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '10px' }}>
        <ChefHat size={22} /> Connect CodeChef
      </h2>
      <p className="text-mono-desc" style={{ margin: 0 }}>
        Enter your public CodeChef username to see your rating, stars, contest history and problems solved here.
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
          placeholder="CodeChef username"
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

export function CodeChefDashboard() {
  const [acceptedOnly, setAcceptedOnly] = useState(false);
  const toast = useToast();
  const queryClient = useQueryClient();
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const { data: stats, isLoading, isError, error } = useQuery({
    queryKey: CC_KEY,
    queryFn: () => api.cc.stats(),
  });

  const syncMutation = useMutation({
    mutationFn: (username) => api.cc.sync(username),
    onSuccess: (data) => {
      queryClient.setQueryData(CC_KEY, data);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.push('CodeChef stats synced!', { type: 'success' });
    },
    onError: (err) => toast.push(err.message || 'CodeChef sync failed', { type: 'error' }),
  });

  const disconnectMutation = useMutation({
    mutationFn: () => api.cc.disconnect(),
    onSuccess: () => {
      queryClient.setQueryData(CC_KEY, null);
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.push('CodeChef disconnected', { type: 'success' });
    },
    onError: (err) => toast.push(err.message || 'Could not disconnect', { type: 'error' }),
  });

  if (isLoading) return <SkeletonCard />;
  if (isError) return <p className="av-form-error">Failed to load CodeChef stats: {error.message}</p>;
  if (!stats) return <ConnectCard onConnect={(u) => syncMutation.mutate(u)} pending={syncMutation.isPending} />;

  const { profile, contestHistory } = stats;
  const starColor = STAR_COLORS[Math.min(stats.stars, STAR_COLORS.length - 1)];
  const recent = [...contestHistory].reverse().slice(0, 10);
  const submissions = (stats.recent ?? []).filter((s) => !acceptedOnly || s.status === 'accepted');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Profile header */}
      <div className="mono-card" style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
        {profile?.avatar && <img src={profile.avatar} alt="" width={56} height={56} style={{ borderRadius: '50%', objectFit: 'cover' }} />}
        <div style={{ flex: 1, minWidth: '200px' }}>
          <a href={`https://www.codechef.com/users/${stats.handle}`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', fontWeight: 800, fontSize: '1.25rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
            {stats.handle} <ExternalLink size={14} />
          </a>
          <div style={{ ...muted, fontSize: '0.85rem', marginTop: '2px' }}>
            {[profile?.name, profile?.country].filter(Boolean).join(' · ')}
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
            onClick={() => window.confirm('Disconnect CodeChef? Your synced stats will be removed.') && disconnectMutation.mutate()}
            style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
          >
            <Unplug size={14} /> Disconnect
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '24px' }}>
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: '6px' }}><Trophy size={14} /> Rating</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: stats.rating ? starColor : 'var(--text-primary)' }}>
            {stats.rating ?? 'Unrated'}
          </div>
          {stats.stars > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2px', color: starColor }} title={`${stats.stars} star`}>
              {Array.from({ length: stats.stars }, (_, i) => <Star key={i} size={14} fill="currentColor" />)}
              {stats.division && <span style={{ ...muted, fontSize: '0.8rem', marginLeft: '8px' }}>{stats.division}</span>}
            </div>
          )}
        </div>
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={labelStyle}>Highest rating</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.highestRating ?? '—'}</div>
          <div style={{ ...muted, fontSize: '0.85rem' }}>{contestHistory.length} rated contests</div>
        </div>
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={labelStyle}>Problems solved</span>
          <div style={{ fontSize: '2.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{stats.totalSolved}</div>
        </div>
      </div>

      {/* Recent submissions */}
      <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '6px' }}>
          <span style={labelStyle}>Recent submissions</span>
          <label style={{ ...muted, fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <input type="checkbox" checked={acceptedOnly} onChange={(e) => setAcceptedOnly(e.target.checked)} /> Accepted only
          </label>
        </div>
        {submissions.length === 0 && (
          <p className="text-mono-desc" style={{ margin: 0 }}>
            {(stats.recent ?? []).length === 0 ? 'No submissions found. Press Sync to refresh.' : 'No accepted submissions in the latest ones.'}
          </p>
        )}
        {submissions.map((s, i) => {
          const style = STATUS_STYLE[s.status] ?? { color: '#f59e0b', label: s.status };
          return (
            <div key={`${s.at}-${i}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', fontSize: '0.88rem', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
              <a href={s.url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', fontWeight: 650, textDecoration: 'none', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {s.problem}
              </a>
              <span style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
                <span style={{ color: style.color, fontWeight: 700 }}>{style.label}{s.score !== null && s.score !== undefined ? ` (${s.score})` : ''}</span>
                <span style={muted}>{s.language}</span>
                <span style={muted}>{s.at ? timeAgo(s.at) : ''}</span>
                {s.solutionUrl && (
                  <a href={s.solutionUrl} target="_blank" rel="noreferrer" style={muted} title="View solution"><ExternalLink size={13} /></a>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Rating history */}
      <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <span style={labelStyle}>Rating history</span>
        {contestHistory.length > 1 ? (
          <div style={{ height: 240 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={contestHistory.map((c) => ({ ...c, date: c.at.slice(0, 10) }))}>
                <CartesianGrid stroke={isLight ? '#e5e7eb' : '#262626'} vertical={false} />
                <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} minTickGap={40} />
                <YAxis domain={['dataMin - 50', 'dataMax + 50']} width={44} tick={{ fontSize: 11, fill: 'var(--text-secondary)' }} />
                <Tooltip
                  contentStyle={{ background: isLight ? '#fff' : '#111', border: '1px solid var(--border-color)', borderRadius: 8, fontSize: 12 }}
                  formatter={(v) => [v, 'Rating']}
                  labelFormatter={(_, p) => p?.[0]?.payload?.title ?? ''}
                />
                <Line type="monotone" dataKey="rating" stroke={starColor} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-mono-desc" style={{ margin: 0 }}>Not enough rated contests to draw a chart yet.</p>
        )}
      </div>

      {/* Recent contests */}
      {recent.length > 0 && (
        <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <span style={{ ...labelStyle, marginBottom: '6px' }}>Recent contests</span>
          {recent.map((c, i) => {
            const prev = recent[i + 1];
            const delta = prev ? c.rating - prev.rating : null;
            return (
              <a key={c.code} href={`https://www.codechef.com/${c.code}`} target="_blank" rel="noreferrer" style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', textDecoration: 'none', color: 'var(--text-primary)', fontSize: '0.88rem', padding: '8px 0', borderBottom: '1px solid var(--border-color)' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</span>
                <span style={{ ...muted, flexShrink: 0 }}>
                  {c.rank ? `rank ${c.rank} · ` : ''}
                  <strong style={{ color: 'var(--text-primary)' }}>{c.rating}</strong>
                  {delta !== null && (
                    <span style={{ color: delta >= 0 ? '#22c55e' : '#ef4444', marginLeft: 6 }}>{delta >= 0 ? '+' : ''}{delta}</span>
                  )}
                </span>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
