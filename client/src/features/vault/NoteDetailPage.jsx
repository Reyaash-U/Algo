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

  // Provide mock fallback note for demo/scaffold
  const note = rawNote ?? {
    id: id || 'note-1',
    title: 'Two Sum - Hash Map Optimal Solution',
    patternTags: ['Array', 'HashTable', 'TwoPointers'],
    timeComplexity: 'O(N)',
    spaceComplexity: 'O(N)',
    codeSnippet: `class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen = {}
        for i, num in enumerate(nums):
            diff = target - num
            if diff in seen:
                return [seen[diff], i]
            seen[num] = i
        return []`,
    contentMarkdown: `### 💡 Intuition & Approach
We use a hash map to store the values we have seen so far along with their indices. 

For each number \`num\` in the array, we calculate its complement \`diff = target - num\`. If \`diff\` already exists in our hash map, we have found the target pair and can immediately return \`[seen[diff], current_index]\`.

### ⏱️ Complexity Analysis
- **Time Complexity:** $O(N)$ because we iterate through the list once and hash map lookups take average $O(1)$ time.
- **Space Complexity:** $O(N)$ to store up to $N$ elements in the hash map.`,
  };

  const handleCopyCode = () => {
    const code = note.codeSnippet || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    toast.push('Code snippet copied to clipboard!', { type: 'success' });
    setTimeout(() => setCopied(false), 2000);
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
            <h1 className="text-mono-title" style={{ margin: '0 0 12px', fontSize: '2rem', fontWeight: 850, letterSpacing: '-0.02em' }}>{note.title}</h1>
            <PatternTags tags={note.patternTags} />
          </div>
          <div style={{ filter: theme === 'light' ? 'invert(1) hue-rotate(180deg)' : 'none' }}>
            <ComplexityPills
              timeComplexity={note.timeComplexity ?? 'O(N)'}
              spaceComplexity={note.spaceComplexity ?? 'O(N)'}
            />
          </div>
        </div>

        {/* Code Snippet Box with Floating Copy Button */}
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
            <span style={{ fontWeight: 650 }}>Solution Snippet (Python 3)</span>
            <button className="btn-mono-secondary" onClick={handleCopyCode} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>
              {copied ? '✓ Copied!' : '📋 Copy Code'}
            </button>
          </div>
          <pre style={{ margin: 0, padding: '20px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: theme === 'light' ? '#09090b' : '#fafafa', overflowX: 'auto' }}>
            <code>{note.codeSnippet ?? `// Solution snippet placeholder`}</code>
          </pre>
        </div>

        <div style={{ marginTop: '32px', color: 'var(--text-primary)' }}>
          <MarkdownRenderer content={note.contentMarkdown} />
        </div>
      </div>
    </div>
  );
}
