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
import { Clipboard, Pencil, Lock, Globe, Link as LinkIcon } from 'lucide-react';
import Prism from 'prismjs';
import 'prismjs/components/prism-python';
import 'prismjs/components/prism-java';
import 'prismjs/components/prism-c';
import 'prismjs/components/prism-cpp';

export function NoteDetailPage() {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  const { theme } = useTheme();

  const { data: rawNote, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.note(id),
    queryFn: () => api.notes.get(id),
  });

  if (isLoading) {
    return (
      <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        <SkeletonCard />
      </div>
    );
  }

  if (isError && !rawNote) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center' }}>
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
    codeBlocks: [{
      language: 'python',
      timeComplexity: 'O(N)',
      spaceComplexity: 'O(N)',
      code: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in seen:
                return [seen[diff], i]
            seen[num] = i
        return []`
    }],
    contentMarkdown: `### 💡 Intuition & Approach
We use a hash map to store the values we have seen so far along with their indices. 

For each number \`num\` in the array, we calculate its complement \`diff = target - num\`. If \`diff\` already exists in our hash map, we have found the target pair and can immediately return \`[seen[diff], current_index]\`.

### ⏱️ Complexity Analysis
- **Time Complexity:** $O(N)$ because we iterate through the list once and hash map lookups take average $O(1)$ time.
- **Space Complexity:** $O(N)$ to store up to $N$ elements in the hash map.`,
  };

  const firstBlock = note.codeBlocks?.[0] || {};
  const codeSnippet = firstBlock.code || '';
  const timeComplexity = firstBlock.timeComplexity || 'O(N)';
  const spaceComplexity = firstBlock.spaceComplexity || 'O(N)';

  const handleCopyCode = () => {
    if (!codeSnippet) return;
    navigator.clipboard.writeText(codeSnippet);
    setCopied(true);
    toast.push('Code snippet copied to clipboard!', { type: 'success' });
    setTimeout(() => setCopied(false), 2000);
  };

  const highlightCode = (code, lang) => {
    const safeLang = lang || 'python';
    const grammar = Prism.languages[safeLang] || Prism.languages.python;
    return Prism.highlight(code, grammar, safeLang);
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

  return (
    <div className="av-note-detail" style={{ maxWidth: '840px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ marginBottom: '8px' }}>
        <Link to="/vault" style={{ color: 'var(--text-secondary)', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          ← Back to Vault
        </Link>
      </div>

      <div className="mono-card" style={{ padding: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px', marginBottom: '24px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
              <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.02em' }}>{note.title}</h1>
              {renderVisibilityBadge(note.visibility)}
            </div>
            <PatternTags tags={note.patternTags} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
              <ComplexityPills
                timeComplexity={timeComplexity}
                spaceComplexity={spaceComplexity}
              />
            </div>
            <Link to={`/note/${note.id}/edit`} className="btn-mono-secondary" style={{ padding: '6px 12px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}>
              <Pencil size={14} /> Edit
            </Link>
          </div>
        </div>

        {/* Code Snippet Box with Floating Copy Button */}
        {codeSnippet && (
          <div style={{
            border: '1px solid var(--border-color)',
            borderRadius: '10px',
            background: theme === 'light' ? '#f4f4f5' : '#050505',
            overflow: 'hidden',
            marginTop: '28px'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 20px',
              borderBottom: '1px solid var(--border-color)',
              fontSize: '0.82rem',
              color: 'var(--text-secondary)'
            }}>
              <span style={{ fontWeight: 650 }}>Solution Snippet ({firstBlock.language || 'Python 3'})</span>
              <button className="btn-mono-secondary" onClick={handleCopyCode} style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {copied ? '✓ Copied!' : <><Clipboard size={14} /> Copy Code</>}
              </button>
            </div>
            <pre style={{ margin: 0, padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: theme === 'light' ? '#09090b' : '#fafafa', overflowX: 'auto' }}>
              <code 
                className={`language-${firstBlock.language || 'python'}`}
                dangerouslySetInnerHTML={{ __html: highlightCode(codeSnippet, firstBlock.language) }}
              />
            </pre>
          </div>
        )}

        <div style={{ marginTop: '32px', color: 'var(--text-primary)' }}>
          <MarkdownRenderer content={note.contentMarkdown} />
        </div>
      </div>
    </div>
  );
}
