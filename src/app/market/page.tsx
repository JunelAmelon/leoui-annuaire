import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MarketSearchBar from '@/components/market/MarketSearchBar';
import LatestListings from '@/components/market/LatestListings';
import MarketStats from '@/components/market/MarketStats';
import CategoryBentoGrid from '@/components/market/CategoryBentoGrid';
import HowItWorksRow from '@/components/market/HowItWorksRow';
import HeroListingsColumn from '@/components/market/HeroListingsColumn';
import TitleDecoration from '@/components/market/TitleDecoration';
import { Plus, ArrowRight } from 'lucide-react';

const STEPS_BUYER = [
  { n: '01', icon: 'search' as const, title: 'Trouvez & commandez', text: 'Parcourez les annonces, filtrez par zone pour la remise en main propre, et commandez en quelques clics.' },
  { n: '02', icon: 'shield' as const, title: 'Payez en sécurité', text: 'Votre paiement est conservé par le prestataire de paiement — jamais par le vendeur ni par nous.' },
  { n: '03', icon: 'package_check' as const, title: 'Confirmez la réception', text: 'Vous libérez les fonds uniquement quand vos articles sont entre vos mains et conformes.' },
];

const STEPS_SELLER = [
  { n: '01', icon: 'tag' as const, title: 'Publiez votre annonce', text: 'Photos, prix, état, remise en main propre ou envoi : votre article est en ligne en quelques minutes.' },
  { n: '02', icon: 'truck' as const, title: 'Expédiez ou remettez', text: 'Envoi suivi ou remise avec code de validation unique saisi au moment de l\'échange.' },
  { n: '03', icon: 'coins' as const, title: 'Recevez vos fonds', text: 'Dès la confirmation de réception par l\'acheteur, le reversement est déclenché automatiquement.' },
];

function StatsRow() {
  return (
    <div className="rounded-[28px] bg-white overflow-hidden grid lg:grid-cols-2">
      <div className="p-8 sm:p-12 order-2 lg:order-1">
        <MarketStats />
      </div>
      <div className="relative min-h-[260px] lg:min-h-full order-1 lg:order-2">
        <img
          src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=900"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>
    </div>
  );
}

