'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getDocument } from '@/lib/db';
import PrestataireDashboardLayout from '../../PrestataireDashboardLayout';
import {
  Star, MapPin, ArrowLeft, Tag, Globe, Instagram,
  Award, Users, Zap, ChevronDown, Image as ImageIcon, Check, ExternalLink,
} from 'lucide-react';

interface VendorProfile {
  id: string;
  name: string;
  tagline?: string;
  category?: string;
  location?: string;
  description?: string;
  rating?: number;
  reviewCount?: number;
  images?: string[];
  startingPrice?: string;
  responseTime?: string;
  experience?: string;
  weddingsCompleted?: number;
  website?: string;
  instagram?: string;
  packages?: { name: string; price: string; items: string[]; popular?: boolean }[];
  faqs?: { q: string; a: string }[];
  team?: { name: string; role: string; bio: string; photo?: string }[];
  reportages?: { title: string; date: string; imageUrl: string; videoUrl?: string }[];
  tags?: string[];
  uid?: string;
}

export default function VendorProfileInPrestatairePage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'about' | 'packages' | 'reportages' | 'faqs'>('about');
  const [faqOpen, setFaqOpen] = useState<number | null>(null);

  useEffect(() => {
    if (!id) return;
    getDocument('vendors', id)
      .then(data => setVendor(data as VendorProfile | null))
      .catch(() => setVendor(null))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <PrestataireDashboardLayout>
      <div className="space-y-4 animate-pulse max-w-4xl">
        <div className="h-8 w-32 bg-white/60 rounded-xl" />
        <div className="h-64 bg-white/60 rounded-2xl" />
        <div className="h-40 bg-white/60 rounded-2xl" />
      </div>
    </PrestataireDashboardLayout>
  );

  if (!vendor) return (
    <PrestataireDashboardLayout>
      <div className="text-center py-20">
        <ImageIcon className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
        <p className="font-serif text-xl text-charcoal-600">Prestataire introuvable</p>
        <button onClick={() => router.back()} className="mt-4 text-sm text-rose-600 hover:underline">← Retour</button>
      </div>
    </PrestataireDashboardLayout>
  );

  const photos: string[] = vendor.images?.length ? vendor.images : [];
  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'about', label: 'À propos' },
    ...(vendor.packages?.length ? [{ key: 'packages' as const, label: 'Formules' }] : []),
    ...(vendor.reportages?.length ? [{ key: 'reportages' as const, label: 'Reportages' }] : []),
    ...(vendor.faqs?.length ? [{ key: 'faqs' as const, label: 'FAQ' }] : []),
  ];

  return (
    <PrestataireDashboardLayout>
      <div className="space-y-5 max-w-4xl">
        {/* Back + public link */}
        <div className="flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-charcoal-500 hover:text-charcoal-900 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </button>
          <a href={`/vendors/${id}`} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-rose-600 hover:underline">
            <ExternalLink className="w-3.5 h-3.5" /> Voir profil public
          </a>
        </div>

        <div className="grid lg:grid-cols-[1fr_280px] gap-5">
          <div className="space-y-5">
            {/* Photos */}
            {photos.length > 0 && (
              <div className="rounded-2xl overflow-hidden bg-stone-100">
                <div className="sm:hidden flex gap-2 overflow-x-auto pb-1" style={{ scrollSnapType: 'x mandatory' }}>
                  {photos.map((p, i) => (
                    <div key={i} className="flex-shrink-0 w-[85vw] h-52 rounded-xl overflow-hidden" style={{ scrollSnapAlign: 'start' }}>
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <div className="hidden sm:grid grid-cols-2 gap-2 h-64">
                  <div className="row-span-2 overflow-hidden rounded-l-2xl">
                    <img src={photos[0]} alt="" className="w-full h-full object-cover" />
                  </div>
                  {photos.slice(1, 3).map((p, i) => (
                    <div key={i} className={`overflow-hidden ${i === 1 ? 'rounded-tr-2xl' : 'rounded-br-2xl'}`}>
                      <img src={p} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Header */}
            <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-5">
              <p className="text-xs font-semibold text-charcoal-400 uppercase tracking-wider mb-1">{vendor.category}</p>
              <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem,3vw,2rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
                {vendor.name}
              </h1>
              {vendor.tagline && <p className="text-sm text-charcoal-500 mt-0.5 font-light">{vendor.tagline}</p>}
              <div className="flex flex-wrap items-center gap-4 mt-2">
                {vendor.rating && vendor.rating > 0 ? (
                  <div className="flex items-center gap-1.5">
                    {[1,2,3,4,5].map(i => (
                      <Star key={i} className={`w-3.5 h-3.5 ${i <= Math.round(vendor.rating!) ? 'text-champagne-500 fill-champagne-500' : 'text-charcoal-200'}`} />
                    ))}
                    <span className="text-sm font-medium text-charcoal-700">{vendor.rating}</span>
                    {vendor.reviewCount ? <span className="text-xs text-charcoal-400">({vendor.reviewCount} avis)</span> : null}
                  </div>
                ) : null}
                {vendor.location && <p className="flex items-center gap-1 text-sm text-charcoal-500"><MapPin className="w-3.5 h-3.5 text-rose-400" />{vendor.location}</p>}
              </div>
              <div className="flex flex-wrap gap-3 mt-4 pt-4 border-t border-charcoal-100">
                {vendor.experience && <span className="flex items-center gap-1.5 text-sm text-charcoal-600"><Award className="w-3.5 h-3.5 text-champagne-500" />{vendor.experience}</span>}
                {vendor.weddingsCompleted ? <span className="flex items-center gap-1.5 text-sm text-charcoal-600"><Users className="w-3.5 h-3.5 text-rose-400" />{vendor.weddingsCompleted}+ mariages</span> : null}
                {vendor.responseTime && <span className="flex items-center gap-1.5 text-sm text-charcoal-600"><Zap className="w-3.5 h-3.5 text-amber-400" />Répond en {vendor.responseTime}</span>}
                {vendor.website && <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-rose-600 hover:underline"><Globe className="w-3.5 h-3.5" />Site web</a>}
                {vendor.instagram && <a href={`https://instagram.com/${vendor.instagram.replace('@','')}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-rose-600 hover:underline"><Instagram className="w-3.5 h-3.5" />{vendor.instagram}</a>}
              </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
              <div className="flex border-b border-charcoal-100 overflow-x-auto">
                {tabs.map(tab => (
                  <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                    className={`px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.key ? 'border-b-2 border-rose-600 text-rose-600 bg-rose-50/50' : 'text-charcoal-500 hover:text-charcoal-800'}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
              <div className="p-5">
                {activeTab === 'about' && (
                  <div className="space-y-4">
                    {vendor.description && <p className="text-sm text-charcoal-700 leading-relaxed whitespace-pre-line">{vendor.description}</p>}
                    {vendor.tags?.length ? (
                      <div className="flex flex-wrap gap-2">
                        {vendor.tags.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-100 text-charcoal-600 text-xs rounded-full">
                            <Tag className="w-2.5 h-2.5" />{t}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
                {activeTab === 'packages' && vendor.packages?.map((pkg, i) => (
                  <div key={i} className={`mb-3 p-4 rounded-xl border ${pkg.popular ? 'border-rose-300 bg-rose-50/40' : 'border-charcoal-100'}`}>
                    {pkg.popular && <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Populaire</span>}
                    <div className="flex items-start justify-between gap-2 mt-1">
                      <p className="font-semibold text-charcoal-900">{pkg.name}</p>
                      <p className="font-serif text-rose-700 text-lg flex-shrink-0">{pkg.price}</p>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {pkg.items.map((item, j) => (
                        <li key={j} className="flex items-center gap-2 text-sm text-charcoal-600">
                          <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />{item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
                {activeTab === 'reportages' && (
                  <div className="grid sm:grid-cols-2 gap-3">
                    {vendor.reportages?.map((r, i) => (
                      <div key={i} className="rounded-xl overflow-hidden bg-stone-100">
                        {r.videoUrl ? (
                          <video src={r.videoUrl} poster={r.imageUrl} controls playsInline className="w-full h-44 object-cover" />
                        ) : r.imageUrl ? (
                          <img src={r.imageUrl} alt={r.title} className="w-full h-44 object-cover" />
                        ) : null}
                        <div className="p-3">
                          <p className="text-sm font-medium text-charcoal-900">{r.title}</p>
                          <p className="text-xs text-charcoal-400 mt-0.5">{r.date}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {activeTab === 'faqs' && (
                  <div className="space-y-2">
                    {vendor.faqs?.map((faq, i) => (
                      <div key={i} className="border border-charcoal-100 rounded-xl overflow-hidden">
                        <button onClick={() => setFaqOpen(faqOpen === i ? null : i)}
                          className="w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-stone-50 transition-colors">
                          <span className="text-sm font-medium text-charcoal-900">{faq.q}</span>
                          <ChevronDown className={`w-4 h-4 text-charcoal-400 flex-shrink-0 ml-3 transition-transform ${faqOpen === i ? 'rotate-180' : ''}`} />
                        </button>
                        {faqOpen === i && (
                          <div className="px-4 pb-4 text-sm text-charcoal-600 leading-relaxed border-t border-charcoal-100 pt-3">{faq.a}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div>
            <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-5 sticky top-24 space-y-3">
              {vendor.startingPrice && (
                <div className="text-center pb-3 border-b border-charcoal-100">
                  <p className="text-xs text-charcoal-400 mb-1">À partir de</p>
                  <p className="font-serif text-2xl text-rose-700" style={{ fontWeight: 300 }}>{vendor.startingPrice}</p>
                </div>
              )}
              <a href={`/vendors/${id}`} target="_blank" rel="noopener noreferrer"
                className="w-full py-3 border border-rose-300 text-rose-600 hover:bg-rose-50 text-sm font-medium rounded-xl transition-colors flex items-center justify-center gap-2">
                <ExternalLink className="w-4 h-4" /> Voir profil public
              </a>
            </div>
          </div>
        </div>
      </div>
    </PrestataireDashboardLayout>
  );
}
