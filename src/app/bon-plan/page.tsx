'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { VENDOR_CATEGORIES, VENDOR_CATEGORY_GROUPS } from '@/lib/vendor-categories';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';
import { toast } from 'sonner';
import { Copy, Check, MapPin, ArrowRight, Clock, Tag, ChevronDown } from 'lucide-react';

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
      <section className="relative overflow-hidden" style={{ minHeight: '520px' }}>
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
          <div className="absolute inset-0 bg-gradient-to-r from-charcoal-900/85 via-charcoal-900/50 to-charcoal-900/30" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-14">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-body-sm text-white/60 mb-4">
              <Link href="/" className="hover:text-white transition-colors">Accueil</Link>
              <span>/</span>
              <span className="text-white/90">Bon plans</span>
            </div>
            <h1 className="font-display text-display-md text-white mb-3">
              Bons plans mariage
            </h1>
            <p className="text-body-md text-white/80 mb-7 max-w-lg">
              Codes promo et offres exclusives des meilleurs prestataires pour votre mariage.
            </p>

            {/* Search bar */}
            <div className="flex flex-col sm:flex-row gap-2 bg-black/20 rounded-2xl p-2 max-w-2xl border border-white/15">
              <div className="relative flex-1">
                <select
                  value={activeCategory}
                  onChange={e => setActiveCategory(e.target.value)}
                  className="w-full h-12 px-4 text-sm bg-white/10 text-white rounded-xl outline-none focus:bg-white/15 border border-transparent focus:border-white/20 appearance-none"
                  style={{ backgroundImage: 'none' }}
                >
                  <option value="Toutes les catégories" className="text-charcoal-900">Toutes les catégories</option>
                  {VENDOR_CATEGORY_GROUPS.map(group => (
                    <optgroup key={group.label} label={group.label} className="text-charcoal-900">
                      {group.items.map(item => <option key={item} value={item} className="text-charcoal-900">{item}</option>)}
                    </optgroup>
                  ))}
                  <option value="Autres" className="text-charcoal-900">Autres</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/70 pointer-events-none" />
              </div>
              <div className="flex-1">
                <CityAutocompleteInput
                  value={cityFilter}
                  onChange={setCityFilter}
                  onSelectLocation={(loc: LocationSuggestion) => setCityFilter(loc.name)}
                  types="all"
                  dropdownPosition="top"
                  maxHeight="max-h-48"
                  placeholder="Ville, région, département..."
                  dark
                  showPostalCode={false}
                  inputClassName="py-3"
                  className="w-full"
                />
              </div>
              <button
                onClick={() => { setActiveCategory('Toutes les catégories'); setCityFilter(''); }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-medium px-5 py-3 rounded-xl text-sm transition-colors"
              >
                Effacer
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* PROMOS */}
      <section id="offres" className="py-14 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <h2 className="font-display text-2xl text-charcoal-900">
                {activeCategory === 'Toutes les catégories' ? 'Tous les bons plans' : activeCategory}
              </h2>
              <p className="text-charcoal-500 text-sm mt-1">
                {filtered.length} bon plan{filtered.length !== 1 ? 's' : ''} trouvé{filtered.length !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-charcoal-500">Trier par</span>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value)}
                className="h-10 px-3 text-sm bg-stone-50 border border-stone-200 rounded-xl outline-none focus:border-rose-400"
              >
                {SORTS.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="h-96 bg-stone-100 rounded-2xl animate-pulse" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
    <article className="group bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-soft-xl transition-all duration-300 flex flex-col">
      <div className="relative aspect-[3/2] overflow-hidden">
        <img
          src={image}
          alt={promo.vendor.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
        <div className="absolute top-4 right-4 bg-rose-600 text-white text-sm font-bold px-4 py-2 rounded-full shadow-lg">
          {formatDiscount(promo)}
        </div>
        {remaining !== null && remaining <= 5 && (
          <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-3 py-1.5 rounded-full flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-champagne-300" /> {remaining}j restants
          </div>
        )}
      </div>

      <div className="p-6 flex-1 flex flex-col">
        <p className="text-xs uppercase tracking-wider text-rose-600 font-semibold mb-2">{promo.vendor.category}</p>
        <h3 className="font-serif text-2xl text-charcoal-900 mb-1 group-hover:text-rose-700 transition-colors">
          {promo.vendor.name}
        </h3>
        <p className="text-sm text-charcoal-500 flex items-center gap-1 mb-4">
          <MapPin className="w-3.5 h-3.5" /> {promo.vendor.location || 'France'}
        </p>

        <p className="text-sm text-charcoal-700 font-medium mb-2">{promo.title}</p>
        {promo.description && (
          <p className="text-sm text-charcoal-500 line-clamp-2 mb-4">{promo.description}</p>
        )}

        {promo.min_amount > 0 && (
          <p className="text-xs text-charcoal-400 mb-4">Dès {promo.min_amount} € de prestation</p>
        )}

        <div className="mt-auto pt-4 border-t border-stone-100 space-y-4">
          <div className="flex items-center justify-between gap-3 p-3 bg-stone-50 rounded-xl">
            <code className="font-mono text-sm font-semibold text-charcoal-900 tracking-widest truncate">
              {promo.code}
            </code>
            <button
              onClick={onCopy}
              className="flex-shrink-0 flex items-center gap-1.5 bg-white border border-stone-200 hover:border-rose-400 hover:text-rose-600 text-charcoal-700 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>

          <Link
            href={`/vendors/${promo.vendor.id}`}
            className="flex items-center justify-center gap-2 w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-3 rounded-xl transition-colors text-sm"
          >
            Voir le prestataire <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </article>
  );
}
