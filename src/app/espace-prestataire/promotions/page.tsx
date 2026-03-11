'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { Tag, Plus, X, Edit, Trash2, ToggleLeft, ToggleRight, Copy, Calendar } from 'lucide-react';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';

interface Promo {
  id: string; title: string; description: string;
  discount_type: 'percentage' | 'fixed'; discount_value: number;
  code: string; valid_from: string; valid_to: string;
  max_uses: number; used_count: number;
  min_amount: number; status: 'active' | 'inactive' | 'expired';
  created_at: string;
}

function genCode() {
  return Math.random().toString(36).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
}

export default function PromotionsPage() {
  const { user } = useAuth();
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Promo | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '',
    discount_type: 'percentage' as 'percentage' | 'fixed',
    discount_value: '', code: genCode(),
    valid_from: '', valid_to: '',
    max_uses: '', min_amount: '', status: 'active' as 'active' | 'inactive' | 'expired',
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('promotions', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setPromos((data as any[]).map(d => ({
        id: d.id, title: d.title || '', description: d.description || '',
        discount_type: d.discount_type || 'percentage', discount_value: d.discount_value || 0,
        code: d.code || '', valid_from: d.valid_from || '', valid_to: d.valid_to || '',
        max_uses: d.max_uses || 0, used_count: d.used_count || 0,
        min_amount: d.min_amount || 0, status: d.status || 'active',
        created_at: d.created_at || new Date().toISOString(),
      })));
    } catch { setPromos([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', description: '', discount_type: 'percentage', discount_value: '', code: genCode(), valid_from: '', valid_to: '', max_uses: '', min_amount: '', status: 'active' });
    setShowModal(true);
  };
  const openEdit = (p: Promo) => {
    setEditItem(p);
    setForm({ title: p.title, description: p.description, discount_type: p.discount_type, discount_value: String(p.discount_value), code: p.code, valid_from: p.valid_from, valid_to: p.valid_to, max_uses: String(p.max_uses || ''), min_amount: String(p.min_amount || ''), status: p.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !form.title || !form.discount_value) { toast.error('Remplissez les champs obligatoires'); return; }
    setSaving(true);
    try {
      const data = { vendor_id: user.uid, title: form.title, description: form.description, discount_type: form.discount_type, discount_value: parseFloat(form.discount_value) || 0, code: form.code.toUpperCase(), valid_from: form.valid_from, valid_to: form.valid_to, max_uses: parseInt(form.max_uses) || 0, min_amount: parseFloat(form.min_amount) || 0, status: form.status, used_count: editItem?.used_count || 0, created_at: editItem?.created_at || new Date().toISOString() };
      if (editItem) { await updateDocument('promotions', editItem.id, data); toast.success('Promotion mise à jour'); }
      else { await addDocument('promotions', data); toast.success('Promotion créée'); }
      setShowModal(false); load();
    } catch { toast.error('Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette promotion ?')) return;
    try { await deleteDocument('promotions', id); toast.success('Supprimée'); load(); } catch { toast.error('Erreur'); }
  };

  const toggleStatus = async (p: Promo) => {
    const next = p.status === 'active' ? 'inactive' : 'active';
    try { await updateDocument('promotions', p.id, { status: next }); toast.success(next === 'active' ? 'Promotion activée' : 'Promotion désactivée'); load(); } catch { toast.error('Erreur'); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).then(() => toast.success('Code copié !'));
  };

  const isExpired = (p: Promo) => p.valid_to && new Date(p.valid_to) < new Date();
  const activeCount = promos.filter(p => p.status === 'active' && !isExpired(p)).length;

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Promotions</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Créez des codes promo et offres spéciales pour attirer de nouveaux clients.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
            <Plus className="w-4 h-4" /> Créer une promo
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total promos', val: promos.length },
            { label: 'Actives', val: activeCount },
            { label: 'Utilisations', val: promos.reduce((s, p) => s + p.used_count, 0) },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">{s.label}</p>
              <p className="font-serif text-charcoal-900" style={{ fontSize: '1.8rem', fontWeight: 300, lineHeight: 1 }}>{s.val}</p>
            </div>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
        ) : promos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Tag className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
            <p className="font-serif text-charcoal-700 text-lg mb-1">Aucune promotion</p>
            <p className="text-sm text-charcoal-400">Créez votre première promotion pour booster votre visibilité</p>
          </div>
        ) : (
          <div className="space-y-3">
            {promos.map(p => {
              const expired = isExpired(p);
              const badgeColor = expired ? 'bg-stone-100 text-stone-500' : p.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-stone-100 text-stone-500';
              const badgeLabel = expired ? 'Expirée' : p.status === 'active' ? 'Active' : 'Inactive';
              return (
                <div key={p.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badgeColor}`}>{badgeLabel}</span>
                        {p.valid_to && (
                          <span className="flex items-center gap-1 text-xs text-charcoal-400">
                            <Calendar className="w-3 h-3" /> jusqu&apos;au {p.valid_to}
                          </span>
                        )}
                      </div>
                      <p className="font-medium text-charcoal-900">{p.title}</p>
                      {p.description && <p className="text-sm text-charcoal-500 mt-0.5">{p.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-serif text-rose-700 text-2xl" style={{ fontWeight: 300 }}>
                        -{p.discount_value}{p.discount_type === 'percentage' ? '%' : ' €'}
                      </p>
                      {p.min_amount > 0 && <p className="text-xs text-charcoal-400">à partir de {p.min_amount} €</p>}
                    </div>
                  </div>

                  {/* Code promo */}
                  <div className="flex items-center gap-3 mb-3 p-3 bg-stone-50 rounded-xl">
                    <div className="flex-1">
                      <p className="text-xs text-charcoal-400 mb-0.5">Code promo</p>
                      <p className="font-mono font-bold text-charcoal-900 tracking-widest text-sm">{p.code}</p>
                    </div>
                    <button onClick={() => copyCode(p.code)} className="flex items-center gap-1.5 px-3 py-1.5 border border-charcoal-200 text-charcoal-600 rounded-lg text-xs hover:bg-white transition-colors">
                      <Copy className="w-3.5 h-3.5" /> Copier
                    </button>
                    {p.max_uses > 0 && (
                      <p className="text-xs text-charcoal-400">{p.used_count}/{p.max_uses} utilisations</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {!expired && (
                      <button onClick={() => toggleStatus(p)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${p.status === 'active' ? 'bg-green-50 text-green-700 border border-green-200 hover:bg-green-100' : 'bg-stone-50 text-charcoal-600 border border-charcoal-200 hover:bg-stone-100'}`}>
                        {p.status === 'active' ? <ToggleRight className="w-3.5 h-3.5" /> : <ToggleLeft className="w-3.5 h-3.5" />}
                        {p.status === 'active' ? 'Désactiver' : 'Activer'}
                      </button>
                    )}
                    <button onClick={() => openEdit(p)} className="flex items-center gap-1.5 px-3 py-1.5 border border-charcoal-200 text-charcoal-600 rounded-lg text-xs font-medium hover:bg-stone-50 transition-colors">
                      <Edit className="w-3.5 h-3.5" /> Modifier
                    </button>
                    <button onClick={() => handleDelete(p.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors ml-auto">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 400 }}>{editItem ? 'Modifier la promotion' : 'Nouvelle promotion'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-charcoal-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Titre *</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="Ex: Offre spéciale printemps" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Description</label>
                <textarea value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 resize-none" placeholder="Décrivez l'offre…" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Type de remise</label>
                  <select value={form.discount_type} onChange={e => setForm(p => ({ ...p, discount_type: e.target.value as 'percentage' | 'fixed' }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                    <option value="percentage">Pourcentage (%)</option>
                    <option value="fixed">Montant fixe (€)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Valeur *</label>
                  <input type="number" value={form.discount_value} onChange={e => setForm(p => ({ ...p, discount_value: e.target.value }))} min="0"
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400"
                    placeholder={form.discount_type === 'percentage' ? '10' : '50'} />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-charcoal-700">Code promo</label>
                  <button onClick={() => setForm(p => ({ ...p, code: genCode() }))} className="text-xs text-rose-600 hover:text-rose-700">Générer</button>
                </div>
                <input type="text" value={form.code} onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 font-mono tracking-widest" placeholder="EX: PROMO2025" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Valide du</label>
                  <input type="date" value={form.valid_from} onChange={e => setForm(p => ({ ...p, valid_from: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Valide jusqu&apos;au</label>
                  <input type="date" value={form.valid_to} onChange={e => setForm(p => ({ ...p, valid_to: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Utilisations max</label>
                  <input type="number" value={form.max_uses} onChange={e => setForm(p => ({ ...p, max_uses: e.target.value }))} min="0"
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="0 = illimité" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Montant min. (€)</label>
                  <input type="number" value={form.min_amount} onChange={e => setForm(p => ({ ...p, min_amount: e.target.value }))} min="0"
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="0 = sans minimum" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as 'active' | 'inactive' | 'expired' }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 p-6 border-t border-stone-100">
              <button onClick={() => setShowModal(false)} className="flex-1 px-4 py-2.5 border border-charcoal-200 text-charcoal-600 rounded-xl text-sm hover:bg-stone-50 transition-colors">Annuler</button>
              <button onClick={handleSave} disabled={saving} className="flex-1 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {saving ? 'Sauvegarde…' : editItem ? 'Mettre à jour' : 'Créer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
