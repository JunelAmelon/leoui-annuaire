'use client';

import { useState } from 'react';
import Link from 'next/link';
import VendorCard from '@/components/VendorCard';
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
  Award,
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
}: VendorProfileDetailViewProps) {
  const [activeTab, setActiveTab] = useState('informations');
  const [showContactModal, setShowContactModal] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
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

  const photos: string[] = vendor.images?.length ? vendor.images : FALLBACK_PHOTOS;
  const faqs: { q: string; a: string }[] = vendor.faqs || [];
  const team: { name: string; role: string; bio: string; photo: string }[] = vendor.team || [];
  const reportages: { title: string; date: string; imageUrl: string; videoUrl?: string }[] = vendor.reportages || [];
  const packages: { name: string; price: string; items: string[]; popular?: boolean }[] = vendor.packages || [];
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length)
    : (vendor.rating || 5);
  const activePromos = (promotions || []).filter((p: any) => !p.valid_to || new Date(p.valid_to) >= new Date());

  const tabs = [
    { id: 'informations', label: 'Informations' },
    ...(faqs.length > 0 ? [{ id: 'faq', label: 'FAQ' }] : []),
    { id: 'avis', label: `Avis (${reviews.length})` },
    ...(reportages.length > 0 ? [{ id: 'reportages', label: `Reportages (${reportages.length})` }] : []),
    ...(activePromos.length > 0 ? [{ id: 'promotions', label: `Promotions (${activePromos.length})` }] : []),
    ...(team.length > 0 ? [{ id: 'equipe', label: `Équipe (${team.length})` }] : []),
    { id: 'carte', label: 'Carte' },
  ];

  const isContactDisabled = contactSubmitDisabled
    ? contactSubmitDisabled(contactForm)
    : isLoggedIn ? !contactForm.message.trim() : (!contactForm.name || !contactForm.email);

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
            {/* Photo Gallery — mobile: horizontal scroll strip; desktop: editorial grid */}
            <div className="sm:hidden w-full overflow-hidden rounded-2xl">
              <div className="flex gap-2 overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}>
                {photos.map((p, i) => (
                  <div key={i} className="flex-shrink-0 rounded-2xl overflow-hidden" style={{ width: '82vw', height: '220px', scrollSnapAlign: 'start' }}>
                    <img src={p} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            </div>

            <div className="hidden sm:flex gap-2 h-80 lg:h-[460px] rounded-2xl overflow-hidden">
              <div className="flex-[1.7] relative overflow-hidden">
                <img src={photos[0]} alt="Photo principale" className="w-full h-full object-cover hover:scale-[1.02] transition-transform duration-700" />
              </div>
              <div className="hidden sm:grid flex-1 grid-cols-2 grid-rows-2 gap-2 relative">
                <div className="overflow-hidden">
                  <img src={photos[1] || photos[0]} alt="Photo 2" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="overflow-hidden relative">
                  <img src={photos[2] || photos[0]} alt="Photo 3" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    <button
                      onClick={() => setIsFavorite((f) => !f)}
                      className="w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-soft hover:bg-white transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFavorite ? 'text-rose-600 fill-rose-600' : 'text-charcoal-600'}`} />
                    </button>
                  </div>
                </div>
                <div className="overflow-hidden">
                  <img src={photos[3] || photos[0]} alt="Photo 4" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                </div>
                <div className="overflow-hidden relative">
                  <img src={photos[4] || photos[0]} alt="Photo 5" className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                  <div className="absolute bottom-2 right-2 flex gap-1.5 z-10">
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-white/90 backdrop-blur-sm text-charcoal-700 text-xs font-medium rounded-lg shadow-soft">
                      <ImageIcon className="w-3 h-3" /> {photos.length} photo{photos.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="mt-4 lg:mt-6 border-b border-charcoal-200 w-full overflow-x-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
              <div className="flex gap-1 min-w-max">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-all relative ${
                      activeTab === tab.id ? 'text-charcoal-900' : 'text-charcoal-500 hover:text-charcoal-800'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.id && (
                      <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-charcoal-900 rounded-full" />
                    )}
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
                      <h3 className="font-serif text-heading-lg text-charcoal-900 mb-4 mt-8">Formules & Tarifs</h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                        {packages.map((pkg, i) => (
                          <div
                            key={i}
                            className={`border-2 rounded-xl p-6 ${
                              pkg.popular ? 'bg-rose-50 border-rose-300' : 'bg-ivory-50 border-charcoal-200'
                            }`}
                          >
                            {pkg.popular && (
                              <span className="inline-block px-2.5 py-0.5 bg-rose-600 text-white text-xs font-semibold rounded-full mb-2">
                                Populaire
                              </span>
                            )}
                            <h4 className="font-semibold text-charcoal-900 mb-1">{pkg.name}</h4>
                            {pkg.price && <p className="font-display text-heading-xl text-rose-600 mb-4">{pkg.price}</p>}
                            <ul className="space-y-2">
                              {pkg.items?.map((item: string, j: number) => (
                                <li key={j} className="flex items-center gap-2 text-body-sm text-charcoal-700">
                                  <Check className="w-4 h-4 text-rose-500 flex-shrink-0" /> {item}
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
                  {/* Formulaire laisser un avis — client connecté uniquement */}
                  {canReview && !reviewSubmitted && (
                    <div className="mb-6 bg-white rounded-2xl border border-charcoal-100 p-6 shadow-sm">
                      <h3 className="font-serif text-charcoal-900 text-base font-medium mb-1">Laisser un avis</h3>
                      <p className="text-xs text-charcoal-500 mb-4 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-green-500" />
                        Avis vérifié — vous avez fait appel à ce prestataire
                      </p>
                      <div className="flex gap-1.5 mb-4">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button key={n} type="button" onClick={() => setReviewRating(n)}>
                            <Star className={`w-7 h-7 transition-colors ${n <= reviewRating ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`} />
                          </button>
                        ))}
                      </div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Partagez votre expérience avec ce prestataire…"
                        rows={4}
                        className="w-full px-4 py-3 bg-stone-50 border border-charcoal-200 rounded-xl text-sm resize-none focus:outline-none focus:border-rose-400 transition-all"
                      />
                      <button
                        disabled={!reviewComment.trim() || submittingReview}
                        onClick={async () => {
                          if (!onSubmitReview) return;
                          setSubmittingReview(true);
                          try {
                            await onSubmitReview({ rating: reviewRating, comment: reviewComment });
                            setReviewSubmitted(true);
                          } finally { setSubmittingReview(false); }
                        }}
                        className="mt-3 px-5 py-2.5 bg-charcoal-900 text-white text-sm font-semibold rounded-xl hover:bg-charcoal-800 disabled:opacity-50 transition-colors"
                      >
                        {submittingReview ? 'Envoi…' : 'Publier mon avis'}
                      </button>
                    </div>
                  )}
                  {reviewSubmitted && existingClientReview && (
                    <div className="mb-6 bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <div>
                        <p className="text-sm font-semibold text-green-800">Votre avis a été publié</p>
                        <div className="flex gap-0.5 mt-1">{[...Array(5)].map((_,i)=><Star key={i} className={`w-3.5 h-3.5 ${i < existingClientReview.rating ? 'text-amber-400 fill-amber-400':'text-charcoal-200'}`}/>)}</div>
                      </div>
                    </div>
                  )}
                  {reviewSubmitted && !existingClientReview && (
                    <div className="mb-6 bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                      <p className="text-sm font-semibold text-green-800">Votre avis a été publié. Merci !</p>
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 p-5 sm:p-6 bg-white rounded-2xl border border-charcoal-200 mb-6">
                    <div className="text-center">
                      <p className="font-display text-[3.5rem] leading-none text-charcoal-900">{avgRating.toFixed(1)}</p>
                      <div className="flex gap-0.5 justify-center mt-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-4 h-4 ${i < Math.round(avgRating) ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`}
                          />
                        ))}
                      </div>
                      <p className="text-body-sm text-charcoal-600 mt-1">{reviews.length} avis</p>
                    </div>

                    {reviews.length > 0 && (
                      <div className="flex-1 space-y-2">
                        {[5, 4, 3, 2, 1].map((n) => {
                          const count = reviews.filter((r) => Math.round(r.rating || 5) === n).length;
                          const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                          return (
                            <div key={n} className="flex items-center gap-3">
                              <span className="text-body-sm w-3">{n}</span>
                              <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                              <div className="flex-1 h-2 bg-charcoal-100 rounded-full overflow-hidden">
                                <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-body-sm text-charcoal-500 w-8">{pct}%</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {reviews.length === 0 ? (
                    <div className="text-center py-12 text-charcoal-400">
                      <Star className="w-10 h-10 mx-auto mb-3 text-charcoal-200" />
                      <p>Aucun avis pour le moment</p>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      {reviews
                        .filter((r) => r.status !== 'pending')
                        .map((review: any, i: number) => {
                          const initials = (review.client_name || review.author || 'A')
                            .split(' ')
                            .map((w: string) => w[0])
                            .slice(0, 2)
                            .join('')
                            .toUpperCase();
                          return (
                            <article key={i} className="bg-white rounded-2xl border border-charcoal-100 p-6">
                              <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-rose-100 rounded-full flex items-center justify-center text-rose-700 font-semibold text-sm">
                                    {initials}
                                  </div>
                                  <div>
                                    <p className="font-semibold text-charcoal-900 text-sm">
                                      {review.client_name || review.author || 'Client'}
                                    </p>
                                    <p className="text-xs text-charcoal-500">
                                      {new Date(review.date || review.created_at || Date.now()).toLocaleDateString('fr-FR', {
                                        month: 'long',
                                        year: 'numeric',
                                      })}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex gap-0.5 flex-shrink-0">
                                  {[...Array(5)].map((_, j) => (
                                    <Star
                                      key={j}
                                      className={`w-4 h-4 ${j < (review.rating || 5) ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`}
                                    />
                                  ))}
                                </div>
                              </div>
                              {review.comment && <p className="text-body-md text-charcoal-700 leading-relaxed">{review.comment}</p>}
                              {review.vendor_reply && (
                                <div className="mt-3 bg-rose-50 rounded-xl p-3 border-l-2 border-rose-300">
                                  <p className="text-xs font-semibold text-rose-700 mb-1">Réponse du prestataire</p>
                                  <p className="text-xs text-charcoal-600">{review.vendor_reply}</p>
                                </div>
                              )}
                            </article>
                          );
                        })}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'reportages' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                  {reportages.map((r, i) => (
                    <article key={i} className="group relative rounded-2xl overflow-hidden cursor-pointer bg-charcoal-900">
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
                <div className="space-y-4">
                  {activePromos.map((promo: any, i: number) => (
                    <div
                      key={i}
                      className={`bg-white rounded-2xl p-6 ${i === 0 ? 'border-2 border-rose-200' : 'border border-charcoal-200'}`}
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <Tag className={`w-5 h-5 ${i === 0 ? 'text-rose-600' : 'text-champagne-600'}`} />
                        <span className={`font-semibold ${i === 0 ? 'text-rose-600' : 'text-champagne-700'}`}>
                          {promo.title} — -{promo.discount_value}
                          {promo.discount_type === 'percentage' ? '%' : ' €'}
                        </span>
                      </div>
                      {promo.description && <p className="text-body-md text-charcoal-700 mb-3">{promo.description}</p>}
                      {promo.code && (
                        <p className="text-body-sm text-charcoal-500 font-mono">
                          Code : <strong>{promo.code}</strong>
                        </p>
                      )}
                      {promo.valid_to && <p className="text-body-sm text-charcoal-400 mt-1">Valable jusqu'au {promo.valid_to}</p>}
                      <button
                        onClick={() => setShowContactModal(true)}
                        className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors"
                      >
                        En profiter
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
                  <div className="bg-charcoal-100 rounded-2xl h-80 flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-10 h-10 text-rose-500 mx-auto mb-3" />
                      <p className="font-semibold text-charcoal-800">{vendor.location || 'Localisation non renseignée'}</p>
                      <p className="text-body-sm text-charcoal-500 mt-1">Zone d'intervention principale</p>
                    </div>
                  </div>
                  <p className="text-body-sm text-charcoal-500 mt-3 flex items-center gap-1.5">
                    <MapPin className="w-4 h-4" /> {vendor.location}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT STICKY SIDEBAR */}
          <div className="w-full lg:w-[310px] flex-shrink-0 order-first lg:order-last">
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
                <div className="flex items-center gap-1.5 mb-4">
                  <Tag className="w-4 h-4 text-rose-500" />
                  <button
                    className="text-body-sm text-rose-600 hover:text-rose-700 font-medium"
                    onClick={() => setActiveTab('promotions')}
                  >
                    {activePromos.length} promotion{activePromos.length > 1 ? 's' : ''} active{activePromos.length > 1 ? 's' : ''}
                  </button>
                </div>
              )}

              {vendor.startingPrice && (
                <div className="bg-white border border-charcoal-200 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-champagne-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Award className="w-4 h-4 text-champagne-600" />
                    </div>
                    <div>
                      <p className="text-xs text-charcoal-500">Tarif à partir de</p>
                      <p className="font-semibold text-charcoal-900 text-base">{vendor.startingPrice}</p>
                    </div>
                  </div>
                </div>
              )}

              {vendor.responseTime && (
                <div className="flex items-center gap-2 mb-4 text-body-sm text-charcoal-600">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span>Répond en {vendor.responseTime}</span>
                </div>
              )}

              <div className="flex gap-2 mb-5">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors text-sm"
                >
                  Nous contacter
                </button>
                {vendor.phone ? (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="w-12 h-12 border-2 border-rose-600 rounded-xl flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
                    title={`Appeler ${vendor.name}`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                ) : (
                  <button disabled className="w-12 h-12 border-2 border-charcoal-200 rounded-xl flex items-center justify-center text-charcoal-300 flex-shrink-0 cursor-not-allowed">
                    <Phone className="w-4 h-4" />
                  </button>
                )}
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

              <div className="fixed bottom-0 left-0 right-0 z-40 lg:hidden bg-white border-t border-charcoal-100 px-4 py-3 flex gap-3 shadow-lg">
                <button
                  onClick={() => setShowContactModal(true)}
                  className="flex-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold py-3 rounded-xl transition-colors text-sm"
                >
                  Nous contacter
                </button>
                {vendor.phone ? (
                  <a
                    href={`tel:${vendor.phone}`}
                    className="w-12 h-12 border-2 border-rose-600 rounded-xl flex items-center justify-center text-rose-600 hover:bg-rose-50 transition-colors flex-shrink-0"
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                ) : (
                  <button disabled className="w-12 h-12 border-2 border-charcoal-200 rounded-xl flex items-center justify-center text-charcoal-300 flex-shrink-0 cursor-not-allowed">
                    <Phone className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {similarVendors.length > 0 && (
        <section className="py-16 px-4 sm:px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-xl sm:text-display-sm text-charcoal-900 mb-6 sm:mb-8">Prestataires similaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {similarVendors.map((v: any) => (
                <VendorCard
                  key={v.id}
                  id={v.id}
                  name={v.name}
                  category={v.category}
                  location={v.location}
                  rating={v.rating || 5}
                  reviewCount={v.reviewCount || 0}
                  imageUrl={v.images?.[0] || ''}
                  startingPrice={v.startingPrice}
                  hrefBase={similarHrefBase}
                />
              ))}
            </div>
          </div>
        </section>
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
                  onClick={() => setShowContactModal(false)}
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
                  setSending(true);
                  try {
                    await onSubmitContact(contactForm);
                    setShowContactModal(false);
                  } finally {
                    setSending(false);
                  }
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
                {!isLoggedIn && (
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
                  className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors flex items-center justify-center gap-2 mt-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Envoi…' : 'Envoyer'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ensures vendorId is referenced (props parity) */}
      <span className="hidden">{vendorId}</span>
    </>
  );
}
