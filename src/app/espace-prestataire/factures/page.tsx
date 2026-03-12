'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { Receipt, Plus, Search, Download, Eye, CheckCircle, Clock, AlertCircle, X, Trash2, Edit, Send } from 'lucide-react';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { uploadPdf } from '@/lib/storage';

interface LineItem { description: string; qty: number; unit_price: number }
interface Invoice {
  id: string; reference: string; client_name: string; client_email: string;
  type: 'invoice' | 'deposit'; date: string; due_date: string;
  items: LineItem[]; montant_ht: number; tva: number; montant_ttc: number;
  paid: number; status: 'pending' | 'paid' | 'partial' | 'overdue'; notes: string;
}

const STATUS_CFG = {
  pending: { label: 'En attente',  color: 'bg-blue-100 text-blue-700',    icon: Clock },
  paid:    { label: 'Payée',       color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  partial: { label: 'Partiel',     color: 'bg-orange-100 text-orange-700', icon: AlertCircle },
  overdue: { label: 'En retard',   color: 'bg-red-100 text-red-700',      icon: AlertCircle },
} as const;

const EMPTY_LINE: LineItem = { description: '', qty: 1, unit_price: 0 };

function calcTotals(items: LineItem[], tva: number) {
  const ht = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const ttc = ht * (1 + tva / 100);
  return { ht: Math.round(ht * 100) / 100, ttc: Math.round(ttc * 100) / 100 };
}

function buildPDF(inv: Invoice, vendorName: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 50;
  let y = 60;

  doc.setFontSize(22); doc.setFont('helvetica', 'bold');
  doc.text(inv.type === 'deposit' ? 'FACTURE D\'ACOMPTE' : 'FACTURE', W / 2, y, { align: 'center' }); y += 26;
  doc.setFontSize(11); doc.setFont('helvetica', 'normal');
  doc.text(inv.reference, W / 2, y, { align: 'center' }); y += 28;

  doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 20;

  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text('ÉMETTEUR', M, y); doc.text('CLIENT', W / 2, y);
  y += 14; doc.setFont('helvetica', 'normal');
  doc.text(vendorName, M, y); doc.text(inv.client_name, W / 2, y); y += 14;
  if (inv.client_email) doc.text(inv.client_email, W / 2, y);
  y += 24;

  doc.setFont('helvetica', 'bold');
  doc.text(`Date d'émission : ${inv.date}`, M, y);
  doc.text(`Échéance : ${inv.due_date}`, W / 2, y); y += 20;
  doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 20;

  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('Description', M, y);
  doc.text('Qté', W - M - 130, y, { align: 'right' });
  doc.text('P.U.', W - M - 70, y, { align: 'right' });
  doc.text('Total', W - M, y, { align: 'right' }); y += 8;
  doc.setDrawColor(200); doc.line(M, y, W - M, y); y += 12;
  doc.setFont('helvetica', 'normal');

  for (const it of inv.items) {
    const total = it.qty * it.unit_price;
    const descLines = doc.splitTextToSize(it.description || '—', W - M * 2 - 160);
    const rh = Math.max(14, descLines.length * 13);
    if (y + rh > 750) { doc.addPage(); y = 60; }
    doc.text(descLines, M, y);
    doc.text(String(it.qty), W - M - 130, y, { align: 'right' });
    doc.text(`${it.unit_price.toFixed(2)} €`, W - M - 70, y, { align: 'right' });
    doc.text(`${total.toFixed(2)} €`, W - M, y, { align: 'right' }); y += rh;
    doc.setDrawColor(235); doc.line(M, y, W - M, y); y += 8;
  }

  y += 10;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10);
  doc.text(`Total HT : ${inv.montant_ht.toFixed(2)} €`, W - M, y, { align: 'right' }); y += 16;
  doc.text(`TVA (${inv.tva}%) : ${(inv.montant_ttc - inv.montant_ht).toFixed(2)} €`, W - M, y, { align: 'right' }); y += 16;
  doc.setFontSize(12);
  doc.text(`Total TTC : ${inv.montant_ttc.toFixed(2)} €`, W - M, y, { align: 'right' }); y += 16;
  if (inv.paid > 0) { doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.text(`Déjà payé : ${inv.paid.toFixed(2)} €`, W - M, y, { align: 'right' }); y += 14; doc.setFont('helvetica', 'bold'); doc.text(`Reste à payer : ${(inv.montant_ttc - inv.paid).toFixed(2)} €`, W - M, y, { align: 'right' }); }

  if (inv.notes) { y += 20; doc.setFont('helvetica', 'normal'); doc.setFontSize(9); const nLines = doc.splitTextToSize(`Notes : ${inv.notes}`, W - M * 2); doc.text(nLines, M, y); }
  return doc;
}

