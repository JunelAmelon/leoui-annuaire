'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { VENDOR_CATEGORIES, VENDOR_CATEGORY_GROUPS } from '@/lib/vendor-categories';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';
import { toast } from 'sonner';
import { Copy, Check, MapPin, ArrowRight, Clock, Tag, ChevronDown } from 'lucide-react';
import TitleDecoration from '@/components/market/TitleDecoration';

const HERO_VIDEO = 'https://videos.pexels.com/video-files/6761618/6761618-hd_1920_1080_25fps.mp4';
const HERO_POSTER = 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=1920';
const DEFAULT_CARD_IMAGE = 'https://images.pexels.com/photos/2549018/pexels-photo-2549018.jpeg?auto=compress&cs=tinysrgb&w=800';
const CTA_IMAGE = 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1920';



interface Vendor {
  id: string;
  name: string;
  category: string;
  location: string;
  imageUrl: string;
}

interface Promo {
  id: string;
  title: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  code: string;
  valid_to: string;
  valid_from: string;
  created_at: string;
  min_amount: number;
  vendor: Vendor;
}

const categoryMap: Record<string, string[]> = {};
VENDOR_CATEGORIES.forEach(c => { categoryMap[c] = [c]; });

const SORTS = [
  { key: 'ending', label: 'Expire bientôt' },
  { key: 'newest', label: 'Nouveautés' },
  { key: 'discount', label: 'Meilleure remise' },
];

function daysLeft(validTo: string) {
  if (!validTo) return null;
  const end = new Date(validTo);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
}

function formatDiscount(p: Promo) {
  if (p.discount_type === 'percentage') return `-${p.discount_value}%`;
  return `-${p.discount_value} €`;
}

