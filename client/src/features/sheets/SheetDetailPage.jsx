import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';

export function SheetDetailPage() {
  const { id } = useParams();
  const { data: sheet, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sheet(id),
    queryFn: () => api.sheets.get(id),
  });

  if (isLoading) return <p>Loading sheet…</p>;
  if (isError) return <p className="av-form-error">Failed to load sheet: {error.message}</p>;

  return (
    <div className="av-sheet-detail">
      <h1>{sheet.title}</h1>
      <p>{sheet.progressPct}% complete</p>
      <ul>
        {sheet.items.map((item) => (
          <li key={item.itemId}>{item.title} — {item.status}</li>
        ))}
      </ul>
      {/* TODO(Frontend Dev): ProgressBar, item status toggles via
          api.sheets.updateItem, CountdownBanner, ForkButton */}
    </div>
  );
}
