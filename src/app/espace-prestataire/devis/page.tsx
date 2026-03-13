'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { FileText, Plus, Clock, CheckCircle, XCircle, Send, Euro, Search, Download, Trash2, X, Minus, Eye, Sparkles, AlertCircle, MoreVertical } from 'lucide-react';
import { getDocuments, addDocument, updateDocument, deleteDocument, getDocument } from '@/lib/db';
import { uploadPdf } from '@/lib/storage';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { getDefaultServicesForCategory, getDevisConditionsForCategory } from '@/lib/contract-templates';

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

export default function DevisPage() {
  const { user } = useAuth();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'form' | 'preview'>('form');
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [linkedClients, setLinkedClients] = useState<{ id: string; name: string; email: string }[]>([]);
  const [vendorCategory, setVendorCategory] = useState<string>('Autre');
  const [vendorAddress, setVendorAddress] = useState<string>('');
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [form, setForm] = useState({
    client_name: '', client_email: '', client_id: '', date: new Date().toISOString().slice(0, 10), tva: '0', conditions: '', event_date: ''
  });

  const vendorName = user?.displayName || user?.email?.split('@')[0] || 'Prestataire';
  const { ht, ttc } = calcTotals(items, Number(form.tva) || 0);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const docs = await getDocuments('devis', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setDevis((docs as Devis[]).sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()));
    } catch { setDevis([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    load();
    getDocuments('collaborations', [{ field: 'vendor_id', operator: '==', value: user.uid }])
      .then(collabs => setLinkedClients((collabs as any[]).map(c => ({ id: c.client_id, name: c.client_name || '', email: c.client_email || '' })).filter(c => c.name || c.email)))
      .catch(() => {});
    getDocument('vendors', user.uid).then(v => {
      if (v) {
        setVendorCategory((v as any).category || 'Autre');
        setVendorAddress((v as any).address || (v as any).location || '');
      }
    }).catch(() => {});
  }, [user]);

  const openNew = () => {
    const defaults = getDefaultServicesForCategory(vendorCategory);
    setItems(defaults.map(s => ({ description: s.description, qty: 1, unit_price: s.unit_price })));
    setForm({
      client_name: '', client_email: '', client_id: '',
      date: new Date().toISOString().slice(0, 10),
      tva: '0', event_date: '',
      conditions: getDevisConditionsForCategory(vendorCategory),
    });
    setModalTab('form');
    setShowModal(true);
  };

  const genRef = () => `DEV-${Date.now().toString().slice(-6)}`;

  const buildDoc = (ref?: string): Devis => ({
    id: '', client_name: form.client_name, client_email: form.client_email,
    reference: ref || genRef(), items, tva: Number(form.tva),
    amount: ttc, date: form.date, conditions: form.conditions,
    status: 'draft', created_at: new Date().toISOString(), vendor_name: vendorName,
  });

  const updateItem = (idx: number, field: keyof LineItem, val: string | number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const handleSaveDraft = async () => {
    if (!user || !form.client_name) { toast.error('Nom du client requis'); return; }
    setSaving(true);
    try {
      const ref = genRef();
      await addDocument('devis', { vendor_id: user.uid, vendor_email: user.email, vendor_name: vendorName, ...buildDoc(ref), reference: ref, status: 'draft' });
      toast.success('Devis sauvegardé en brouillon');
      setShowModal(false); load();
    } catch { toast.error('Erreur'); } finally { setSaving(false); }
  };

  const handleSendToClient = async () => {
    if (!user || !form.client_name) { toast.error('Nom du client requis'); return; }
    if (!form.client_email) { toast.error('Email du client requis'); return; }
    setSending('new');
    try {
      const ref = genRef();
      const d = buildDoc(ref);
      const pdf = buildDevisPDF(d, vendorName);
      let pdf_url = '';
      try { pdf_url = await uploadPdf(pdf.output('blob'), ref); } catch {}

      const clients = await getDocuments('clients', [{ field: 'email', operator: '==', value: form.client_email }]);
      const client = (clients[0] as any) || null;
      const resolvedClientId = form.client_id || client?.id || null;

      const devisData = { vendor_id: user.uid, vendor_email: user.email, vendor_name: vendorName, ...d, status: 'sent', sent_at: new Date().toISOString(), pdf_url, client_id: resolvedClientId };
      const res = await addDocument('devis', devisData);

      if (resolvedClientId) {
        await addDocument('documents', {
          client_id: resolvedClientId, vendor_id: user.uid,
          name: `Devis ${ref} — ${form.client_name}`,
          type: 'devis', file_url: pdf_url,
          uploaded_by: 'vendor', uploaded_at: new Date().toLocaleDateString('fr-FR'),
          devis_id: (res as any).id, status: 'sent',
        });
        // Message dans la conversation
        const convs = await getDocuments('conversations', [
          { field: 'vendor_id', operator: '==', value: user.uid },
          { field: 'client_id', operator: '==', value: resolvedClientId },
        ]);
        let convId = (convs[0] as any)?.id;
        if (!convId) {
          const newConv = await addDocument('conversations', {
            vendor_id: user.uid, client_id: resolvedClientId,
            vendor_name: vendorName, client_name: form.client_name,
            created_at: new Date().toISOString(), last_message: '', unread_vendor: 0, unread_client: 1,
          });
          convId = (newConv as any).id;
        }
        await addDocument(`conversations/${convId}/messages`, {
          sender: 'vendor', type: 'document',
          content: `📋 Devis envoyé : ${ref}\nMontant : ${ttc.toFixed(2)} € TTC\n${pdf_url ? `Voir le devis : ${pdf_url}` : 'Disponible dans vos documents.'}`,
          file_url: pdf_url, document_type: 'devis', devis_id: (res as any).id,
          created_at: new Date().toISOString(), read: false,
        });
        await updateDocument('conversations', convId, { last_message: `Devis envoyé : ${ref}`, unread_client: 1, updated_at: new Date().toISOString() });
      }
      toast.success(resolvedClientId ? `Devis envoyé — visible dans les documents et la messagerie du client` : `Devis créé — email non trouvé dans la base`, { duration: 4000 });
      setShowModal(false); load();
    } catch (e) { console.error(e); toast.error('Erreur lors de l\'envoi'); } finally { setSending(null); }
  };

  const handleSendExisting = async (d: Devis) => {
    if (!user || !d.client_email) { toast.error('Email client manquant'); return; }
    setSending(d.id);
    try {
      const pdf = buildDevisPDF(d, vendorName);
      let pdf_url = d.pdf_url || '';
      if (!pdf_url) { try { pdf_url = await uploadPdf(pdf.output('blob'), d.reference || ''); } catch {} }
      const clients = await getDocuments('clients', [{ field: 'email', operator: '==', value: d.client_email }]);
      const client = (clients[0] as any) || null;
      const resolvedClientId = (d as any).client_id || client?.id || null;
      if (resolvedClientId) {
        const convs = await getDocuments('conversations', [
          { field: 'vendor_id', operator: '==', value: user.uid },
          { field: 'client_id', operator: '==', value: resolvedClientId },
        ]);
        let convId = (convs[0] as any)?.id;
        if (!convId) {
          const nc = await addDocument('conversations', { vendor_id: user.uid, client_id: resolvedClientId, vendor_name: vendorName, client_name: d.client_name || '', created_at: new Date().toISOString(), last_message: '', unread_vendor: 0, unread_client: 1 });
          convId = (nc as any).id;
        }
        await addDocument(`conversations/${convId}/messages`, {
          sender: 'vendor', type: 'document',
          content: `📋 Devis (re-)envoyé : ${d.reference}\nMontant : ${(d.amount || 0).toFixed(2)} € TTC\n${pdf_url ? `Voir le devis : ${pdf_url}` : 'Disponible dans vos documents.'}`,
          file_url: pdf_url, document_type: 'devis', devis_id: d.id,
          created_at: new Date().toISOString(), read: false,
        });
        await updateDocument('conversations', convId, { last_message: `Devis (re-)envoyé : ${d.reference}`, unread_client: 1, updated_at: new Date().toISOString() });
        // Upsert document in client's documents
        await addDocument('documents', { client_id: resolvedClientId, vendor_id: user.uid, name: `Devis ${d.reference} — ${d.client_name}`, type: 'devis', file_url: pdf_url, uploaded_by: 'vendor', uploaded_at: new Date().toLocaleDateString('fr-FR'), devis_id: d.id, status: 'sent' });
      }
      await updateDocument('devis', d.id, { status: 'sent', pdf_url, sent_at: new Date().toISOString() });
      toast.success('Devis renvoyé au client');
      load();
    } catch (e) { console.error(e); toast.error('Erreur'); } finally { setSending(null); }
  };

  const handleAcceptDevis = async (d: Devis) => {
    if (!user) return;
    try {
      await updateDocument('devis', d.id, { status: 'accepted', accepted_at: new Date().toISOString() });
      // Créer facture automatiquement
      const invoiceRef = `FAC-${Date.now().toString().slice(-6)}`;
      await addDocument('invoices', {
        vendor_id: user.uid, client_name: d.client_name, client_email: d.client_email,
        client_id: (d as any).client_id || '',
        devis_id: d.id, reference: invoiceRef,
        amount_ht: (d.items || []).reduce((s, i) => s + i.qty * i.unit_price, 0),
        amount_ttc: d.amount || 0, tva: d.tva || 0,
        items: d.items || [], status: 'pending',
        created_at: new Date().toISOString(), due_date: '',
        notes: `Facture générée automatiquement depuis le devis ${d.reference}`,
      });
      toast.success('Devis accepté ✓ — Facture créée automatiquement dans Paiements');
      load();
    } catch { toast.error('Erreur'); }
  };

  const handleRejectDevis = async (id: string) => {
    try { await updateDocument('devis', id, { status: 'rejected' }); toast.success('Devis marqué comme refusé'); load(); } catch { toast.error('Erreur'); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce devis ?')) return;
    try { await deleteDocument('devis', id); toast.success('Supprimé'); load(); } catch { toast.error('Erreur'); }
  };

  const filtered = devis.filter(d =>
    !search || d.client_name?.toLowerCase().includes(search.toLowerCase()) || d.reference?.toLowerCase().includes(search.toLowerCase())
  );
  const totalAccepted = devis.filter(d => d.status === 'accepted').reduce((s, d) => s + (d.amount || 0), 0);
  const totalPending = devis.filter(d => d.status === 'sent').reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Devis</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Devis professionnels avec prestations et conditions pré-remplies selon votre activité.</p>
          </div>
          <button onClick={openNew} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm">
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
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 bg-charcoal-100 rounded-2xl animate-pulse" />)}</div>
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
              const isSending = sending === d.id;
              return (
                <div key={d.id} className="relative bg-white border border-charcoal-100 rounded-2xl p-5 shadow-soft">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-xs font-mono text-charcoal-400 bg-charcoal-50 px-2 py-0.5 rounded">{d.reference}</span>
                        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}>
                          <cfg.icon className="w-3 h-3" />{cfg.label}
                        </span>
                      </div>
                      <p className="font-semibold text-charcoal-900">{d.client_name}</p>
                      {d.client_email && <p className="text-xs text-charcoal-400 mt-0.5">{d.client_email}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-serif text-charcoal-900 text-2xl" style={{ fontWeight: 300 }}>{(d.amount || 0).toLocaleString('fr-FR')} €</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">TTC</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-charcoal-50">
                    <button
                      onClick={() => setOpenMenuId((p) => p === d.id ? null : d.id)}
                      className="p-2 rounded-lg hover:bg-charcoal-50 transition-colors"
                      title="Actions"
                    >
                      <MoreVertical className="w-4 h-4 text-charcoal-600" />
                    </button>

                    {openMenuId === d.id && (
                      <div className="absolute right-5 top-[calc(100%-14px)] z-30 w-56 bg-white border border-charcoal-100 rounded-xl shadow-soft overflow-hidden">
                        <div className="py-1">
                          {(d.status === 'draft' || d.status === 'sent') && (
                            <button
                              onClick={() => { setOpenMenuId(null); handleSendExisting(d); }}
                              disabled={isSending}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-700 disabled:opacity-50"
                            >
                              {isSending ? 'Envoi…' : d.status === 'sent' ? 'Renvoyer au client' : 'Envoyer au client'}
                            </button>
                          )}

                          {d.status === 'sent' && (
                            <>
                              <button
                                onClick={() => { setOpenMenuId(null); handleAcceptDevis(d); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-green-700"
                              >
                                Accepter
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); handleRejectDevis(d.id); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600"
                              >
                                Refuser
                              </button>
                            </>
                          )}

                          <div className="h-px bg-charcoal-100 my-1" />

                          <button
                            onClick={() => { setOpenMenuId(null); const pdf = buildDevisPDF(d, vendorName); pdf.save(`${d.reference || 'devis'}.pdf`); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                          >
                            Télécharger PDF
                          </button>
                          {d.pdf_url && (
                            <a
                              href={d.pdf_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={() => setOpenMenuId(null)}
                              className="block px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                            >
                              Voir le PDF
                            </a>
                          )}

                          <div className="h-px bg-charcoal-100 my-1" />
                          <button
                            onClick={() => { setOpenMenuId(null); handleDelete(d.id); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-600"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {d.status === 'sent' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Devis envoyé au client — visible dans ses documents et sa messagerie. En attente de validation.
                    </div>
                  )}
                  {d.status === 'accepted' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Devis accepté ✓ — Une facture a été générée automatiquement dans Paiements
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal nouveau devis */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-shrink-0">
              <h2 className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 400 }}>
                Nouveau devis
                <span className="ml-2 text-sm font-sans font-normal text-charcoal-400 bg-charcoal-50 px-2 py-0.5 rounded">{vendorCategory}</span>
              </h2>
              <div className="flex items-center gap-3">
                <div className="flex bg-stone-100 rounded-xl p-1 gap-1">
                  {(['form', 'preview'] as const).map(t => (
                    <button key={t} onClick={() => setModalTab(t)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${modalTab === t ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-700'}`}>
                      {t === 'form' ? 'Formulaire' : '👁 Aperçu'}
                    </button>
                  ))}
                </div>
                <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-charcoal-400"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {modalTab === 'preview' ? (
                <div className="p-6">
                  <div className="bg-white border border-stone-200 rounded-xl shadow-sm font-sans text-sm max-w-2xl mx-auto overflow-hidden">
                    <div className="bg-charcoal-900 text-white text-center py-4">
                      <p className="text-xs tracking-widest uppercase text-white/60 mb-1">Devis</p>
                      <p className="text-xs text-white/50">Date : {form.date ? new Date(form.date).toLocaleDateString('fr-FR') : new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-6 mb-5 text-xs">
                        <div><p className="font-semibold text-charcoal-400 uppercase tracking-wider mb-1">Prestataire</p><p className="font-bold text-charcoal-900">{vendorName}</p>{vendorAddress && <p className="text-charcoal-500 mt-1">{vendorAddress}</p>}</div>
                        <div><p className="font-semibold text-charcoal-400 uppercase tracking-wider mb-1">Client</p><p className="font-bold text-charcoal-900">{form.client_name || '—'}</p>{form.client_email && <p className="text-charcoal-500 mt-1">{form.client_email}</p>}</div>
                      </div>
                      <table className="w-full text-xs mb-4">
                        <thead><tr className="bg-stone-100">
                          <th className="text-left py-2 px-2 text-charcoal-600 font-semibold">Désignation</th>
                          <th className="text-right py-2 px-2 text-charcoal-600 font-semibold w-12">Qté</th>
                          <th className="text-right py-2 px-2 text-charcoal-600 font-semibold w-24">PU HT</th>
                          <th className="text-right py-2 px-2 text-charcoal-600 font-semibold w-24">Total HT</th>
                        </tr></thead>
                        <tbody>
                          {items.filter(it => it.description).map((item, idx) => (
                            <tr key={idx} className="border-b border-charcoal-100">
                              <td className="py-2 px-2">{item.description}</td>
                              <td className="py-2 px-2 text-right">{item.qty}</td>
                              <td className="py-2 px-2 text-right">{item.unit_price.toFixed(2)} €</td>
                              <td className="py-2 px-2 text-right font-medium">{(item.qty * item.unit_price).toFixed(2)} €</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="flex flex-col items-end gap-1 text-xs mb-4">
                        <div className="flex gap-8 text-charcoal-600"><span>Sous-total HT</span><span>{ht.toFixed(2)} €</span></div>
                        {Number(form.tva) > 0 && <div className="flex gap-8 text-charcoal-600"><span>TVA ({form.tva}%)</span><span>{(ttc - ht).toFixed(2)} €</span></div>}
                        <div className="flex gap-8 font-bold text-charcoal-900 border-t border-charcoal-300 pt-1"><span>Total TTC</span><span>{ttc.toFixed(2)} €</span></div>
                      </div>
                      {form.conditions && (
                        <div className="border-t border-charcoal-100 pt-4 text-xs">
                          <p className="font-semibold text-charcoal-700 mb-2 uppercase tracking-wider">Conditions</p>
                          <p className="whitespace-pre-wrap text-charcoal-600 leading-relaxed max-h-40 overflow-y-auto">{form.conditions}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  {linkedClients.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-rose-700 mb-2">Client lié — sélectionner pour auto-remplir</label>
                      <select onChange={e => {
                        const c = linkedClients.find(x => x.id === e.target.value);
                        if (c) setForm(p => ({ ...p, client_name: c.name, client_email: c.email, client_id: c.id }));
                      }} className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400">
                        <option value="">— Choisir un client lié —</option>
                        {linkedClients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>)}
                      </select>
                    </div>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date du devis</label>
                      <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date événement</label>
                      <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">TVA (%)</label>
                      <input type="number" value={form.tva} onChange={e => setForm(p => ({ ...p, tva: e.target.value }))} min="0" max="100"
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                    </div>
                  </div>

                  {/* Prestations */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-charcoal-700">Prestations &amp; tarifs</label>
                      <div className="flex gap-2">
                        <button type="button"
                          onClick={() => { const d = getDefaultServicesForCategory(vendorCategory); setItems(d.map(s => ({ description: s.description, qty: 1, unit_price: s.unit_price }))); toast.success('Prestations appliquées'); }}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-champagne-300 text-champagne-700 rounded-lg hover:bg-champagne-50 transition-colors">
                          <Sparkles className="w-3.5 h-3.5" /> {vendorCategory}
                        </button>
                        <button type="button" onClick={() => setItems(p => [...p, { ...EMPTY_LINE }])}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-charcoal-200 text-charcoal-600 rounded-lg hover:bg-stone-50 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Ligne
                        </button>
                      </div>
                    </div>
                    <div className="border border-charcoal-200 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 bg-stone-50 px-3 py-2 text-xs font-semibold text-charcoal-500">
                        <div className="col-span-6">Désignation</div>
                        <div className="col-span-2 text-right">Qté</div>
                        <div className="col-span-3 text-right">PU HT</div>
                        <div className="col-span-1" />
                      </div>
                      {items.map((item, idx) => (
                        <div key={idx} className="grid grid-cols-12 gap-2 px-3 py-2 border-t border-charcoal-100 items-center">
                          <input value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                            className="col-span-6 px-2 py-1.5 border border-charcoal-200 rounded-lg text-xs bg-white focus:outline-none focus:border-rose-400" placeholder="Désignation…" />
                          <input type="number" value={item.qty} onChange={e => updateItem(idx, 'qty', Math.max(1, Number(e.target.value)))} min="1"
                            className="col-span-2 px-2 py-1.5 border border-charcoal-200 rounded-lg text-xs text-right bg-white focus:outline-none focus:border-rose-400" />
                          <div className="col-span-3 relative">
                            <Euro className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-charcoal-400" />
                            <input type="number" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', Number(e.target.value))} min="0"
                              className="w-full pl-5 pr-2 py-1.5 border border-charcoal-200 rounded-lg text-xs text-right bg-white focus:outline-none focus:border-rose-400" />
                          </div>
                          <button onClick={() => setItems(p => p.filter((_, i) => i !== idx))} disabled={items.length === 1}
                            className="col-span-1 flex justify-center text-charcoal-300 hover:text-red-500 disabled:opacity-30 transition-colors">
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 flex flex-col items-end gap-1">
                      <div className="flex items-center gap-6 text-charcoal-500 text-xs"><span>HT</span><span className="w-24 text-right">{ht.toFixed(2)} €</span></div>
                      {Number(form.tva) > 0 && <div className="flex items-center gap-6 text-charcoal-500 text-xs"><span>TVA {form.tva}%</span><span className="w-24 text-right">{(ttc - ht).toFixed(2)} €</span></div>}
                      <div className="flex items-center gap-6 font-bold text-charcoal-900 border-t border-charcoal-200 pt-1.5"><span>Total TTC</span><span className="w-24 text-right">{ttc.toFixed(2)} €</span></div>
                    </div>
                  </div>

                  {/* Conditions */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-charcoal-700">Conditions générales</label>
                      <button type="button"
                        onClick={() => { setForm(p => ({ ...p, conditions: getDevisConditionsForCategory(vendorCategory) })); toast.success('Conditions appliquées'); }}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" /> Template {vendorCategory}
                      </button>
                    </div>
                    <textarea value={form.conditions} onChange={e => setForm(p => ({ ...p, conditions: e.target.value }))} rows={6}
                      className="w-full px-4 py-3 border border-charcoal-200 rounded-xl text-xs bg-stone-50 focus:outline-none focus:border-rose-400 resize-y leading-relaxed"
                      placeholder="Les conditions seront pré-remplies selon votre catégorie. Cliquez sur 'Template' pour appliquer." />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50 rounded-b-2xl flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-charcoal-200 text-charcoal-600 rounded-xl text-sm hover:bg-stone-100 transition-colors">Annuler</button>
              <div className="flex-1" />
              <button onClick={() => { const pdf = buildDevisPDF(buildDoc(), vendorName); pdf.save('devis-preview.pdf'); }}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-charcoal-200 text-charcoal-700 rounded-xl text-sm hover:bg-stone-100 transition-colors">
                <Download className="w-4 h-4" /> PDF
              </button>
              <button onClick={handleSaveDraft} disabled={saving}
                className="flex items-center gap-1.5 px-4 py-2.5 border border-charcoal-300 text-charcoal-700 rounded-xl text-sm hover:bg-stone-100 disabled:opacity-50 transition-colors">
                {saving ? 'Sauvegarde…' : '💾 Brouillon'}
              </button>
              <button onClick={handleSendToClient} disabled={sending !== null || !form.client_name}
                className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-colors shadow-sm">
                <Send className="w-4 h-4" />
                {sending === 'new' ? 'Envoi…' : '📨 Envoyer au client'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
