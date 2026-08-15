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

export function NoteDetailPage() {
  const { id } = useParams();
  const [copied, setCopied] = useState(false);
  const toast = useToast();

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
    <div className="av-note-detail" style={{ maxWidth: '840px', margin: '0 auto' }}>
      <div style={{ marginBottom: '16px' }}>
        <Link to="/vault" style={{ color: 'var(--text-muted)', textDecoration: 'none', fontSize: '0.85rem' }}>
          ← Back to Vault
        </Link>
      </div>

      <div className="av-card" style={{ padding: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ margin: '0 0 12px', fontSize: '1.6rem', color: '#fff' }}>{note.title}</h1>
            <PatternTags tags={note.patternTags} />
          </div>
          <ComplexityPills
            timeComplexity={note.timeComplexity ?? 'O(N)'}
            spaceComplexity={note.spaceComplexity ?? 'O(N)'}
          />
        </div>

        {/* Code Snippet Box with Floating Copy Button */}
        <div className="av-code-container">
          <div className="av-code-header">
            <span>Solution Snippet (Python 3)</span>
            <button className="av-copy-btn" onClick={handleCopyCode}>
              {copied ? '✓ Copied!' : '📋 Copy Code'}
            </button>
          </div>
          <pre style={{ margin: 0, padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '0.88rem', color: '#a7f3d0', overflowX: 'auto' }}>
            <code>{note.codeSnippet ?? `// Solution snippet placeholder`}</code>
          </pre>
        </div>

        <div style={{ marginTop: '24px' }}>
          <MarkdownRenderer content={note.contentMarkdown} />
        </div>
      </div>
    </div>
  );
}
