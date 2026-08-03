import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';

export function RevisePage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.revisionsDue,
    queryFn: () => api.revisions.due(),
  });

  if (isLoading) return <p>Loading revision queue…</p>;
  if (isError) return <p className="av-form-error">Failed to load queue: {error.message}</p>;

  const items = data?.items ?? [];

  return (
    <div className="av-revise-page">
      <h1>Revision Queue</h1>
      {items.length === 0 ? (
        <EmptyState title="Nothing due today" description="Come back tomorrow, or enroll more notes for revision." />
      ) : (
        <p>{items.length} problems due today.</p>
      )}
      {/* TODO(Frontend Dev): FlashcardView, RatingBar (Again/Hard/Good/Easy),
          SessionSummary — see README.md */}
    </div>
  );
}
