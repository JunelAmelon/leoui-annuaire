import Link from 'next/link';
import { Heart } from 'lucide-react';

// Coque commune des portails Market (connexion / inscription).
// Le panneau photo reste fixe à la hauteur de l'écran : il ne s'étire plus
// (et ne zoome plus) quand le formulaire est long.
export default function MarketAuthShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex bg-white">
      <aside className="hidden lg:block lg:w-[46%] flex-shrink-0 self-start sticky top-0 h-screen overflow-hidden bg-charcoal-900">
        <img
          src="/mariage%20(4).jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          style={{ objectPosition: '52% center' }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/10 to-black/25" />

        <div className="relative z-10 h-full flex flex-col justify-between p-12 text-white">
          <Link href="/" className="flex items-center gap-2.5 w-fit group">
            <span className="w-7 h-7 border border-white/60 flex items-center justify-center group-hover:bg-white/10 transition-colors">
              <Heart className="w-3.5 h-3.5 text-white fill-white" />
            </span>
            <span className="font-serif text-[1.3rem] tracking-wide">LeOui.net</span>
          </Link>

          <div className="max-w-sm">
            <p className="label-xs text-white/70 mb-4">LeOui Market</p>
            <h2 className="font-serif leading-[1.08] mb-4" style={{ fontSize: 'clamp(2rem, 3vw, 2.75rem)', fontWeight: 400 }}>
              La seconde vie des <em className="italic">beaux mariages</em>
            </h2>
            <p className="text-sm text-white/80 leading-relaxed">
              Achetez et revendez décoration, mobilier et tenues entre particuliers, en toute confiance.
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-14 py-10">
        <div className="lg:hidden mb-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="w-7 h-7 border border-rose-600 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-rose-600 fill-rose-600" />
            </span>
            <span className="font-serif text-xl text-charcoal-900">LeOui.net</span>
          </Link>
          <Link href="/market" className="label-xs text-charcoal-500 hover:text-rose-600">
            Market
          </Link>
        </div>

        <div className="max-w-md w-full mx-auto">
          <p className="label-xs text-rose-600 mb-3">{eyebrow}</p>
          <h1 className="font-serif text-[2rem] leading-tight text-charcoal-900 mb-2">{title}</h1>
          <p className="text-charcoal-500 text-sm mb-8">{subtitle}</p>
          {children}
        </div>
      </main>
    </div>
  );
}
