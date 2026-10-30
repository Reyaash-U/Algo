export function toLcStatsDTO(row) {
  return {
    handle: row.handle,
    ranking: row.ranking,
    solved: row.solved,
    totals: row.totals,
    contest: row.contest,
    contestHistory: row.contestHistory,
    topics: row.topics,
    calendar: row.calendar,
    recent: row.recent,
    badges: row.badges,
    profile: row.profile,
    syncedAt: row.syncedAt.toISOString(),
  };
}
