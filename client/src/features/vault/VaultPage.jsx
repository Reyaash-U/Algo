import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';

// REFERENCE PATTERN for every list screen in the app:
//   1. useQuery with a key from queryKeys
//   2. queryFn calls api.<feature>.list()  — same call whether mocked or real
//   3. handle loading / error / empty / data explicitly
// Copy this shape for SheetsPage, ExplorePage, etc.
export function VaultPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.notes(),
    queryFn: () => api.notes.list(),
  });

  if (isLoading) return <p>Loading notes…</p>;
  if (isError) return <p className="av-form-error">Failed to load notes: {error.message}</p>;

  const notes = data?.items ?? [];

  return (
    <div className="av-vault-page">
      <h1>Vault</h1>
      {/* TODO(Frontend Dev): NoteFilters, TagSidebar (spec §10) */}
      {notes.length === 0 ? (
        <EmptyState title="No notes yet" description="Paste a problem link to create your first note." />
      ) : (
        <ul className="av-note-list">
          {notes.map((n) => (
            <li key={n.id}>
              <Link to={`/note/${n.id}`}>{n.title}</Link>
              <span className="av-note-list__tags">{n.patternTags?.join(', ')}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
