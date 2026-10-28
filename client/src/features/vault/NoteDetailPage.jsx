import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { MarkdownRenderer } from '../../components/shared/MarkdownRenderer.jsx';
import { ComplexityPills } from '../../components/shared/ComplexityPills.jsx';
import { PatternTags } from '../../components/shared/PatternTags.jsx';
import { SkeletonCard } from '../../components/shared/Skeleton.jsx';
import { useToast } from '../../components/shared/Toast.jsx';
import { useTheme } from '../../lib/themeContext.jsx';
import {
  Clipboard,
  Pencil,
  Lock,
  Globe,
  Link as LinkIcon,
  Code2,
  Check,
  Zap,
  ArrowRight,
} from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-clike';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-javascript';
import 'prismjs/components/prism-typescript';
import 'prismjs/components/prism-go';
import 'prismjs/components/prism-rust';
import 'prismjs/themes/prism-tomorrow.css';

const LANGUAGE_LABELS = {
  python: 'Python 3',
  java: 'Java',
  cpp: 'C++',
  c: 'C',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  go: 'Go',
  rust: 'Rust',
};

const getApproachBadge = (approach, title = '') => {
  const norm = (approach || title || '').toLowerCase();
  if (norm.includes('brute')) {
    return { label: 'Brute Force', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.12)', border: 'rgba(239, 68, 68, 0.3)' };
  }
  if (norm.includes('better')) {
    return { label: 'Better', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.12)', border: 'rgba(245, 158, 11, 0.3)' };
  }
  if (norm.includes('optim')) {
    return { label: 'Optimal', color: '#10b981', bg: 'rgba(16, 185, 129, 0.12)', border: 'rgba(16, 185, 129, 0.3)' };
  }
  return { label: title || 'Custom', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.12)', border: 'rgba(139, 92, 246, 0.3)' };
};

