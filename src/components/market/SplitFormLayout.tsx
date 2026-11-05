import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Avatar } from './ui';

// Mise en page des formulaires Market : photo éditoriale à gauche (fixe au scroll),
// formulaire à droite, le tout centré sous le header connecté.
export default function SplitFormLayout({
  eyebrow,
  title,
  subtitle,
  image,
  imagePosition = 'center',
  tips,
  seller,
  backHref = '/app/market',
  backLabel = 'Mon espace',
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
  image: string;
  imagePosition?: string;
  tips?: string[];
  seller?: { name: string; status?: string; photoUrl?: string | null };
  backHref?: string;
  backLabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 sm:py-10 w-full">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 label-xs text-charcoal-500 hover:text-rose-600 transition-colors mb-5"
      >
        <ArrowLeft className="w-3.5 h-3.5" /> {backLabel}
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-charcoal-200">
        {/* Panneau photo */}
        <aside className="hidden lg:block lg:col-span-5 relative border-r border-charcoal-200">
          <div className="sticky top-[7.5rem] h-[min(680px,calc(100vh-9rem))] overflow-hidden">
            <img
              src={image}
              alt=""
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: imagePosition }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/5" />

            <div className="relative z-10 h-full flex flex-col justify-end p-8 text-white">
              <p className="label-xs text-champagne-300 mb-3">{eyebrow}</p>
              <h2 className="font-serif leading-[1.1] mb-5" style={{ fontSize: '2rem', fontWeight: 400 }}>
                {title}
              </h2>

              {tips && tips.length > 0 && (
                <ol className="space-y-3 text-sm text-white/85 mb-6">
                  {tips.map((tip, i) => (
                    <li key={tip} className="flex gap-3">
                      <span className="font-serif text-champagne-300 tabular-nums">0{i + 1}</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ol>
              )}

              {seller && (
                <div className="flex items-center gap-3 pt-5 border-t border-white/20">
                  <Avatar name={seller.name} photoUrl={seller.photoUrl} size={36} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{seller.name}</p>
                    {seller.status && <p className="text-xs text-white/60 capitalize">{seller.status}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Formulaire */}
        <section className="lg:col-span-7 p-6 sm:p-10">
          <div className="lg:hidden mb-6">
            <p className="label-xs text-rose-600 mb-2">{eyebrow}</p>
            <h1 className="font-serif text-3xl text-charcoal-900 leading-tight">{title}</h1>
          </div>
          <div className="hidden lg:block mb-8">
            <p className="label-xs text-rose-600 mb-2">{eyebrow}</p>
            <h1 className="font-serif text-3xl text-charcoal-900 leading-tight">{title}</h1>
            {subtitle && <p className="text-sm text-charcoal-500 mt-2">{subtitle}</p>}
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
