// Reusable empty-state block. Every list screen (notes, sheets, revision
// queue, search results) should use this instead of a bare "no data" string.
export function EmptyState({ title = 'Nothing here yet', description, action }) {
  return (
    <div className="av-empty-state">
      <p className="av-empty-state__title">{title}</p>
      {description && <p className="av-empty-state__desc">{description}</p>}
      {action}
    </div>
  );
}
