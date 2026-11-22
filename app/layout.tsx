import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL('http://localhost:3000'),
  title: 'אסתר שטרייט־וורצל | האתר הרשמי',
  description: 'האתר הרשמי של אסתר שטרייט־וורצל: כל הספרים ושעריהם, סקירות מורחבות, כתבות, ביקורות, עיבודים, פרסים וקהילת קוראים.',
  openGraph: {
    title: 'אסתר שטרייט־וורצל | האתר הרשמי',
    description: 'סיפורים שגידלו דורות — ספרים ושערים, סקירות, ארכיון, עיבודים, פרסים וקהילת קוראים.',
    locale: 'he_IL',
    type: 'website',
    images: [{ url: '/og.png', width: 1200, height: 630, alt: 'אסתר שטרייט־וורצל — סיפורים שגידלו דורות של קוראים' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'אסתר שטרייט־וורצל | האתר הרשמי',
    description: 'סיפורים שגידלו דורות — ספרים ושערים, סקירות, ארכיון, עיבודים, פרסים וקהילת קוראים.',
    images: ['/og.png'],
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="he" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
