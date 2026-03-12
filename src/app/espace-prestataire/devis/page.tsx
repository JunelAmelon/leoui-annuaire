'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { FileText, Plus, Clock, CheckCircle, XCircle, Send, Euro, Search, Download, Trash2, X, Minus } from 'lucide-react';
import { getDocuments, addDocument, deleteDocument } from '@/lib/db';
import { uploadPdf } from '@/lib/storage';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

interface LineItem { description: string; qty: number; unit_price: number }

interface Devis {
  id: string;
  client_name?: string;
  client_email?: string;
  reference?: string;
  amount?: number;
  items?: LineItem[];
  tva?: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  description?: string;
  conditions?: string;
  date?: string;
  created_at?: string;
  sent_at?: string;
  pdf_url?: string;
  vendor_name?: string;
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', icon: Clock, color: 'text-charcoal-500', bg: 'bg-charcoal-100' },
  sent: { label: 'Envoyé', icon: Send, color: 'text-champagne-700', bg: 'bg-champagne-100' },
  accepted: { label: 'Accepté', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' },
  rejected: { label: 'Refusé', icon: XCircle, color: 'text-rose-700', bg: 'bg-rose-100' },
};

const EMPTY_LINE: LineItem = { description: '', qty: 1, unit_price: 0 };

function calcTotals(items: LineItem[], tva: number) {
  const ht = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const ttc = ht * (1 + tva / 100);
  return { ht, ttc };
}

function buildDevisPDF(d: Devis, vendorName: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 50;
  let y = 60;

  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text('DEVIS', W / 2, y, { align: 'center' }); y += 26;
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(d.reference || '', W / 2, y, { align: 'center' }); y += 28;
  doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 20;

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('PRESTATAIRE', M, y); doc.text('CLIENT', W / 2, y); y += 14;
  doc.setFont('helvetica', 'normal');
  doc.text(vendorName, M, y); doc.text(d.client_name || '', W / 2, y); y += 14;
  if (d.client_email) { doc.text('', M, y); doc.text(d.client_email, W / 2, y); y += 14; }
  y += 10;

  doc.setFont('helvetica', 'bold');
  doc.text('Date', M, y); doc.text(d.date ? new Date(d.date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR'), M + 60, y); y += 20;

  doc.setDrawColor(220); doc.line(M, y, W - M, y); y += 16;
  doc.setFont('helvetica', 'bold');
  doc.text('Désignation', M, y); doc.text('Qté', W - 180, y); doc.text('Prix unit.', W - 130, y); doc.text('Total HT', W - 70, y); y += 14;
  doc.setDrawColor(220); doc.line(M, y, W - M, y); y += 12;

  doc.setFont('helvetica', 'normal');
  const items = d.items || [];
  for (const item of items) {
    if (y > 740) { doc.addPage(); y = 60; }
    const total = item.qty * item.unit_price;
    const lines = doc.splitTextToSize(item.description, W - M - 200);
    doc.text(lines[0] || '', M, y);
    doc.text(String(item.qty), W - 175, y, { align: 'right' });
    doc.text(`${item.unit_price.toFixed(2)} €`, W - 120, y, { align: 'right' });
    doc.text(`${total.toFixed(2)} €`, W - 55, y, { align: 'right' });
    y += 16;
  }

  const tva = d.tva ?? 20;
  const { ht, ttc } = calcTotals(items, tva);
  y += 8; doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 16;
  doc.setFont('helvetica', 'normal');
  doc.text('Total HT', W - 160, y); doc.text(`${ht.toFixed(2)} €`, W - 55, y, { align: 'right' }); y += 14;
  doc.text(`TVA (${tva}%)`, W - 160, y); doc.text(`${(ttc - ht).toFixed(2)} €`, W - 55, y, { align: 'right' }); y += 14;
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL TTC', W - 160, y); doc.text(`${ttc.toFixed(2)} €`, W - 55, y, { align: 'right' }); y += 24;

  if (d.conditions) {
    doc.setFont('helvetica', 'bold'); doc.text('Conditions', M, y); y += 14;
    doc.setFont('helvetica', 'normal');
    const clines = doc.splitTextToSize(d.conditions, W - M * 2);
    for (const l of clines) { if (y > 740) { doc.addPage(); y = 60; } doc.text(l, M, y); y += 13; }
  }
  return doc;
}

const BLANK_FORM = { client_name: '', client_email: '', date: new Date().toISOString().slice(0,10), tva: '20', conditions: '' };

export default function DevisPage() {
  const { user } = useAuth();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'form' | 'preview'>('form');
  const [search, setSearch] = useState('');
  const [form, setForm] = useState(BLANK_FORM);
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const [linkedClients, setLinkedClients] = useState<{id: string; name: string; email: string}[]>([]);

  const vendorName = user?.displayName || user?.email?.split('@')[0] || 'Prestataire';
  const reference = `DEV-${Date.now().toString().slice(-6)}`;

  const loadLinkedClients = async () => {
    if (!user) return;
    try {
      const collabs = await getDocuments('collaborations', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setLinkedClients((collabs as any[]).map(c => ({ id: c.client_id, name: c.client_name || '', email: c.client_email || '' })).filter(c => c.name || c.email));
    } catch {}
  };

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const docs = await getDocuments('devis', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setDevis((docs as Devis[]).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
    } catch { setDevis([]); } finally { setLoading(false); }
  };
  useEffect(() => { load(); loadLinkedClients(); }, [user]);

  const openNew = () => {
    setForm(BLANK_FORM);
    setItems([{ ...EMPTY_LINE }]);
    setModalTab('form');
    setShowModal(true);
  };

  const { ht, ttc } = calcTotals(items, Number(form.tva) || 0);

  const buildDoc = (): Devis => ({
    id: '', client_name: form.client_name, client_email: form.client_email,
    reference, items, tva: Number(form.tva),
    amount: ttc, date: form.date, conditions: form.conditions,
    status: 'draft', created_at: new Date().toISOString(), vendor_name: vendorName,
  });

  const handleDownload = () => {
    if (!form.client_name) { toast.error('Remplissez le nom du client'); return; }
    const pdf = buildDevisPDF(buildDoc(), vendorName);
    pdf.save(`${reference}.pdf`);
    toast.success('PDF téléchargé');
  };

  const handleSaveDraft = async () => {
    if (!user || !form.client_name) { toast.error('Nom du client requis'); return; }
    setSaving(true);
    try {
      const data = { vendor_id: user.uid, vendor_email: user.email, ...buildDoc(), status: 'draft' };
      await addDocument('devis', data);
      toast.success('Devis sauvegardé en brouillon');
      setShowModal(false);
      load();
    } catch { toast.error('Erreur'); } finally { setSaving(false); }
  };

  const handleSendToClient = async () => {
    if (!user || !form.client_name) { toast.error('Nom du client requis'); return; }
    if (!form.client_email) { toast.error('Email du client requis pour envoyer'); return; }
    setSending(true);
    try {
      const ref = `DEV-${Date.now().toString().slice(-6)}`;
      const d = { ...buildDoc(), reference: ref };
      const pdf = buildDevisPDF(d, vendorName);
      const pdfBlob = pdf.output('blob');
      let pdf_url = '';
      try { pdf_url = await uploadPdf(pdfBlob, ref); } catch { /* Cloudinary optionnel */ }

      const clients = await getDocuments('clients', [{ field: 'email', operator: '==', value: form.client_email }]);
      const client = clients[0] as any;

      const devisData = { vendor_id: user.uid, vendor_email: user.email, ...d, status: 'sent', sent_at: new Date().toISOString(), pdf_url };
      const res = await addDocument('devis', devisData);

      if (client?.id) {
        await addDocument('documents', {
          client_id: client.id, vendor_id: user.uid,
          name: `Devis ${ref} — ${form.client_name}`,
          type: 'devis', file_url: pdf_url,
          uploaded_by: 'vendor', uploaded_at: new Date().toLocaleDateString('fr-FR'),
          devis_id: res.id, status: 'sent',
        });
      }
      toast.success(`Devis ${ref} envoyé à ${form.client_email}`);
      setShowModal(false);
      load();
    } catch (e) { toast.error('Erreur lors de l\'envoi'); console.error(e); } finally { setSending(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce devis ?')) return;
    try { await deleteDocument('devis', id); toast.success('Supprimé'); load(); } catch { toast.error('Erreur'); }
  };

  const updateItem = (idx: number, field: keyof LineItem, val: string | number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const filtered = devis.filter(d =>
    !search || d.client_name?.toLowerCase().includes(search.toLowerCase()) || d.reference?.toLowerCase().includes(search.toLowerCase())
  );
  const totalAccepted = devis.filter(d => d.status === 'accepted').reduce((s, d) => s + (d.amount || 0), 0);
  const totalPending = devis.filter(d => d.status === 'sent').reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Devis</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Créez, prévisualisez et envoyez vos devis aux couples.</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
            <Plus className="w-4 h-4" /> Nouveau devis
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: devis.length },
            { label: 'Envoyés', value: devis.filter(d => d.status === 'sent').length },
            { label: 'Acceptés (€)', value: `${totalAccepted.toLocaleString('fr-FR')} €` },
            { label: 'En attente (€)', value: `${totalPending.toLocaleString('fr-FR')} €` },
          ].map(s => (
            <div key={s.label} className="bg-white border border-charcoal-100 rounded-2xl p-4 shadow-soft">
              <p className="font-serif text-charcoal-900" style={{ fontSize: '1.6rem', fontWeight: 300, lineHeight: 1 }}>{s.value}</p>
              <p className="text-xs text-charcoal-500 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un devis…"
            className="w-full max-w-sm pl-10 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-white shadow-sm focus:outline-none focus:border-rose-400" />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-charcoal-100 rounded-2xl animate-pulse" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-charcoal-100 rounded-2xl p-12 text-center shadow-soft">
            <FileText className="w-10 h-10 text-charcoal-300 mx-auto mb-3" />
            <p className="text-charcoal-600 font-medium">Aucun devis</p>
            <p className="text-sm text-charcoal-400 mt-1">Cliquez sur "Nouveau devis" pour commencer</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(d => {
              const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.draft;
              return (
                <div key={d.id} className="bg-white border border-charcoal-100 rounded-2xl p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-charcoal-400">{d.reference}</span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <cfg.icon className="w-3 h-3" />{cfg.label}
                        </span>
                      </div>
                      <p className="font-medium text-charcoal-900">{d.client_name}</p>
                      {d.client_email && <p className="text-xs text-charcoal-400">{d.client_email}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 300 }}>{(d.amount || 0).toLocaleString('fr-FR')} €</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">TTC</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    {d.pdf_url ? (
                      <a href={d.pdf_url} target="_blank" rel="noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Télécharger
                      </a>
                    ) : (
                      <button onClick={() => { const pdf = buildDevisPDF(d as Devis, vendorName); pdf.save(`${d.reference || 'devis'}.pdf`); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors">
                        <Download className="w-3.5 h-3.5" /> Télécharger PDF
                      </button>
                    )}
                    <button onClick={() => handleDelete(d.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs hover:bg-red-50 transition-colors ml-auto">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[92vh] flex flex-col">
            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
              <h2 className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 400 }}>Nouveau devis</h2>
              <div className="flex items-center gap-4">
                {/* Tabs */}
                <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
                  {(['form', 'preview'] as const).map(t => (
                    <button key={t} onClick={() => setModalTab(t)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${modalTab === t ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-700'}`}>
                      {t === 'form' ? 'Formulaire' : 'Aperçu'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-charcoal-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto">
              {modalTab === 'form' ? (
                <div className="p-6 space-y-5">
                  {linkedClients.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Client lié (sélectionner)</label>
                      <select onChange={e => {
                        const c = linkedClients.find(x => x.id === e.target.value);
                        if (c) setForm(p => ({ ...p, client_name: c.name, client_email: c.email }));
                      }} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                        <option value="">— Choisir un client lié —</option>
                        {linkedClients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Client / Couple *</label>
                      <input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="Sophie & Thomas" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Email client</label>
                      <input type="email" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="email@exemple.com" />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date du devis</label>
                      <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">TVA (%)</label>
                      <input type="number" value={form.tva} onChange={e => setForm(p => ({ ...p, tva: e.target.value }))} min="0" max="100"
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                    </div>
                  </div>

                  {/* Line items */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-medium text-charcoal-700">Prestations</label>
                      <button onClick={() => setItems(prev => [...prev, { ...EMPTY_LINE }])}
                        className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 font-medium">
                        <Plus className="w-3.5 h-3.5" /> Ajouter une ligne
                      </button>
                    </div>
                    <div className="border border-charcoal-200 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 bg-stone-50 px-3 py-2 text-xs font-medium text-charcoal-500">
                        <div className="col-span-6">Désignation</div>
                        <div className="col-span-2 text-right">Qté</div>
                        <div className="col-span-3 text-right">Prix HT</div>
                        <div className="col-span-1" />
                      </div>
                      {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-charcoal-100 items-center">
                          <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                            className="col-span-6 px-2 py-1.5 border border-charcoal-200 rounded-lg text-sm bg-white focus:outline-none focus:border-rose-400" placeholder="Prestation…" />
                          <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', Number(e.target.value))} min="1"
                            className="col-span-2 px-2 py-1.5 border border-charcoal-200 rounded-lg text-sm text-right bg-white focus:outline-none focus:border-rose-400" />
                          <div className="col-span-3 relative">
                            <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-charcoal-400" />
                            <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} min="0"
                              className="w-full pl-6 pr-2 py-1.5 border border-charcoal-200 rounded-lg text-sm text-right bg-white focus:outline-none focus:border-rose-400" />
                          </div>
                          <button onClick={() => setItems(prev => prev.filter((_, i) => i !== idx))} disabled={items.length === 1}
                            className="col-span-1 flex justify-center text-charcoal-300 hover:text-red-500 disabled:opacity-30 transition-colors">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col items-end gap-1 text-sm">
                      <div className="flex items-center gap-4 text-charcoal-600"><span>Sous-total HT</span><span className="font-medium w-28 text-right">{ht.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span></div>
                      <div className="flex items-center gap-4 text-charcoal-600"><span>TVA ({form.tva}%)</span><span className="font-medium w-28 text-right">{(ttc - ht).toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span></div>
                      <div className="flex items-center gap-4 font-semibold text-charcoal-900 border-t border-charcoal-200 pt-1"><span>Total TTC</span><span className="w-28 text-right">{ttc.toLocaleString('fr-FR', { minimumFractionDigits: 2 })} €</span></div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Conditions & remarques</label>
                    <textarea value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} rows={3}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 resize-none"
                      placeholder="Acompte de 30% à la signature, solde 15 jours avant la prestation…" />
                  </div>
                </div>
              ) : (
                /* PREVIEW TAB */
                <div className="p-6">
                  <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm font-sans text-sm max-w-2xl mx-auto">
                    <div className="text-center mb-6">
                      <h2 className="text-2xl font-bold text-charcoal-900 tracking-wide">DEVIS</h2>
                      <p className="text-charcoal-500 text-xs mt-1">Réf. {reference}</p>
                      <p className="text-charcoal-500 text-xs">Date : {form.date ? new Date(form.date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
                      <div><p className="font-semibold text-charcoal-500 uppercase tracking-wider mb-1">Prestataire</p><p className="font-medium text-charcoal-900">{vendorName}</p></div>
                      <div><p className="font-semibold text-charcoal-500 uppercase tracking-wider mb-1">Client</p><p className="font-medium text-charcoal-900">{form.client_name || '—'}</p>{form.client_email && <p className="text-charcoal-500">{form.client_email}</p>}</div>
                    </div>
                    <table className="w-full text-xs mb-4">
                      <thead><tr className="border-y border-charcoal-200">
                        <th className="text-left py-2 text-charcoal-600 font-semibold">Désignation</th>
                        <th className="text-right py-2 text-charcoal-600 font-semibold w-12">Qté</th>
                        <th className="text-right py-2 text-charcoal-600 font-semibold w-24">Prix HT</th>
                        <th className="text-right py-2 text-charcoal-600 font-semibold w-24">Total HT</th>
                      </tr></thead>
                      <tbody>
                        {items.map((item, idx) => (
                          <tr key={idx} className="border-b border-charcoal-100">
                            <td className="py-2 text-charcoal-900">{item.description || '—'}</td>
                            <td className="py-2 text-right text-charcoal-600">{item.qty}</td>
                            <td className="py-2 text-right text-charcoal-600">{item.unit_price.toFixed(2)} €</td>
                            <td className="py-2 text-right font-medium text-charcoal-900">{(item.qty * item.unit_price).toFixed(2)} €</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="flex flex-col items-end gap-1 text-xs mb-4">
                      <div className="flex gap-8 text-charcoal-600"><span>Sous-total HT</span><span>{ht.toFixed(2)} €</span></div>
                      <div className="flex gap-8 text-charcoal-600"><span>TVA ({form.tva}%)</span><span>{(ttc - ht).toFixed(2)} €</span></div>
                      <div className="flex gap-8 font-bold text-charcoal-900 text-sm border-t border-charcoal-300 pt-1 mt-1"><span>Total TTC</span><span>{ttc.toFixed(2)} €</span></div>
                    </div>
                    {form.conditions && (
                      <div className="border-t border-charcoal-100 pt-4 text-xs text-charcoal-600">
                        <p className="font-semibold text-charcoal-700 mb-1">Conditions</p>
                        <p className="whitespace-pre-wrap">{form.conditions}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50 rounded-b-2xl">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-charcoal-200 text-charcoal-600 rounded-xl text-sm hover:bg-stone-100 transition-colors">
                Annuler
              </button>
              <div className="flex-1" />
              <button onClick={handleDownload} className="flex items-center gap-1.5 px-4 py-2.5 border border-charcoal-200 text-charcoal-700 rounded-xl text-sm hover:bg-stone-100 transition-colors">
                <Download className="w-4 h-4" /> Télécharger PDF
              </button>
              <button onClick={handleSaveDraft} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-charcoal-300 text-charcoal-700 rounded-xl text-sm hover:bg-stone-100 disabled:opacity-50 transition-colors">
                {saving ? 'Sauvegarde…' : 'Brouillon'}
              </button>
              <button onClick={handleSendToClient} disabled={sending || !form.client_name}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />
                {sending ? 'Envoi…' : 'Envoyer au client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
