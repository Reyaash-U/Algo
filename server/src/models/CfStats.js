export function toCfStatsDTO(row) {
  return {
    handle: row.handle,
    currentRating: row.currentRating,
    maxRating: row.maxRating,
    ratingHistory: row.ratingHistory,
    solvedByTag: row.solvedByTag,
    syncedAt: row.syncedAt.toISOString(),
  };
}
