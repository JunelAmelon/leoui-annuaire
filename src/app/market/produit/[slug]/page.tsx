'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ListingCard from '@/components/market/ListingCard';
import ListingMap from '@/components/market/ListingMap';
import ListingGallery from '@/components/market/ListingGallery';
import { Avatar } from '@/components/market/ui';
import ContactSeller from '@/components/market/ContactSeller';
import { MarketListing } from '@/lib/market/types';
import { MARKET_CATEGORIES, CONDITION_LABELS } from '@/lib/market/categories';
import { formatLocation, splitCityLabel } from '@/lib/market/utils';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import {
  MapPin, Truck, Handshake, ShieldCheck, Lock,
  ChevronRight, ArrowLeft, Loader2, Flag, Info,
  BadgeCheck, Star, CalendarDays, Phone, Mail, Eye,
  AlertTriangle, Pause, Play, Trash2, X,
  Tag, Layers, Palette, Ruler, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface SellerPublic {
  display_name: string;
  status: 'particulier' | 'professionnel';
  verified: { email: boolean; phone: boolean; identity: boolean };
  rating_avg: number;
  rating_count: number;
  photo_url?: string | null;
  bio?: string | null;
  created_at: string;
}

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: 'article_interdit', label: 'Article interdit ou dangereux' },
  { value: 'annonce_trompeuse', label: 'Annonce trompeuse ou contrefaçon' },
  { value: 'photos_mensongeres', label: 'Photos ne correspondant pas à l’article' },
  { value: 'prix_abusif', label: 'Prix abusif ou arnaque suspectée' },
  { value: 'autre', label: 'Autre motif' },
];

const SERVICE_FEE_RATE = 0.05;
const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const memberSince = (iso?: string) =>
  iso ? `Membre depuis ${new Date(iso).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}` : '';

