'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { FileCheck2, Plus, Search, Download, Eye, Send, Edit, CheckCircle, Clock, XCircle, X, Trash2 } from 'lucide-react';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface Contract {
  id: string;
  reference: string;
  title: string;
  client_name: string;
  client_email: string;
  type: string;
  amount: number;
  status: 'draft' | 'sent' | 'signed' | 'cancelled';
  created_at: string;
  signed_at: string | null;
  content: string;
}

const STATUS_CFG = {
  draft:     { label: 'Brouillon', color: 'bg-stone-100 text-stone-600',  icon: Edit },
  sent:      { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700',    icon: Clock },
  signed:    { label: 'Signé',     color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  cancelled: { label: 'Annulé',   color: 'bg-red-100 text-red-700',      icon: XCircle },
} as const;

const TYPES = ['Contrat de prestation', 'Contrat de mariage', 'Contrat de location', 'Contrat cadre', 'Autre'];

function buildPDF(c: Contract, vendorName: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 50;
  let y = 60;

  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text('CONTRAT DE PRESTATION', W / 2, y, { align: 'center' }); y += 26;
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(c.reference, W / 2, y, { align: 'center' }); y += 28;

  doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 20;

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('PARTIES', M, y); y += 16;
  doc.setFont('helvetica', 'normal');
  doc.text(`Prestataire : ${vendorName}`, M, y); y += 14;
  doc.text(`Client : ${c.client_name}`, M, y); y += 14;
  if (c.client_email) { doc.text(`Email : ${c.client_email}`, M, y); y += 14; }
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('OBJET', M, y); y += 16;
  doc.setFont('helvetica', 'normal');
  doc.text(`Type : ${c.type}`, M, y); y += 14;
  doc.text(`Intitulé : ${c.title}`, M, y); y += 14;
  doc.text(`Montant : ${c.amount.toLocaleString('fr-FR')} €`, M, y); y += 14;
  doc.text(`Date : ${new Date(c.created_at).toLocaleDateString('fr-FR')}`, M, y); y += 20;

  if (c.content) {
    doc.setFont('helvetica', 'bold');
    doc.text('CONDITIONS GÉNÉRALES', M, y); y += 16;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(c.content, W - M * 2);
    for (const line of lines) {
      if (y > 740) { doc.addPage(); y = 60; }
      doc.text(line, M, y); y += 13;
    }
  }

  y = Math.max(y + 30, 700);
  if (y > 760) { doc.addPage(); y = 80; }
  doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 20;
  doc.setFontSize(10);
  doc.text('Signature prestataire :', M, y);
  doc.text('Signature client :', W / 2 + 20, y); y += 50;
  doc.text('Date : _______________', M, y);
  doc.text('Date : _______________', W / 2 + 20, y);
  return doc;
}

export default function ContratsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', client_name: '', client_email: '', type: TYPES[0], amount: '', content: '', status: 'draft' as keyof typeof STATUS_CFG });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('contracts', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setContracts((data as any[]).map(d => ({ id: d.id, reference: d.reference || '', title: d.title || '', client_name: d.client_name || '', client_email: d.client_email || '', type: d.type || '', amount: d.amount || 0, status: d.status || 'draft', created_at: d.created_at || new Date().toISOString(), signed_at: d.signed_at || null, content: d.content || '' })));
    } catch { setContracts([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', client_name: '', client_email: '', type: TYPES[0], amount: '', content: '', status: 'draft' });
    setShowModal(true);
  };
  const openEdit = (c: Contract) => {
    setEditItem(c);
    setForm({ title: c.title, client_name: c.client_name, client_email: c.client_email, type: c.type, amount: String(c.amount), content: c.content, status: c.status });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !form.title || !form.client_name) { toast.error('Remplissez les champs obligatoires'); return; }
    setSaving(true);
    try {
      const ref = editItem?.reference || `CTR-${Date.now().toString(36).toUpperCase()}`;
      const data = { vendor_id: user.uid, reference: ref, title: form.title, client_name: form.client_name, client_email: form.client_email, type: form.type, amount: parseFloat(form.amount) || 0, status: form.status, content: form.content, created_at: editItem?.created_at || new Date().toISOString(), signed_at: form.status === 'signed' ? (editItem?.signed_at || new Date().toISOString()) : null };
      if (editItem) { await updateDocument('contracts', editItem.id, data); toast.success('Contrat mis à jour'); }
      else { await addDocument('contracts', data); toast.success('Contrat créé'); }
      setShowModal(false); load();
    } catch { toast.error('Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce contrat ?')) return;
    try { await deleteDocument('contracts', id); toast.success('Supprimé'); load(); } catch { toast.error('Erreur'); }
  };

  const vendorName = user?.displayName || user?.email?.split('@')[0] || 'Prestataire';
  const handleView = (c: Contract) => { const doc = buildPDF(c, vendorName); window.open(doc.output('bloburl'), '_blank'); };
  const handleDownload = (c: Contract) => { const doc = buildPDF(c, vendorName); doc.save(`${c.reference}.pdf`); toast.success('PDF téléchargé'); };
  const markSent = async (c: Contract) => { try { await updateDocument('contracts', c.id, { status: 'sent' }); toast.success('Marqué envoyé'); load(); } catch { toast.error('Erreur'); } };

  const filtered = contracts.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Contrats</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Rédigez et téléchargez vos contrats en PDF.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
            <Plus className="w-4 h-4" /> Nouveau contrat
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(Object.keys(STATUS_CFG) as Array<keyof typeof STATUS_CFG>).map(s => {
            const cfg = STATUS_CFG[s];
            return (
              <div key={s} className="bg-white rounded-2xl shadow-sm p-4">
                <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">{cfg.label}</p>
                <p className="font-serif text-charcoal-900" style={{ fontSize: '1.8rem', fontWeight: 300, lineHeight: 1 }}>
                  {contracts.filter(c => c.status === s).length}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un contrat…"
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-rose-400 shadow-sm" />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <FileCheck2 className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
            <p className="font-serif text-charcoal-700 text-lg mb-1">{search ? 'Aucun résultat' : 'Aucun contrat'}</p>
            <p className="text-sm text-charcoal-400">{search ? 'Essayez d\'autres mots-clés' : 'Créez votre premier contrat'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const cfg = STATUS_CFG[c.status] || STATUS_CFG.draft;
              const Icon = cfg.icon;
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xs text-charcoal-400 font-mono">{c.reference}</span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </span>
                      </div>
                      <p className="font-medium text-charcoal-900">{c.title}</p>
                      <p className="text-sm text-charcoal-500">{c.client_name}{c.client_email ? ` · ${c.client_email}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 300 }}>{c.amount.toLocaleString('fr-FR')} €</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">{c.type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleView(c)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors">
                      <Eye className="w-3.5 h-3.5" /> Voir PDF
                    </button>
                    <button onClick={() => handleDownload(c)} className="flex items-center gap-1.5 px-3 py-1.5 border border-charcoal-200 text-charcoal-600 rounded-lg text-xs font-medium hover:bg-stone-50 transition-colors">
                      <Download className="w-3.5 h-3.5" /> Télécharger
                    </button>
                    {c.status === 'draft' && (
                      <button onClick={() => markSent(c)} className="flex items-center gap-1.5 px-3 py-1.5 border border-blue-200 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-50 transition-colors">
                        <Send className="w-3.5 h-3.5" /> Marquer envoyé
                      </button>
                    )}
                    <button onClick={() => openEdit(c)} className="flex items-center gap-1.5 px-3 py-1.5 border border-charcoal-200 text-charcoal-600 rounded-lg text-xs font-medium hover:bg-stone-50 transition-colors">
                      <Edit className="w-3.5 h-3.5" /> Modifier
                    </button>
                    <button onClick={() => handleDelete(c.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors ml-auto">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 400 }}>{editItem ? 'Modifier le contrat' : 'Nouveau contrat'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-charcoal-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Intitulé *</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="Ex: Prestation photo mariage" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Client *</label>
                  <input type="text" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="Nom complet" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Email client</label>
                  <input type="email" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="email@exemple.com" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                    {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Montant (€)</label>
                  <input type="number" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} min="0"
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="0" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as keyof typeof STATUS_CFG }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Conditions & Clauses</label>
                <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={7}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 resize-none"
                  placeholder="Rédigez les conditions : délais de livraison, acompte, annulation, droits d'auteur…" />
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
