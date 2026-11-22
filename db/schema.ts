export const createCommentsTableSql = `
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY NOT NULL,
    book_id TEXT NOT NULL,
    name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 40),
    body TEXT NOT NULL CHECK (length(body) BETWEEN 1 AND 700),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0, 1)),
    date_label TEXT NOT NULL,
    created_at TEXT NOT NULL,
    legacy_id TEXT
  )
`;

export const createCommentsCreatedAtIndexSql = `
  CREATE INDEX IF NOT EXISTS idx_comments_created_at
  ON comments(created_at DESC, id DESC)
`;

export const createCommentsLegacyIdIndexSql = `
  CREATE UNIQUE INDEX IF NOT EXISTS idx_comments_legacy_id
  ON comments(legacy_id)
  WHERE legacy_id IS NOT NULL
`;
