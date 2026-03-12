'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, addDocument } from '@/lib/db';
import { toast } from 'sonner';
import {
  Star, MapPin, Camera, ChevronLeft, ChevronRight, X,
  Search, Heart, MessageSquare, Send, List, Grid3X3,
  Tag, Zap, ChevronDown,
} from 'lucide-react';

interface Vendor {
  id: string;
  uid?: string;
  name: string;
  category: string;
  location?: string;
  address?: string;
  rating?: number;
  reviewCount?: number;
  imageUrl?: string;
  images?: string[];
  photo?: string;
  startingPrice?: string;
  description?: string;
  email?: string;
}

const CATEGORIES = [
  'Tous', 'Photographes', 'Vidéastes', 'Traiteurs', 'Fleuristes',
  'DJ & Musiciens', 'Décorateurs', 'Wedding Planners', 'Lieux de réception',
];

const STATIC_VENDORS: Vendor[] = [
  { id: 's1', name: 'Atelier Lumière', category: 'Photographes', location: 'Paris', rating: 5.0, reviewCount: 127,
    imageUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '2 500 €', description: 'Spécialiste du reportage photographique de mariage depuis 12 ans. Approche documentaire et artistique, chaque moment capturé avec sensibilité.' },
  { id: 's2', name: 'Maison Florale', category: 'Fleuristes', location: 'Lyon', rating: 4.8, reviewCount: 98,
    imageUrl: 'https://images.pexels.com/photos/1024960/pexels-photo-1024960.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '1 800 €', description: 'Créations florales de prestige. Bouquets, décorations de table, arches botaniques sur mesure pour votre mariage.' },
  { id: 's3', name: 'Saveurs & Délices', category: 'Traiteurs', location: 'Provence', rating: 5.0, reviewCount: 156,
    imageUrl: 'https://images.pexels.com/photos/1640772/pexels-photo-1640772.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '85 €/pers', description: 'Cuisine gastronomique française avec des produits locaux de saison. Menus entièrement personnalisés selon vos souhaits.' },
  { id: 's4', name: 'Harmonie Musicale', category: 'DJ & Musiciens', location: 'Bordeaux', rating: 4.9, reviewCount: 84,
    imageUrl: 'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '1 200 €', description: 'DJ et groupe de musiciens pour animer votre soirée. De la cérémonie au bal de nuit, une ambiance sur-mesure.' },
  { id: 's5', name: 'Vision Ciné', category: 'Vidéastes', location: 'Paris', rating: 4.9, reviewCount: 73,
    imageUrl: 'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '3 200 €', description: 'Films de mariage cinématographiques et émotionnels. Montage professionnel, musique originale, souvenirs pour toujours.' },
  { id: 's6', name: 'Élégance Déco', category: 'Décorateurs', location: 'Lyon', rating: 4.8, reviewCount: 91,
    imageUrl: 'https://images.pexels.com/photos/169198/pexels-photo-169198.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '3 500 €', description: 'Décoration de mariage haut de gamme. Tables, arches, luminaires, textiles — une scénographie complète.' },
  { id: 's7', name: 'Le Festin Royal', category: 'Traiteurs', location: 'Paris', rating: 4.9, reviewCount: 134,
    imageUrl: 'https://images.pexels.com/photos/1126359/pexels-photo-1126359.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '95 €/pers', description: 'Traiteur parisien pour mariages de prestige. Cuisine gastronomique et service en salle blanc.' },
  { id: 's8', name: 'Le Jardin Enchanté', category: 'Fleuristes', location: 'Provence', rating: 4.7, reviewCount: 62,
    imageUrl: 'https://images.pexels.com/photos/1616403/pexels-photo-1616403.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '2 200 €', description: 'Compositions florales bohème et romantiques. Fleurs de saison, couronnes, arches — le charme champêtre.' },
  { id: 's9', name: 'Studio Blanc', category: 'Photographes', location: 'Marseille', rating: 4.8, reviewCount: 109,
    imageUrl: 'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=800',
    startingPrice: '1 900 €', description: 'Photographe au style lumineux et naturel. Priorité aux émotions authentiques et aux moments spontanés.' },
];

const PRICE_OPTIONS = ['Moins de 500€', '500€ – 1 000€', '1 000€ – 2 000€', 'Plus de 2 000€'];
const SERVICE_OPTIONS = ['Séance d’engagement', 'Après le mariage', 'Album photo', 'Photos HD', 'Blu-ray / DVD'];
const PER_PAGE = 6;

export default function PrestatairesPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { client, event, loading: dataLoading } = useClientData();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState(searchParams.get('cat') || 'Tous');
  const [search, setSearch] = useState('');
  const [citySearch, setCitySearch] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [hasPromo, setHasPromo] = useState(false);
  const [priceFilters, setPriceFilters] = useState<string[]>([]);
  const [serviceFilters, setServiceFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState('recommandés');
  const [profile, setProfile] = useState<Vendor | null>(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [showContact, setShowContact] = useState(false);

  const togglePrice = (v: string) => setPriceFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);
  const toggleService = (v: string) => setServiceFilters(prev => prev.includes(v) ? prev.filter(x => x !== v) : [...prev, v]);

  useEffect(() => {
    const cat = searchParams.get('cat');
    if (cat) setCategory(cat);
  }, [searchParams]);

  useEffect(() => {
    getDocuments('vendors', [])
      .then(docs => setVendors(
        docs.length > 0
          ? (docs as Vendor[]).map(v => ({ ...v, imageUrl: (v as any).images?.[0] || (v as any).imageUrl || '' }))
          : STATIC_VENDORS
      ))
      .catch(() => setVendors(STATIC_VENDORS))
      .finally(() => setLoading(false));
  }, []);

  const coupleName = client
    ? `${client.name || ''}${client.name && client.partner ? ' & ' : ''}${client.partner || ''}`.trim()
    : event?.couple_names || user?.displayName || 'Client';

  const filtered = vendors.filter(v => {
    const matchCat = category === 'Tous' || v.category === category;
    const q = search.toLowerCase();
    const matchSearch = !q || v.name.toLowerCase().includes(q) || v.category.toLowerCase().includes(q);
    const matchCity = !citySearch || (v.location || '').toLowerCase().includes(citySearch.toLowerCase());
    const matchPromo = !hasPromo || (v as any).hasPromo;
    return matchCat && matchSearch && matchCity && matchPromo;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const openProfile = useCallback((v: Vendor) => {
    setProfile(v);
    setShowContact(false);
    setMessage(`Bonjour, je suis ${coupleName} et je souhaite en savoir plus sur vos prestations pour notre mariage.`);
  }, [coupleName]);

  const handleContact = async () => {
    if (!user || !message.trim() || !profile || !client?.id) {
      toast.error('Profil client introuvable.');
      return;
    }
    setSending(true);
    try {
      const existingConvs = await getDocuments('conversations', [
        { field: 'client_id', operator: '==', value: client.id },
      ]);
      const existing = (existingConvs as any[]).find(c => c.vendor_id === (profile.uid || profile.id));
      let convId: string;
      if (existing) {
        convId = existing.id;
      } else {
        const ref = await addDocument('conversations', {
          client_id: client.id,
          vendor_id: profile.uid || profile.id,
          client_name: coupleName,
          vendor_name: profile.name,
          vendor_email: profile.email || '',
          type: 'vendor',
          last_message: message.trim(),
          last_message_at: new Date().toISOString(),
          unread_count_vendor: 1,
          unread_count_client: 0,
          created_at: new Date().toISOString(),
        });
        convId = ref.id;
      }
      await addDocument('messages', {
        conversation_id: convId,
        sender_id: user.uid,
        sender_role: 'client',
        sender_name: coupleName,
        content: message.trim(),
        created_at: new Date().toISOString(),
      });
      toast.success(`Message envoyé à ${profile.name} !`);
      setProfile(null);
      router.push('/espace-client/messages');
    } catch {
      toast.error("Erreur lors de l'envoi.");
    } finally {
      setSending(false);
    }
  };

  if (dataLoading || loading) return (
    <div className="space-y-5 animate-pulse">
      <div className="h-10 w-56 bg-white/60 rounded-xl" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white/60 rounded-2xl" />)}
      </div>
      <div className="flex gap-5">
        <div className="w-52 flex-shrink-0 hidden lg:block space-y-3">
          {[1,2,3,4].map(i => <div key={i} className="h-8 bg-white/60 rounded-xl" />)}
        </div>
        <div className="flex-1 space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-36 bg-white/60 rounded-2xl" />)}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">

      {/* ── GREETING + SEARCH ROW ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            {category === 'Tous' ? 'Vos prestataires' : category}
          </h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {filtered.length} prestataire{filtered.length !== 1 ? 's' : ''} disponible{filtered.length !== 1 ? 's' : ''}
          </p>
        </div>
        {/* Search row */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-stone-200 shadow-sm">
            <Search className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
            <input type="text" value={search} onChange={e => { setSearch(e.target.value); setPage(1); }}
              placeholder="Nom, catégorie…"
              className="text-sm text-charcoal-700 placeholder-charcoal-400 bg-transparent outline-none w-28" />
          </div>
          <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-stone-200 shadow-sm">
            <MapPin className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
            <input type="text" value={citySearch} onChange={e => { setCitySearch(e.target.value); setPage(1); }}
              placeholder="Ville…"
              className="text-sm text-charcoal-700 placeholder-charcoal-400 bg-transparent outline-none w-20" />
          </div>
        </div>
      </div>

      {/* ── STATS STRIP ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Prestataires', value: vendors.length },
          { label: 'Photographes', value: vendors.filter(v => v.category === 'Photographes').length },
          { label: 'Traiteurs', value: vendors.filter(v => v.category === 'Traiteurs').length },
          { label: 'Fleuristes', value: vendors.filter(v => v.category === 'Fleuristes').length },
        ].map(({ label, value }) => (
          <div key={label} className="bg-white rounded-2xl shadow-sm p-4">
            <p className="font-serif text-charcoal-900 leading-none" style={{ fontSize: '1.75rem', fontWeight: 300 }}>{value}</p>
            <p className="text-xs text-charcoal-500 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* ── CATEGORY PILLS ── */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map(cat => (
          <button key={cat} onClick={() => { setCategory(cat); setPage(1); }}
            className={`px-3.5 py-1.5 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
              category === cat ? 'bg-charcoal-900 text-white shadow-sm' : 'bg-white text-charcoal-600 hover:bg-stone-100 border border-stone-200'
            }`}>
            {cat}
          </button>
        ))}
      </div>

      {/* ── MAIN CONTENT — sidebar + results ── */}
      <div className="flex gap-5 items-start">

        {/* LEFT SIDEBAR */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <div className="bg-white rounded-2xl shadow-sm p-4 space-y-5">
            <div>
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">Filtres</p>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm text-charcoal-700 flex items-center gap-2"><Tag className="w-3.5 h-3.5 text-rose-500" /> Promotions</span>
                <div onClick={() => setHasPromo(p => !p)} className={`w-10 h-5 rounded-full transition-colors cursor-pointer relative ${hasPromo ? 'bg-charcoal-900' : 'bg-stone-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${hasPromo ? 'left-5' : 'left-0.5'}`} />
                </div>
              </label>
            </div>
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">Prix</p>
              <div className="space-y-2">
                {PRICE_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={priceFilters.includes(opt)} onChange={() => togglePrice(opt)} className="w-3.5 h-3.5 rounded accent-charcoal-900" />
                    <span className="text-sm text-charcoal-600">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="border-t border-stone-100 pt-4">
              <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-3">Services</p>
              <div className="space-y-2">
                {SERVICE_OPTIONS.map(opt => (
                  <label key={opt} className="flex items-center gap-2.5 cursor-pointer">
                    <input type="checkbox" checked={serviceFilters.includes(opt)} onChange={() => toggleService(opt)} className="w-3.5 h-3.5 rounded accent-charcoal-900" />
                    <span className="text-sm text-charcoal-600">{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </aside>

        {/* RESULTS */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-charcoal-500">{filtered.length} résultat{filtered.length !== 1 ? 's' : ''}</p>
            <div className="flex items-center gap-2">
              <div className="flex bg-white rounded-xl border border-stone-200 overflow-hidden shadow-sm">
                <button onClick={() => setViewMode('list')} className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'list' ? 'bg-charcoal-900 text-white' : 'text-charcoal-600 hover:bg-stone-100'}`}>
                  <List className="w-3.5 h-3.5" /> Liste
                </button>
                <button onClick={() => setViewMode('grid')} className={`px-3 py-2 flex items-center gap-1.5 text-sm transition-colors ${viewMode === 'grid' ? 'bg-charcoal-900 text-white' : 'text-charcoal-600 hover:bg-stone-100'}`}>
                  <Grid3X3 className="w-3.5 h-3.5" /> Photos
                </button>
              </div>
              <select value={sortBy} onChange={e => setSortBy(e.target.value)}
                className="bg-white border border-stone-200 rounded-xl px-3 py-2 text-sm text-charcoal-700 outline-none shadow-sm">
                <option value="recommandés">Recommandés</option>
                <option value="note">Note (décroissante)</option>
                <option value="prix-asc">Prix (croissant)</option>
              </select>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm py-20 text-center">
              <p className="text-charcoal-500 font-medium">Aucun prestataire trouvé</p>
              <p className="text-sm text-charcoal-400 mt-1">Modifiez votre recherche ou vos filtres</p>
            </div>
          ) : viewMode === 'list' ? (
            <div className="space-y-3">
              {paginated.map(vendor => {
                const photo = vendor.imageUrl || vendor.images?.[0] || vendor.photo || '';
                return (
                  <article key={vendor.id} className="bg-white rounded-2xl shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col sm:flex-row">
                    <div className="sm:w-44 h-40 sm:h-auto flex-shrink-0 overflow-hidden relative cursor-pointer" onClick={() => openProfile(vendor)}>
                      {photo ? (
                        <img src={photo} alt={vendor.name} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-stone-100 flex items-center justify-center"><Camera className="w-8 h-8 text-charcoal-300" /></div>
                      )}
                    </div>
                    <div className="flex-1 p-5 flex flex-col justify-between">
                      <div>
                        <div className="flex items-start justify-between mb-1.5">
                          <button onClick={() => openProfile(vendor)} className="text-left">
                            <h3 className="font-serif text-charcoal-900 text-lg font-light hover:text-rose-600 transition-colors">{vendor.name}</h3>
                          </button>
                          <button onClick={() => setFavorites(prev => { const n = new Set(prev); n.has(vendor.id) ? n.delete(vendor.id) : n.add(vendor.id); return n; })}
                            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-rose-50 transition-colors ml-2 flex-shrink-0">
                            <Heart className={`w-4 h-4 ${favorites.has(vendor.id) ? 'text-rose-500 fill-rose-500' : 'text-charcoal-300 hover:text-rose-500'}`} />
                          </button>
                        </div>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-xs font-medium text-charcoal-500 bg-stone-100 px-2 py-0.5 rounded-full">{vendor.category}</span>
                          {(vendor.location || vendor.address) && (
                            <span className="text-xs text-charcoal-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{vendor.location || vendor.address}</span>
                          )}
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            <span className="text-xs font-semibold text-charcoal-700">{vendor.rating || '—'}</span>
                            <span className="text-xs text-charcoal-400">({vendor.reviewCount || 0})</span>
                          </div>
                        </div>
                        {vendor.description && <p className="text-sm text-charcoal-500 line-clamp-2 leading-relaxed">{vendor.description}</p>}
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-3 border-t border-stone-100">
                        <div className="flex items-center gap-3">
                          {vendor.startingPrice && <span className="text-sm text-charcoal-700">À partir de <strong>{vendor.startingPrice}</strong></span>}
                          {(vendor as any).hasPromo && <span className="text-xs text-rose-600 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded-full"><Tag className="w-3 h-3" /> Promo</span>}
                        </div>
                        <button onClick={() => openProfile(vendor)}
                          className="bg-charcoal-900 hover:bg-charcoal-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors">
                          Contacter
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {paginated.map(vendor => {
                const photo = vendor.imageUrl || vendor.images?.[0] || vendor.photo || '';
                return (
                  <div key={vendor.id} className="group cursor-pointer" onClick={() => openProfile(vendor)}>
                    <article className="relative h-60 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-200">
                      {photo ? (
                        <img src={photo} alt={vendor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full bg-stone-200 flex items-center justify-center"><Camera className="w-8 h-8 text-charcoal-400" /></div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
                      <button onClick={e => { e.stopPropagation(); setFavorites(prev => { const n = new Set(prev); n.has(vendor.id) ? n.delete(vendor.id) : n.add(vendor.id); return n; }); }}
                        className="absolute top-3 right-3 w-7 h-7 rounded-full bg-white/80 flex items-center justify-center">
                        <Heart className={`w-3.5 h-3.5 ${favorites.has(vendor.id) ? 'text-rose-500 fill-rose-500' : 'text-charcoal-500'}`} />
                      </button>
                      <div className="absolute bottom-0 p-4">
                        <p className="text-[0.65rem] text-white/60 mb-0.5 uppercase tracking-wider">{vendor.category}</p>
                        <h3 className="font-serif text-white font-light text-base">{vendor.name}</h3>
                        <div className="flex items-center gap-1.5 mt-1">
                          <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                          <span className="text-xs text-white/80">{vendor.rating || '—'}</span>
                          {vendor.startingPrice && <span className="text-xs text-white/50">· {vendor.startingPrice}</span>}
                        </div>
                      </div>
                    </article>
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl border border-stone-200 text-sm text-charcoal-600 hover:bg-stone-100 disabled:opacity-40 transition-colors shadow-sm">
                <ChevronLeft className="w-3.5 h-3.5" /> Préc.
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-sm font-medium transition-colors shadow-sm ${
                    p === page ? 'bg-charcoal-900 text-white' : 'bg-white border border-stone-200 text-charcoal-700 hover:bg-stone-100'
                  }`}>{p}</button>
              ))}
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="flex items-center gap-1 px-3 py-2 bg-white rounded-xl border border-stone-200 text-sm text-charcoal-600 hover:bg-stone-100 disabled:opacity-40 transition-colors shadow-sm">
                Suiv. <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── VENDOR PROFILE SLIDE-OVER ── */}
      {profile && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-charcoal-900/50" onClick={() => setProfile(null)} />
          <div className="relative w-full max-w-lg bg-white shadow-2xl flex flex-col overflow-hidden">
            {/* Hero image */}
            <div className="relative h-64 bg-charcoal-100 flex-shrink-0">
              {(profile.imageUrl || profile.images?.[0] || profile.photo) ? (
                <img src={profile.imageUrl || profile.images?.[0] || profile.photo || ''} alt={profile.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center"><Camera className="w-14 h-14 text-charcoal-300" /></div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-charcoal-900/60 to-transparent" />
              <button onClick={() => setProfile(null)} className="absolute top-4 right-4 w-8 h-8 bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/40 transition-colors">
                <X className="w-4 h-4 text-white" />
              </button>
              <div className="absolute bottom-0 left-0 right-0 px-6 pb-5">
                <p className="label-xs text-white/60 mb-1 tracking-[0.12em]">{profile.category}</p>
                <h2 className="font-serif text-white" style={{ fontSize: '1.5rem', fontWeight: 300, lineHeight: 1.1 }}>{profile.name}</h2>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
              {/* Meta */}
              <div className="px-6 py-5 border-b border-charcoal-100">
                <div className="flex items-center gap-5 flex-wrap">
                  {profile.rating && (
                    <div className="flex items-center gap-1.5">
                      <div className="flex gap-0.5">
                        {[1,2,3,4,5].map(i => <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(profile.rating!) ? 'text-champagne-500 fill-champagne-500' : 'text-charcoal-200'}`} />)}
                      </div>
                      <span className="text-sm text-charcoal-500 font-light">{profile.rating} · {profile.reviewCount} avis</span>
                    </div>
                  )}
                  {(profile.location || profile.address) && (
                    <p className="text-sm text-charcoal-500 font-light flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-charcoal-400" />{profile.location || profile.address}
                    </p>
                  )}
                  {profile.startingPrice && (
                    <p className="label-xs text-champagne-700 tracking-[0.08em]">À partir de {profile.startingPrice}</p>
                  )}
                </div>
              </div>

              {profile.description && (
                <div className="px-6 py-5 border-b border-charcoal-100">
                  <p className="label-xs text-charcoal-400 mb-3 tracking-[0.1em]">À propos</p>
                  <p className="text-charcoal-700 text-sm font-light leading-relaxed">{profile.description}</p>
                </div>
              )}

              {/* Contact form */}
              {showContact ? (
                <div className="px-6 py-5">
                  <p className="label-xs text-charcoal-400 mb-3 tracking-[0.1em]">Votre message</p>
                  <textarea
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    rows={5}
                    className="w-full px-4 py-3 border border-charcoal-200 text-sm bg-ivory-50 focus:outline-none focus:border-charcoal-400 transition-colors resize-none"
                  />
                  <div className="flex gap-3 mt-4">
                    <button onClick={() => setShowContact(false)} className="flex-1 py-2.5 border border-charcoal-200 text-charcoal-700 text-sm font-light hover:bg-charcoal-50 transition-colors">
                      Annuler
                    </button>
                    <button
                      onClick={handleContact}
                      disabled={!message.trim() || sending}
                      className="flex-1 py-2.5 bg-charcoal-900 text-white text-sm font-medium hover:bg-charcoal-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Send className="w-3.5 h-3.5" />
                      {sending ? 'Envoi…' : 'Envoyer'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="px-6 py-5">
                  <button
                    onClick={() => setShowContact(true)}
                    className="w-full flex items-center justify-center gap-2.5 py-3.5 bg-charcoal-900 text-white text-sm font-medium tracking-[0.05em] hover:bg-charcoal-700 transition-colors"
                  >
                    <MessageSquare className="w-4 h-4" /> Contacter ce prestataire
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
