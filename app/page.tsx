'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { adaptations, archiveItems, books, filters, honors, type Book } from './content';

type ReaderComment = {
  id: string;
  bookId: string;
  name: string;
  text: string;
  rating: number;
  spoiler: boolean;
  date: string;
};

const STORAGE_KEY = 'ester-streit-wurzel-reader-comments';

type CommentResponse = {
  comment?: ReaderComment;
  comments?: ReaderComment[];
  error?: string;
};

function BookCover({ book, index, compact = false }: { book: Book; index: number; compact?: boolean }) {
  return (
    <div className={`cover cover-${book.palette} ${compact ? 'cover-compact' : ''}`} aria-label={`כריכת הספר ${book.title}`}>
      <div className="cover-fallback" aria-hidden="true">
        <span className="cover-number">{String(index + 1).padStart(2, '0')}</span>
        <h3>{book.title}</h3>
        <span className="cover-author">אסתר שטרייט־וורצל</span>
      </div>
      <img
        className="cover-image"
        src={book.cover}
        alt={`הכריכה המקורית של הספר ${book.title}`}
        loading="lazy"
        onError={(event) => { event.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
}

export default function Home() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('הכול');
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [comments, setComments] = useState<ReaderComment[]>([]);
  const [name, setName] = useState('');
  const [commentText, setCommentText] = useState('');
  const [rating, setRating] = useState(5);
  const [spoiler, setSpoiler] = useState(false);
  const [commentsLoading, setCommentsLoading] = useState(true);
  const [commentsError, setCommentsError] = useState('');
  const [commentNotice, setCommentNotice] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  useEffect(() => {
    let active = true;

    const importBrowserComments = async () => {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return;

      const legacyComments = JSON.parse(saved) as ReaderComment[];
      if (!Array.isArray(legacyComments)) return;

      for (const comment of legacyComments) {
        const response = await fetch('/api/comments', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: comment.bookId,
            name: comment.name,
            text: comment.text,
            rating: comment.rating,
            spoiler: comment.spoiler,
            legacyId: comment.id,
            legacyDate: comment.date,
          }),
        });

        if (!response.ok) throw new Error('ייבוא התגובות הישנות נכשל');
      }

      localStorage.removeItem(STORAGE_KEY);
    };

    const loadComments = async () => {
      try {
        await importBrowserComments();
        const response = await fetch('/api/comments', { cache: 'no-store' });
        const data = await response.json() as CommentResponse;
        if (!response.ok) throw new Error(data.error || 'טעינת התגובות נכשלה');
        if (active) setComments(data.comments ?? []);
      } catch (error) {
        if (active) {
          setCommentsError(error instanceof Error ? error.message : 'לא הצלחנו לטעון את התגובות.');
        }
      } finally {
        if (active) setCommentsLoading(false);
      }
    };

    void loadComments();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedBook(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const filteredBooks = useMemo(() => {
    const term = search.trim().toLocaleLowerCase('he');
    return books.filter((book) => {
      const matchesFilter = filter === 'הכול' || book.category === filter;
      const searchable = `${book.title} ${book.overview} ${book.context} ${book.review.join(' ')} ${book.themes.join(' ')}`.toLocaleLowerCase('he');
      return matchesFilter && (!term || searchable.includes(term));
    });
  }, [filter, search]);

  const selectedComments = selectedBook ? comments.filter((comment) => comment.bookId === selectedBook.id) : [];
  const recentComments = comments.slice(0, 3);

  const openBook = (book: Book) => {
    setSelectedBook(book);
    setCommentText('');
    setRating(5);
    setSpoiler(false);
    setCommentNotice('');
  };

  const submitComment = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedBook || !name.trim() || !commentText.trim() || commentSubmitting) return;

    setCommentSubmitting(true);
    setCommentsError('');
    setCommentNotice('');

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId: selectedBook.id,
          name: name.trim(),
          text: commentText.trim(),
          rating,
          spoiler,
        }),
      });
      const data = await response.json() as CommentResponse;
      if (!response.ok || !data.comment) throw new Error(data.error || 'שמירת התגובה נכשלה');

      setComments((current) => [data.comment as ReaderComment, ...current]);
      setCommentText('');
      setSpoiler(false);
      setCommentNotice('התגובה נשמרה ומוצגת כעת לכל המבקרים באתר המקומי.');
    } catch (error) {
      setCommentsError(error instanceof Error ? error.message : 'לא הצלחנו לשמור את התגובה.');
    } finally {
      setCommentSubmitting(false);
    }
  };

  return (
    <main id="main-content">
      <a className="skip-link" href="#catalog">דלגו לספרים</a>

      <header className="site-header">
        <a className="brand" href="#top" aria-label="עמוד הבית">
          <span className="brand-mark" aria-hidden="true">א</span>
          <span><strong>אסתר שטרייט־וורצל</strong><small>האתר הרשמי</small></span>
        </a>
        <nav aria-label="ניווט ראשי">
          <a href="#about">על אסתר</a>
          <a href="#catalog">כל הספרים</a>
          <a href="#archive">קטעים וכתבות</a>
          <a href="#adaptations">במה ומסך</a>
          <a href="#honors">פרסים</a>
          <a className="nav-accent" href="#community">קהילת קוראים</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">1932—2013 · סופרת · מורה · מספרת</p>
          <h1>סיפורים שגידלו<br />דורות של קוראים</h1>
          <p className="hero-lede">בית מקוון ליצירתה של אסתר שטרייט־וורצל — מן המושבה פתח תקווה, דרך ימי המחתרות והשואה, ועד עולמם הפנימי של בני ובנות הנוער בישראל.</p>
          <div className="hero-actions">
            <a className="button button-primary" href="#catalog">לספרייה המלאה <span aria-hidden="true">←</span></a>
            <a className="button button-quiet" href="#about">להכיר את אסתר</a>
          </div>
          <dl className="hero-stats" aria-label="נתונים מרכזיים">
            <div><dt>26</dt><dd>כותרים בספרייה</dd></div>
            <div><dt>46</dt><dd>שנות יצירה</dd></div>
            <div><dt>1981</dt><dd>פרס זאב על ״אליפים״</dd></div>
          </dl>
        </div>

        <div className="hero-visual" aria-label="דיוקן ספרותי של אסתר שטרייט־וורצל">
          <div className="portrait-frame">
            <div className="portrait-fallback" aria-hidden="true"><span>אסתר</span><small>שטרייט־וורצל</small></div>
            <img
              src="/assets/ester-portrait.jpg"
              alt="אסתר שטרייט־וורצל"
              onError={(event) => { event.currentTarget.style.display = 'none'; }}
            />
            <span className="photo-caption">אסתר שטרייט־וורצל · תצלום ארכיוני</span>
          </div>
          <div className="book-spine spine-one">אוּרי</div>
          <div className="book-spine spine-two">אליפים</div>
          <div className="book-spine spine-three">הבריחה</div>
          <span className="scribble" aria-hidden="true">אסתר</span>
        </div>
      </section>

      <section className="intro-strip">
        <blockquote>
          <span className="quote-mark" aria-hidden="true">״</span>
          <p>לא צריך להסתיר את הטרגי והכואב, אבל צריך לתת פתח לתקווה.</p>
          <cite>אסתר שטרייט־וורצל, על הכתיבה לנוער</cite>
        </blockquote>
      </section>

      <section className="about-section" id="about">
        <div className="about-heading">
          <p className="eyebrow">הסופרת והמחנכת</p>
          <h2>כתיבה שנולדה<br />מתוך הקשבה</h2>
        </div>
        <div className="about-copy">
          <p className="drop-cap">אסתר שטרייט־וורצל נולדה בפתח תקווה בשנת 1932, בבית שהיה פתוח לסופרים, משוררים ופליטי שואה. היא החלה לכתוב בילדותה, ובגיל שתים־עשרה כבר פרסמה סיפור ראשון בשם העט ״צבי הדס״.</p>
          <p>במשך 32 שנים לימדה וחינכה בני נוער. הכיתה, המושבה והמפגשים עם תלמידיה היו לחומרי החיים של ספריה: עלילות מרתקות המחברות היסטוריה לאומית עם אהבות ראשונות, שאלות של זהות, יחסי משפחה והצורך העמוק להשתייך.</p>
          <a className="text-link" href="#legacy">לתחנות בחייה <span aria-hidden="true">←</span></a>
        </div>
        <aside className="about-note"><span>״</span><p>היה לי מזל להיוולד בתקופה מיוחדת ובמשפחה מיוחדת.</p></aside>
      </section>

      <section className="catalog" id="catalog">
        <div className="section-heading catalog-heading">
          <div><p className="eyebrow">הספרייה המלאה</p><h2>כל הספרים</h2></div>
          <p>26 כותרים · שערים מקוריים · חמש פסקאות סקירה לכל ספר</p>
        </div>

        <div className="catalog-tools">
          <label className="search-box">
            <span aria-hidden="true">⌕</span>
            <span className="sr-only">חיפוש בספרייה</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="חיפוש לפי שם או נושא..." />
          </label>
          <div className="filter-row" role="group" aria-label="סינון ספרים לפי נושא">
            {filters.map((item) => (
              <button className={filter === item ? 'active' : ''} type="button" key={item} onClick={() => setFilter(item)}>{item}</button>
            ))}
          </div>
        </div>

        <p className="results-count" aria-live="polite">מוצגים {filteredBooks.length} ספרים</p>
        {filteredBooks.length > 0 ? (
          <div className="catalog-grid">
            {filteredBooks.map((book) => {
              const index = books.findIndex((item) => item.id === book.id);
              const commentCount = comments.filter((comment) => comment.bookId === book.id).length;
              return (
                <article className="catalog-card" key={book.id}>
                  <button className="book-open" type="button" onClick={() => openBook(book)} aria-label={`פתיחת סקירה ותגובות עבור ${book.title}`}>
                    <BookCover book={book} index={index} compact />
                  </button>
                  <div className="catalog-card-info">
                    <span>{book.year} · {book.category}</span>
                    <h3>{book.title}</h3>
                    <p>{book.overview}</p>
                    <button className="card-link" type="button" onClick={() => openBook(book)}>סקירה ותגובות <span aria-hidden="true">←</span></button>
                    {commentCount > 0 && <small>{commentCount} תגובות קוראים</small>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="empty-results"><strong>לא מצאנו ספר מתאים</strong><p>נסו מילה אחרת או בחרו ״הכול״.</p></div>
        )}
      </section>

      <section className="archive-section" id="archive">
        <div className="section-heading archive-heading">
          <div><p className="eyebrow">מן הארכיון</p><h2>קטעים, כתבות וביקורות</h2></div>
          <p>ראיונות, מסות, ביקורות וזיכרונות שנאספו לאורך השנים</p>
        </div>
        <div className="archive-grid">
          {archiveItems.map((item) => (
            <a className="archive-card" href={item.url} target="_blank" rel="noreferrer" key={`${item.year}-${item.title}`}>
              <div className="archive-meta"><span>{item.kind}</span><time>{item.year}</time></div>
              <h3>{item.title}</h3>
              <p>{item.summary}</p>
              <footer><span>{item.source}</span><span aria-hidden="true">↗</span></footer>
            </a>
          ))}
        </div>
      </section>

      <section className="adaptations-section" id="adaptations">
        <div className="section-heading">
          <div><p className="eyebrow">מן הדף אל הקהל</p><h2>על הבמה ועל המסך</h2></div>
          <p>עיבודים, הפקות והמשכיות תרבותית</p>
        </div>
        <div className="adaptations-list">
          {adaptations.map((item, index) => (
            <article className="adaptation-card" key={item.title}>
              <div className="adaptation-number">{String(index + 1).padStart(2, '0')}</div>
              <div className="adaptation-label"><span>{item.medium}</span><time>{item.year}</time></div>
              <div className="adaptation-copy"><h3>{item.title}</h3><p>{item.description}</p><small>{item.credit}</small></div>
              <a href={item.url} target="_blank" rel="noreferrer" aria-label={`מידע נוסף על ${item.title}`}>מידע נוסף <span aria-hidden="true">↗</span></a>
            </article>
          ))}
        </div>
      </section>

      <section className="honors-section" id="honors">
        <div className="honors-intro">
          <p className="eyebrow">פרסים והוקרה</p>
          <h2>מילים שנשארו.<br />הכרה שנמשכת.</h2>
          <p>מפרסי הספרות ועד הנצחה עירונית — תחנות שבהן זכו היצירה, המחנכת והקשר לפתח תקווה להכרה ציבורית.</p>
        </div>
        <div className="honors-grid">
          {honors.map((honor) => (
            <a className="honor-card" href={honor.url} target="_blank" rel="noreferrer" key={`${honor.year}-${honor.title}`}>
              <time>{honor.year}</time><h3>{honor.title}</h3><p>{honor.description}</p><span>למקור <b aria-hidden="true">↗</b></span>
            </a>
          ))}
        </div>
      </section>

      <section className="legacy" id="legacy">
        <div className="section-heading"><div><p className="eyebrow">ציר זמן</p><h2>חיים של ספרות וחינוך</h2></div></div>
        <ol className="timeline">
          <li><time>1932</time><div><h3>ילדות בפתח תקווה</h3><p>נולדה למשפחה ספרותית; אביה היה הסופר והמבקר שלום שטרייט.</p></div></li>
          <li><time>1944</time><div><h3>הסיפור הראשון</h3><p>בגיל שתים־עשרה פרסמה סיפור בשם העט ״צבי הדס״.</p></div></li>
          <li><time>1952</time><div><h3>מן האוניברסיטה לכיתה</h3><p>סיימה תואר בספרות ובפסיכולוגיה והחלה קריירה בת 32 שנים כמורה ומחנכת.</p></div></li>
          <li><time>1962</time><div><h3>ספר הביכורים</h3><p>״מן המצר״ ראה אור ופתח ארבעה עשורים וחצי של יצירה.</p></div></li>
          <li><time>1981</time><div><h3>פרס זאב</h3><p>״אליפים״ זכה בפרס זאב לספרות ילדים ונוער.</p></div></li>
          <li><time>2004</time><div><h3>פרס זאב נוסף</h3><p>״חברות״ זיכה אותה בפרס זאב לשנת תשס״ד.</p></div></li>
          <li><time>2008</time><div><h3>יקירת פתח תקווה</h3><p>זכתה בתואר יקירת העיר ובאותה שנה ראה אור ספרה האחרון, ״קיץ כתום״.</p></div></li>
        </ol>
      </section>

      <section className="community" id="community">
        <div className="community-intro">
          <p className="eyebrow">מועדון הקוראים</p>
          <h2>איזה ספר<br />נשאר איתכם?</h2>
          <p>הכניסה חופשית ואין צורך בהרשמה. פתחו ספר מן הקטלוג, כתבו זיכרון, מחשבה או המלצה והוסיפו את קולכם למדף.</p>
          <button className="button button-paper" type="button" onClick={() => openBook(books[5])}>כתבו על ״אורי״ <span aria-hidden="true">←</span></button>
          <small>התגובות נשמרות במסד SQLite המקומי ומוצגות לכל המבקרים באתר ברשת.</small>
        </div>
        <div className="community-board">
          <div className="board-top"><span>{commentsLoading ? 'טוען תגובות…' : `${comments.length} תגובות`}</span><span>ללא הרשמה</span></div>
          {commentsError && !commentsLoading ? (
            <div className="board-empty"><span aria-hidden="true">!</span><h3>לא הצלחנו לטעון את התגובות</h3><p>{commentsError}</p></div>
          ) : recentComments.length > 0 ? recentComments.map((comment) => {
            const book = books.find((item) => item.id === comment.bookId);
            return (
              <article className="reader-note" key={comment.id}>
                <div className="reader-note-head"><strong>{comment.name}</strong><span>{'★'.repeat(comment.rating)}{'☆'.repeat(5 - comment.rating)}</span></div>
                <p>{comment.spoiler ? 'התגובה כוללת ספוילר — אפשר לפתוח אותה בחלון הספר.' : comment.text}</p>
                <small>{book?.title} · {comment.date}</small>
              </article>
            );
          }) : !commentsLoading ? (
            <div className="board-empty"><span aria-hidden="true">✎</span><h3>הדף עדיין מחכה לקול הראשון</h3><p>בחרו ספר מן הספרייה ושתפו מה הוא עורר בכם.</p></div>
          ) : null}
        </div>
      </section>

      <footer className="site-footer">
        <div className="footer-brand"><span className="brand-mark" aria-hidden="true">א</span><p><strong>אסתר שטרייט־וורצל</strong><br />האתר הרשמי · באהבה, המשפחה</p></div>
        <div className="footer-links"><a href="#top">ראש העמוד</a><a href="#catalog">הספרים</a><a href="#archive">הארכיון</a><a href="#adaptations">במה ומסך</a><a href="#honors">פרסים</a><a href="#community">תגובות</a></div>
        <div className="sources"><span>מקורות מידע:</span><a href="https://benyehuda.org/lexicon/01067.php" target="_blank" rel="noreferrer">לקסיקון הספרות העברית החדשה</a><a href="https://www.nli.org.il/he/a-topic/987007306948605171" target="_blank" rel="noreferrer">הספרייה הלאומית</a></div>
      </footer>

      {selectedBook && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelectedBook(null); }}>
          <section className="book-modal" role="dialog" aria-modal="true" aria-labelledby="book-modal-title">
            <button className="modal-close" type="button" onClick={() => setSelectedBook(null)} aria-label="סגירת החלון">×</button>
            <div className="modal-book">
              <BookCover book={selectedBook} index={books.findIndex((book) => book.id === selectedBook.id)} compact />
              <div className="modal-copy">
                <p className="eyebrow">{selectedBook.year} · {selectedBook.category}</p>
                <h2 id="book-modal-title">{selectedBook.title}</h2>
                <h3 className="review-heading">סקירה מורחבת</h3>
                <div className="extended-review">
                  {selectedBook.review.map((paragraph, paragraphIndex) => <p className={paragraphIndex === 0 ? 'modal-overview' : ''} key={paragraph}>{paragraph}</p>)}
                </div>
                <div className="theme-list">{selectedBook.themes.map((theme) => <span key={theme}>{theme}</span>)}</div>
                {selectedBook.coverNote && <p className="cover-note">הערת כריכה: {selectedBook.coverNote}</p>}
              </div>
            </div>

            <div className="comments-area">
              <div className="comments-list">
                <div className="comments-title"><h3>תגובות קוראים</h3><span>{selectedComments.length}</span></div>
                {commentsLoading ? <p className="no-comments">טוען תגובות קודמות…</p> : selectedComments.length > 0 ? selectedComments.map((comment) => (
                  <article className="modal-comment" key={comment.id}>
                    <div><strong>{comment.name}</strong><span className="stars" aria-label={`דירוג ${comment.rating} מתוך 5`}>{'★'.repeat(comment.rating)}{'☆'.repeat(5 - comment.rating)}</span></div>
                    {comment.spoiler ? <details><summary>תגובה זו כוללת ספוילר</summary><p>{comment.text}</p></details> : <p>{comment.text}</p>}
                    <footer><span>{comment.date}</span></footer>
                  </article>
                )) : <p className="no-comments">עדיין אין תגובות לספר הזה. תוכלו להיות הראשונים.</p>}
              </div>

              <form className="comment-form" onSubmit={submitComment}>
                <h3>הוסיפו תגובה</h3>
                <p>חופשי, בלי חשבון ובלי סיסמה.</p>
                <label>שם או כינוי<input value={name} onChange={(event) => setName(event.target.value)} maxLength={40} required placeholder="איך להציג את שמכם?" /></label>
                <fieldset><legend>דירוג הספר</legend><div className="rating-row">{[1, 2, 3, 4, 5].map((star) => <button type="button" key={star} className={star <= rating ? 'selected' : ''} onClick={() => setRating(star)} aria-label={`${star} כוכבים`}>★</button>)}</div></fieldset>
                <label>התגובה שלכם<textarea value={commentText} onChange={(event) => setCommentText(event.target.value)} maxLength={700} required rows={5} placeholder="מה זכור לכם מן הקריאה?" /></label>
                <label className="checkbox"><input type="checkbox" checked={spoiler} onChange={(event) => setSpoiler(event.target.checked)} /><span>התגובה כוללת ספוילר</span></label>
                <button className="button button-primary submit-comment" type="submit" disabled={commentSubmitting}>{commentSubmitting ? 'שומר תגובה…' : 'פרסום באתר'}</button>
                {commentNotice && <p className="comment-feedback success" role="status">{commentNotice}</p>}
                {commentsError && <p className="comment-feedback error" role="alert">{commentsError}</p>}
                <small>התגובה נשמרת במסד הנתונים המקומי ומוצגת לכל מי שנכנס לאתר.</small>
              </form>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
