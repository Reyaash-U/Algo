import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';

export function AdminPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.adminTags,
    queryFn: () => api.admin.listTags(),
  });

  if (isLoading) return <p>Loading tags…</p>;
  if (isError) return <p className="av-form-error">Failed to load tags: {error.message}</p>;

  return (
    <div className="av-admin-page">
      <h1>Admin</h1>
      <h2>Tag Taxonomy</h2>
      <ul>{data.tags?.map((t) => <li key={t}>{t}</li>)}</ul>
      {/* TODO(Frontend Dev): TagManager (create/delete), ReportQueue */}
    </div>
  );
}
