// TODO(Frontend Dev): PublicSheets, PublicNotes (forkable) — see README.md.
// Waiting on backend to implement visibility filtering on GET /notes and
// GET /sheets (currently stubs return the caller's own mock data regardless
// of visibility param).
export function ExplorePage() {
  return (
    <div className="av-explore-page">
      <h1>Explore</h1>
      <p>Public sheets and notes will appear here.</p>
    </div>
  );
}
