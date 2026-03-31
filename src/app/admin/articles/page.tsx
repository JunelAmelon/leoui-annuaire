'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { SEED_ARTICLES } from '@/lib/articles';
import type { Article } from '@/lib/articles';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, CheckCircle, X, Zap, Clock, Star } from 'lucide-react';

const CATS = ['Real Wedding', 'Tendances', 'Conseils', 'Décoration', 'Mode'];
const EMPTY: Omit<Article, 'id'> = {
  title: '', excerpt: '', content: '', imageUrl: '', category: 'Conseils',
  readTime: '5 min', date: '', published_at: new Date().toISOString(),
  author: '', authorRole: '', authorPhoto: '', featured: false,
  tags: [], gallery: [], quote: '', quoteAuthor: '',
  vendorsCredit: [], status: 'draft',
  created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
};

export default function AdminArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [seedDone, setSeedDone] = useState(false);
  const [modal, setModal] = useState<'create' | 'edit' | null>(null);
  const [editing, setEditing] = useState<Article | null>(null);
  const [form, setForm] = useState<Omit<Article, 'id'>>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const docs = await getDocuments('articles', []);
      const sorted = (docs as Article[]).sort(
        (a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
      setArticles(sorted);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setForm({ ...EMPTY, date: new Date().toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }), published_at: new Date().toISOString(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    setEditing(null);
    setModal('create');
  };

  const openEdit = (a: Article) => {
    setEditing(a);
    const { id: _id, ...rest } = a;
    setForm(rest as Omit<Article, 'id'>);
    setModal('edit');
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const payload = { ...form, updated_at: new Date().toISOString() };
      if (modal === 'edit' && editing) {
        await updateDocument('articles', editing.id, payload);
      } else {
        await addDocument('articles', { ...payload, created_at: new Date().toISOString() });
      }
      setModal(null);
      await load();
    } catch { /* ignore */ }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument('articles', id);
      setDeleteId(null);
      await load();
    } catch { /* ignore */ }
  };

  const toggleStatus = async (a: Article) => {
    const newStatus = a.status === 'published' ? 'draft' : 'published';
    await updateDocument('articles', a.id, { status: newStatus, updated_at: new Date().toISOString() });
    await load();
  };

  const toggleFeatured = async (a: Article) => {
    if (!a.featured) {
      for (const art of articles.filter(x => x.featured && x.id !== a.id)) {
        await updateDocument('articles', art.id, { featured: false });
      }
    }
    await updateDocument('articles', a.id, { featured: !a.featured, updated_at: new Date().toISOString() });
    await load();
  };

  const runSeed = async () => {
    setSeeding(true);
    try {
      for (const art of SEED_ARTICLES) {
        await addDocument('articles', { ...art, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
      }
      setSeedDone(true);
      await load();
    } catch { /* ignore */ }
    finally { setSeeding(false); }
  };

  const f = (key: keyof typeof form, val: any) => setForm(p => ({ ...p, [key]: val }));

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            Articles & Inspiration
          </h1>
        </div>
        <div className="flex gap-3 flex-wrap">
          {articles.length === 0 && (
            <button
              onClick={runSeed}
              disabled={seeding}
              className="flex items-center gap-2 px-4 py-2.5 border border-champagne-300 bg-champagne-50 hover:bg-champagne-100 text-champagne-800 text-sm font-medium rounded-xl transition-colors disabled:opacity-50"
            >
              {seeding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
              Seed {SEED_ARTICLES.length} articles initiaux
            </button>
          )}
          {seedDone && <span className="flex items-center gap-1.5 text-sm text-green-700 font-medium"><CheckCircle className="w-4 h-4" /> Seedé !</span>}
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Nouvel article
          </button>
        </div>
      </div>

      {/* List */}
      <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
          </div>
        ) : articles.length === 0 ? (
          <div className="text-center py-16 text-charcoal-400">
            <p className="text-sm mb-2">Aucun article.</p>
            <p className="text-xs">Utilisez le bouton &quot;Seed&quot; pour importer les articles initiaux, ou créez-en un manuellement.</p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-50">
            {articles.map(a => (
              <div key={a.id} className="flex items-start gap-4 px-5 py-4 hover:bg-stone-50 transition-colors">
                <img src={a.imageUrl || 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?w=80'} alt={a.title} className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="font-semibold text-charcoal-900 text-sm truncate">{a.title}</p>
                    {a.featured && <span className="text-[10px] bg-champagne-100 text-champagne-700 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1"><Star className="w-2.5 h-2.5 fill-champagne-600" />À la une</span>}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-charcoal-400 flex-wrap">
                    <span className="bg-stone-100 px-2 py-0.5 rounded-full">{a.category}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{a.readTime}</span>
                    <span>{a.date}</span>
                    <span className={`px-2 py-0.5 rounded-full font-medium ${a.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-charcoal-500'}`}>
                      {a.status === 'published' ? 'Publié' : 'Brouillon'}
                    </span>
                  </div>
                  <p className="text-xs text-charcoal-500 mt-1 line-clamp-1">{a.excerpt}</p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => toggleFeatured(a)} title="Mettre à la une" className={`p-2 rounded-lg transition-colors ${a.featured ? 'text-champagne-600 bg-champagne-50' : 'text-charcoal-300 hover:text-champagne-600 hover:bg-champagne-50'}`}>
                    <Star className={`w-4 h-4 ${a.featured ? 'fill-champagne-500' : ''}`} />
                  </button>
                  <button onClick={() => toggleStatus(a)} title={a.status === 'published' ? 'Passer en brouillon' : 'Publier'} className="p-2 rounded-lg text-charcoal-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    {a.status === 'published' ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                  <button onClick={() => openEdit(a)} className="p-2 rounded-lg text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteId(a.id)} className="p-2 rounded-lg text-charcoal-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={() => setModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100 sticky top-0 bg-white z-10">
              <h2 className="font-serif text-charcoal-900 text-lg">
                {modal === 'create' ? 'Nouvel article' : 'Modifier l\'article'}
              </h2>
              <button onClick={() => setModal(null)} className="p-1.5 text-charcoal-400 hover:text-charcoal-700 rounded-lg hover:bg-stone-100">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Titre *</label>
                  <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none" value={form.title} onChange={e => f('title', e.target.value)} placeholder="Titre de l'article" />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Extrait *</label>
                  <textarea className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none resize-none" rows={2} value={form.excerpt} onChange={e => f('excerpt', e.target.value)} placeholder="Résumé court (affiché sur la liste)" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Catégorie</label>
                  <select className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.category} onChange={e => f('category', e.target.value)}>
                    {CATS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Temps de lecture</label>
                  <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.readTime} onChange={e => f('readTime', e.target.value)} placeholder="ex: 5 min" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Date affichée</label>
                  <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.date} onChange={e => f('date', e.target.value)} placeholder="ex: Mars 2026" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Statut</label>
                  <select className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.status} onChange={e => f('status', e.target.value as 'published' | 'draft')}>
                    <option value="draft">Brouillon</option>
                    <option value="published">Publié</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Image principale (URL)</label>
                  <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.imageUrl} onChange={e => f('imageUrl', e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Auteur</label>
                  <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.author} onChange={e => f('author', e.target.value)} placeholder="Nom de l'auteur" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Rôle auteur</label>
                  <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.authorRole} onChange={e => f('authorRole', e.target.value)} placeholder="ex: Rédactrice en chef" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Photo auteur (URL)</label>
                  <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.authorPhoto} onChange={e => f('authorPhoto', e.target.value)} placeholder="https://..." />
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" id="featured" checked={form.featured} onChange={e => f('featured', e.target.checked)} className="w-4 h-4 accent-rose-600" />
                  <label htmlFor="featured" className="text-sm font-medium text-charcoal-700">Article à la une (hero)</label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Contenu * <span className="text-charcoal-400 font-normal">(séparer les paragraphes par une ligne vide)</span></label>
                <textarea className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 focus:border-rose-300 outline-none resize-y" rows={10} value={form.content} onChange={e => f('content', e.target.value)} placeholder="Corps de l'article..." />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Citation mise en avant</label>
                <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none mb-2" value={form.quote || ''} onChange={e => f('quote', e.target.value)} placeholder="Texte de la citation (optionnel)" />
                <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={form.quoteAuthor || ''} onChange={e => f('quoteAuthor', e.target.value)} placeholder="Auteur de la citation (ex: Sophie & Thomas)" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Galerie <span className="text-charcoal-400 font-normal">(URLs séparées par des virgules)</span></label>
                <textarea className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none resize-none" rows={2} value={(form.gallery || []).join(', ')} onChange={e => f('gallery', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="https://img1.jpg, https://img2.jpg" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-charcoal-700 mb-1.5">Tags <span className="text-charcoal-400 font-normal">(séparés par des virgules)</span></label>
                <input className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:ring-2 focus:ring-rose-200 outline-none" value={(form.tags || []).join(', ')} onChange={e => f('tags', e.target.value.split(',').map(s => s.trim()).filter(Boolean))} placeholder="paris, élégance, château" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setModal(null)} className="px-4 py-2.5 border border-charcoal-200 hover:bg-stone-50 text-charcoal-700 text-sm font-medium rounded-xl transition-colors">Annuler</button>
                <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.content.trim()} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  {modal === 'create' ? 'Créer l\'article' : 'Enregistrer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-charcoal-900/50 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm">
            <h3 className="font-serif text-charcoal-900 text-lg mb-2">Supprimer l&apos;article ?</h3>
            <p className="text-sm text-charcoal-500 mb-5">Cette action est irréversible.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)} className="flex-1 py-2.5 border border-charcoal-200 hover:bg-stone-50 text-charcoal-700 text-sm font-medium rounded-xl">Annuler</button>
              <button onClick={() => handleDelete(deleteId)} className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl">Supprimer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