const publishedAgo = (iso?: string) => {
  if (!iso) return '';
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (days <= 0) return 'Publiée aujourd’hui';
  if (days === 1) return 'Publiée hier';
  if (days < 30) return `Publiée il y a ${days} jours`;
  return `Publiée le ${new Date(iso).toLocaleDateString('fr-FR')}`;
};

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params?.slug as string;
  const { user } = useAuth();

  const [listing, setListing] = useState<MarketListing | null>(null);
  const [seller, setSeller] = useState<SellerPublic | null>(null);
  const [similarListings, setSimilarListings] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedDesc, setExpandedDesc] = useState(false);

  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [deliveryMode, setDeliveryMode] = useState<'shipping' | 'pickup'>('shipping');
  const [favorited, setFavorited] = useState(false);

  const [reportOpen, setReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState(REPORT_REASONS[0].value);
  const [reportComment, setReportComment] = useState('');
  const [reportSending, setReportSending] = useState(false);
  const [busyAction, setBusyAction] = useState(false);

  const isOwner = !!user && !!listing && user.uid === listing.seller_id;
  const loginUrl = `/market/connexion?next=${encodeURIComponent(`/market/produit/${slug}`)}`;

  useEffect(() => {
    if (!slug) return;
    setLoading(true);

    async function loadListing() {
      try {
        const res = await fetch(`/api/market/listings/${slug}`);
        const data = await res.json();
        if (!res.ok || !data.ok || !data.listing) {
          setListing(null);
          return;
        }
        const item: MarketListing = data.listing;
        setListing(item);
        setSeller(data.seller || null);
        if (item.delivery.shipping) setDeliveryMode('shipping');
        else if (item.delivery.pickup) setDeliveryMode('pickup');

        fetch(`/api/market/listings?category=${item.category}&limit=5`)
          .then((r) => r.json())
          .then((resSim) => {
            if (resSim.ok && Array.isArray(resSim.listings)) {
              setSimilarListings(resSim.listings.filter((l: MarketListing) => l.id !== item.id).slice(0, 4));
            }
          })
          .catch(() => {});
      } catch {
        setListing(null);
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [slug]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: listing?.title || 'Annonce LeOui Market', url: window.location.href });
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Lien de l’annonce copié !');
    }
  };

  const handleFavorite = () => {
    if (!user) return router.push(loginUrl);
    setFavorited((v) => !v);
    toast.success(favorited ? 'Retiré de vos favoris' : 'Ajouté à vos favoris');
  };

  const handleBuy = () => {
    if (!user) return router.push(loginUrl);
    router.push(`/market/achat/${listing?.id}?qty=${selectedQuantity}&mode=${deliveryMode}`);
  };

  const handleReport = async () => {
    if (!user) return router.push(loginUrl);
    setReportSending(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/market/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ listing_id: listing?.id, reason: reportReason, comment: reportComment }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur');
      toast.success('Signalement envoyé. Notre équipe va l’examiner.');
      setReportOpen(false);
      setReportComment('');
    } catch (e: any) {
      toast.error(e.message || 'Impossible d’envoyer le signalement');
    } finally {
      setReportSending(false);
    }
  };

  const ownerAction = async (action: 'pause' | 'activate' | 'delete') => {
    if (!listing || busyAction) return;
    if (action === 'delete' && !confirm('Supprimer définitivement cette annonce ?')) return;
    setBusyAction(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = action === 'delete'
        ? await fetch(`/api/market/listings/${listing.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
        : await fetch(`/api/market/listings/${listing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ status: action === 'pause' ? 'paused' : 'active' }),
          });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur');
      if (action === 'delete') {
        toast.success('Annonce supprimée');
        router.push('/market/annonces');
      } else {
        setListing({ ...listing, status: action === 'pause' ? 'paused' : 'active' });
        toast.success(action === 'pause' ? 'Annonce mise en pause' : 'Annonce republiée');
      }
    } catch (e: any) {
      toast.error(e.message || 'Action impossible');
    } finally {
      setBusyAction(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-ivory-50 flex flex-col justify-between">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-ivory-50 flex flex-col justify-between">
        <Header />
        <div className="max-w-xl mx-auto px-4 py-32 text-center">
          <h1 className="font-serif text-3xl text-charcoal-900 mb-3">Annonce introuvable</h1>
          <p className="text-sm text-charcoal-500 mb-8">
            Cet article n’est plus disponible ou a été retiré de la marketplace.
          </p>
          <Link
            href="/market/annonces"
            className="inline-flex items-center gap-2 bg-rose-600 text-white font-semibold px-6 py-3 rounded-full text-sm hover:bg-rose-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Parcourir les autres annonces
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const cat = MARKET_CATEGORIES.find((c) => c.slug === listing.category);
  const subcat = cat?.subcategories.find((s) => s.slug === listing.subcategory);
  const images = listing.images || [];
  const locationLabel = formatLocation(listing.location.city, listing.location.postal_code);
  const cityOnly = splitCityLabel(listing.location.city).city;

  const available = listing.status === 'active' && listing.quantity > 0;
  const itemsTotal = listing.price * selectedQuantity;
  const shippingCost = deliveryMode === 'shipping' ? (listing.delivery.shipping_cost || 0) : 0;
  const serviceFee = Math.round(itemsTotal * SERVICE_FEE_RATE * 100) / 100;
  const grandTotal = Math.round((itemsTotal + shippingCost + serviceFee) * 100) / 100;
  const bothModes = listing.delivery.shipping && listing.delivery.pickup;

  const keyInfos: { icon: LucideIcon; label: string; value: string }[] = [
    { icon: BadgeCheck, label: 'État', value: CONDITION_LABELS[listing.condition] || listing.condition },
    { icon: Tag, label: 'Catégorie', value: cat?.label || listing.category },
    ...(subcat ? [{ icon: Layers, label: 'Sous-catégorie', value: subcat.label }] : []),
    ...(listing.attributes?.material ? [{ icon: Layers, label: 'Matière', value: listing.attributes.material }] : []),
    ...(listing.attributes?.color ? [{ icon: Palette, label: 'Couleur', value: listing.attributes.color }] : []),
    ...(listing.attributes?.dimensions ? [{ icon: Ruler, label: 'Dimensions', value: listing.attributes.dimensions }] : []),
  ];

  const steps = [
    { n: '01', title: 'Vous payez en sécurité', text: 'Votre paiement est bloqué : le vendeur ne reçoit rien tout de suite.' },
    { n: '02', title: listing.delivery.pickup && !listing.delivery.shipping ? 'Remise en main propre' : 'Envoi ou remise', text: 'Le vendeur expédie avec suivi ou vous remet l’article avec un code unique.' },
    { n: '03', title: 'Vous confirmez, il est payé', text: 'Une fois l’article reçu et vérifié, vous libérez le paiement.' },
  ];

  return (
    <div className="min-h-screen bg-ivory-50 flex flex-col justify-between">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full flex-1 pb-28 lg:pb-10">
        {/* FIL D'ARIANE */}
        <div className="flex items-center gap-2 text-xs text-charcoal-500 mb-5 flex-wrap">
          <Link href="/market" className="hover:text-rose-600 transition-colors">LeOui Market</Link>
          <ChevronRight className="w-3 h-3 text-charcoal-400" />
          <Link href={`/market/annonces?category=${listing.category}`} className="hover:text-rose-600 transition-colors">
            {cat?.label || listing.category}
          </Link>
          <ChevronRight className="w-3 h-3 text-charcoal-400" />
          <span className="text-charcoal-900 font-medium truncate max-w-[16rem]">{listing.title}</span>
        </div>

        {/* Grille : galerie + panneau d'achat remontent ensemble, détails dessous.
            Mobile : galerie → panneau d'achat → détails (le bouton n'est jamais « tout en bas »). */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-x-8 gap-y-6">

          {/* ── GALERIE (mosaïque + visionneuse) ── */}
          <div className="lg:col-span-7 lg:col-start-1 lg:row-start-1">
            <ListingGallery
              images={images}
              title={listing.title}
              badge={!available ? (listing.status === 'sold' || listing.quantity === 0 ? 'Vendu' : 'Indisponible') : undefined}
              favorited={favorited}
              onFavorite={handleFavorite}
              onShare={handleShare}
            />
          </div>

          {/* ── PANNEAU D'ACHAT : compact, CTA visible dès l'arrivée, sticky sur desktop ── */}
          <aside className="lg:col-span-5 lg:col-start-8 lg:row-start-1 lg:row-span-2 lg:self-start lg:sticky lg:top-24">
            <div className="bg-white rounded-[28px] border border-charcoal-100 shadow-soft-xl p-5 sm:p-6">
              {/* Titre + actions */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <span className="text-[11px] font-semibold tracking-wider uppercase text-rose-600">
                      {cat?.label || listing.category}
                    </span>
                    {listing.quantity === 1 && available && (
                      <span className="text-[11px] font-semibold bg-rose-50 text-rose-700 px-2 py-0.5 rounded-full">
                        Pièce unique
                      </span>
                    )}
                  </div>
                  <h1 className="font-serif text-2xl text-charcoal-900 leading-snug">{listing.title}</h1>
                </div>
                
              </div>

              <p className="flex items-center gap-1.5 text-sm text-charcoal-500 mt-2">
                <MapPin className="w-4 h-4 text-charcoal-400 flex-shrink-0" /> {locationLabel}
              </p>

              {/* Prix */}
              <div className="flex items-end justify-between gap-3 mt-4 pb-4 border-b border-charcoal-100">
                <div className="flex items-baseline gap-1.5">
                  <span className="font-serif text-4xl text-charcoal-900 leading-none">{eur(listing.price)} €</span>
                  {listing.quantity > 1 && <span className="text-xs text-charcoal-400">/ unité</span>}
                </div>
                <span className="text-xs text-charcoal-500 pb-0.5">
                  {listing.quantity} disponible{listing.quantity > 1 ? 's' : ''}
                </span>
              </div>

              {isOwner ? (
                /* ── Vue propriétaire : gestion de l'annonce à la place du CTA ── */
                <div className="pt-4 space-y-3">
                  <p className="text-sm text-charcoal-600">
                    <span className="font-semibold text-charcoal-900">C’est votre annonce.</span>{' '}
                    {listing.status === 'active' ? 'Elle est visible par tous les acheteurs.' : 'Elle est actuellement masquée.'}
                  </p>
                  <Link
                    href={`/market/modifier-annonce/${listing.id}`}
                    className="flex items-center justify-center h-11 rounded-xl bg-charcoal-900 hover:bg-black text-white text-sm font-semibold transition-colors"
                  >
                    Modifier l’annonce
                  </Link>
                  <div className="grid grid-cols-2 gap-2">
                    {listing.status === 'active' ? (
                      <button
                        onClick={() => ownerAction('pause')}
                        disabled={busyAction}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-sm font-semibold hover:bg-amber-100 transition-colors"
                      >
                        <Pause className="w-4 h-4" /> Mettre en pause
                      </button>
                    ) : (
                      <button
                        onClick={() => ownerAction('activate')}
                        disabled={busyAction}
                        className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-green-50 text-green-800 border border-green-200 text-sm font-semibold hover:bg-green-100 transition-colors"
                      >
                        <Play className="w-4 h-4" /> Republier
                      </button>
                    )}
                    <button
                      onClick={() => ownerAction('delete')}
                      disabled={busyAction}
                      className="inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-50 text-red-700 border border-red-200 text-sm font-semibold hover:bg-red-100 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" /> Supprimer
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* Mode de réception : tuiles compactes */}
                  <div className="pt-4">
                    <p className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider mb-2">Réception</p>
                    <div className={`grid gap-2 ${bothModes ? 'grid-cols-2' : 'grid-cols-1'}`}>
                      {listing.delivery.shipping && (
                        <button
                          type="button"
                          onClick={() => setDeliveryMode('shipping')}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            deliveryMode === 'shipping' ? 'border-rose-600 bg-rose-50/60 ring-1 ring-rose-600' : 'border-charcoal-200 hover:border-charcoal-300'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-charcoal-900">
                            <Truck className="w-4 h-4" /> Colis suivi
                          </span>
                          <span className="block text-xs text-charcoal-500 mt-0.5">
                            {(listing.delivery.shipping_cost || 0) > 0 ? `+ ${eur(listing.delivery.shipping_cost || 0)} €` : 'Livraison offerte'}
                          </span>
                        </button>
                      )}
                      {listing.delivery.pickup && (
                        <button
                          type="button"
                          onClick={() => setDeliveryMode('pickup')}
                          className={`text-left p-3 rounded-xl border transition-all ${
                            deliveryMode === 'pickup' ? 'border-rose-600 bg-rose-50/60 ring-1 ring-rose-600' : 'border-charcoal-200 hover:border-charcoal-300'
                          }`}
                        >
                          <span className="flex items-center gap-1.5 text-sm font-semibold text-charcoal-900">
                            <Handshake className="w-4 h-4" /> Main propre
                          </span>
                          <span className="block text-xs text-green-700 font-medium mt-0.5">Gratuit · {cityOnly}</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {listing.quantity > 1 && (
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider">Quantité</span>
                      <div className="flex items-center border border-charcoal-200 rounded-xl overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSelectedQuantity(Math.max(1, selectedQuantity - 1))}
                          className="w-9 h-9 text-charcoal-600 hover:bg-charcoal-50"
                          aria-label="Diminuer"
                        >
                          −
                        </button>
                        <span className="w-9 text-center text-sm font-semibold text-charcoal-900">{selectedQuantity}</span>
                        <button
                          type="button"
                          onClick={() => setSelectedQuantity(Math.min(listing.quantity, selectedQuantity + 1))}
                          className="w-9 h-9 text-charcoal-600 hover:bg-charcoal-50"
                          aria-label="Augmenter"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  )}

                  {/* CTA principal */}
                  <button
                    onClick={handleBuy}
                    disabled={!available}
                    className="mt-4 w-full h-11 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-300 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {available ? (
                      <>
                        <Lock className="w-4 h-4" /> Acheter · {eur(grandTotal)} €
                      </>
                    ) : (
                      'Article indisponible'
                    )}
                  </button>
                  <p className="text-[11px] text-charcoal-400 text-center mt-2">
                    Dont {eur(serviceFee)} € de protection acheteur (5 %)
                    {shippingCost > 0 ? ` et ${eur(shippingCost)} € de livraison` : ''}
                  </p>

                  <ContactSeller
                    sellerId={listing.seller_id}
                    sellerName={seller?.display_name || 'le vendeur'}
                    sellerPhoto={seller?.photo_url}
                    listing={{ id: listing.id, title: listing.title, image: listing.images?.[0], price: listing.price }}
                    className="w-full mt-3"
                  />

                  {/* Réassurance — uniquement des garanties réellement en place */}
                  <ul className="mt-4 pt-4 border-t border-charcoal-100 space-y-2.5 text-xs text-charcoal-600">
                    <li className="flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-rose-600 flex-shrink-0 mt-px" />
                      <span><strong className="text-charcoal-900">Paiement bloqué</strong> jusqu’à ce que vous confirmiez la réception.</span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      {deliveryMode === 'pickup'
                        ? <Handshake className="w-4 h-4 text-rose-600 flex-shrink-0 mt-px" />
                        : <Truck className="w-4 h-4 text-rose-600 flex-shrink-0 mt-px" />}
                      <span>
                        {deliveryMode === 'pickup'
                          ? <><strong className="text-charcoal-900">Remise validée par un code unique</strong> saisi au moment de l’échange.</>
                          : <><strong className="text-charcoal-900">Envoi avec numéro de suivi</strong> renseigné par le vendeur.</>}
                      </span>
                    </li>
                    <li className="flex items-start gap-2.5">
                      <BadgeCheck className="w-4 h-4 text-rose-600 flex-shrink-0 mt-px" />
                      <span>Un problème ? <strong className="text-charcoal-900">Ne confirmez pas</strong> : les fonds restent bloqués.</span>
                    </li>
                  </ul>
                </>
              )}

              {/* Vendeur — compact, au contact du CTA */}
              {seller && (
                <div className="mt-5 pt-4 border-t border-charcoal-100 flex items-center gap-3">
                  <Avatar name={seller.display_name} photoUrl={seller.photo_url} size={40} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-charcoal-900 truncate">
                      {seller.display_name}
                      {seller.status === 'professionnel' && (
                        <span className="ml-1.5 text-[10px] font-bold uppercase tracking-wide bg-champagne-100 text-champagne-700 px-1.5 py-0.5 rounded-full align-middle">Pro</span>
                      )}
                    </p>
                    <p className="text-xs text-charcoal-500 flex items-center gap-1">
                      {seller.rating_count > 0 ? (
                        <><Star className="w-3 h-3 text-amber-400 fill-amber-400" /> {seller.rating_avg.toFixed(1)} · {seller.rating_count} avis</>
                      ) : (
                        'Nouveau vendeur'
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/market/vendeur/${listing.seller_id}`}
                    className="text-xs font-semibold text-rose-600 hover:underline whitespace-nowrap"
                  >
                    Ses annonces
                  </Link>
                </div>
              )}
            </div>
          </aside>

          {/* ── DÉTAILS : une seule carte, sections séparées par des filets ── */}
          <div className="lg:col-span-7 lg:col-start-1 lg:row-start-2 space-y-4">
            <div className="bg-white rounded-[28px] border border-charcoal-100 divide-y divide-charcoal-100 overflow-hidden">

              {/* Infos clés */}
              <section className="p-6 sm:p-8">
                <h2 className="font-serif text-xl text-charcoal-900 mb-5">Les informations clés</h2>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-10 gap-y-4">
                  {keyInfos.map((info) => (
                    <div key={info.label} className="flex items-center gap-3 min-w-0">
                      <span className="w-9 h-9 rounded-full bg-ivory-100 flex items-center justify-center flex-shrink-0">
                        <info.icon className="w-4 h-4 text-charcoal-600" />
                      </span>
                      <dt className="text-sm text-charcoal-500 w-24 flex-shrink-0">{info.label}</dt>
                      <dd className="text-sm font-semibold text-charcoal-900 truncate">{info.value}</dd>
                    </div>
                  ))}
                </dl>
              </section>

              {/* Description */}
              <section className="p-6 sm:p-8">
                <h2 className="font-serif text-xl text-charcoal-900 mb-4">Description</h2>
                <div className={`text-[15px] text-charcoal-700 leading-relaxed whitespace-pre-line ${expandedDesc ? '' : 'line-clamp-5'}`}>
                  {listing.description}
                </div>
                {listing.description.length > 280 && (
                  <button
                    onClick={() => setExpandedDesc((v) => !v)}
                    className="mt-3 text-sm font-semibold text-charcoal-900 underline underline-offset-4 hover:text-rose-600"
                  >
                    {expandedDesc ? 'Voir moins' : 'Voir plus'}
                  </button>
                )}

                {listing.attributes?.defects && (
                  <div className="mt-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span><strong>Défauts signalés :</strong> {listing.attributes.defects}</span>
                  </div>
                )}

                <p className="mt-5 flex items-center gap-4 text-xs text-charcoal-400">
                  <span>{publishedAgo(listing.published_at)}</span>
                  {listing.views_count > 0 && (
                    <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" /> {listing.views_count} vue{listing.views_count > 1 ? 's' : ''}</span>
                  )}
                </p>
              </section>

              {/* Comment ça se passe */}
              <section className="p-6 sm:p-8 bg-ivory-50/60">
                <h2 className="font-serif text-xl text-charcoal-900 mb-5">Comment se passe votre achat</h2>
                <ol className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {steps.map((s) => (
                    <li key={s.n}>
                      <span className="font-serif text-3xl text-rose-300 leading-none">{s.n}</span>
                      <p className="text-sm font-semibold text-charcoal-900 mt-2">{s.title}</p>
                      <p className="text-xs text-charcoal-500 mt-1 leading-relaxed">{s.text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              {/* Localisation */}
              <section className="p-6 sm:p-8">
                <h2 className="font-serif text-xl text-charcoal-900 mb-1">Localisation</h2>
                <p className="text-sm text-charcoal-600 mb-4">{locationLabel}</p>
                <ListingMap city={cityOnly} postalCode={listing.location.postal_code || splitCityLabel(listing.location.city).postal} />
              </section>

              {/* Vendeur */}
              {seller && (
                <section className="p-6 sm:p-8">
                  <h2 className="font-serif text-xl text-charcoal-900 mb-5">Vendu par</h2>
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div className="flex items-center gap-4">
                      <Avatar name={seller.display_name} photoUrl={seller.photo_url} size={56} />
                      <div>
                        <p className="font-semibold text-charcoal-900">{seller.display_name}</p>
                        <p className="text-xs text-charcoal-500 flex items-center gap-1.5 mt-1">
                          <CalendarDays className="w-3.5 h-3.5" /> {memberSince(seller.created_at)}
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/market/vendeur/${listing.seller_id}`}
                      className="text-xs font-semibold text-charcoal-900 border border-charcoal-200 hover:border-charcoal-900 px-4 py-2 rounded-full transition-colors"
                    >
                      Voir toutes ses annonces
                    </Link>
                  </div>
                  {seller.bio && (
                    <p className="mt-5 text-sm text-charcoal-600 leading-relaxed whitespace-pre-line">{seller.bio}</p>
                  )}
                  <div className="flex items-center gap-2.5 mt-5 flex-wrap">
                    {seller.verified.email && (
                      <span className="flex items-center gap-1.5 text-xs text-charcoal-600 bg-ivory-100 px-3 py-1.5 rounded-full">
                        <Mail className="w-3.5 h-3.5 text-rose-600" /> Email vérifié
                      </span>
                    )}
                    {seller.verified.phone && (
                      <span className="flex items-center gap-1.5 text-xs text-charcoal-600 bg-ivory-100 px-3 py-1.5 rounded-full">
                        <Phone className="w-3.5 h-3.5 text-rose-600" /> Numéro vérifié
                      </span>
                    )}
                    {seller.verified.identity && (
                      <span className="flex items-center gap-1.5 text-xs text-charcoal-600 bg-ivory-100 px-3 py-1.5 rounded-full">
                        <BadgeCheck className="w-3.5 h-3.5 text-rose-600" /> Identité vérifiée
                      </span>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="flex items-center gap-8 text-sm px-2">
              <button
                onClick={() => setReportOpen(true)}
                className="flex items-center gap-1.5 text-charcoal-600 hover:text-rose-600 font-medium transition-colors"
              >
                <Flag className="w-4 h-4" /> Signaler l’annonce
              </button>
              <Link href="/terms" className="flex items-center gap-1.5 text-charcoal-600 hover:text-rose-600 font-medium transition-colors">
                <Info className="w-4 h-4" /> Vos droits et obligations
              </Link>
            </div>
          </div>
        </div>

        {/* ── SUGGESTIONS ── */}
        {similarListings.length > 0 && (
          <div className="mt-16 pt-12 border-t border-charcoal-200">
            <div className="flex items-center justify-between gap-4 mb-6">
              <h2 className="font-serif text-2xl text-charcoal-900">Ces annonces peuvent vous intéresser</h2>
              <Link href="/market/annonces" className="text-sm font-semibold text-rose-600 hover:underline whitespace-nowrap">
                Voir plus d’annonces →
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {similarListings.map((l) => (
                <ListingCard key={l.id} listing={l} />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* ── CTA STICKY MOBILE ── */}
      {!isOwner && (
        <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur border-t border-charcoal-100 px-4 py-3 flex items-center gap-4 lg:hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="min-w-0">
            <p className="text-xl font-serif font-semibold text-charcoal-900 leading-none">{eur(grandTotal)} €</p>
            <p className="text-[10px] text-charcoal-500 mt-1">Paiement bloqué jusqu’à réception</p>
          </div>
          <button
            onClick={handleBuy}
            disabled={!available}
            className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-300 text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" /> {available ? 'Acheter' : 'Indisponible'}
          </button>
        </div>
      )}

      {/* ── MODAL SIGNALEMENT ── */}
      {reportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <h3 className="font-serif text-xl text-charcoal-900">Signaler cette annonce</h3>
              <button onClick={() => setReportOpen(false)} className="p-1.5 text-charcoal-400 hover:text-charcoal-800" aria-label="Fermer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              {REPORT_REASONS.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer text-sm transition-all ${
                    reportReason === r.value ? 'border-rose-600 bg-rose-50/40' : 'border-charcoal-200 hover:bg-charcoal-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="reportReason"
                    checked={reportReason === r.value}
                    onChange={() => setReportReason(r.value)}
                    className="accent-rose-600"
                  />
                  {r.label}
                </label>
              ))}
            </div>

            <textarea
              rows={3}
              placeholder="Précisions facultatives…"
              value={reportComment}
              onChange={(e) => setReportComment(e.target.value)}
              className="w-full px-4 py-3 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 resize-none"
            />

            <button
              onClick={handleReport}
              disabled={reportSending}
              className="w-full bg-charcoal-900 hover:bg-black text-white font-semibold py-3.5 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
            >
              {reportSending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Envoyer le signalement'}
            </button>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
