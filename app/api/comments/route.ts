import { env } from 'cloudflare:workers';
import { books } from '../../content';
import { createComment, listComments, type NewReaderComment } from '../../../db/comments';

const validBookIds = new Set(books.map((book) => book.id));

function database() {
  return (env as unknown as { DB: D1Database }).DB;
}

function json(body: unknown, status = 200) {
  return Response.json(body, {
    status,
    headers: { 'Cache-Control': 'no-store' },
  });
}

function parseComment(body: unknown): NewReaderComment | null {
  if (!body || typeof body !== 'object') return null;

  const value = body as Record<string, unknown>;
  const bookId = typeof value.bookId === 'string' ? value.bookId.trim() : '';
  const name = typeof value.name === 'string' ? value.name.trim() : '';
  const text = typeof value.text === 'string' ? value.text.trim() : '';
  const rating = typeof value.rating === 'number' ? value.rating : Number.NaN;
  const spoiler = value.spoiler === true;
  const legacyId = typeof value.legacyId === 'string' ? value.legacyId.trim().slice(0, 120) : undefined;
  const legacyDate = typeof value.legacyDate === 'string' ? value.legacyDate.trim().slice(0, 80) : undefined;

  if (
    !validBookIds.has(bookId)
    || name.length < 1
    || name.length > 40
    || text.length < 1
    || text.length > 700
    || !Number.isInteger(rating)
    || rating < 1
    || rating > 5
  ) {
    return null;
  }

  return { bookId, name, text, rating, spoiler, legacyId, legacyDate };
}

export async function GET() {
  try {
    return json({ comments: await listComments(database()) });
  } catch (error) {
    console.error('Failed to load comments', error);
    return json({ error: 'לא הצלחנו לטעון את התגובות. נסו שוב בעוד רגע.' }, 500);
  }
}

export async function POST(request: Request) {
  try {
    const input = parseComment(await request.json());
    if (!input) return json({ error: 'חלק מפרטי התגובה חסרים או אינם תקינים.' }, 400);

    return json({ comment: await createComment(database(), input) }, 201);
  } catch (error) {
    console.error('Failed to save comment', error);
    return json({ error: 'לא הצלחנו לשמור את התגובה. נסו שוב בעוד רגע.' }, 500);
  }
}
