import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';
import { EmptyState } from '../../components/shared/EmptyState.jsx';

export function SheetsPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.sheets,
    queryFn: () => api.sheets.list(),
  });

  if (isLoading) return <p>Loading sheets…</p>;
  if (isError) return <p className="av-form-error">Failed to load sheets: {error.message}</p>;

  const sheets = data?.items ?? [];

  return (
    <div className="av-sheets-page">
      <h1>Company Sheets</h1>
      {sheets.length === 0 ? (
        <EmptyState title="No sheets yet" />
      ) : (
        <ul>
          {sheets.map((s) => (
            <li key={s.id}>
              <Link to={`/sheets/${s.id}`}>{s.title}</Link> — {s.progressPct}%
            </li>
          ))}
        </ul>
      )}
      {/* TODO(Frontend Dev): CountdownBanner, ForkButton — see README.md */}
    </div>
  );
}
