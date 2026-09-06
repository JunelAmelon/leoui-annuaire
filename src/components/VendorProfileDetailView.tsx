'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import VendorCard from '@/components/VendorCard';
import SimilarVendorsCarousel from '@/components/SimilarVendorsCarousel';
import { toast } from 'sonner';
import { incrementDocumentFields, addDocument, getDocument } from '@/lib/db';
import {
  Star,
  MapPin,
  Phone,
  Heart,
  Share2,
  Check,
  TrendingUp,
  Users,
  X,
  Send,
  Zap,
  Tag,
  Globe,
  Instagram,
  Image as ImageIcon,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Award,
  Video,
  Gift,
  Calendar,
  BadgeCheck,
} from 'lucide-react';

const FALLBACK_PHOTOS = [
  'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=1200',
  'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=600',
  'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=600',
];

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

export type VendorProfileDetailViewProps = {
  vendorId: string;
  vendor: any;
  reviews: any[];
  promotions: any[];
  similarVendors: any[];
  vendorsIndexHref: string;
  homeHref: string;
  similarHrefBase: string;
  onSubmitContact: (form: ContactForm) => Promise<void>;
  contactSubmitDisabled?: (form: ContactForm) => boolean;
  contactIntroText?: string;
  isLoggedIn?: boolean;
  canReview?: boolean;
  existingClientReview?: { rating: number; comment: string } | null;
  clientName?: string;
  onSubmitReview?: (review: { rating: number; comment: string }) => Promise<void>;
  isFavorite?: boolean;
  onFavoriteToggle?: () => void;
};