export default function MarketHomePage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      <main className="px-2 sm:px-3 pb-3 space-y-3">

        {/* ── HERO BENTO — pleine largeur sans bordure sur mobile ─── */}
        <section className="grid grid-cols-12 gap-0 sm:gap-3 -mx-2 sm:mx-0">
          {/* Grande carte hero */}
          <div className="col-span-12 lg:col-span-8 relative rounded-none sm:rounded-[28px] overflow-hidden bg-charcoal-900 min-h-[75dvh] sm:min-h-[560px] flex flex-col justify-end">
            <img
              src="/mariage%20(4).jpg"
              alt="Mariage"
              className="absolute inset-0 w-full h-full object-cover object-center"
            />
            {/* Dégradé atmosphérique rose sombre / vignettage identique à la capture */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#5B1A2E]/95 via-[#5B1A2E]/75 sm:via-[#5B1A2E]/60 to-black/35" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            <div className="relative z-10 px-7 sm:px-10 pb-10 pt-12">
              <div className="relative mb-4 max-w-xl">
                <h1
                  className="font-serif text-white"
                  style={{ fontSize: 'clamp(2.1rem, 4.3vw, 3.6rem)', fontWeight: 400, lineHeight: 1.1, letterSpacing: '-0.02em' }}
                >
                  La seconde vie de vos<br />
                  objets de{' '}
                  <span className="relative inline-block">
                    mariage
                    <TitleDecoration />
                  </span>
                </h1>
              </div>

              <p className="text-white/85 mb-8 max-w-md text-sm sm:text-base leading-relaxed font-light">
                Achetez et revendez décoration, mobilier et accessoires entre particuliers en toute confiance.
              </p>

              <MarketSearchBar />
            </div>

          </div>

          {/* Colonne droite — 3 dernières annonces réelles */}
          <div className="col-span-12 lg:col-span-4">
            <HeroListingsColumn />
          </div>
        </section>

        {/* ── DERNIÈRES ANNONCES ─────────────────────────────────── */}
        <section className="rounded-[28px] bg-white p-6 sm:p-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-rose-600 mb-1.5">Fraîchement en ligne</p>
              <h2 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', fontWeight: 300 }}>
                Les dernières annonces
              </h2>
            </div>
            <Link
              href="/market/annonces"
              className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700"
            >
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <LatestListings limit={8} />
          <Link
            href="/market/annonces"
            className="sm:hidden flex items-center justify-center gap-1.5 mt-6 text-sm font-medium text-rose-600"
          >
            Voir toutes les annonces <ArrowRight className="w-4 h-4" />
          </Link>
        </section>

        {/* ── COMMENT ÇA MARCHE — rangées zigzag ─────────────────── */}
        <section className="space-y-3">
          <HowItWorksRow
            eyebrow="Pour les acheteurs"
            title="Trouvez votre article en 3 étapes"
            cta={{ label: 'Parcourir les annonces', href: '/market/annonces' }}
            steps={STEPS_BUYER}
            image="https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=900"
            imageAlt="Acheteuse parcourant les annonces"
          />
          <HowItWorksRow
            eyebrow="Pour les vendeurs"
            title="Revendez vos articles en 3 étapes"
            cta={{ label: 'Déposer une annonce', href: '/market/deposer-une-annonce' }}
            steps={STEPS_SELLER}
            image="https://images.pexels.com/photos/33642063/pexels-photo-33642063.jpeg?auto=compress&cs=tinysrgb&w=900"
            imageAlt="Vendeur préparant ses articles"
            imageSide="left"
          />
          <StatsRow />
        </section>

        {/* ── CATÉGORIES ─────────────────────────────────────────── */}
        <section className="rounded-[28px] bg-white p-6 sm:p-8">
          <div className="flex items-end justify-between mb-6">
            <div>
              <p className="text-xs font-semibold tracking-[0.18em] uppercase text-rose-600 mb-1.5">Explorer</p>
              <h2 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.6rem, 3vw, 2.3rem)', fontWeight: 300 }}>
                Parcourir par catégorie
              </h2>
            </div>
            <Link href="/market/annonces" className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-rose-600 hover:text-rose-700">
              Tout voir <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <CategoryBentoGrid />
        </section>

        {/* ── CTA VENDEUR — carte pleine couleur type référence ──── */}
        <section className="relative rounded-[28px] bg-rose-600 overflow-hidden p-10 sm:p-16 text-center">
          <p
            aria-hidden
            className="absolute -bottom-8 left-0 right-0 text-center font-serif text-white/10 select-none pointer-events-none whitespace-nowrap"
            style={{ fontSize: 'clamp(5rem, 11vw, 10rem)', lineHeight: 1 }}
          >
            Vendez
          </p>
          <div className="relative z-10">
            <h2 className="font-serif text-white mb-4" style={{ fontSize: 'clamp(1.8rem, 3.5vw, 2.8rem)', fontWeight: 300, lineHeight: 1.15 }}>
              Votre mariage est passé ?<br />
              <em className="italic">Donnez une seconde vie à vos articles.</em>
            </h2>
            <p className="text-white/75 mb-8 max-w-lg mx-auto text-sm sm:text-base">
              Publiez votre première annonce en quelques minutes. Vous êtes payé
              dès que l'acheteur confirme la réception.
            </p>
            <Link
              href="/market/deposer-une-annonce"
              className="inline-flex items-center gap-2 bg-white text-rose-600 font-semibold px-7 py-3.5 rounded-full text-sm hover:bg-rose-50 transition-colors"
            >
              <Plus className="w-4 h-4" /> Déposer une annonce
            </Link>
          </div>
        </section>
      </main>

      <div className="bg-white">
        <Footer />
      </div>
    </div>
  );
}
