// Reusable empty-state block. Every list screen (notes, sheets, revision
// queue, search results) should use this instead of a bare "no data" string.
export function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="mono-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '48px 32px', gap: '12px' }}>
      <p className="text-mono-title" style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800 }}>{title}</p>
      {description && <p className="text-mono-desc" style={{ margin: 0, fontSize: '0.92rem', maxWidth: '380px', lineHeight: 1.5 }}>{description}</p>}
      {action && <div style={{ marginTop: '12px' }}>{action}</div>}
    </div>
  );
}