export default function BonPlanPage() {
  const [promotions, setPromotions] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Toutes les catégories');
  const [cityFilter, setCityFilter] = useState('');
  const [sortBy, setSortBy] = useState('ending');
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch('/api/public/promotions')
      .then(async (r) => {
        const json = await r.json();
        if (!r.ok || !json?.ok) throw new Error(json?.error || 'Failed');
        setPromotions(Array.isArray(json.promotions) ? json.promotions : []);
      })
      .catch(() => setPromotions([]))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let list = promotions;

    if (activeCategory !== 'Toutes les catégories') {
      const terms = categoryMap[activeCategory] || [activeCategory];
      list = list.filter(p =>
        activeCategory === 'Autres'
          ? !Object.values(categoryMap).flat().some(t => p.vendor.category.toLowerCase().includes(t.toLowerCase()))
          : terms.some(t => p.vendor.category.toLowerCase().includes(t.toLowerCase()))
      );
    }

    if (cityFilter.trim()) {
      const city = cityFilter.toLowerCase();
      list = list.filter(p =>
        p.vendor.location.toLowerCase().includes(city) ||
        p.vendor.name.toLowerCase().includes(city)
      );
    }

    list = [...list];
    if (sortBy === 'ending') {
      list.sort((a, b) => (daysLeft(a.valid_to) ?? 999) - (daysLeft(b.valid_to) ?? 999));
    } else if (sortBy === 'newest') {
      list.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
    } else if (sortBy === 'discount') {
      list.sort((a, b) => b.discount_value - a.discount_value);
    }
    return list;
  }, [promotions, activeCategory, cityFilter, sortBy]);

  const copyCode = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(id);
      setTimeout(() => setCopied(null), 1500);
      toast.success('Code copié !');
    } catch {
      toast.error('Impossible de copier');
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Header />

      {/* HERO */}
      <section className="relative overflow-hidden bg-charcoal-900" style={{ minHeight: '520px' }}>
        <div className="absolute inset-0">
          <video
            className="w-full h-full object-cover"
            src={HERO_VIDEO}
            poster={HERO_POSTER}
            autoPlay
            muted
            loop
            playsInline
            preload="auto"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#5B1A2E]/95 via-[#5B1A2E]/75 sm:via-[#5B1A2E]/60 to-black/35" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-body-sm text-white/60 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-white/90">Bon plans</span>
            </div>
            <h1 className="font-serif text-white mb-3" style={{ fontSize: 'clamp(2rem, 3.8vw, 3.2rem)', fontWeight: 400, lineHeight: 1.15 }}>
              Bons plans de{' '}
              <span className="relative inline-block">
                mariage
                <TitleDecoration />
              </span>
            </h1>
            <p className="text-white/85 mb-7 max-w-lg text-sm sm:text-base leading-relaxed font-light">
              Codes promo et offres exclusives des meilleurs prestataires pour votre mariage.
            </p>

            {/* Search bar matching LeOui Market style (pilule blanche slim) */}
            <div className="flex flex-col sm:flex-row items-stretch bg-white rounded-2xl sm:rounded-full p-1.5 shadow-soft-xl max-w-2xl">
              <div className="relative flex-[1.4] border-b sm:border-b-0 sm:border-r border-charcoal-100 flex items-center px-4">
                <Tag className="w-4 h-4 text-charcoal-400 flex-shrink-0 mr-2" />
                <select
                  value={activeCategory}
                  onChange={e => setActiveCategory(e.target.value)}
                  className="w-full py-2.5 text-sm bg-transparent text-charcoal-900 outline-none border-none focus:ring-0 appearance-none cursor-pointer pr-8"
                  style={{ backgroundImage: 'none' }}
                >
                  <option value="Toutes les catégories">Toutes les catégories</option>
                  {VENDOR_CATEGORY_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map(item => <option key={item} value={item}>{item}</option>)}
                    </optgroup>
                  ))}
                  <option value="Autres">Autres</option>
                </select>
                <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400 pointer-events-none" />
              </div>
              <CityAutocompleteInput
                value={cityFilter}
                onChange={setCityFilter}
                onSelectLocation={(loc: LocationSuggestion) => setCityFilter(loc.name)}
                types="all"
                dropdownPosition="top"
                maxHeight="max-h-56"
                placeholder="Où ? Ville, région..."
                icon
                showPostalCode={false}
                className="flex-1"
                inputClassName="!border-transparent !bg-transparent focus:!ring-0 focus:!border-transparent py-2.5"
              />
              <button
                type="button"
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold px-6 py-2.5 rounded-xl sm:rounded-full text-sm transition-colors flex-shrink-0"
              >
                Rechercher
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PROMOS */}
      <section id="offres" className="py-14 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-5 border-b border-charcoal-100">
            <div>
              <h2 className="font-serif text-2xl text-charcoal-950" style={{ letterSpacing: '-0.01em' }}>
                {activeCategory === 'Toutes les catégories' ? 'Tous les bons plans' : activeCategory}
              </h2>
              <p className="text-charcoal-400 text-xs mt-1 uppercase tracking-wider font-medium">
                {filtered.length} offre{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
            {/* Tri en pilules segmentées — plus pro qu'un select natif */}
            <div className="flex items-center gap-1 bg-stone-100 rounded-full p-1 self-start sm:self-auto">
              {SORTS.map(s => (
                <button
                  key={s.key}
                  onClick={() => setSortBy(s.key)}
                  className={`px-3.5 py-1.5 text-xs font-medium rounded-full transition-all ${
                    sortBy === s.key
                      ? 'bg-white text-charcoal-950 shadow-sm'
                      : 'text-charcoal-500 hover:text-charcoal-800'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-80 bg-stone-100 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-24 bg-stone-50 rounded-3xl">
              <Tag className="w-12 h-12 text-charcoal-300 mx-auto mb-4" />
              <p className="font-serif text-2xl text-charcoal-700 mb-2">Aucune offre trouvée</p>
              <p className="text-sm text-charcoal-500 mb-6">Essayez une autre catégorie ou lieu.</p>
              <button onClick={() => { setActiveCategory('Toutes les catégories'); setCityFilter(''); }} className="btn-primary">
                Réinitialiser
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filtered.map(promo => (
                <PromoCard key={promo.id} promo={promo} onCopy={() => copyCode(promo.code, promo.id)} copied={copied === promo.id} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="relative py-20 px-4 sm:px-6 overflow-hidden">
        <img
          src={CTA_IMAGE}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl sm:text-4xl text-white mb-4">
            Vous êtes prestataire ?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Publiez votre offre et captez des couples en pleine recherche de prestataires pour leur mariage.
          </p>
          <Link
            href="/vendors/join"
            className="inline-flex items-center gap-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold px-10 py-4 rounded-full transition-colors text-sm"
          >
            Publier mon bon plan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}

function PromoCard({
  promo,
  onCopy,
  copied,
}: {
  promo: Promo;
  onCopy: () => void;
  copied: boolean;
}) {
  const remaining = daysLeft(promo.valid_to);
  const image = promo.vendor.imageUrl || DEFAULT_CARD_IMAGE;

  return (
    <article className="group bg-white border border-charcoal-100 rounded-2xl overflow-hidden hover:border-rose-200 hover:shadow-soft transition-all duration-300 flex flex-col">
      {/* Visuel — bandeau photo compact, badge d'urgence seulement si pertinent */}
      <div className="relative aspect-[16/9] overflow-hidden bg-charcoal-100">
        <img
          src={image}
          alt={promo.vendor.name}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-700"
        />
        {remaining !== null && remaining <= 5 && (
          <div className="absolute top-3 left-3 bg-white/95 backdrop-blur text-charcoal-900 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
            Plus que {remaining} jour{remaining !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        {/* En-tête : prestataire à gauche, remise en serif à droite */}
        <div className="flex items-start justify-between gap-4 mb-3">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-widest text-charcoal-400 font-semibold mb-1">
              {promo.vendor.category}
            </p>
            <h3 className="font-serif text-lg text-charcoal-950 leading-tight group-hover:text-rose-700 transition-colors truncate">
              {promo.vendor.name}
            </h3>
            <p className="text-xs text-charcoal-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3 h-3" /> {promo.vendor.location || 'France'}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="font-serif text-[1.7rem] leading-none text-rose-600" style={{ letterSpacing: '-0.02em' }}>
              {formatDiscount(promo)}
            </p>
            <p className="text-[9px] uppercase tracking-widest text-charcoal-400 mt-1">de remise</p>
          </div>
        </div>

        {/* Offre */}
        <p className="text-sm text-charcoal-800 font-medium leading-snug">{promo.title}</p>
        {promo.description && (
          <p className="text-xs text-charcoal-500 leading-relaxed line-clamp-2 mt-1.5">{promo.description}</p>
        )}

        {/* Conditions + validité — ligne méta discrète */}
        <div className="flex items-center gap-3 mt-3 text-[11px] text-charcoal-400">
          {promo.valid_to && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Jusqu'au {new Date(promo.valid_to).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {promo.min_amount > 0 && (
            <span>Dès {promo.min_amount} € de prestation</span>
          )}
        </div>

        {/* Zone coupon — séparateur pointillé façon ticket */}
        <div className="mt-4 pt-4 border-t border-dashed border-charcoal-200">
          <div className="flex items-center justify-between gap-3 bg-ivory-50 border border-charcoal-100 rounded-lg px-3.5 py-2.5">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-widest text-charcoal-400 font-semibold">Code promo</p>
              <code className="font-mono text-sm font-bold text-charcoal-950 tracking-[0.15em] truncate block">
                {promo.code}
              </code>
            </div>
            <button
              onClick={onCopy}
              className={`flex-shrink-0 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                copied
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-white border border-charcoal-200 text-charcoal-700 hover:border-rose-400 hover:text-rose-600'
              }`}
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
        </div>

        {/* CTA discret */}
        <Link
          href={`/vendors/${promo.vendor.id}`}
          className="mt-4 flex items-center justify-center gap-1.5 w-full border border-charcoal-200 hover:border-rose-500 hover:text-rose-700 text-charcoal-800 font-semibold py-2.5 rounded-xl transition-all text-sm"
        >
          Voir le prestataire <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </article>
  );
}
