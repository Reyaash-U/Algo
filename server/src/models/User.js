// No Mongoose class anymore — Prisma queries happen in services via the
// `prisma` client (see config/db.js). This file now just maps a Prisma
// User row to the API DTO shape (never leak passwordHash to the client).
export function toUserDTO(row) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.displayName,
    role: row.role,
    cfHandle: row.cfHandle,
    avatarUrl: row.avatarUrl || null,
    bio: row.bio || '',
    createdAt: row.createdAt ? (row.createdAt.toISOString ? row.createdAt.toISOString() : row.createdAt) : null,
  };
}
