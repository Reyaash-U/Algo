import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import {
  ClipboardList,
  GitFork,
  ArrowRight,
  X,
  Sparkles,
  AlertCircle,
} from 'lucide-react';

const PRESET_GITHUB_SHEETS = [
  {
    name: 'NeetCode 150',
    description: '150 essential LeetCode coding interview questions categorized by algorithmic pattern.',
    url: 'https://github.com/neetcode-gh/leetcode',
  },
  {
    name: 'Blind 75',
    description: 'The standard 75 must-do interview questions covering all major core patterns.',
    url: 'https://github.com/kamyu104/LeetCode-Solutions',
  },
  {
    name: 'Striver SDE Sheet',
    description: 'Curated 180 DSA questions for top product companies interview preparation.',
    url: 'https://github.com/striver/sde-sheet',
  },
];

export function SheetsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const queryClient = useQueryClient();

  const [isForkModalOpen, setIsForkModalOpen] = useState(false);
  const [githubUrl, setGithubUrl] = useState('');
  const [urlError, setUrlError] = useState('');

  // User's own sheets
  const { data: mySheetsData, isLoading: isLoadingMySheets, isError, error } = useQuery({
    queryKey: queryKeys.sheets,
    queryFn: () => api.sheets.list(),
  });

  // Fork Sheet from GitHub Mutation
  const forkGithubMutation = useMutation({
    mutationFn: (url) => api.sheets.forkGithub({ url }),
    onSuccess: (newSheet) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sheets });
      setIsForkModalOpen(false);
      setGithubUrl('');
      setUrlError('');
      toast.push('Sheet successfully forked from GitHub!', { type: 'success' });
      if (newSheet?.id) {
        navigate(`/sheets/${newSheet.id}`);
      }
    },
    onError: (err) => {
      const msg = err.message || 'Failed to fork sheet from GitHub';
      setUrlError(msg);
      toast.push(msg, { type: 'error' });
    },
  });

  const handleForkSubmit = (e) => {
    e.preventDefault();
    const trimmed = githubUrl.trim();
    if (!trimmed) {
      setUrlError('Please enter a GitHub repository or file link.');
      return;
    }
    if (!trimmed.includes('github.com') && !trimmed.includes('githubusercontent.com')) {
      setUrlError('URL must be a valid GitHub link (e.g. https://github.com/owner/repo)');
      return;
    }
    setUrlError('');
    forkGithubMutation.mutate(trimmed);
  };

  if (isLoadingMySheets) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (isError) return <p className="av-form-error">Failed to load sheets: {error.message}</p>;

  const mySheets = mySheetsData?.items ?? [];
  const displaySheets = mySheets;

  return (
    <div className="av-sheets-page" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* Header with Top Right "Fork Sheet" Button */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.03em', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <ClipboardList size={32} strokeWidth={2.5} style={{ color: 'var(--text-primary)' }} /> Problem Trackers & Sheets
          </h1>
          <p className="text-mono-desc" style={{ margin: '6px 0 0', fontSize: '0.95rem' }}>
            Track progress across popular DSA sheets, fork community collections, or import sheets from GitHub.
          </p>
        </div>

        {/* Top Right Action: Fork Sheet Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            id="forkSheetTopRightBtn"
            onClick={() => setIsForkModalOpen(true)}
            className="btn-mono-primary"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 22px',
              fontSize: '0.92rem',
              fontWeight: 800,
              borderRadius: '8px',
              cursor: 'pointer',
              boxShadow: '0 2px 10px rgba(0,0,0,0.18)',
            }}
            title="Fork a sheet from a GitHub link"
          >
            <GitFork size={17} />
            <span>Fork Sheet</span>
          </button>
        </div>
      </div>

      {/* Grid of Sheets (Each sheet card has NO fork button, only Open Tracker) */}
      {displaySheets.length === 0 ? (
        <EmptyState title="No sheets yet" description="Fork a sheet from GitHub or explore community sheets to start tracking." />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '24px' }}>
          {displaySheets.map((s) => {
            const itemsList = s.items ?? [];
            const solved = itemsList.filter((i) => i.status === 'done' || i.status === 'solved').length || s.solved || 0;
            const inProgress = itemsList.filter((i) => i.status === 'in_progress' || i.status === 'in-progress').length || s.inProgress || 0;
            const total = itemsList.length || s.total || (solved + inProgress + 1);

            const solvedPct = total > 0 ? Math.round((solved / total) * 100) : 0;
            const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
            const todoPct = total > 0 ? Math.max(0, 100 - solvedPct - inProgressPct) : 100;

            return (
              <div key={s.id} className="mono-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: '260px', padding: '24px' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                    <Link
                      to={`/sheets/${s.id}`}
                      style={{ textDecoration: 'none', color: 'var(--text-primary)', fontSize: '1.2rem', fontWeight: 800, lineHeight: 1.35 }}
                    >
                      {s.title}
                    </Link>

                    {s.forkCount !== undefined && s.forkCount > 0 && (
                      <span
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          color: 'var(--text-secondary)',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                          flexShrink: 0,
                        }}
                        title={`${s.forkCount} forks`}
                      >
                        <GitFork size={13} /> {s.forkCount}
                      </span>
                    )}
                  </div>

                  <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', margin: '10px 0 20px', lineHeight: 1.55 }}>
                    {s.description || 'Custom curated collection of practice problems and algorithmic patterns.'}
                  </p>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.82rem', marginBottom: '8px' }}>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 750 }}>{solvedPct}% Completed</span>
                    <span style={{ color: 'var(--text-secondary)' }}>
                      <strong style={{ color: '#10b981' }}>{solved}</strong> done • <strong style={{ color: '#f59e0b' }}>{inProgress}</strong> active • {total} total
                    </span>
                  </div>

                  {/* Multi-segment Progress Bar */}
                  <div className="progress-mono" style={{ height: '8px', marginBottom: '20px' }}>
                    <div className="progress-mono-solved" style={{ width: `${solvedPct}%` }} title={`Done: ${solvedPct}%`} />
                    <div className="progress-mono-progress" style={{ width: `${inProgressPct}%` }} title={`In Progress: ${inProgressPct}%`} />
                    <div className="progress-mono-todo" style={{ width: `${todoPct}%` }} title={`Todo: ${todoPct}%`} />
                  </div>

                  {/* Card Action: Only Open Tracker (Fork button removed from each card) */}
                  <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
                    <Link
                      to={`/sheets/${s.id}`}
                      className="btn-mono-primary"
                      style={{
                        padding: '7px 18px',
                        fontSize: '0.82rem',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontWeight: 700,
                      }}
                    >
                      Open Tracker <ArrowRight size={14} />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: Fork Sheet from GitHub */}
      {isForkModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '16px',
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsForkModalOpen(false);
          }}
        >
          <div
            className="mono-card"
            style={{
              width: '100%',
              maxWidth: '560px',
              padding: '32px',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
              borderRadius: '14px',
              animation: 'fadeIn 0.2s ease',
            }}
          >
            {/* Close Button */}
            <button
              onClick={() => setIsForkModalOpen(false)}
              style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '6px',
              }}
            >
              <X size={20} />
            </button>

            {/* Modal Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <div
                style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-primary)',
                }}
              >
                <GitFork size={20} />
              </div>
              <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.45rem', fontWeight: 850 }}>
                Fork Sheet from GitHub
              </h2>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 20px', lineHeight: 1.55 }}>
              Paste a link to any GitHub repository or markdown file containing DSA problems. AlgoVault will extract all problems, topics, and difficulties into your Sheets page.
            </p>

            {/* Input Form */}
            <form onSubmit={handleForkSubmit}>
              <div style={{ marginBottom: '18px' }}>
                <label
                  htmlFor="githubSheetUrlInput"
                  style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}
                >
                  GitHub Link
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="githubSheetUrlInput"
                    type="url"
                    className="av-input"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      if (urlError) setUrlError('');
                    }}
                    placeholder="https://github.com/username/dsa-sheet"
                    style={{
                      width: '100%',
                      padding: '11px 14px',
                      fontSize: '0.92rem',
                      borderRadius: '8px',
                      border: urlError ? '1px solid #f43f5e' : undefined,
                    }}
                    required
                    autoFocus
                  />
                </div>
                {urlError ? (
                  <p style={{ margin: '6px 0 0', fontSize: '0.8rem', color: '#f43f5e', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <AlertCircle size={14} /> {urlError}
                  </p>
                ) : (
                  <p style={{ margin: '6px 0 0', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                    Accepts GitHub repositories (e.g. <code>github.com/neetcode-gh/leetcode</code>) or markdown links.
                  </p>
                )}
              </div>

              {/* Quick Presets */}
              <div style={{ marginBottom: '24px' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'block', marginBottom: '8px' }}>
                  Popular Community Presets
                </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {PRESET_GITHUB_SHEETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => {
                        setGithubUrl(preset.url);
                        setUrlError('');
                      }}
                      className="btn-mono-secondary"
                      style={{
                        padding: '6px 12px',
                        fontSize: '0.8rem',
                        fontWeight: 650,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        borderRadius: '6px',
                      }}
                    >
                      <Sparkles size={13} style={{ color: '#38bdf8' }} /> {preset.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setIsForkModalOpen(false)}
                  className="btn-mono-secondary"
                  style={{ padding: '9px 18px', fontSize: '0.88rem', fontWeight: 650 }}
                >
                  Cancel
                </button>
                <button
                  id="confirmForkGithubBtn"
                  type="submit"
                  disabled={forkGithubMutation.isPending}
                  className="btn-mono-primary"
                  style={{
                    padding: '9px 22px',
                    fontSize: '0.88rem',
                    fontWeight: 750,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: forkGithubMutation.isPending ? 'not-allowed' : 'pointer',
                  }}
                >
                  <GitFork size={16} />
                  {forkGithubMutation.isPending ? 'Forking Sheet...' : 'Fork Sheet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
