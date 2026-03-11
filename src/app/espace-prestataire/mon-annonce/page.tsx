'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { Camera, MapPin, Save, Plus, X, Eye, ExternalLink, Globe, Star, Clock, Euro, CheckCircle, Instagram } from 'lucide-react';
import { getDocuments, setDocument, updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import Link from 'next/link';

const CATEGORIES = [
  'Photographes', 'Vidéastes', 'Traiteurs', 'Fleuristes',
  'DJ & Musiciens', 'Décorateurs', 'Wedding Planners', 'Lieux de réception',
];

function AnnuairePreview({ form }: { form: { name: string; category: string; location: string; description: string; startingPrice: string; responseTime: string; tags: string[]; images: string[] } }) {
  const mainImage = form.images[0];
  return (
    <div className="bg-white rounded-2xl border border-stone-100 overflow-hidden">
      <div className="relative h-44 bg-stone-100">
        {mainImage ? (
          <img src={mainImage} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 to-stone-100">
            <Camera className="w-8 h-8 text-stone-300 mb-1" />
            <span className="text-xs text-stone-400">Ajoutez des photos</span>
          </div>
        )}
        {form.category && (
          <span className="absolute top-2.5 left-2.5 px-2.5 py-1 bg-white/95 text-charcoal-700 text-[11px] font-medium rounded-full shadow-sm">{form.category}</span>
        )}
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-serif text-charcoal-900 text-base leading-tight">{form.name || 'Nom de votre entreprise'}</h3>
          <div className="flex items-center gap-0.5 text-xs text-champagne-600 flex-shrink-0">
            <Star className="w-3 h-3 fill-champagne-500 text-champagne-500" /><span className="font-medium ml-0.5">5.0</span>
          </div>
        </div>
        {form.location && (
          <div className="flex items-center gap-1 text-xs text-charcoal-500 mb-2">
            <MapPin className="w-3 h-3 text-rose-400" />{form.location}
          </div>
        )}
        {form.description && (
          <p className="text-xs text-charcoal-500 mb-2.5 line-clamp-2">{form.description}</p>
        )}
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {form.tags.slice(0, 3).map((t: string) => (
              <span key={t} className="px-2 py-0.5 bg-rose-50 text-rose-700 text-[10px] rounded-full">{t}</span>
            ))}
            {form.tags.length > 3 && <span className="px-2 py-0.5 bg-stone-100 text-charcoal-400 text-[10px] rounded-full">+{form.tags.length - 3}</span>}
          </div>
        )}
        <div className="flex items-center justify-between pt-2.5 border-t border-stone-100">
          <p className="text-xs text-charcoal-500">
            {form.startingPrice ? <>À partir de <span className="font-semibold text-charcoal-900">{form.startingPrice}</span></> : <span className="text-charcoal-300">Prix sur demande</span>}
          </p>
          <div className="flex items-center gap-1 text-[10px] text-charcoal-400">
            <Clock className="w-2.5 h-2.5" />Répond en {form.responseTime}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MonAnnoncePage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [announcementId, setAnnouncementId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    category: '',
    location: '',
    description: '',
    startingPrice: '',
    responseTime: '24h',
    website: '',
    instagram: '',
    tags: [] as string[],
    images: [] as string[],
  });
  const [newTag, setNewTag] = useState('');
  const [newImage, setNewImage] = useState('');

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const docs = await getDocuments('vendors', [
          { field: 'uid', operator: '==', value: user.uid },
        ]);
        if (docs.length > 0) {
          const d = docs[0] as any;
          setAnnouncementId(d.id);
          setForm({
            name: d.name || '',
            category: d.category || '',
            location: d.location || '',
            description: d.description || '',
            startingPrice: d.startingPrice || '',
            responseTime: d.responseTime || '24h',
            website: d.website || '',
            instagram: d.instagram || '',
            tags: d.tags || [],
            images: d.images || [],
          });
        } else {
          setForm(prev => ({ ...prev, name: user.displayName || '' }));
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const data = {
        ...form,
        uid: user.uid,
        email: user.email,
        updatedAt: new Date().toISOString(),
      };
      if (announcementId) {
        await updateDocument('vendors', announcementId, data);
      } else {
        await setDocument('vendors', user.uid, { ...data, createdAt: new Date().toISOString() });
        setAnnouncementId(user.uid);
      }
      toast.success('Annonce mise à jour avec succès');
    } catch {
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const addTag = () => {
    if (newTag.trim() && !form.tags.includes(newTag.trim())) {
      setForm(p => ({ ...p, tags: [...p.tags, newTag.trim()] }));
      setNewTag('');
    }
  };

  const removeTag = (t: string) => setForm(p => ({ ...p, tags: p.tags.filter(x => x !== t) }));
  const addImage = () => {
    if (newImage.trim()) {
      setForm(p => ({ ...p, images: [...p.images, newImage.trim()] }));
      setNewImage('');
    }
  };
  const removeImage = (url: string) => setForm(p => ({ ...p, images: p.images.filter(x => x !== url) }));

  if (loading) {
    return (
      <PrestataireDashboardLayout>
        <div className="space-y-4">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-charcoal-100 rounded-2xl animate-pulse" />)}
        </div>
      </PrestataireDashboardLayout>
    );
  }

  const completionItems = [
    { label: "Nom de l'entreprise", done: !!form.name },
    { label: 'Catégorie', done: !!form.category },
    { label: 'Localisation', done: !!form.location },
    { label: 'Description (30+ car.)', done: form.description.length > 30 },
    { label: 'Photo principale', done: form.images.length > 0 },
    { label: 'Spécialités (tags)', done: form.tags.length > 0 },
    { label: 'Tarif indicatif', done: !!form.startingPrice },
  ];
  const completionPct = Math.round(completionItems.filter(i => i.done).length / completionItems.length * 100);

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Mon annonce</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Ces informations s&apos;affichent sur votre fiche dans l&apos;annuaire LeOui.</p>
          </div>
          <div className="flex items-center gap-2.5">
            {announcementId && (
              <Link href={`/vendors/${announcementId}`} target="_blank"
                className="flex items-center gap-2 text-sm text-charcoal-600 hover:text-rose-600 border border-charcoal-200 hover:border-rose-300 px-3.5 py-2.5 rounded-xl transition-all">
                <Eye className="w-4 h-4" /> Voir ma fiche <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
              <Save className="w-4 h-4" />{saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        {/* 2-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-6">

          {/* ── Left: Form ── */}
          <div className="space-y-5">

            {/* Infos générales */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-4">Informations générales</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Nom de votre entreprise *</label>
                  <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm text-charcoal-900 bg-stone-50 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                    placeholder="Ex: Atelier Lumière" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Catégorie *</label>
                    <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all">
                      <option value="">Choisir une catégorie</option>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Ville / Région *</label>
                    <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                      placeholder="Ex: Paris, Île-de-France" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Description *</label>
                  <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={4}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all resize-none"
                    placeholder="Décrivez votre activité, votre style, vos points forts…" />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Tarif à partir de</label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
                      <input type="text" value={form.startingPrice} onChange={e => setForm(p => ({ ...p, startingPrice: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="1 500€ ou 85€/pers" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Délai de réponse</label>
                    <select value={form.responseTime} onChange={e => setForm(p => ({ ...p, responseTime: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all">
                      {['12h', '24h', '48h', '72h'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-1">Photos de réalisations</h2>
              <p className="text-xs text-charcoal-400 mb-4">La première image sera la photo principale. Collez une URL (Unsplash, votre site…)</p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
                {form.images.map((img, i) => (
                  <div key={i} className="relative group aspect-square rounded-xl overflow-hidden bg-stone-100">
                    <img src={img} alt="" className="w-full h-full object-cover" onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
                    {i === 0 && <span className="absolute bottom-1 left-1 px-1.5 py-0.5 bg-black/60 text-white text-[10px] rounded-md">Principale</span>}
                    <button onClick={() => removeImage(img)} className="absolute top-1 right-1 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                <div className="aspect-square rounded-xl border-2 border-dashed border-charcoal-200 flex flex-col items-center justify-center hover:border-rose-300 transition-colors">
                  <Camera className="w-4 h-4 text-charcoal-300 mb-0.5" /><span className="text-[10px] text-charcoal-400">Ajouter</span>
                </div>
              </div>
              <div className="flex gap-2">
                <input type="url" value={newImage} onChange={e => setNewImage(e.target.value)} onKeyDown={e => e.key === 'Enter' && addImage()}
                  className="flex-1 px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                  placeholder="https://... URL de l'image" />
                <button onClick={addImage} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm hover:bg-rose-700 transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-1">Spécialités & Services</h2>
              <p className="text-xs text-charcoal-400 mb-4">Mots-clés affichés sur votre fiche (ex: &quot;Séance engagement&quot;, &quot;Album photo&quot;)</p>
              <div className="flex flex-wrap gap-2 mb-3">
                {form.tags.map(t => (
                  <span key={t} className="flex items-center gap-1 px-3 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-full text-xs font-medium">
                    {t}<button onClick={() => removeTag(t)} className="hover:text-rose-900"><X className="w-3 h-3" /></button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input type="text" value={newTag} onChange={e => setNewTag(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()}
                  className="flex-1 px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                  placeholder="Ex: Album photo, Séance engagement…" />
                <button onClick={addTag} className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm hover:bg-rose-700 transition-colors"><Plus className="w-4 h-4" /></button>
              </div>
            </div>

            {/* Liens */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-4">Liens externes</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Site web</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
                    <input type="url" value={form.website} onChange={e => setForm(p => ({ ...p, website: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                      placeholder="https://monsite.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Instagram</label>
                  <div className="relative">
                    <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
                    <input type="text" value={form.instagram} onChange={e => setForm(p => ({ ...p, instagram: e.target.value }))}
                      className="w-full pl-9 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                      placeholder="@moncompte" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: Sticky preview + checklist ── */}
          <div className="space-y-4 lg:sticky lg:top-6 h-fit">

            {/* Live preview */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Aperçu annuaire</p>
                {announcementId && (
                  <Link href={`/vendors/${announcementId}`} target="_blank"
                    className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 transition-colors">
                    Ouvrir <ExternalLink className="w-3 h-3" />
                  </Link>
                )}
              </div>
              <AnnuairePreview form={form} />
            </div>

            {/* Completion checklist */}
            <div className="bg-white rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Complétude</p>
                <span className="text-sm font-semibold text-charcoal-900">{completionPct}%</span>
              </div>
              <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden mb-4">
                <div className="h-full bg-rose-600 rounded-full transition-all duration-500" style={{ width: `${completionPct}%` }} />
              </div>
              <div className="space-y-2">
                {completionItems.map(item => (
                  <div key={item.label} className="flex items-center gap-2.5">
                    <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center transition-colors ${item.done ? 'bg-green-500' : 'bg-stone-200'}`}>
                      {item.done && <CheckCircle className="w-3 h-3 text-white" />}
                    </div>
                    <span className={`text-xs ${item.done ? 'text-charcoal-700' : 'text-charcoal-400'}`}>{item.label}</span>
                  </div>
                ))}
              </div>
              {completionPct === 100 && (
                <div className="mt-4 p-3 bg-green-50 rounded-xl">
                  <p className="text-xs text-green-700 font-medium text-center">🎉 Fiche complète ! Vous êtes bien référencé.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </PrestataireDashboardLayout>
  );
}
