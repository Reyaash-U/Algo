import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { MarkdownRenderer } from '../../components/shared/MarkdownRenderer.jsx';

export function NoteDetailPage() {
  const { id } = useParams();
  const { data: note, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.note(id),
    queryFn: () => api.notes.get(id),
  });

  if (isLoading) return <p>Loading note…</p>;
  if (isError) return <p className="av-form-error">Failed to load note: {error.message}</p>;

  return (
    <div className="av-note-detail">
      <h1>{note.title}</h1>
      <div className="av-note-detail__tags">{note.patternTags?.join(', ')}</div>
      <MarkdownRenderer content={note.contentMarkdown} />
      {/* TODO(Frontend Dev): NoteEditor (CodeMirror), CodeBlockTabs,
          ComplexityFields, ProblemLinkCard, VersionHistoryDrawer, ShareModal,
          debounced autosave via api.notes.update(id, patch) */}
    </div>
  );
}
