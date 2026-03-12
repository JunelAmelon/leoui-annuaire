'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { Camera, MapPin, Save, Plus, X, Eye, ExternalLink, Globe, Star, Clock, Euro, CheckCircle, Instagram, Upload, Loader2, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { getDocuments, setDocument, updateDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
import Link from 'next/link';

const CATEGORIES = [
  'Photographe', 'Vidéaste', 'Traiteur', 'Fleuriste',
  'DJ & Animation', 'Décorateur', 'Wedding Planner', 'Salle & Domaine',
  'Pâtissier', 'Musicien', 'Coiffure & Beauté', 'Transport',
];

type Faq = { q: string; a: string };
type TeamMember = { name: string; role: string; bio: string; photo: string };
type Package = { name: string; price: string; items: string[]; popular: boolean };
type Reportage = { title: string; date: string; imageUrl: string; videoUrl?: string };

function AnnuairePreview({ form }: { form: { name: string; tagline?: string; category: string; location: string; description: string; startingPrice: string; responseTime: string; tags: string[]; images: string[] } }) {
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
    tagline: '',
    category: '',
    location: '',
    description: '',
    experience: '',
    weddingsCompleted: 0,
    startingPrice: '',
    responseTime: '24h',
    website: '',
    instagram: '',
    tags: [] as string[],
    images: [] as string[],
    faqs: [] as Faq[],
    team: [] as TeamMember[],
    packages: [] as Package[],
    reportages: [] as Reportage[],
  });
  const [newTag, setNewTag] = useState('');
  const [newImage, setNewImage] = useState('');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  // FAQ
  const [newFaq, setNewFaq] = useState<Faq>({ q: '', a: '' });
  // Team
  const [newMember, setNewMember] = useState<TeamMember>({ name: '', role: '', bio: '', photo: '' });
  const [uploadingMemberPhoto, setUploadingMemberPhoto] = useState(false);
  // Packages
  const [newPkg, setNewPkg] = useState<Package>({ name: '', price: '', items: [], popular: false });
  const [newPkgItem, setNewPkgItem] = useState('');
  // Reportages
  const [newReport, setNewReport] = useState<Reportage>({ title: '', date: '', imageUrl: '', videoUrl: '' });
  const [uploadingReportImg, setUploadingReportImg] = useState(false);
  const [uploadingReportVideo, setUploadingReportVideo] = useState(false);
  // Section expand
  const [sections, setSections] = useState({ photos: true, tags: false, links: false, faqs: false, team: false, packages: false, reportages: false });
  const toggleSection = (s: keyof typeof sections) => setSections(p => ({ ...p, [s]: !p[s] }));

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
            tagline: d.tagline || '',
            category: d.category || '',
            location: d.location || '',
            description: d.description || '',
            experience: d.experience || '',
            weddingsCompleted: d.weddingsCompleted || 0,
            startingPrice: d.startingPrice || '',
            responseTime: d.responseTime || '24h',
            website: d.website || '',
            instagram: d.instagram || '',
            tags: d.tags || [],
            images: d.images || [],
            faqs: d.faqs || [],
            team: d.team || [],
            packages: d.packages || [],
            reportages: d.reportages || [],
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

  const handlePhotoUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadingPhoto(true);
    try {
      const urls = await Promise.all(Array.from(files).map(f => uploadFile(f, 'vendors/photos')));
      setForm(p => ({ ...p, images: [...p.images, ...urls] }));
      toast.success(`${urls.length} photo${urls.length > 1 ? 's' : ''} ajoutée${urls.length > 1 ? 's' : ''}`);
    } catch {
      toast.error('Erreur lors de l’upload');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleMemberPhotoUpload = async (file: File) => {
    setUploadingMemberPhoto(true);
    try {
      const url = await uploadFile(file, 'vendors/team');
      setNewMember(p => ({ ...p, photo: url }));
    } catch {
      toast.error('Erreur upload photo membre');
    } finally {
      setUploadingMemberPhoto(false);
    }
  };

  const handleReportImgUpload = async (file: File) => {
    setUploadingReportImg(true);
    try {
      const url = await uploadFile(file, 'vendors/reportages');
      setNewReport(p => ({ ...p, imageUrl: url }));
    } catch {
      toast.error('Erreur upload image');
    } finally {
      setUploadingReportImg(false);
    }
  };

  const addFaq = () => {
    if (newFaq.q.trim() && newFaq.a.trim()) {
      setForm(p => ({ ...p, faqs: [...p.faqs, { ...newFaq }] }));
      setNewFaq({ q: '', a: '' });
    }
  };
  const removeFaq = (i: number) => setForm(p => ({ ...p, faqs: p.faqs.filter((_, idx) => idx !== i) }));

  const addTeamMember = () => {
    if (newMember.name.trim()) {
      setForm(p => ({ ...p, team: [...p.team, { ...newMember }] }));
      setNewMember({ name: '', role: '', bio: '', photo: '' });
    }
  };
  const removeTeamMember = (i: number) => setForm(p => ({ ...p, team: p.team.filter((_, idx) => idx !== i) }));

  const addPkgItem = () => {
    if (newPkgItem.trim()) {
      setNewPkg(p => ({ ...p, items: [...p.items, newPkgItem.trim()] }));
      setNewPkgItem('');
    }
  };
  const addPackage = () => {
    if (newPkg.name.trim()) {
      setForm(p => ({ ...p, packages: [...p.packages, { ...newPkg }] }));
      setNewPkg({ name: '', price: '', items: [], popular: false });
      setNewPkgItem('');
    }
  };
  const removePackage = (i: number) => setForm(p => ({ ...p, packages: p.packages.filter((_, idx) => idx !== i) }));

  const addReportage = () => {
    if (newReport.title.trim()) {
      setForm(p => ({ ...p, reportages: [...p.reportages, { ...newReport }] }));
      setNewReport({ title: '', date: '', imageUrl: '', videoUrl: '' });
    }
  };
  const removeReportage = (i: number) => setForm(p => ({ ...p, reportages: p.reportages.filter((_, idx) => idx !== i) }));

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
    { label: 'FAQ', done: form.faqs.length > 0 },
    { label: 'Formules / Packages', done: form.packages.length > 0 },
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Nom de votre entreprise *</label>
                    <input type="text" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm text-charcoal-900 bg-stone-50 focus:outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 transition-all"
                      placeholder="Ex: Atelier Lumière" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Accroche (tagline)</label>
                    <input type="text" value={form.tagline} onChange={e => setForm(p => ({ ...p, tagline: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                      placeholder="Ex: Photographes passionnés · Paris" />
                  </div>
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
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Tarif à partir de</label>
                    <div className="relative">
                      <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
                      <input type="text" value={form.startingPrice} onChange={e => setForm(p => ({ ...p, startingPrice: e.target.value }))}
                        className="w-full pl-9 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="1 500€" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Délai réponse</label>
                    <select value={form.responseTime} onChange={e => setForm(p => ({ ...p, responseTime: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all">
                      {['12h', '24h', '48h', '72h'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Expérience</label>
                    <input type="text" value={form.experience} onChange={e => setForm(p => ({ ...p, experience: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                      placeholder="Ex: 8 ans" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Mariages réalisés</label>
                    <input type="number" min={0} value={form.weddingsCompleted} onChange={e => setForm(p => ({ ...p, weddingsCompleted: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                      placeholder="150" />
                  </div>
                </div>
              </div>
            </div>

            {/* Photos */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <button onClick={() => toggleSection('photos')} className="w-full flex items-center justify-between mb-1">
                <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Photos de réalisations</h2>
                {sections.photos ? <ChevronUp className="w-4 h-4 text-charcoal-400" /> : <ChevronDown className="w-4 h-4 text-charcoal-400" />}
              </button>
              {sections.photos && (
                <>
                  <p className="text-xs text-charcoal-400 mb-4">La première image sera la photo principale. Importez depuis votre appareil ou collez une URL.</p>
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
                    <button onClick={() => photoInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-charcoal-200 flex flex-col items-center justify-center hover:border-rose-400 hover:bg-rose-50 transition-colors cursor-pointer">
                      {uploadingPhoto ? <Loader2 className="w-5 h-5 text-rose-400 animate-spin" /> : <><Camera className="w-5 h-5 text-charcoal-300 mb-1" /><span className="text-[10px] text-charcoal-400">Importer</span></>}
                    </button>
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={e => handlePhotoUpload(e.target.files)} />
                  <div className="flex items-center gap-2 mb-2">
                    <div className="flex-1 h-px bg-charcoal-100" />
                    <span className="text-[10px] text-charcoal-400 uppercase tracking-wider">ou URL</span>
                    <div className="flex-1 h-px bg-charcoal-100" />
                  </div>
                  <div className="flex gap-2">
                    <input type="url" value={newImage} onChange={e => setNewImage(e.target.value)} onKeyDown={e => e.key === 'Enter' && addImage()}
                      className="flex-1 px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                      placeholder="https://... coller une URL" />
                    <button onClick={addImage} className="px-4 py-2 bg-charcoal-800 text-white rounded-xl text-sm hover:bg-charcoal-900 transition-colors"><Plus className="w-4 h-4" /></button>
                  </div>
                </>
              )}
            </div>

            {/* Tags */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <button onClick={() => toggleSection('tags')} className="w-full flex items-center justify-between mb-1">
                <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Spécialités & Services</h2>
                {sections.tags ? <ChevronUp className="w-4 h-4 text-charcoal-400" /> : <ChevronDown className="w-4 h-4 text-charcoal-400" />}
              </button>
              {sections.tags && (
                <>
                  <p className="text-xs text-charcoal-400 mb-4">Mots-clés affichés sur votre fiche.</p>
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
                </>
              )}
            </div>

            {/* Liens */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <button onClick={() => toggleSection('links')} className="w-full flex items-center justify-between mb-1">
                <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Liens externes</h2>
                {sections.links ? <ChevronUp className="w-4 h-4 text-charcoal-400" /> : <ChevronDown className="w-4 h-4 text-charcoal-400" />}
              </button>
              {sections.links && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
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
              )}
            </div>

            {/* FAQ */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <button onClick={() => toggleSection('faqs')} className="w-full flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">FAQ</h2>
                  {form.faqs.length > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-medium rounded-full">{form.faqs.length}</span>}
                </div>
                {sections.faqs ? <ChevronUp className="w-4 h-4 text-charcoal-400" /> : <ChevronDown className="w-4 h-4 text-charcoal-400" />}
              </button>
              {sections.faqs && (
                <>
                  <p className="text-xs text-charcoal-400 mb-4 mt-1">Questions fréquemment posées par vos futurs clients.</p>
                  <div className="space-y-3 mb-4">
                    {form.faqs.map((faq, i) => (
                      <div key={i} className="bg-stone-50 rounded-xl p-3 border border-charcoal-100">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <p className="text-sm font-medium text-charcoal-800 mb-1">{faq.q}</p>
                            <p className="text-xs text-charcoal-500">{faq.a}</p>
                          </div>
                          <button onClick={() => removeFaq(i)} className="text-charcoal-300 hover:text-red-500 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border border-charcoal-200 rounded-xl p-4 space-y-3 bg-stone-50">
                    <p className="text-xs font-medium text-charcoal-600">Ajouter une question</p>
                    <input type="text" value={newFaq.q} onChange={e => setNewFaq(p => ({ ...p, q: e.target.value }))}
                      className="w-full px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
                      placeholder="Question (ex: Livrez-vous en RAW ?)" />
                    <textarea rows={2} value={newFaq.a} onChange={e => setNewFaq(p => ({ ...p, a: e.target.value }))}
                      className="w-full px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all resize-none"
                      placeholder="Réponse…" />
                    <button onClick={addFaq} disabled={!newFaq.q.trim() || !newFaq.a.trim()}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-sm rounded-xl transition-colors">
                      <Plus className="w-3.5 h-3.5" /> Ajouter
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Packages / Formules */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <button onClick={() => toggleSection('packages')} className="w-full flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Formules & Tarifs</h2>
                  {form.packages.length > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-medium rounded-full">{form.packages.length}</span>}
                </div>
                {sections.packages ? <ChevronUp className="w-4 h-4 text-charcoal-400" /> : <ChevronDown className="w-4 h-4 text-charcoal-400" />}
              </button>
              {sections.packages && (
                <>
                  <p className="text-xs text-charcoal-400 mb-4 mt-1">Vos offres tarifaires affichées dans l'onglet Informations.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
                    {form.packages.map((pkg, i) => (
                      <div key={i} className={`rounded-xl p-4 border-2 ${pkg.popular ? 'border-rose-300 bg-rose-50' : 'border-charcoal-200 bg-stone-50'}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            {pkg.popular && <span className="text-[10px] font-semibold bg-rose-600 text-white px-2 py-0.5 rounded-full mb-1 inline-block">Populaire</span>}
                            <p className="font-semibold text-charcoal-900 text-sm">{pkg.name}</p>
                            <p className="text-rose-600 font-medium text-sm">{pkg.price}</p>
                          </div>
                          <button onClick={() => removePackage(i)} className="text-charcoal-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                        </div>
                        <ul className="mt-2 space-y-0.5">
                          {pkg.items.map((it, j) => <li key={j} className="text-xs text-charcoal-600">• {it}</li>)}
                        </ul>
                      </div>
                    ))}
                  </div>
                  <div className="border border-charcoal-200 rounded-xl p-4 space-y-3 bg-stone-50">
                    <p className="text-xs font-medium text-charcoal-600">Ajouter une formule</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={newPkg.name} onChange={e => setNewPkg(p => ({ ...p, name: e.target.value }))}
                        className="px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="Nom (ex: Formule Premium)" />
                      <input type="text" value={newPkg.price} onChange={e => setNewPkg(p => ({ ...p, price: e.target.value }))}
                        className="px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="Prix (ex: 2 500 €)" />
                    </div>
                    <div className="flex gap-2">
                      <input type="text" value={newPkgItem} onChange={e => setNewPkgItem(e.target.value)} onKeyDown={e => e.key === 'Enter' && addPkgItem()}
                        className="flex-1 px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="Inclus dans la formule…" />
                      <button onClick={addPkgItem} className="px-3 py-2 bg-charcoal-800 text-white rounded-xl text-sm hover:bg-charcoal-900 transition-colors"><Plus className="w-4 h-4" /></button>
                    </div>
                    {newPkg.items.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {newPkg.items.map((it, i) => (
                          <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-white border border-charcoal-200 text-charcoal-600 text-xs rounded-full">
                            {it}<button onClick={() => setNewPkg(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))} className="hover:text-red-500"><X className="w-2.5 h-2.5" /></button>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-charcoal-600 cursor-pointer">
                        <input type="checkbox" checked={newPkg.popular} onChange={e => setNewPkg(p => ({ ...p, popular: e.target.checked }))}
                          className="rounded border-charcoal-300" />
                        Marquer comme populaire
                      </label>
                      <button onClick={addPackage} disabled={!newPkg.name.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-sm rounded-xl transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Ajouter formule
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Équipe */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <button onClick={() => toggleSection('team')} className="w-full flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Équipe</h2>
                  {form.team.length > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-medium rounded-full">{form.team.length}</span>}
                </div>
                {sections.team ? <ChevronUp className="w-4 h-4 text-charcoal-400" /> : <ChevronDown className="w-4 h-4 text-charcoal-400" />}
              </button>
              {sections.team && (
                <>
                  <p className="text-xs text-charcoal-400 mb-4 mt-1">Présentez les membres de votre équipe.</p>
                  <div className="space-y-3 mb-4">
                    {form.team.map((member, i) => (
                      <div key={i} className="flex items-center gap-3 bg-stone-50 rounded-xl p-3 border border-charcoal-100">
                        {member.photo ? (
                          <img src={member.photo} alt={member.name} className="w-12 h-12 rounded-xl object-cover flex-shrink-0" />
                        ) : (
                          <div className="w-12 h-12 rounded-xl bg-charcoal-100 flex items-center justify-center flex-shrink-0">
                            <span className="font-serif text-lg text-charcoal-400">{member.name.charAt(0)}</span>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-charcoal-900 text-sm">{member.name}</p>
                          <p className="text-rose-600 text-xs">{member.role}</p>
                        </div>
                        <button onClick={() => removeTeamMember(i)} className="text-charcoal-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                  <div className="border border-charcoal-200 rounded-xl p-4 space-y-3 bg-stone-50">
                    <p className="text-xs font-medium text-charcoal-600">Ajouter un membre</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={newMember.name} onChange={e => setNewMember(p => ({ ...p, name: e.target.value }))}
                        className="px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="Prénom Nom" />
                      <input type="text" value={newMember.role} onChange={e => setNewMember(p => ({ ...p, role: e.target.value }))}
                        className="px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="Rôle (ex: Photographe)" />
                    </div>
                    <textarea rows={2} value={newMember.bio} onChange={e => setNewMember(p => ({ ...p, bio: e.target.value }))}
                      className="w-full px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all resize-none"
                      placeholder="Courte biographie…" />
                    <div className="flex items-center gap-3">
                      {newMember.photo && <img src={newMember.photo} alt="" className="w-10 h-10 rounded-lg object-cover" />}
                      <label className="flex items-center gap-2 px-3 py-2 border border-charcoal-200 rounded-xl text-sm text-charcoal-600 bg-white cursor-pointer hover:border-rose-300 transition-colors">
                        {uploadingMemberPhoto ? <Loader2 className="w-4 h-4 animate-spin text-rose-400" /> : <Upload className="w-4 h-4" />}
                        Photo
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleMemberPhotoUpload(e.target.files[0])} />
                      </label>
                      <button onClick={addTeamMember} disabled={!newMember.name.trim()}
                        className="ml-auto flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-sm rounded-xl transition-colors">
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Reportages */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <button onClick={() => toggleSection('reportages')} className="w-full flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Reportages</h2>
                  {form.reportages.length > 0 && <span className="px-2 py-0.5 bg-rose-100 text-rose-600 text-[10px] font-medium rounded-full">{form.reportages.length}</span>}
                </div>
                {sections.reportages ? <ChevronUp className="w-4 h-4 text-charcoal-400" /> : <ChevronDown className="w-4 h-4 text-charcoal-400" />}
              </button>
              {sections.reportages && (
                <>
                  <p className="text-xs text-charcoal-400 mb-4 mt-1">Vos plus belles références de mariage.</p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {form.reportages.map((r, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden h-28 bg-stone-100">
                        {r.videoUrl ? (
                          <video src={r.videoUrl} poster={r.imageUrl || undefined} className="w-full h-full object-cover" />
                        ) : r.imageUrl ? (
                          <img src={r.imageUrl} alt={r.title} className="w-full h-full object-cover" />
                        ) : null}
                        {r.videoUrl && (
                          <div className="absolute top-1.5 left-1.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center">
                            <span className="text-[8px]">▶</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        <div className="absolute bottom-0 p-2">
                          <p className="text-white text-xs font-medium">{r.title}</p>
                          {r.date && <p className="text-white/70 text-[10px]">{r.date}</p>}
                        </div>
                        <button onClick={() => removeReportage(i)}
                          className="absolute top-1.5 right-1.5 w-5 h-5 bg-black/60 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="border border-charcoal-200 rounded-xl p-4 space-y-3 bg-stone-50">
                    <p className="text-xs font-medium text-charcoal-600">Ajouter un reportage</p>
                    <div className="grid grid-cols-2 gap-3">
                      <input type="text" value={newReport.title} onChange={e => setNewReport(p => ({ ...p, title: e.target.value }))}
                        className="px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="Titre du reportage" />
                      <input type="text" value={newReport.date} onChange={e => setNewReport(p => ({ ...p, date: e.target.value }))}
                        className="px-3 py-2 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
                        placeholder="Date (ex: Juin 2024)" />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {newReport.imageUrl && <img src={newReport.imageUrl} alt="" className="w-12 h-8 rounded-lg object-cover" />}
                      <label className="flex items-center gap-1.5 px-3 py-2 border border-charcoal-200 rounded-xl text-sm text-charcoal-600 bg-white cursor-pointer hover:border-rose-300 transition-colors">
                        {uploadingReportImg ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Upload className="w-3.5 h-3.5" />}
                        Image
                        <input type="file" accept="image/*" className="hidden" onChange={e => e.target.files?.[0] && handleReportImgUpload(e.target.files[0])} />
                      </label>
                      <label className="flex items-center gap-1.5 px-3 py-2 border border-charcoal-200 rounded-xl text-sm text-charcoal-600 bg-white cursor-pointer hover:border-rose-300 transition-colors">
                        {uploadingReportVideo ? <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" /> : <Camera className="w-3.5 h-3.5" />}
                        Vidéo
                        <input type="file" accept="video/*" className="hidden" onChange={async e => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingReportVideo(true);
                          try {
                            const url = await uploadFile(file, 'reportages/videos');
                            setNewReport(p => ({ ...p, videoUrl: url }));
                            toast.success('Vidéo uploadée');
                          } catch { toast.error('Erreur upload vidéo'); }
                          finally { setUploadingReportVideo(false); }
                        }} />
                      </label>
                      {newReport.videoUrl && <span className="text-xs text-green-600 font-medium">✓ Vidéo prête</span>}
                      <button onClick={addReportage} disabled={!newReport.title.trim()}
                        className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-sm rounded-xl transition-colors ml-auto">
                        <Plus className="w-3.5 h-3.5" /> Ajouter
                      </button>
                    </div>
                  </div>
                </>
              )}
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