export default function FacturesPage() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'form' | 'preview'>('form');
  const [editItem, setEditItem] = useState<Invoice | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [linkedClients, setLinkedClients] = useState<{id: string; name: string; email: string}[]>([]);
  const [form, setForm] = useState({
    client_name: '', client_email: '', type: 'invoice' as 'invoice' | 'deposit',
    date: new Date().toLocaleDateString('fr-FR'), due_date: '', tva: 20,
    items: [{ ...EMPTY_LINE }] as LineItem[], paid: '', notes: '', status: 'pending' as keyof typeof STATUS_CFG,
  });

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('invoices', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setInvoices((data as any[]).map(d => ({ id: d.id, reference: d.reference || '', client_name: d.client_name || '', client_email: d.client_email || '', type: d.type || 'invoice', date: d.date || '', due_date: d.due_date || '', items: d.items || [], montant_ht: d.montant_ht || 0, tva: d.tva || 20, montant_ttc: d.montant_ttc || 0, paid: d.paid || 0, status: d.status || 'pending', notes: d.notes || '' })));
    } catch { setInvoices([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    load();
    if (user) {
      getDocuments('collaborations', [{ field: 'vendor_id', operator: '==', value: user.uid }])
        .then(collabs => setLinkedClients((collabs as any[]).map(c => ({ id: c.client_id, name: c.client_name || '', email: c.client_email || '' })).filter(c => c.name || c.email)))
        .catch(() => {});
    }
  }, [user]);

  const totals = calcTotals(form.items, form.tva);

  const openCreate = () => {
    setEditItem(null);
    setForm({ client_name: '', client_email: '', type: 'invoice', date: new Date().toLocaleDateString('fr-FR'), due_date: '', tva: 20, items: [{ ...EMPTY_LINE }], paid: '', notes: '', status: 'pending' });
    setModalTab('form');
    setShowModal(true);
  };
  const openEdit = (inv: Invoice) => {
    setEditItem(inv);
    setForm({ client_name: inv.client_name, client_email: inv.client_email, type: inv.type, date: inv.date, due_date: inv.due_date, tva: inv.tva, items: inv.items.length ? inv.items : [{ ...EMPTY_LINE }], paid: String(inv.paid), notes: inv.notes, status: inv.status });
    setModalTab('form');
    setShowModal(true);
  };

  const handleSendToClient = async (inv: Invoice) => {
    if (!user) return;
    setSending(true);
    try {
      const pdf = buildPDF(inv, vendorName);
      const pdfBlob = pdf.output('blob');
      let file_url = '';
      try { file_url = await uploadPdf(pdfBlob, inv.reference); } catch {}
      const clients = await getDocuments('clients', [{ field: 'email', operator: '==', value: inv.client_email }]);
      const client = clients[0] as any;
      if (client?.id) {
        await addDocument('documents', {
          client_id: client.id, vendor_id: user.uid,
          name: `Facture ${inv.reference} — ${inv.client_name}`,
          type: 'facture', file_url,
          uploaded_by: 'vendor', uploaded_at: new Date().toLocaleDateString('fr-FR'),
          invoice_id: inv.id, status: inv.status,
        });
        toast.success(`Facture envoyée à ${inv.client_email}`);
      } else {
        toast.error('Client introuvable (vérifiez l\'email)');
      }
    } catch { toast.error('Erreur lors de l\'envoi'); } finally { setSending(false); }
  };

  const updateLine = (i: number, field: keyof LineItem, val: string) => {
    setForm(p => {
      const items = [...p.items];
      items[i] = { ...items[i], [field]: field === 'description' ? val : Number(val) };
      return { ...p, items };
    });
  };

  const handleSave = async () => {
    if (!user || !form.client_name) { toast.error('Remplissez les champs obligatoires'); return; }
    setSaving(true);
    try {
      const ref = editItem?.reference || `FAC-${Date.now().toString(36).toUpperCase()}`;
      const data = { vendor_id: user.uid, reference: ref, client_name: form.client_name, client_email: form.client_email, type: form.type, date: form.date, due_date: form.due_date, tva: form.tva, items: form.items, montant_ht: totals.ht, montant_ttc: totals.ttc, paid: parseFloat(form.paid) || 0, status: form.status, notes: form.notes, created_at: editItem?.date || new Date().toISOString() };
      if (editItem) { await updateDocument('invoices', editItem.id, data); toast.success('Facture mise à jour'); }
      else { await addDocument('invoices', data); toast.success('Facture créée'); }
      setShowModal(false); load();
    } catch { toast.error('Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette facture ?')) return;
    try { await deleteDocument('invoices', id); toast.success('Supprimée'); load(); } catch { toast.error('Erreur'); }
  };

  const vendorName = user?.displayName || user?.email?.split('@')[0] || 'Prestataire';
  const handleView = (inv: Invoice) => { const doc = buildPDF(inv, vendorName); window.open(doc.output('bloburl'), '_blank'); };
  const handleDownload = (inv: Invoice) => { const doc = buildPDF(inv, vendorName); doc.save(`${inv.reference}.pdf`); toast.success('PDF téléchargé'); };
  const recordPayment = async (inv: Invoice) => {
    const val = prompt(`Montant payé (actuel: ${inv.paid} €, total: ${inv.montant_ttc} €)`);
    if (val === null) return;
    const paid = parseFloat(val) || 0;
    const status = paid >= inv.montant_ttc ? 'paid' : paid > 0 ? 'partial' : inv.status;
    try { await updateDocument('invoices', inv.id, { paid, status }); toast.success('Paiement enregistré'); load(); } catch { toast.error('Erreur'); }
  };

  const totalCA = invoices.reduce((s, i) => s + i.paid, 0);
  const totalPending = invoices.filter(i => i.status !== 'paid').reduce((s, i) => s + (i.montant_ttc - i.paid), 0);
  const filtered = invoices.filter(i => i.reference.toLowerCase().includes(search.toLowerCase()) || i.client_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Factures</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Émettez vos factures et acomptes avec génération PDF.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
            <Plus className="w-4 h-4" /> Nouvelle facture
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total factures', val: invoices.length, suffix: '' },
            { label: 'Payées', val: invoices.filter(i => i.status === 'paid').length, suffix: '' },
            { label: 'CA encaissé', val: totalCA.toLocaleString('fr-FR'), suffix: ' €' },
            { label: 'À encaisser', val: totalPending.toLocaleString('fr-FR'), suffix: ' €' },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl shadow-sm p-4">
              <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-2">{s.label}</p>
              <p className="font-serif text-charcoal-900" style={{ fontSize: '1.6rem', fontWeight: 300, lineHeight: 1 }}>{s.val}{s.suffix}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher une facture…"
            className="w-full pl-10 pr-4 py-2.5 bg-white rounded-xl border border-stone-200 text-sm focus:outline-none focus:border-rose-400 shadow-sm" />
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Receipt className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
            <p className="font-serif text-charcoal-700 text-lg mb-1">{search ? 'Aucun résultat' : 'Aucune facture'}</p>
            <p className="text-sm text-charcoal-400">{search ? 'Essayez d\'autres mots-clés' : 'Créez votre première facture'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(inv => {
              const cfg = STATUS_CFG[inv.status] || STATUS_CFG.pending;
              const Icon = cfg.icon;
              const restant = inv.montant_ttc - inv.paid;
              return (
                <div key={inv.id} className="bg-white rounded-2xl shadow-sm p-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xs text-charcoal-400 font-mono">{inv.reference}</span>
                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}><Icon className="w-3 h-3" />{cfg.label}</span>
                        <span className="text-xs text-charcoal-400 border border-charcoal-100 px-2 py-0.5 rounded-full">{inv.type === 'deposit' ? 'Acompte' : 'Facture'}</span>
                      </div>
                      <p className="font-medium text-charcoal-900">{inv.client_name}{inv.client_email ? ` · ${inv.client_email}` : ''}</p>
                      <p className="text-xs text-charcoal-400">Émise le {inv.date}{inv.due_date ? ` · Échéance ${inv.due_date}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 300 }}>{inv.montant_ttc.toLocaleString('fr-FR')} €</p>
                      {restant > 0 && <p className="text-xs text-orange-600">Restant : {restant.toLocaleString('fr-FR')} €</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <button onClick={() => handleView(inv)} className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white rounded-lg text-xs font-medium hover:bg-rose-700 transition-colors"><Eye className="w-3.5 h-3.5" /> Voir</button>
                    <button onClick={() => handleDownload(inv)} className="flex items-center gap-1.5 px-3 py-1.5 border border-charcoal-200 text-charcoal-600 rounded-lg text-xs font-medium hover:bg-stone-50 transition-colors"><Download className="w-3.5 h-3.5" /> Télécharger</button>
                    {inv.status !== 'paid' && <button onClick={() => recordPayment(inv)} className="flex items-center gap-1.5 px-3 py-1.5 border border-green-200 text-green-700 rounded-lg text-xs font-medium hover:bg-green-50 transition-colors"><CheckCircle className="w-3.5 h-3.5" /> Paiement reçu</button>}
                    {inv.client_email && (
                      <button onClick={() => handleSendToClient(inv)} disabled={sending} className="flex items-center gap-1.5 px-3 py-1.5 border border-rose-200 text-rose-700 rounded-lg text-xs font-medium hover:bg-rose-50 disabled:opacity-50 transition-colors"><Send className="w-3.5 h-3.5" /> {sending ? 'Envoi…' : 'Envoyer au client'}</button>
                    )}
                    <button onClick={() => openEdit(inv)} className="flex items-center gap-1.5 px-3 py-1.5 border border-charcoal-200 text-charcoal-600 rounded-lg text-xs font-medium hover:bg-stone-50 transition-colors"><Edit className="w-3.5 h-3.5" /> Modifier</button>
                    <button onClick={() => handleDelete(inv.id)} className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 rounded-lg text-xs font-medium hover:bg-red-50 transition-colors ml-auto"><Trash2 className="w-3.5 h-3.5" /></button>
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 400 }}>{editItem ? 'Modifier la facture' : 'Nouvelle facture'}</h2>
              <div className="flex items-center gap-3">
                <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
                  {(['form', 'preview'] as const).map(t => (
                    <button key={t} onClick={() => setModalTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${modalTab === t ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-700'}`}>
                      {t === 'form' ? 'Formulaire' : 'Aperçu'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-charcoal-400"><X className="w-4 h-4" /></button>
              </div>
            </div>
            {modalTab === 'preview' ? (
              <div className="p-6 overflow-y-auto max-h-[60vh]">
                <div className="bg-white border border-stone-200 rounded-xl p-8 shadow-sm font-sans text-sm max-w-2xl mx-auto">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-charcoal-900 tracking-wide">{form.type === 'deposit' ? "FACTURE D'ACOMPTE" : 'FACTURE'}</h2>
                    <p className="text-xs text-charcoal-500 mt-1">{editItem?.reference || 'Nouvelle facture'}</p>
                    <p className="text-xs text-charcoal-500">Émise le {form.date}{form.due_date ? ` · Échéance ${form.due_date}` : ''}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-6 mb-6 text-xs">
                    <div><p className="font-semibold text-charcoal-500 uppercase tracking-wider mb-1">Prestataire</p><p className="font-medium text-charcoal-900">{vendorName}</p></div>
                    <div><p className="font-semibold text-charcoal-500 uppercase tracking-wider mb-1">Client</p><p className="font-medium text-charcoal-900">{form.client_name || '—'}</p>{form.client_email && <p className="text-charcoal-500">{form.client_email}</p>}</div>
                  </div>
                  <table className="w-full text-xs mb-4">
                    <thead><tr className="border-y border-charcoal-200">
                      <th className="text-left py-2 font-semibold text-charcoal-600">Description</th>
                      <th className="text-right py-2 font-semibold text-charcoal-600 w-12">Qté</th>
                      <th className="text-right py-2 font-semibold text-charcoal-600 w-24">P.U.</th>
                      <th className="text-right py-2 font-semibold text-charcoal-600 w-24">Total HT</th>
                    </tr></thead>
                    <tbody>
                      {form.items.map((item, idx) => (
                        <tr key={idx} className="border-b border-charcoal-100">
                          <td className="py-2 text-charcoal-900">{item.description || '—'}</td>
                          <td className="py-2 text-right text-charcoal-600">{item.qty}</td>
                          <td className="py-2 text-right text-charcoal-600">{item.unit_price.toFixed(2)} €</td>
                          <td className="py-2 text-right font-medium">{(item.qty * item.unit_price).toFixed(2)} €</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex flex-col items-end gap-1 text-xs">
                    <div className="flex gap-8 text-charcoal-600"><span>Total HT</span><span>{totals.ht.toFixed(2)} €</span></div>
                    <div className="flex gap-8 text-charcoal-600"><span>TVA ({form.tva}%)</span><span>{(totals.ttc - totals.ht).toFixed(2)} €</span></div>
                    {Number(form.paid) > 0 && <div className="flex gap-8 text-charcoal-600"><span>Déjà payé</span><span>- {Number(form.paid).toFixed(2)} €</span></div>}
                    <div className="flex gap-8 font-bold text-charcoal-900 text-sm border-t border-charcoal-300 pt-1 mt-1"><span>Total TTC</span><span>{totals.ttc.toFixed(2)} €</span></div>
                  </div>
                  {form.notes && <div className="border-t border-charcoal-100 pt-4 mt-4 text-xs text-charcoal-600"><p className="font-semibold mb-1">Notes</p><p className="whitespace-pre-wrap">{form.notes}</p></div>}
                </div>
              </div>
            ) : (
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
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Client *</label>
                  <input type="text" value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="Nom du client" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Email client</label>
                  <input type="email" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="email@exemple.com" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as 'invoice' | 'deposit' }))} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                    <option value="invoice">Facture</option><option value="deposit">Acompte</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date émission</label>
                  <input type="text" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="JJ/MM/AAAA" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Échéance</label>
                  <input type="text" value={form.due_date} onChange={e => setForm(p => ({ ...p, due_date: e.target.value }))} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="JJ/MM/AAAA" />
                </div>
              </div>

              {/* Line items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-charcoal-700">Prestations</label>
                  <button onClick={() => setForm(p => ({ ...p, items: [...p.items, { ...EMPTY_LINE }] }))} className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1"><Plus className="w-3.5 h-3.5" /> Ligne</button>
                </div>
                <div className="space-y-2">
                  <div className="hidden sm:grid grid-cols-[1fr_60px_90px_36px] gap-2 text-xs text-charcoal-400 px-1">
                    <span>Description</span><span className="text-center">Qté</span><span className="text-right">P.U. (€)</span><span />
                  </div>
                  {form.items.map((item, i) => (
                    <div key={i} className="grid grid-cols-[1fr_60px_90px_36px] sm:grid-cols-[1fr_60px_90px_36px] gap-2 max-sm:grid-cols-[1fr_36px]">
                      <input value={item.description} onChange={e => updateLine(i, 'description', e.target.value)} className="px-3 py-2 border border-charcoal-200 rounded-lg text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="Description" />
                      <input type="number" value={item.qty} onChange={e => updateLine(i, 'qty', e.target.value)} min="1" className="px-2 py-2 border border-charcoal-200 rounded-lg text-sm bg-stone-50 focus:outline-none focus:border-rose-400 text-center" />
                      <input type="number" value={item.unit_price} onChange={e => updateLine(i, 'unit_price', e.target.value)} min="0" step="0.01" className="px-2 py-2 border border-charcoal-200 rounded-lg text-sm bg-stone-50 focus:outline-none focus:border-rose-400 text-right" />
                      <button onClick={() => setForm(p => ({ ...p, items: p.items.filter((_, j) => j !== i) }))} className="flex items-center justify-center text-charcoal-300 hover:text-red-400 rounded-lg border border-charcoal-100 hover:border-red-200 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">TVA (%)</label>
                  <select value={form.tva} onChange={e => setForm(p => ({ ...p, tva: Number(e.target.value) }))} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                    {[0, 5.5, 10, 20].map(v => <option key={v} value={v}>{v}%</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Déjà payé (€)</label>
                  <input type="number" value={form.paid} onChange={e => setForm(p => ({ ...p, paid: e.target.value }))} min="0" step="0.01" className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Statut</label>
                  <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as keyof typeof STATUS_CFG }))} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                    {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                </div>
              </div>

              {/* Totals preview */}
              <div className="bg-stone-50 rounded-xl p-4 text-sm space-y-1">
                <div className="flex justify-between"><span className="text-charcoal-500">Total HT</span><span className="font-medium">{totals.ht.toFixed(2)} €</span></div>
                <div className="flex justify-between"><span className="text-charcoal-500">TVA ({form.tva}%)</span><span className="font-medium">{(totals.ttc - totals.ht).toFixed(2)} €</span></div>
                <div className="flex justify-between border-t border-stone-200 pt-2 mt-2"><span className="font-semibold text-charcoal-900">Total TTC</span><span className="font-semibold text-rose-700 text-base">{totals.ttc.toFixed(2)} €</span></div>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Notes / Conditions</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={3} className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 resize-none" placeholder="Conditions de paiement, mentions légales…" />
              </div>
            </div>
            )}
            <div className="flex gap-3 p-6 border-t border-stone-100 bg-stone-50">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-charcoal-200 text-charcoal-600 rounded-xl text-sm hover:bg-stone-50 transition-colors">Annuler</button>
              <div className="flex-1" />
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-1.5 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {saving ? 'Sauvegarde…' : editItem ? 'Mettre à jour' : 'Créer la facture'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
