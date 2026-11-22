import {
  createCommentsCreatedAtIndexSql,
  createCommentsLegacyIdIndexSql,
  createCommentsTableSql,
} from './schema';

export type ReaderComment = {
  id: string;
  bookId: string;
  name: string;
  text: string;
  rating: number;
  spoiler: boolean;
  date: string;
};

export type NewReaderComment = Omit<ReaderComment, 'id' | 'date'> & {
  legacyId?: string;
  legacyDate?: string;
};

type CommentRow = {
  id: string;
  book_id: string;
  name: string;
  body: string;
  rating: number;
  spoiler: number;
  date_label: string;
};

let schemaReady: Promise<void> | undefined;

function mapComment(row: CommentRow): ReaderComment {
  return {
    id: row.id,
    bookId: row.book_id,
    name: row.name,
    text: row.body,
    rating: row.rating,
    spoiler: row.spoiler === 1,
    date: row.date_label,
  };
}

export function ensureCommentSchema(db: D1Database) {
  schemaReady ??= (async () => {
    const existingTable = await db
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name = 'comments'")
      .first<{ name: string }>();

    await db.batch([
      db.prepare(createCommentsTableSql),
      db.prepare(createCommentsCreatedAtIndexSql),
      db.prepare(createCommentsLegacyIdIndexSql),
    ]);

    if (!existingTable) await db.prepare('PRAGMA optimize').run();
  })().catch((error) => {
    schemaReady = undefined;
    throw error;
  });

  return schemaReady;
}

export async function listComments(db: D1Database): Promise<ReaderComment[]> {
  await ensureCommentSchema(db);
  const result = await db
    .prepare(`
      SELECT id, book_id, name, body, rating, spoiler, date_label
      FROM comments
      ORDER BY created_at DESC, id DESC
    `)
    .all<CommentRow>();

  return result.results.map(mapComment);
}

export async function createComment(
  db: D1Database,
  input: NewReaderComment,
): Promise<ReaderComment> {
  await ensureCommentSchema(db);

  if (input.legacyId) {
    const existing = await db
      .prepare(`
        SELECT id, book_id, name, body, rating, spoiler, date_label
        FROM comments
        WHERE legacy_id = ?
      `)
      .bind(input.legacyId)
      .first<CommentRow>();

    if (existing) return mapComment(existing);
  }

  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  const dateLabel = input.legacyDate?.trim() || new Intl.DateTimeFormat('he-IL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  await db
    .prepare(`
      INSERT INTO comments (
        id, book_id, name, body, rating, spoiler, date_label, created_at, legacy_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `)
    .bind(
      id,
      input.bookId,
      input.name,
      input.text,
      input.rating,
      input.spoiler ? 1 : 0,
      dateLabel,
      createdAt,
      input.legacyId ?? null,
    )
    .run();

  return {
    id,
    bookId: input.bookId,
    name: input.name,
    text: input.text,
    rating: input.rating,
    spoiler: input.spoiler,
    date: dateLabel,
  };
}