export default function VendorProfileDetailView({
  vendorId,
  vendor,
  reviews,
  promotions,
  similarVendors,
  vendorsIndexHref,
  homeHref,
  similarHrefBase,
  onSubmitContact,
  contactSubmitDisabled,
  contactIntroText,
  isLoggedIn = false,
  canReview = false,
  existingClientReview = null,
  clientName = '',
  onSubmitReview,
  isFavorite: isFavoriteProp,
  onFavoriteToggle,
}: VendorProfileDetailViewProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState('informations');
  const [showContactModal, setShowContactModal] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [selectedPromo, setSelectedPromo] = useState<any>(null);
  const [pendingPromoToken, setPendingPromoToken] = useState<string | null>(null);

  const nextUrl = useMemo(() => {
    const base = isLoggedIn
      ? (pathname || `/vendors/${vendorId}`)
      : `/espace-client/prestataires/${vendorId}`;
    const params = new URLSearchParams(searchParams?.toString() || '');
    if (pendingPromoToken) params.set('promoToken', pendingPromoToken);
    const query = params.toString();
    return query ? `${base}?${query}` : base;
  }, [isLoggedIn, pathname, searchParams, vendorId, pendingPromoToken]);
  const [internalFavorite, setInternalFavorite] = useState(false);
  const isFavorite = isFavoriteProp !== undefined ? isFavoriteProp : internalFavorite;
  const [faqOpen, setFaqOpen] = useState<number | null>(null);
  const [contactForm, setContactForm] = useState<ContactForm>({
    name: '',
    email: '',
    phone: '',
    message: 'Bonjour, nous sommes en pleins préparatifs de mariage et nous aimerions en savoir plus sur vos services et disponibilités.',
  });
  const [sending, setSending] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(Boolean(existingClientReview));
  const [showReviewConfirmation, setShowReviewConfirmation] = useState(false);
  const [expandedReview, setExpandedReview] = useState<any | null>(null);
  const reviewsScrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [clientPhotos, setClientPhotos] = useState<Record<string, string>>({});
  const [showGallery, setShowGallery] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [showStickyButton, setShowStickyButton] = useState(false);
  const contactButtonRef = useRef<HTMLButtonElement>(null);
  const promotionsRef = useRef<HTMLDivElement>(null);

  const photos: string[] = vendor.images?.length ? vendor.images : FALLBACK_PHOTOS;
  const videos: string[] = vendor.videos || [];
  const faqs: { q: string; a: string }[] = vendor.faqs || [];
  const team: { name: string; role: string; bio: string; photo: string }[] = vendor.team || [];
  const reportages: { title: string; date: string; imageUrl: string; videoUrl?: string }[] = vendor.reportages || [];
  const packages: { name: string; price: string; items: string[]; popular?: boolean }[] = vendor.packages || [];
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length)
    : (vendor.rating || 5);
  const publishedReviews = useMemo(
    () => (reviews || [])
      .filter((r: any) => r.status !== 'pending')
      .sort((a: any, b: any) => new Date(b.date || b.created_at || 0).getTime() - new Date(a.date || a.created_at || 0).getTime()),
    [reviews]
  );
  const RATING_LABELS = ['', 'Décevant', 'Passable', 'Bien', 'Très bien', 'Excellent'];

  // Récupère les photos des clients ayant laissé un avis
  useEffect(() => {
    const ids = Array.from(new Set(publishedReviews.map((r: any) => r.client_id).filter(Boolean)));
    const missing = ids.filter((id) => !(id in clientPhotos));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(
        missing.map(async (id) => {
          try {
            const c = await getDocument('clients', id);
            if (c?.photo || c?.photoURL) return [id, (c.photo || c.photoURL) as string] as const;
            const p = await getDocument('profiles', id);
            return [id, (p?.photo || p?.photoURL || '') as string] as const;
          } catch {
            return [id, ''] as const;
          }
        })
      );
      if (!cancelled) setClientPhotos((prev) => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
    return () => { cancelled = true; };
  }, [publishedReviews]);

  // Affiche les flèches du carrousel uniquement si le contenu déborde
  const updateReviewsScrollState = () => {
    const el = reviewsScrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    if (activeTab !== 'avis') return;
    updateReviewsScrollState();
    const el = reviewsScrollRef.current;
    window.addEventListener('resize', updateReviewsScrollState);
    el?.addEventListener('scroll', updateReviewsScrollState, { passive: true });
    return () => {
      window.removeEventListener('resize', updateReviewsScrollState);
      el?.removeEventListener('scroll', updateReviewsScrollState);
    };
  }, [activeTab, publishedReviews.length]);

  const activePromos = (promotions || []).filter((p: any) => !p.valid_to || new Date(p.valid_to) >= new Date());

  // Observer pour afficher le bouton sticky après le défilement
  useEffect(() => {
    if (!contactButtonRef.current) return;
    
    const observer = new IntersectionObserver(
      ([entry]) => {
        setShowStickyButton(!entry.isIntersecting);
      },
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    );
    
    observer.observe(contactButtonRef.current);
    return () => observer.disconnect();
  }, []);

  const tabs = [
    { id: 'informations', label: 'Informations' },
    ...(faqs.length > 0 ? [{ id: 'faq', label: 'FAQ' }] : []),
    { id: 'avis', label: `Avis (${reviews.length})` },
    ...(reportages.length > 0 ? [{ id: 'reportages', label: `Reportages (${reportages.length})` }] : []),
    ...(activePromos.length > 0 ? [{ id: 'promotions', label: `Promotions (${activePromos.length})` }] : []),
    ...(team.length > 0 ? [{ id: 'equipe', label: `Équipe (${team.length})` }] : []),
    { id: 'carte', label: 'Carte' },
  ];

  const isPromoPath = Boolean(selectedPromo);
  const isContactDisabled = contactSubmitDisabled
    ? contactSubmitDisabled(contactForm)
    : isLoggedIn
      ? !contactForm.message.trim()
      : isPromoPath
        ? !contactForm.message.trim()
        : (!contactForm.name || !contactForm.email);

  const buildPromoMessage = (promo: any) => {
    const discount = promo.discount_type === 'percentage' ? `${promo.discount_value}%` : `${promo.discount_value} €`;
    return `Bonjour, je suis intéressé(e) par votre offre "${promo.title}" (code ${promo.code}, remise de -${discount}). Pouvez-vous me revenir avec les conditions et disponibilités ?`;
  };

  const submitContact = async (form: ContactForm, promo: any) => {
    setSending(true);
    try {
      await onSubmitContact(form);
      if (isLoggedIn && promo?.id) {
        await incrementDocumentFields('promotions', promo.id, { used_count: 1 }).catch(() => {});
        await addDocument('promo_usages', {
          promo_id: promo.id,
          vendor_id: vendorId,
          message_preview: form.message.slice(0, 200),
          created_at: new Date().toISOString(),
        }).catch(() => {});
      }
    } finally {
      setSending(false);
    }
  };

  const handleUsePromo = (promo: any) => {
    const message = buildPromoMessage(promo);
    setSelectedPromo(promo);
    setContactForm((prev) => ({ ...prev, message }));
    setShowContactModal(true);
  };

  useEffect(() => {
    if (!isLoggedIn || !vendor || !vendorId || typeof window === 'undefined') return;
    const params = new URLSearchParams(searchParams?.toString() || '');
    const tokenFromUrl = params.get('promoToken');
    const storageKey = tokenFromUrl ? `pendingPromo_${tokenFromUrl}` : 'pendingPromo';
    const raw = sessionStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const pending = JSON.parse(raw);
      if (pending.vendorId !== vendorId) return;
      sessionStorage.removeItem(storageKey);
      const promo = pending.promo;
      const form: ContactForm = { name: '', email: '', phone: '', message: pending.message || buildPromoMessage(promo) };
      setSelectedPromo(promo);
      submitContact(form, promo).then(() => {
        setShowContactModal(false);
        setSelectedPromo(null);
        toast.success('Votre demande a bien été envoyée au prestataire');
      }).catch(() => {
        toast.error('Votre demande promotion n\'a pas pu être envoyée');
      });
    } catch {}
  }, [isLoggedIn, vendorId, vendor, searchParams]);

  const openContact = () => {
    setSelectedPromo(null);
    setContactForm((prev) => ({
      ...prev,
      message: 'Bonjour, nous sommes en pleins préparatifs de mariage et nous aimerions en savoir plus sur vos services et disponibilités.',
    }));
    setShowContactModal(true);
  };

  const closeContact = () => {
    setSelectedPromo(null);
    setShowContactModal(false);
  };

  const closeAuthPrompt = () => {
    try {
      if (pendingPromoToken) sessionStorage.removeItem(`pendingPromo_${pendingPromoToken}`);
      sessionStorage.removeItem('pendingPromo');
    } catch {}
    setPendingPromoToken(null);
    setShowAuthPrompt(false);
  };

  return (
    <>
      {/* Breadcrumb */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 pb-2">
        <div className="flex flex-wrap items-center gap-1.5 text-body-sm text-charcoal-500">
          <Link href={homeHref} className="hover:text-rose-600 transition-colors">Accueil</Link>
          <span>/</span>
          <Link href={vendorsIndexHref} className="hover:text-rose-600 transition-colors">Prestataires</Link>
          <span>/</span>
          {vendor.category && <Link href={vendorsIndexHref} className="hover:text-rose-600 transition-colors">{vendor.category}</Link>}
          {vendor.category && <span>/</span>}
          <span className="text-charcoal-800 font-medium">{vendor.name}</span>
        </div>
      </div>

      {/* Main layout: photo grid (left) + sticky sidebar (right) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* LEFT COLUMN */}
          <div className="flex-1 min-w-0 w-full overflow-x-hidden">
            {/* Photo Gallery — elegant masonry style */}
            <div className="sm:hidden w-full">
              <div className="grid grid-cols-2 gap-1">
                <div className="col-span-2 aspect-[16/10] overflow-hidden">
                  <img src={photos[0]} alt="Photo principale" className="w-full h-full object-cover" />
                </div>
                {photos.slice(1, 3).map((p, i) => (
                  <div key={i} className="aspect-square overflow-hidden">
                    <img src={p} alt={`Photo ${i + 2}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden sm:block w-full">
              <div className="grid grid-cols-12 grid-rows-2 gap-1 h-[420px] sm:h-[460px] lg:h-[520px]">
                {/* Main large image */}
                <div className="col-span-7 row-span-2 h-full overflow-hidden">
                  <img src={photos[0]} alt="Photo principale" className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-700" />
                </div>
                {/* Side images */}
                <div className="col-span-5 row-span-2 grid grid-rows-2 gap-1 h-full">
                  <div className="overflow-hidden relative h-full">
                    <img src={photos[1] || photos[0]} alt="Photo 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    <button
                      onClick={() => onFavoriteToggle ? onFavoriteToggle() : setInternalFavorite((f) => !f)}
                      className="absolute top-3 right-3 w-9 h-9 bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors z-10"
                    >
                      <Heart className={`w-4 h-4 ${isFavorite ? 'text-rose-600 fill-rose-600' : 'text-ivory-700'}`} />
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 h-full">
                    <div className="overflow-hidden h-full">
                      <img src={photos[2] || photos[0]} alt="Photo 3" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                    <div className="overflow-hidden relative cursor-pointer h-full" onClick={() => { setCurrentPhotoIndex(3); setShowGallery(true); }}>
                      <img src={photos[3] || photos[0]} alt="Photo 4" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                      <div className="absolute inset-0 bg-ivory-900/60 flex items-center justify-center">
                        <span className="flex items-center gap-1.5 text-white text-sm font-medium">
                          <ImageIcon className="w-4 h-4" /> +{Math.max(0, photos.length - 4)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Videos Section */}
            {videos.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-charcoal-700 mb-3 flex items-center gap-2">
                  <Video className="w-4 h-4 text-rose-600" />
                  Vidéos de présentation
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {videos.map((video, i) => (
                    <div key={video} className="relative rounded-xl overflow-hidden bg-stone-100">
                      <video 
                        src={video} 
                        className="w-full aspect-video object-cover" 
                        controls 
                        preload="metadata"
                        poster={photos[0]}
                      />
                      <span className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                        Vidéo {i + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Mobile Vendor Info Section - appears after videos */}
            <div className="lg:hidden mt-6 pb-4 border-b border-charcoal-200">
              <h1 className="font-display text-[1.6rem] leading-tight text-charcoal-900 mb-1">{vendor.name}</h1>
              {vendor.tagline && <p className="text-sm text-charcoal-500 italic mb-2">{vendor.tagline}</p>}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-charcoal-900">{avgRating.toFixed(1)}</span>
                <span className="text-charcoal-400">·</span>
                <button
                  className="text-charcoal-600 underline underline-offset-2 hover:text-rose-600 text-sm"
                  onClick={() => setActiveTab('avis')}
                >
                  {reviews.length} Avis
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-body-sm text-charcoal-600 mb-1">
                <MapPin className="w-4 h-4 text-charcoal-400" />
                <span>{vendor.location}</span>
              </div>
              {vendor.category && (
                <div className="flex items-center gap-1.5 text-body-sm text-charcoal-500 mb-3">
                  <Tag className="w-4 h-4 text-charcoal-400" />
                  <span>{vendor.category}</span>
                </div>
              )}

              {vendor.startingPrice && (
                <div className="bg-rose-50 p-5 mb-4 border-l-4 border-rose-500 mt-4">
                  <p className="text-xs text-rose-600 uppercase tracking-wider mb-1">Tarif indicatif</p>
                  <p className="font-serif text-2xl text-charcoal-900">{vendor.startingPrice}</p>
                  <p className="text-xs text-charcoal-500 mt-1">Tarif sur demande</p>
                </div>
              )}

              {vendor.responseTime && (
                <div className="flex items-center gap-2 mb-4 text-body-sm text-charcoal-600">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Répond en {vendor.responseTime}</span>
                </div>
              )}

              <button
                ref={contactButtonRef}
                onClick={openContact}
                className="w-full bg-rose-600 hover:bg-rose-700 text-white font-medium py-3.5 px-4 transition-colors text-sm tracking-wide mb-3"
              >
                Envoyer un message
              </button>

              <div className="space-y-3 pt-3 border-t border-charcoal-100">
                {vendor.weddingsCompleted > 0 && (
                  <div className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                    <Users className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>Plus de {vendor.weddingsCompleted} couples</span>
                  </div>
                )}
                {vendor.experience && (
                  <div className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                    <TrendingUp className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{vendor.experience} d'expérience</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-10 relative z-10">
              <div
                className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
              >
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-2 text-sm font-medium whitespace-nowrap rounded-full border transition-all duration-200 flex-shrink-0 ${
                      activeTab === tab.id
                        ? 'bg-rose-600 text-white border-rose-600 shadow-sm'
                        : 'bg-white text-charcoal-500 border-charcoal-200 hover:border-charcoal-400 hover:text-charcoal-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tab content */}
            <div className="mt-6 pb-28 lg:pb-16">
              {activeTab === 'informations' && (
                <div>
                  {vendor.updatedAt && (
                    <div className="flex items-center gap-3 mb-4 text-body-sm text-charcoal-500">
                      <span>
                        Dernière mise à jour :{' '}
                        {new Date(vendor.updatedAt).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  )}

                  {vendor.description && (
                    <p className="text-body-lg text-charcoal-700 leading-relaxed mb-6 whitespace-pre-line break-words" style={{ overflowWrap: 'break-word', wordBreak: 'break-word' }}>{vendor.description}</p>
                  )}

                  {(vendor.experience || vendor.weddingsCompleted) && (
                    <div className="flex flex-wrap gap-4 mb-6">
                      {vendor.experience && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-champagne-50 rounded-xl">
                          <Award className="w-4 h-4 text-champagne-600" />
                          <span className="text-sm font-medium text-charcoal-800">{vendor.experience} d'expérience</span>
                        </div>
                      )}
                      {vendor.weddingsCompleted > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-rose-50 rounded-xl">
                          <Users className="w-4 h-4 text-rose-600" />
                          <span className="text-sm font-medium text-charcoal-800">{vendor.weddingsCompleted}+ mariages</span>
                        </div>
                      )}
                    </div>
                  )}

                  {vendor.tags?.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {vendor.tags.map((t: string) => (
                        <span key={t} className="px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-full">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {packages.length > 0 && (
                    <>
                      <h3 className="font-serif text-xl text-ivory-900 mb-6 mt-8 pb-2 border-b border-ivory-200">Formules & Tarifs</h3>
                      <div className="space-y-4 mb-6">
                        {packages.map((pkg, i) => (
                          <div
                            key={i}
                            className={`relative p-5 ${
                              pkg.popular ? 'bg-ivory-800 text-white' : 'bg-ivory-50 border border-ivory-200'
                            }`}
                          >
                            {pkg.popular && (
                              <div className="absolute -top-3 left-5 px-3 py-1 bg-rose-500 text-white text-xs font-semibold uppercase tracking-wider">
                                Recommandé
                              </div>
                            )}
                            <div className="flex items-start justify-between mb-3">
                              <h4 className={`font-serif text-lg ${pkg.popular ? 'text-white' : 'text-ivory-900'}`}>{pkg.name}</h4>
                              {pkg.price && (
                                <p className={`font-serif text-xl ${pkg.popular ? 'text-white' : 'text-ivory-800'}`}>{pkg.price}</p>
                              )}
                            </div>
                            <ul className={`space-y-2 pt-3 border-t ${pkg.popular ? 'border-white/20' : 'border-ivory-200'}`}>
                              {pkg.items?.map((item: string, j: number) => (
                                <li key={j} className={`flex items-start gap-2 text-sm ${pkg.popular ? 'text-white/80' : 'text-ivory-700'}`}>
                                  <span className={`w-1 h-1 rounded-full mt-2 flex-shrink-0 ${pkg.popular ? 'bg-white' : 'bg-ivory-600'}`}></span>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {(vendor.website || vendor.instagram) && (
                    <div className="flex flex-wrap gap-3 mt-6 pt-6 border-t border-charcoal-100">
                      {vendor.website && (
                        <a
                          href={vendor.website}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 border border-charcoal-200 rounded-xl text-sm text-charcoal-600 hover:border-rose-300 hover:text-rose-600 transition-all"
                        >
                          <Globe className="w-4 h-4" /> Site web
                        </a>
                      )}
                      {vendor.instagram && (
                        <a
                          href={`https://instagram.com/${vendor.instagram.replace('@', '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-4 py-2 border border-charcoal-200 rounded-xl text-sm text-charcoal-600 hover:border-rose-300 hover:text-rose-600 transition-all"
                        >
                          <Instagram className="w-4 h-4" /> {vendor.instagram}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'faq' && (
                <div className="space-y-3">
                  {faqs.map((faq, i) => (
                    <div key={i} className="border border-charcoal-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                        className="w-full flex items-center justify-between p-5 text-left hover:bg-charcoal-50 transition-colors"
                      >
                        <span className="font-medium text-charcoal-900">{faq.q}</span>
                        <ChevronDown
                          className={`w-5 h-5 text-charcoal-500 transition-transform flex-shrink-0 ml-4 ${faqOpen === i ? 'rotate-180' : ''}`}
                        />
                      </button>
                      {faqOpen === i && (
                        <div className="px-5 pb-5 text-body-md text-charcoal-700 leading-relaxed border-t border-charcoal-100">
                          <p className="pt-4">{faq.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'avis' && (
                <div>
                  {/* ── Formulaire laisser un avis — client connecté uniquement ── */}
                  {canReview && !reviewSubmitted && (
                    <div className="mb-8 relative overflow-hidden rounded-3xl border border-champagne-200 bg-gradient-to-b from-champagne-50/60 to-white p-6 sm:p-8">
                      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-rose-300 to-transparent" />
                      <p className="text-[11px] font-semibold tracking-[0.2em] uppercase text-rose-600 mb-1.5">Votre avis compte</p>
                      <h3 className="font-serif text-charcoal-900 text-xl sm:text-2xl mb-1">Partagez votre expérience</h3>
                      <p className="text-xs text-charcoal-500 flex items-center gap-1.5 mb-6">
                        <BadgeCheck className="w-3.5 h-3.5 text-green-600" />
                        Avis vérifié — vous avez fait appel à ce prestataire
                      </p>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-5">
                        <div className="flex gap-1.5">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <button
                              key={n}
                              type="button"
                              onClick={() => setReviewRating(n)}
                              className="transition-transform duration-150 hover:scale-125 hover:-rotate-6"
                              aria-label={`${n} étoile${n > 1 ? 's' : ''}`}
                            >
                              <Star
                                className={`w-8 h-8 transition-colors duration-150 ${n <= reviewRating ? 'text-amber-400 fill-amber-400 drop-shadow-[0_2px_4px_rgba(251,191,36,0.35)]' : 'text-charcoal-200 hover:text-amber-300'}`}
                              />
                            </button>
                          ))}
                        </div>
                        <span className="font-serif italic text-charcoal-600">{RATING_LABELS[reviewRating]}</span>
                      </div>

                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Racontez votre collaboration : la qualité du service, la réactivité, le rendu le jour J…"
                        rows={4}
                        className="w-full px-5 py-4 bg-white border border-champagne-200 rounded-2xl text-sm text-charcoal-800 placeholder:text-charcoal-300 resize-none focus:outline-none focus:border-rose-300 focus:ring-4 focus:ring-rose-100/60 transition-all"
                      />

                      <div className="flex items-center justify-between mt-5">
                        <p className="text-[11px] text-charcoal-400 italic hidden sm:block">Publié immédiatement, sans modération.</p>
                        <button
                          disabled={!reviewComment.trim() || submittingReview}
                          onClick={async () => {
                            if (!onSubmitReview) return;
                            setSubmittingReview(true);
                            try {
                              await onSubmitReview({ rating: reviewRating, comment: reviewComment });
                              setReviewSubmitted(true);
                              setShowReviewConfirmation(true);
                              setTimeout(() => setShowReviewConfirmation(false), 4000);
                            } finally { setSubmittingReview(false); }
                          }}
                          className="group inline-flex items-center gap-2 px-6 py-3 bg-rose-600 text-white text-sm font-medium rounded-full hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 ml-auto"
                        >
                          {submittingReview ? 'Publication…' : 'Publier mon avis'}
                          <Send className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* ── Confirmation après publication ── */}
                  {showReviewConfirmation && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-green-800">Merci ! Votre avis a été publié.</p>
                        {existingClientReview && (
                          <div className="flex gap-0.5 mt-1">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`w-3.5 h-3.5 ${i < existingClientReview.rating ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* ── Carrousel des avis ── */}
                  {publishedReviews.length === 0 ? (
                    <div className="relative py-16 text-center">
                      <div className="flex items-center justify-center gap-3 mb-5">
                        <span className="h-px w-10 bg-champagne-300" />
                        <div className="flex gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} className="w-4 h-4 text-champagne-300" />
                          ))}
                        </div>
                        <span className="h-px w-10 bg-champagne-300" />
                      </div>
                      <p className="font-serif italic text-charcoal-800 text-xl sm:text-2xl">Aucun avis pour le moment</p>
                      <p className="text-sm text-charcoal-400 mt-2 max-w-sm mx-auto leading-relaxed">
                        Ce prestataire n'a pas encore reçu d'avis de ses clients.
                      </p>
                    </div>
                  ) : (
                    <div className="relative">
                      {/* Flèche gauche — visible uniquement si on peut défiler */}
                      {canScrollLeft && (
                        <button
                          type="button"
                          onClick={() => reviewsScrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
                          className="hidden sm:flex absolute -left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-md border border-charcoal-100 items-center justify-center text-charcoal-600 hover:text-rose-600 hover:border-rose-200 transition-colors"
                          aria-label="Avis précédents"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                      )}

                      <div
                        ref={reviewsScrollRef}
                        className="flex gap-5 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide"
                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                      >
                        {publishedReviews.map((review: any, i: number) => {
                          const name = review.client_name || review.author || 'Client';
                          const clientPhoto = review.client_photo || (review.client_id ? clientPhotos[review.client_id] : '') || '';
                          const initials = name
                            .split(' ')
                            .filter(Boolean)
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();
                          const comment: string = review.comment || '';
                          const words = comment.trim().split(/\s+/);
                          const title = review.title || (words.length > 6 ? words.slice(0, 5).join(' ') : '');
                          const isLong = comment.length > 180;
                          return (
                            <article
                              key={review.id || i}
                              className="bg-white rounded-2xl border border-charcoal-100 p-6 shadow-sm flex-shrink-0 w-[85vw] sm:w-[300px] snap-start flex flex-col"
                            >
                              <div className="flex items-center gap-3 mb-3">
                                {clientPhoto ? (
                                  <img src={clientPhoto} alt={name} className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                                ) : (
                                  <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-semibold text-sm flex-shrink-0">
                                    {initials}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <p className="font-semibold text-charcoal-900 text-sm truncate">{name}</p>
                                  <p className="text-xs text-charcoal-400">
                                    Envoyé le {new Date(review.date || review.created_at || Date.now()).toLocaleDateString('fr-FR')}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 mb-3">
                                <div className="flex gap-0.5">
                                  {[...Array(5)].map((_, j) => (
                                    <Star
                                      key={j}
                                      className={`w-4 h-4 ${j < (review.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`}
                                    />
                                  ))}
                                </div>
                                <span className="text-sm font-semibold text-charcoal-900">{(review.rating || 5).toFixed(1)}</span>
                              </div>
                              {title && (
                                <p className="font-bold text-charcoal-900 text-sm mb-2">{title}</p>
                              )}
                              <p className={`text-sm text-charcoal-600 leading-relaxed flex-1 ${isLong ? 'line-clamp-4' : ''}`}>
                                {comment}
                              </p>
                              {isLong && (
                                <button
                                  type="button"
                                  onClick={() => setExpandedReview(review)}
                                  className="mt-2 text-sm font-semibold text-charcoal-900 underline underline-offset-2 hover:text-rose-600 text-left transition-colors"
                                >
                                  En savoir plus
                                </button>
                              )}
                              {review.vendor_reply && (
                                <div className="mt-3 pt-3 border-t border-charcoal-100">
                                  <p className="text-xs font-semibold text-rose-600 mb-1">Réponse du prestataire</p>
                                  <p className="text-xs text-charcoal-500 leading-relaxed line-clamp-3">{review.vendor_reply}</p>
                                </div>
                              )}
                            </article>
                          );
                        })}
                      </div>

                      {/* Flèche droite — visible uniquement si on peut défiler */}
                      {canScrollRight && (
                        <button
                          type="button"
                          onClick={() => reviewsScrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
                          className="hidden sm:flex absolute -right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-md border border-charcoal-100 items-center justify-center text-charcoal-600 hover:text-rose-600 hover:border-rose-200 transition-colors"
                          aria-label="Avis suivants"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  )}

                  {/* ── Modale avis complet ── */}
                  {expandedReview && (
                    <div
                      className="fixed inset-0 z-50 bg-charcoal-900/60 backdrop-blur-sm flex items-center justify-center p-4"
                      onClick={() => setExpandedReview(null)}
                    >
                      <div
                        className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-start justify-between gap-3 mb-4">
                          <div className="flex items-center gap-3">
                            {(() => {
                              const p = expandedReview.client_photo || (expandedReview.client_id ? clientPhotos[expandedReview.client_id] : '') || '';
                              return p ? (
                                <img src={p} alt="" className="w-11 h-11 rounded-full object-cover flex-shrink-0" />
                              ) : (
                                <div className="w-11 h-11 rounded-full bg-rose-100 flex items-center justify-center text-rose-700 font-semibold text-sm flex-shrink-0">
                                  {(expandedReview.client_name || expandedReview.author || 'C')
                                    .split(' ').filter(Boolean).map((w: string) => w[0]).slice(0, 2).join('').toUpperCase()}
                                </div>
                              );
                            })()}
                            <div>
                              <p className="font-semibold text-charcoal-900 text-sm">
                                {expandedReview.client_name || expandedReview.author || 'Client'}
                              </p>
                              <p className="text-xs text-charcoal-400">
                                Envoyé le {new Date(expandedReview.date || expandedReview.created_at || Date.now()).toLocaleDateString('fr-FR')}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedReview(null)}
                            className="w-8 h-8 rounded-full hover:bg-stone-100 flex items-center justify-center text-charcoal-400 hover:text-charcoal-700 transition-colors flex-shrink-0"
                            aria-label="Fermer"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5 mb-4">
                          <div className="flex gap-0.5">
                            {[...Array(5)].map((_, j) => (
                              <Star
                                key={j}
                                className={`w-4 h-4 ${j < (expandedReview.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`}
                              />
                            ))}
                          </div>
                          <span className="text-sm font-semibold text-charcoal-900">{(expandedReview.rating || 5).toFixed(1)}</span>
                        </div>
                        <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-line">{expandedReview.comment}</p>
                        {expandedReview.vendor_reply && (
                          <div className="mt-4 bg-stone-50 rounded-xl p-4 border border-stone-100">
                            <p className="text-xs font-semibold text-rose-600 mb-1">Réponse de {vendor.name}</p>
                            <p className="text-sm text-charcoal-600 leading-relaxed">{expandedReview.vendor_reply}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reportages' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {reportages.map((r, i) => (
                    <article key={i} className="group relative rounded-2xl overflow-hidden cursor-pointer bg-rose-600">
                      {r.videoUrl ? (
                        <div className="relative">
                          <video
                            src={r.videoUrl}
                            poster={r.imageUrl || undefined}
                            controls
                            playsInline
                            preload="metadata"
                            className="w-full h-48 sm:h-60 object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                        </div>
                      ) : (
                        <div className="h-48 sm:h-60">
                          <img
                            src={r.imageUrl}
                            alt={r.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-4 sm:p-5 pointer-events-none">
                        {r.date && <p className="text-xs text-white/70 mb-1">{r.date}</p>}
                        <h3 className="font-serif text-white text-sm sm:text-base leading-snug">{r.title}</h3>
                      </div>
                    </article>
                  ))}
                </div>
              )}

              {activeTab === 'promotions' && (
                <div ref={promotionsRef} className="space-y-4">
                  {activePromos.map((promo: any) => (
                    <div
                      key={promo.id}
                      className="bg-white rounded-2xl p-6 border border-rose-100 shadow-sm"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2.5 mb-2">
                            <span className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center flex-shrink-0">
                              <Gift className="w-4 h-4 text-rose-600" />
                            </span>
                            <h3 className="font-semibold text-charcoal-900 truncate">{promo.title}</h3>
                          </div>
                          {promo.description && (
                            <p className="text-sm text-charcoal-600 mb-3 leading-relaxed">{promo.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-3">
                            {promo.code && (
                              <span className="inline-flex items-center gap-1.5 font-mono text-xs font-semibold text-charcoal-800 bg-stone-100 px-2.5 py-1.5 rounded-lg">
                                <Tag className="w-3 h-3 text-charcoal-500" />
                                {promo.code}
                              </span>
                            )}
                            {promo.valid_to && (
                              <span className="inline-flex items-center gap-1.5 text-xs text-charcoal-500">
                                <Calendar className="w-3.5 h-3.5" />
                                Jusqu&apos;au {new Date(promo.valid_to).toLocaleDateString('fr-FR')}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex-shrink-0">
                          <span className="inline-block bg-rose-600 text-white text-sm font-bold px-3 py-1.5 rounded-full">
                            -{promo.discount_value}{promo.discount_type === 'percentage' ? '%' : ' €'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleUsePromo(promo)}
                        className="mt-5 w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
                      >
                        <Gift className="w-4 h-4" /> En profiter
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'equipe' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {team.map((member, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-charcoal-100 p-6 flex items-start gap-4">
                      {member.photo ? (
                        <img src={member.photo} alt={member.name} className="w-16 h-16 rounded-xl object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-champagne-100 to-rose-100 flex items-center justify-center flex-shrink-0">
                          <span className="font-serif text-2xl text-charcoal-500">{member.name?.charAt(0)}</span>
                        </div>
                      )}
                      <div>
                        <h3 className="font-semibold text-charcoal-900">{member.name}</h3>
                        <p className="text-body-sm text-rose-600 mb-2">{member.role}</p>
                        <p className="text-body-sm text-charcoal-600">{member.bio}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'carte' && (
                <div>
                  {vendor.location ? (
                    <>
                      <div className="rounded-2xl overflow-hidden h-80 border border-charcoal-100 shadow-sm">
                        <iframe
                          title={`Carte — ${vendor.location}`}
                          src={`https://www.google.com/maps?q=${encodeURIComponent(vendor.location)}&output=embed&hl=fr`}
                          className="w-full h-full border-0"
                          loading="lazy"
                          allowFullScreen
                          referrerPolicy="no-referrer-when-downgrade"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                        <p className="text-body-sm text-charcoal-500 flex items-center gap-1.5">
                          <MapPin className="w-4 h-4" /> {vendor.location}
                        </p>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(vendor.location)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-rose-600 hover:text-rose-700 font-medium transition-colors"
                        >
                          Ouvrir dans Google Maps →
                        </a>
                      </div>
                    </>
                  ) : (
                    <div className="bg-charcoal-100 rounded-2xl h-80 flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                        <p className="font-semibold text-charcoal-800">Localisation non renseignée</p>
                        <p className="text-body-sm text-charcoal-500 mt-1">Zone d'intervention principale</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT STICKY SIDEBAR - Desktop only */}
          <div className="hidden lg:block w-full lg:w-[310px] flex-shrink-0 order-last lg:order-last">
            <div className="sticky top-24">
              <h1 className="font-display text-[1.6rem] leading-tight text-charcoal-900 mb-1">{vendor.name}</h1>
              {vendor.tagline && <p className="text-sm text-charcoal-500 italic mb-2">{vendor.tagline}</p>}
              <div className="flex items-center gap-2 mb-2">
                <div className="flex gap-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-4 h-4 ${i < Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`}
                    />
                  ))}
                </div>
                <span className="font-semibold text-charcoal-900">{avgRating.toFixed(1)}</span>
                <span className="text-charcoal-400">·</span>
                <button
                  className="text-charcoal-600 underline underline-offset-2 hover:text-rose-600 text-sm"
                  onClick={() => setActiveTab('avis')}
                >
                  {reviews.length} Avis
                </button>
              </div>
              <div className="flex items-center gap-1.5 text-body-sm text-charcoal-600 mb-1">
                <MapPin className="w-4 h-4 text-charcoal-400" />
                <span>{vendor.location}</span>
              </div>
              {vendor.category && (
                <div className="flex items-center gap-1.5 text-body-sm text-charcoal-500 mb-2">
                  <Tag className="w-4 h-4 text-charcoal-400" />
                  <span>{vendor.category}</span>
                </div>
              )}
              {activePromos.length > 0 && (
                <button
                  onClick={() => {
                    setActiveTab('promotions');
                    setTimeout(() => promotionsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
                  }}
                  className="w-full flex items-center gap-2.5 mb-4 px-3 py-2.5 bg-rose-50 border border-rose-100 rounded-xl text-left hover:bg-rose-100 transition-colors"
                >
                  <span className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                    <Gift className="w-3.5 h-3.5 text-rose-600" />
                  </span>
                  <span className="text-sm font-medium text-rose-700">
                    {activePromos.length} promotion{activePromos.length > 1 ? 's' : ''} en cours
                  </span>
                </button>
              )}

              {vendor.startingPrice && (
                <div className="bg-rose-50 p-5 mb-4 border-l-4 border-rose-500">
                  <p className="text-xs text-rose-600 uppercase tracking-wider mb-1">Tarif indicatif</p>
                  <p className="font-serif text-2xl text-charcoal-900">{vendor.startingPrice}</p>
                  <p className="text-xs text-charcoal-500 mt-1">Tarif sur demande</p>
                </div>
              )}

              {vendor.responseTime && (
                <div className="flex items-center gap-2 mb-4 text-body-sm text-charcoal-600">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Répond en {vendor.responseTime}</span>
                </div>
              )}

              <div className="flex gap-3 mb-5">
                <button
                  onClick={openContact}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3.5 px-4 transition-colors text-sm tracking-wide"
                >
                  Envoyer un message
                </button>
                {vendor.phone ? (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white border-2 border-rose-600 text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0 font-medium text-sm"
                    title={`Appeler ${vendor.name}`}
                  >
                    <Phone className="w-4 h-4" />
                    Appeler
                  </a>
                ) : null}
              </div>

              <div className="space-y-3 pt-4 border-t border-charcoal-100">
                {vendor.weddingsCompleted > 0 && (
                  <div className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                    <Users className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>Plus de {vendor.weddingsCompleted} couples</span>
                  </div>
                )}
                {vendor.experience && (
                  <div className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                    <TrendingUp className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>{vendor.experience} d'expérience</span>
                  </div>
                )}
                {reviews.length > 0 && (
                  <div className="flex items-center gap-2.5 text-body-sm text-charcoal-700">
                    <Star className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>
                      {reviews.length} avis · {avgRating.toFixed(1)}/5
                    </span>
                  </div>
                )}
              </div>

              <button className="flex items-center gap-2 text-body-sm text-charcoal-500 hover:text-charcoal-800 mt-5 transition-colors">
                <Share2 className="w-4 h-4" />
                Partager ce prestataire
              </button>

              <div className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden bg-white border-t border-rose-200 px-4 py-3 flex gap-3 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] transition-transform duration-300 ${showStickyButton ? 'translate-y-0' : 'translate-y-full'}`}>
                <button
                  onClick={openContact}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-medium py-3.5 transition-colors text-sm tracking-wide"
                >
                  Contacter ce prestataire
                </button>
                {vendor.phone ? (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="px-5 py-3.5 bg-white border-2 border-rose-600 text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0 font-medium text-sm flex items-center gap-2"
                  >
                    <Phone className="w-4 h-4" />
                    Appeler
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </div>

      {similarVendors.length > 0 && (
        <SimilarVendorsCarousel
          vendors={similarVendors}
          hrefBase={similarHrefBase}
        />
      )}

      {/* CONTACT MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] w-full max-w-lg max-h-[92dvh] overflow-y-auto animate-scale-in">
            <div className="p-5 sm:p-7">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-widest mb-1">{vendor.name}</p>
                  <h2 className="font-display text-[1.7rem] leading-tight text-charcoal-900">Plus d'information</h2>
                </div>
                <button
                  onClick={closeContact}
                  className="w-9 h-9 bg-charcoal-100 rounded-lg flex items-center justify-center hover:bg-charcoal-200 transition-colors mt-1"
                >
                  <X className="w-4 h-4 text-charcoal-700" />
                </button>
              </div>

              {isLoggedIn ? (
                <p className="text-body-sm text-green-700 bg-green-50 rounded-xl px-4 py-2.5 mb-5 flex items-center gap-2">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  Connecté en tant que <strong className="ml-1">{clientName || 'Client'}</strong>
                </p>
              ) : (
                <p className="text-body-sm text-charcoal-600 mb-6">
                  {contactIntroText || (
                    <>
                      Remplissez ce formulaire et <strong>{vendor.name}</strong> vous contactera dans les plus brefs délais.
                    </>
                  )}
                </p>
              )}

              <form
                className="space-y-3"
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (sending) return;
                  if (!isLoggedIn && selectedPromo) {
                    const token = Math.random().toString(36).slice(2);
                    setPendingPromoToken(token);
                    try {
                      sessionStorage.setItem(`pendingPromo_${token}`, JSON.stringify({ vendorId, promo: selectedPromo, message: contactForm.message }));
                    } catch {}
                    setShowContactModal(false);
                    setShowAuthPrompt(true);
                    return;
                  }
                  await submitContact(contactForm, selectedPromo);
                  setShowContactModal(false);
                  setSelectedPromo(null);
                }}
              >
                <div>
                  <label className="block text-xs font-medium text-charcoal-600 mb-1">Message</label>
                  <textarea
                    rows={4}
                    value={contactForm.message}
                    onChange={(e) => setContactForm((p) => ({ ...p, message: e.target.value }))}
                    className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-200 rounded-xl text-sm text-charcoal-800 resize-none focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                  />
                </div>
                {!isLoggedIn && !selectedPromo && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-charcoal-600 mb-1">Prénom et Nom</label>
                      <input
                        type="text"
                        value={contactForm.name}
                        onChange={(e) => setContactForm((p) => ({ ...p, name: e.target.value }))}
                        placeholder="Sophie Dupont"
                        className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-charcoal-600 mb-1">E-mail</label>
                        <input
                          type="email"
                          value={contactForm.email}
                          onChange={(e) => setContactForm((p) => ({ ...p, email: e.target.value }))}
                          placeholder="sophie@email.fr"
                          className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-charcoal-600 mb-1">Téléphone</label>
                        <input
                          type="tel"
                          value={contactForm.phone}
                          onChange={(e) => setContactForm((p) => ({ ...p, phone: e.target.value }))}
                          placeholder="06 12 34 56 78"
                          className="w-full px-4 py-3 bg-charcoal-50 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </>
                )}
                <button
                  type="submit"
                  disabled={sending || isContactDisabled}
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-3.5 transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Envoi…' : 'Envoyer'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* AUTH PROMPT MODAL */}
      {showAuthPrompt && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-[0_30px_80px_rgba(0,0,0,0.25)] w-full max-w-md max-h-[92dvh] overflow-hidden">
            <div className="relative h-44">
              <img
                src="/mariage%20(1).jpg"
                alt="Mariage"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 flex items-center gap-2">
                <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-sm">
                  <Gift className="w-5 h-5 text-rose-600" />
                </div>
                <span className="text-white font-medium text-sm shadow-black drop-shadow-md">Une promotion vous attend</span>
              </div>
              <button
                onClick={closeAuthPrompt}
                className="absolute top-3 right-3 w-9 h-9 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-charcoal-700 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 text-center">
              <h2 className="font-display text-2xl text-charcoal-900 mb-2">Débloquez cette offre</h2>
              <p className="text-sm text-charcoal-600 mb-6 leading-relaxed">
                Connectez-vous ou créez votre compte pour envoyer votre demande avec cette promotion au prestataire. Vous pourrez ensuite suivre votre conversation.
              </p>
              <div className="space-y-3">
                <Link
                  href={`/signup?next=${encodeURIComponent(nextUrl)}`}
                  className="block w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  S&apos;inscrire
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(nextUrl)}`}
                  className="block w-full bg-white border border-charcoal-200 hover:bg-charcoal-50 text-charcoal-800 font-semibold py-3 rounded-xl transition-colors"
                >
                  Se connecter
                </Link>
                <button
                  onClick={closeAuthPrompt}
                  className="w-full text-sm text-charcoal-500 hover:text-charcoal-700 py-2"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ensures vendorId is referenced (props parity) */}
      <span className="hidden">{vendorId}</span>

      {/* Photo Gallery Lightbox */}
      {showGallery && (
        <div className="fixed inset-0 z-[100] bg-black/95 flex flex-col" onClick={() => setShowGallery(false)}>
          {/* Header */}
          <div className="flex items-center justify-between p-4 text-white">
            <span className="text-sm font-medium">{currentPhotoIndex + 1} / {photos.length}</span>
            <button onClick={() => setShowGallery(false)} className="w-10 h-10 flex items-center justify-center hover:bg-white/10 transition-colors">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Main Image */}
          <div className="flex-1 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
            <img
              src={photos[currentPhotoIndex]}
              alt={`Photo ${currentPhotoIndex + 1}`}
              className="max-w-full max-h-full object-contain"
            />
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-center gap-4 p-4">
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(i => i > 0 ? i - 1 : photos.length - 1); }}
              className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              disabled={photos.length <= 1}
            >
              <ChevronLeft className="w-8 h-8" />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setCurrentPhotoIndex(i => i < photos.length - 1 ? i + 1 : 0); }}
              className="w-12 h-12 flex items-center justify-center text-white hover:bg-white/10 transition-colors disabled:opacity-30"
              disabled={photos.length <= 1}
            >
              <ChevronRight className="w-8 h-8" />
            </button>
          </div>

          {/* Thumbnails */}
          <div className="p-4 pt-0 overflow-x-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex gap-2 justify-center">
              {photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentPhotoIndex(idx)}
                  className={`w-16 h-16 flex-shrink-0 overflow-hidden border-2 transition-all ${
                    idx === currentPhotoIndex ? 'border-rose-500' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img src={photo} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
