import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/apiClient.js';
import { queryKeys } from '../../lib/queryClient.js';

export function AdminPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: queryKeys.adminTags,
    queryFn: () => api.admin.listTags(),
  });

  if (isLoading) return <p className="text-mono-desc">Loading tags…</p>;
  if (isError) return <p className="av-form-error" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}>Failed to load tags: {error.message}</p>;

  return (
    <div className="av-admin-page" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      <h1 className="text-mono-title" style={{ margin: 0, fontSize: '2rem', fontWeight: 850 }}>Admin</h1>
      
      <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <h2 className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>Tag Taxonomy</h2>
        <ul style={{ margin: 0, paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '8px', color: 'var(--text-primary)' }}>
          {data.tags?.map((t) => (
            <li key={t} style={{ fontWeight: 500 }}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
