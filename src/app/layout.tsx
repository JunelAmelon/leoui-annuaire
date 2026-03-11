import type { Metadata } from 'next';
import { DM_Sans, Cormorant_Garamond } from 'next/font/google';
import './globals.css';
import nextDynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const Providers = nextDynamic(() => import('@/components/Providers'), { ssr: false });
const ChatAssistant = nextDynamic(() => import('@/components/ChatAssistant'), { ssr: false });

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
  display: 'swap',
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'LeOui — Organisez votre mariage avec élégance',
  description: 'La plateforme premium pour organiser votre mariage de rêve en France. Découvrez les meilleurs prestataires et lieux de réception.',
  keywords: ['mariage', 'wedding', 'france', 'prestataire mariage', 'organisation mariage'],
  openGraph: {
    title: 'LeOui — Organisez votre mariage avec élégance',
    description: 'La plateforme premium pour organiser votre mariage de rêve en France',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className={`${dmSans.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased bg-ivory-50 text-charcoal-900">
        <Providers>
          {children}
          <ChatAssistant />
        </Providers>
      </body>
    </html>
  );
}