export function NoteDetailPage() {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);
  const [activeSolutionIdx, setActiveSolutionIdx] = useState(0);
  const toast = useToast();
  const { theme } = useTheme();

  const { data: rawNote, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.note(id),
    queryFn: () => api.notes.get(id),
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: '860px', margin: '0 auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (isError && !rawNote) {
    return (
      <div style={{ maxWidth: '860px', margin: '40px auto', textAlign: 'center' }}>
        <p className="av-form-error">Note not found: {error?.message || 'The requested note does not exist'}</p>
        <Link to="/vault" className="btn-mono-secondary" style={{ marginTop: '16px', display: 'inline-block' }}>
          ← Back to Vault
        </Link>
      </div>
    );
  }

  const note = rawNote ?? {
    id: id || 'note-1',
    title: 'Two Sum - Hash Map Optimal Solution',
    patternTags: ['Array', 'HashTable', 'TwoPointers'],
    codeBlocks: [
      {
        title: 'Brute Force',
        approach: 'brute_force',
        language: 'python',
        timeComplexity: 'O(N²)',
        spaceComplexity: 'O(1)',
        code: `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        n = len(nums)\n        for i in range(n):\n            for j in range(i + 1, n):\n                if nums[i] + nums[j] == target:\n                    return [i, j]\n        return []`,
      },
      {
        title: 'Optimal (Hash Map)',
        approach: 'optimal',
        language: 'python',
        timeComplexity: 'O(N)',
        spaceComplexity: 'O(N)',
        code: `class Solution:\n    def twoSum(self, nums: List[int], target: int) -> List[int]:\n        seen = {}\n        for i, num in enumerate(nums):\n            diff = target - num\n            if diff in seen:\n                return [seen[diff], i]\n            seen[num] = i\n        return []`,
      },
    ],
    contentMarkdown: `### 💡 Intuition & Approach\nWe can first examine the brute-force two-nested-loops approach, and then optimize using a single-pass hash map.\n\n### ⏱️ Complexity Analysis\n- **Brute Force:** Time $O(N^2)$, Space $O(1)$\n- **Optimal:** Time $O(N)$, Space $O(N)$`,
  };

  const codeBlocks = Array.isArray(note.codeBlocks) ? note.codeBlocks : [];
  const safeIdx = Math.min(activeSolutionIdx, Math.max(0, codeBlocks.length - 1));
  const activeBlock = codeBlocks[safeIdx] || {};
  const codeSnippet = activeBlock.code || '';
  const timeComplexity = activeBlock.timeComplexity || '';
  const spaceComplexity = activeBlock.spaceComplexity || '';
  const langKey = (activeBlock.language || 'python').toLowerCase();
  const langDisplay = LANGUAGE_LABELS[langKey] || activeBlock.language || 'Python';
  const badgeInfo = getApproachBadge(activeBlock.approach, activeBlock.title);

  const handleCopyCode = () => {
    if (!codeSnippet) return;
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    toast.push('Code snippet copied to clipboard!', { type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (code, lang) => {
    if (!code) return '';
    const key = (lang || 'python').toLowerCase();
    const grammar = Prism.languages[key] || Prism.languages.python || Prism.languages.clike;
    return Prism.highlight(code, grammar, key);
  };

  const renderVisibilityBadge = (vis) => {
    switch (vis) {
      case 'public':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 700, color: '#10b981', padding: '3px 8px', borderRadius: '6px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
            <Globe size={13} /> Public
          </span>
        );
      case 'link':
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 700, color: '#3b82f6', padding: '3px 8px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
            <LinkIcon size={13} /> Link-Only
          </span>
        );
      case 'private':
      default:
        return (
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', padding: '3px 8px', borderRadius: '6px', background: 'var(--border-color)', border: '1px solid var(--border-color)' }}>
            <Lock size={13} /> Private
          </span>
        );
    }
  };

  const isLight = theme === 'light';

  return (
    <div className="av-note-detail" style={{ maxWidth: '860px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link to="/vault" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ← Back to Vault
        </Link>
      </div>

      <div className="mono-card" style={{ padding: '32px' }}>
        {/* Title & Metadata Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <h1 className="text-mono-title" style={{ margin: 0, fontSize: '1.9rem', fontWeight: 850, letterSpacing: '-0.02em' }}>{note.title}</h1>
              {renderVisibilityBadge(note.visibility)}
            </div>
            <PatternTags tags={note.patternTags} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <Link to={`/note/${note.id}/edit`} className="btn-mono-secondary" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
              <Pencil size={14} /> Edit Note
            </Link>
          </div>
        </div>

        {/* ── Multiple Solutions Section ──────────────────────────────── */}
        {codeBlocks.length > 0 && (
          <div
            style={{
              marginTop: '24px',
              borderRadius: '12px',
              border: '1px solid var(--border-color)',
              background: isLight ? '#f9fafb' : '#0b0b0e',
              overflow: 'hidden',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            }}
          >
            {/* Header / Tabs Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '10px 16px',
                borderBottom: '1px solid var(--border-color)',
                backgroundColor: isLight ? '#f3f4f6' : '#111116',
                flexWrap: 'wrap',
                gap: '10px',
              }}
            >
              {/* Solution Tabs */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', maxWidth: '100%', padding: '2px 0' }}>
                <span style={{ fontSize: '0.76rem', fontWeight: 700, color: 'var(--text-secondary)', marginRight: '6px', textTransform: 'uppercase', letterSpacing: '0.04em', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Code2 size={14} /> Solutions ({codeBlocks.length}):
                </span>
                {codeBlocks.map((block, idx) => {
                  const bBadge = getApproachBadge(block.approach, block.title);
                  const isSelected = idx === safeIdx;
                  const bLang = LANGUAGE_LABELS[block.language?.toLowerCase()] || block.language || 'Code';

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveSolutionIdx(idx)}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '8px',
                        border: isSelected
                          ? `1.5px solid ${bBadge.color}`
                          : `1px solid ${isLight ? '#e5e7eb' : '#27272a'}`,
                        background: isSelected
                          ? (isLight ? '#ffffff' : '#1c1c24')
                          : (isLight ? 'rgba(255,255,255,0.6)' : 'transparent'),
                        color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                        fontSize: '0.8rem',
                        fontWeight: isSelected ? 700 : 500,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        whiteSpace: 'nowrap',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                      }}
                    >
                      <span
                        style={{
                          width: '7px',
                          height: '7px',
                          borderRadius: '50%',
                          backgroundColor: bBadge.color,
                          display: 'inline-block',
                        }}
                      />
                      <span>{block.title || bBadge.label}</span>
                      <span
                        style={{
                          fontSize: '0.7rem',
                          padding: '1px 5px',
                          borderRadius: '4px',
                          backgroundColor: isLight ? '#f3f4f6' : '#27272f',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {bLang}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Copy Code button */}
              <button
                type="button"
                className="btn-mono-secondary"
                onClick={handleCopyCode}
                style={{
                  padding: '5px 12px',
                  fontSize: '0.78rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  borderRadius: '6px',
                }}
              >
                {copied ? <Check size={13} style={{ color: '#10b981' }} /> : <Clipboard size={13} />}
                {copied ? 'Copied!' : 'Copy Code'}
              </button>
            </div>

            {/* Active Solution Sub-Bar: Title & Complexity details */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 20px',
                borderBottom: '1px solid var(--border-color)',
                fontSize: '0.82rem',
                backgroundColor: isLight ? '#ffffff' : '#0e0e12',
                flexWrap: 'wrap',
                gap: '12px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                <span
                  style={{
                    fontSize: '0.75rem',
                    fontWeight: 750,
                    color: badgeInfo.color,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    backgroundColor: badgeInfo.bg,
                    border: `1px solid ${badgeInfo.border}`,
                  }}
                >
                  {badgeInfo.label}
                </span>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                  {activeBlock.title || 'Solution'}
                </span>
                <span
                  style={{
                    fontSize: '0.74rem',
                    color: 'var(--text-secondary)',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: isLight ? '#f3f4f6' : '#1c1c22',
                  }}
                >
                  Language: <strong>{langDisplay}</strong>
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ComplexityPills
                  timeComplexity={timeComplexity}
                  spaceComplexity={spaceComplexity}
                />
              </div>
            </div>

            {/* Code Pre Block */}
            <pre
              style={{
                margin: 0,
                padding: '20px',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.88rem',
                color: isLight ? '#09090b' : '#f8f8f2',
                backgroundColor: isLight ? '#fbfbfe' : '#050507',
                overflowX: 'auto',
                lineHeight: 1.55,
              }}
            >
              <code
                className={`language-${langKey}`}
                dangerouslySetInnerHTML={{ __html: highlightCode(codeSnippet, langKey) }}
              />
            </pre>

            {/* Multi-Solution Progression Summary bar if >= 2 solutions */}
            {codeBlocks.length >= 2 && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderTop: '1px solid var(--border-color)',
                  backgroundColor: isLight ? '#f9fafb' : '#09090c',
                  fontSize: '0.75rem',
                  color: 'var(--text-secondary)',
                  overflowX: 'auto',
                }}
              >
                <span style={{ fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Zap size={13} style={{ color: '#eab308' }} /> Complexity Progression:
                </span>
                {codeBlocks.map((b, bIdx) => {
                  const bBadge = getApproachBadge(b.approach, b.title);
                  return (
                    <span key={bIdx} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: bBadge.color, fontWeight: 650 }}>{b.title || bBadge.label}</span>
                      {b.timeComplexity && <span>({b.timeComplexity})</span>}
                      {bIdx < codeBlocks.length - 1 && (
                        <ArrowRight size={11} style={{ margin: '0 2px', color: 'var(--text-secondary)' }} />
                      )}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Markdown Content (Intuition & Approach) */}
        <div style={{ marginTop: '32px', color: 'var(--text-primary)' }}>
          <MarkdownRenderer content={note.contentMarkdown} />
        </div>
      </div>
    </div>
  );
}
