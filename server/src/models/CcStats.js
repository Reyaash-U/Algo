export function toCcStatsDTO(row) {
  return {
    handle: row.handle,
    rating: row.rating,
    highestRating: row.highestRating,
    stars: row.stars,
    division: row.division,
    totalSolved: row.totalSolved,
    contestHistory: row.contestHistory,
    recent: row.recent,
    profile: row.profile,
    syncedAt: row.syncedAt.toISOString(),
  };
}
