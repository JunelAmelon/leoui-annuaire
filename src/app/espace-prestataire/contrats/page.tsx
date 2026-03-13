'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { FileCheck2, Plus, Search, Download, Eye, Send, Edit, CheckCircle, Clock, XCircle, X, Trash2, Sparkles, Minus, Euro, AlertCircle, MoreVertical } from 'lucide-react';
import { getDocuments, addDocument, updateDocument, deleteDocument, getDocument } from '@/lib/db';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import { uploadPdf } from '@/lib/storage';
import { getContractTemplateForCategory, getDefaultServicesForCategory } from '@/lib/contract-templates';

interface LineItem { description: string; qty: number; unit_price: number; }

interface Contract {
  id: string;
  reference: string;
  title: string;
  client_name: string;
  client_email: string;
  client_id?: string;
  type: string;
  amount: number;
  status: 'draft' | 'sent' | 'signed' | 'cancelled';
  created_at: string;
  signed_at: string | null;
  content: string;
  items?: LineItem[];
  tva?: number;
  event_date?: string;
  pdf_url?: string;
}

const EMPTY_LINE: LineItem = { description: '', qty: 1, unit_price: 0 };

function calcTotals(items: LineItem[], tva: number) {
  const ht = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
  const ttc = ht * (1 + tva / 100);
  return { ht, ttc };
}

const STATUS_CFG = {
  draft:     { label: 'Brouillon', color: 'bg-stone-100 text-stone-600',  icon: Edit },
  sent:      { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700',    icon: Clock },
  signed:    { label: 'Signé',     color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  cancelled: { label: 'Annulé',   color: 'bg-red-100 text-red-700',      icon: XCircle },
} as const;

const TYPES = ['Contrat de prestation', 'Contrat de mariage', 'Contrat de location', 'Contrat cadre', 'Autre'];

function buildPDF(c: Contract, vendorName: string, vendorAddress?: string): jsPDF {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const W = doc.internal.pageSize.getWidth();
  const M = 50;
  let y = 50;

  // Header band
  doc.setFillColor(30, 30, 30);
  doc.rect(0, 0, W, 36, 'F');
  doc.setFontSize(13); doc.setFont('helvetica', 'bold'); doc.setTextColor(255, 255, 255);
  doc.text('CONTRAT DE PRESTATION DE SERVICES', W / 2, 23, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  y = 55;
  doc.setFontSize(9); doc.setFont('helvetica', 'normal'); doc.setTextColor(120, 120, 120);
  doc.text(`Référence : ${c.reference}   •   Date : ${new Date(c.created_at).toLocaleDateString('fr-FR')}`, W / 2, y, { align: 'center' });
  if (c.event_date) { y += 13; doc.text(`Date de l'événement : ${new Date(c.event_date).toLocaleDateString('fr-FR')}`, W / 2, y, { align: 'center' }); }
  doc.setTextColor(0, 0, 0);

  y += 20;
  doc.setDrawColor(220); doc.line(M, y, W - M, y); y += 16;

  // Parties
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(150, 150, 150);
  doc.text('PRESTATAIRE', M, y); doc.text('CLIENT', W / 2 + 10, y); y += 13;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(0, 0, 0);
  doc.text(vendorName, M, y); doc.text(c.client_name, W / 2 + 10, y); y += 13;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
  if (vendorAddress) { const vlines = doc.splitTextToSize(vendorAddress, W/2 - M - 10); vlines.forEach((l: string) => { doc.text(l, M, y); y += 12; }); }
  if (c.client_email) { doc.text(c.client_email, W / 2 + 10, y - (vendorAddress ? 12 : 0)); }
  doc.setTextColor(0, 0, 0);

  y += 10;
  doc.setDrawColor(220); doc.line(M, y, W - M, y); y += 16;

  // Objet
  doc.setFontSize(9); doc.setFont('helvetica', 'bold');
  doc.text('OBJET DU CONTRAT', M, y); y += 13;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text(`Type de prestation : ${c.type}`, M, y); y += 12;
  doc.text(`Intitulé : ${c.title}`, M, y); y += 18;

  // Prestations table
  const items = c.items || [];
  if (items.length > 0) {
    doc.setFillColor(245, 245, 245);
    doc.rect(M, y, W - M * 2, 16, 'F');
    doc.setFontSize(8.5); doc.setFont('helvetica', 'bold');
    doc.text('DÉSIGNATION', M + 4, y + 11);
    doc.text('QTÉ', W - 155, y + 11);
    doc.text('PU HT', W - 115, y + 11);
    doc.text('TOTAL HT', W - 65, y + 11);
    y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5);
    items.forEach((item, idx) => {
      if (y > 740) { doc.addPage(); y = 50; }
      if (idx % 2 === 1) { doc.setFillColor(252, 252, 252); doc.rect(M, y, W - M * 2, 15, 'F'); }
      const total = item.qty * item.unit_price;
      const dlines = doc.splitTextToSize(item.description, W - M * 2 - 120);
      doc.text(dlines[0] || '', M + 4, y + 10);
      doc.text(String(item.qty), W - 148, y + 10, { align: 'right' });
      doc.text(`${item.unit_price.toFixed(2)} €`, W - 98, y + 10, { align: 'right' });
      doc.text(`${total.toFixed(2)} €`, W - M, y + 10, { align: 'right' });
      y += 15;
    });
    const tva = c.tva ?? 0;
    const ht = items.reduce((s, i) => s + i.qty * i.unit_price, 0);
    const ttcVal = ht * (1 + tva / 100);
    y += 4;
    doc.setDrawColor(200); doc.line(W - 160, y, W - M, y); y += 10;
    doc.setFontSize(8.5); doc.setFont('helvetica', 'normal');
    doc.text('Sous-total HT', W - 160, y); doc.text(`${ht.toFixed(2)} €`, W - M, y, { align: 'right' }); y += 12;
    if (tva > 0) { doc.text(`TVA (${tva}%)`, W - 160, y); doc.text(`${(ttcVal - ht).toFixed(2)} €`, W - M, y, { align: 'right' }); y += 12; }
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.text('MONTANT TOTAL TTC', W - 160, y); doc.text(`${ttcVal.toFixed(2)} €`, W - M, y, { align: 'right' }); y += 20;
  } else {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text(`Montant forfaitaire : ${c.amount.toLocaleString('fr-FR')} € TTC`, M, y); y += 20;
  }

  doc.setDrawColor(220); doc.line(M, y, W - M, y); y += 16;

  // Legal content
  if (c.content) {
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('CONDITIONS GÉNÉRALES ET CLAUSES CONTRACTUELLES', M, y); y += 16;
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
    const lines = doc.splitTextToSize(c.content, W - M * 2);
    for (const line of lines) {
      if (y > 750) { doc.addPage(); y = 50; }
      doc.text(line, M, y); y += 11;
    }
  }

  // Signatures
  y += 20;
  if (y > 720) { doc.addPage(); y = 50; }
  doc.setDrawColor(180); doc.line(M, y, W - M, y); y += 18;
  doc.setFontSize(8.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(80, 80, 80);
  doc.text('Fait en deux exemplaires originaux', W / 2, y, { align: 'center' }); y += 18;
  doc.setTextColor(0, 0, 0);
  doc.text('Lu et approuvé — Signature prestataire :', M, y);
  doc.text('Lu et approuvé — Signature client :', W / 2 + 10, y); y += 55;
  doc.setFont('helvetica', 'normal');
  doc.text('Nom : ___________________________', M, y);
  doc.text('Nom : ___________________________', W / 2 + 10, y); y += 14;
  doc.text('Date : ___________________________', M, y);
  doc.text('Date : ___________________________', W / 2 + 10, y);
  return doc;
}

export default function ContratsPage() {
  const { user } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalTab, setModalTab] = useState<'form' | 'preview'>('form');
  const [editItem, setEditItem] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [linkedClients, setLinkedClients] = useState<{id: string; name: string; email: string; client_id?: string}[]>([]);
  const [vendorCategory, setVendorCategory] = useState<string>('Autre');
  const [vendorAddress, setVendorAddress] = useState<string>('');
  const [items, setItems] = useState<LineItem[]>([{ ...EMPTY_LINE }]);
  const [form, setForm] = useState({
    title: '', client_name: '', client_email: '', client_id: '',
    type: TYPES[0], tva: '0', event_date: '', content: '', status: 'draft' as keyof typeof STATUS_CFG
  });

  const vendorName = user?.displayName || user?.email?.split('@')[0] || 'Prestataire';
  const { ht, ttc } = calcTotals(items, Number(form.tva) || 0);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('contracts', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setContracts((data as any[]).map(d => ({
        id: d.id, reference: d.reference || '', title: d.title || '',
        client_name: d.client_name || '', client_email: d.client_email || '', client_id: d.client_id || '',
        type: d.type || '', amount: d.amount || 0, status: d.status || 'draft',
        created_at: d.created_at || new Date().toISOString(), signed_at: d.signed_at || null,
        content: d.content || '', items: d.items || [], tva: d.tva ?? 0,
        event_date: d.event_date || '', pdf_url: d.pdf_url || ''
      })));
    } catch { setContracts([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    load();
    // Charger clients liés
    getDocuments('collaborations', [{ field: 'vendor_id', operator: '==', value: user.uid }])
      .then(collabs => setLinkedClients((collabs as any[]).map(c => ({
        id: c.client_id, name: c.client_name || '', email: c.client_email || '', client_id: c.client_id
      })).filter(c => c.name || c.email)))
      .catch(() => {});
    // Charger profil vendor pour catégorie
    getDocument('vendors', user.uid).then(v => {
      if (v) {
        const cat = (v as any).category || 'Autre';
        setVendorCategory(cat);
        setVendorAddress((v as any).address || (v as any).location || '');
      }
    }).catch(() => {});
  }, [user]);

  const updateItem = (idx: number, field: keyof LineItem, val: string | number) =>
    setItems(prev => prev.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const applyDefaultServices = () => {
    const defaults = getDefaultServicesForCategory(vendorCategory);
    setItems(defaults.map(s => ({ description: s.description, qty: 1, unit_price: s.unit_price })));
    toast.success('Prestations par défaut appliquées');
  };

  const applyLegalTemplate = () => {
    const template = getContractTemplateForCategory(vendorCategory);
    setForm(p => ({ ...p, content: template }));
    toast.success('Clauses juridiques appliquées');
  };

  const openCreate = () => {
    setEditItem(null);
    const defaults = getDefaultServicesForCategory(vendorCategory);
    setItems(defaults.map(s => ({ description: s.description, qty: 1, unit_price: s.unit_price })));
    setForm({
      title: '', client_name: '', client_email: '', client_id: '',
      type: TYPES[0], tva: '0', event_date: '',
      content: getContractTemplateForCategory(vendorCategory),
      status: 'draft'
    });
    setModalTab('form');
    setShowModal(true);
  };

  const openEdit = (c: Contract) => {
    setEditItem(c);
    setItems(c.items && c.items.length > 0 ? c.items : [{ ...EMPTY_LINE }]);
    setForm({
      title: c.title, client_name: c.client_name, client_email: c.client_email,
      client_id: c.client_id || '', type: c.type, tva: String(c.tva ?? 0),
      event_date: c.event_date || '', content: c.content, status: c.status
    });
    setModalTab('form');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !form.title || !form.client_name) { toast.error('Remplissez les champs obligatoires'); return; }
    setSaving(true);
    try {
      const ref = editItem?.reference || `CTR-${Date.now().toString(36).toUpperCase()}`;
      const { ttc: total } = calcTotals(items, Number(form.tva) || 0);
      const data = {
        vendor_id: user.uid, reference: ref, title: form.title,
        client_name: form.client_name, client_email: form.client_email, client_id: form.client_id,
        type: form.type, amount: total, items, tva: Number(form.tva) || 0,
        event_date: form.event_date, status: form.status, content: form.content,
        created_at: editItem?.created_at || new Date().toISOString(),
        signed_at: form.status === 'signed' ? (editItem?.signed_at || new Date().toISOString()) : null
      };
      if (editItem) { await updateDocument('contracts', editItem.id, data); toast.success('Contrat mis à jour'); }
      else { await addDocument('contracts', data); toast.success('Contrat créé'); }
      setShowModal(false); load();
    } catch { toast.error('Erreur lors de la sauvegarde'); } finally { setSaving(false); }
  };

  const handleSendToClient = async (c: Contract) => {
    if (!user) return;
    if (!c.client_email) { toast.error('Email client requis pour envoyer'); return; }
    setSending(c.id);
    try {
      const pdf = buildPDF(c, vendorName, vendorAddress);
      const pdfBlob = pdf.output('blob');
      let file_url = '';
      try { file_url = await uploadPdf(pdfBlob, c.reference); } catch {}

      // Chercher client par email
      const clients = await getDocuments('clients', [{ field: 'email', operator: '==', value: c.client_email }]);
      const client = (clients[0] as any) || null;
      const resolvedClientId = c.client_id || client?.id || null;

      if (resolvedClientId) {
        // Créer document dans l'espace client
        await addDocument('documents', {
          client_id: resolvedClientId, vendor_id: user.uid,
          name: `Contrat ${c.reference} — ${c.client_name}`,
          type: 'contrat', file_url,
          uploaded_by: 'vendor', uploaded_at: new Date().toLocaleDateString('fr-FR'),
          contract_id: c.id, status: 'sent',
        });
        // Envoyer message dans la conversation
        const convs = await getDocuments('conversations', [
          { field: 'vendor_id', operator: '==', value: user.uid },
          { field: 'client_id', operator: '==', value: resolvedClientId },
        ]);
        let convId = (convs[0] as any)?.id;
        if (!convId) {
          const newConv = await addDocument('conversations', {
            vendor_id: user.uid, client_id: resolvedClientId,
            vendor_name: vendorName, client_name: c.client_name,
            created_at: new Date().toISOString(), last_message: '', unread_vendor: 0, unread_client: 1,
          });
          convId = (newConv as any).id;
        }
        await addDocument(`conversations/${convId}/messages`, {
          sender: 'vendor', type: 'document',
          content: `📄 Contrat envoyé : ${c.title}\nRéf. ${c.reference} — Montant : ${c.amount.toLocaleString('fr-FR')} €\n${file_url ? `Voir le contrat : ${file_url}` : 'Disponible dans vos documents.'}`,
          file_url, document_type: 'contrat', contract_id: c.id,
          created_at: new Date().toISOString(), read: false,
        });
        await updateDocument('conversations', convId, { last_message: `Contrat envoyé : ${c.title}`, unread_client: 1, updated_at: new Date().toISOString() });
      }

      await updateDocument('contracts', c.id, { status: 'sent', pdf_url: file_url });
      toast.success(resolvedClientId ? `Contrat envoyé et visible dans les documents du client` : `PDF généré — email non trouvé dans la base`, { duration: 4000 });
      load();
    } catch (e) { console.error(e); toast.error('Erreur lors de l\'envoi'); } finally { setSending(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce contrat ?')) return;
    try { await deleteDocument('contracts', id); toast.success('Supprimé'); load(); } catch { toast.error('Erreur'); }
  };

  const handleView = (c: Contract) => { const doc = buildPDF(c, vendorName, vendorAddress); window.open(doc.output('bloburl'), '_blank'); };
  const handleDownload = (c: Contract) => { const doc = buildPDF(c, vendorName, vendorAddress); doc.save(`${c.reference}.pdf`); toast.success('PDF téléchargé'); };

  const filtered = contracts.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.reference.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Contrats</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Contrats complets avec clauses juridiques, prestations et envoi direct au client.</p>
          </div>
          <button onClick={openCreate} className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Nouveau contrat
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(Object.keys(STATUS_CFG) as Array<keyof typeof STATUS_CFG>).map(s => {
            const cfg = STATUS_CFG[s]; const Icon = cfg.icon;
            return (
              <div key={s} className="bg-white rounded-2xl shadow-sm p-4 border border-charcoal-100">
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="w-3.5 h-3.5 text-charcoal-400" />
                  <p className="text-xs text-charcoal-400 uppercase tracking-wider">{cfg.label}</p>
                </div>
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
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center border border-charcoal-100">
            <FileCheck2 className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
            <p className="font-serif text-charcoal-700 text-lg mb-1">{search ? 'Aucun résultat' : 'Aucun contrat'}</p>
            <p className="text-sm text-charcoal-400">{search ? 'Essayez d\'autres mots-clés' : 'Créez votre premier contrat professionnel'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(c => {
              const cfg = STATUS_CFG[c.status] || STATUS_CFG.draft;
              const Icon = cfg.icon;
              const isSending = sending === c.id;
              return (
                <div key={c.id} className="relative bg-white rounded-2xl shadow-sm p-5 border border-charcoal-100">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2.5 mb-1.5">
                        <span className="text-xs text-charcoal-400 font-mono bg-charcoal-50 px-2 py-0.5 rounded">{c.reference}</span>
                        <span className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </span>
                        {c.event_date && <span className="text-xs text-charcoal-400">📅 {new Date(c.event_date).toLocaleDateString('fr-FR')}</span>}
                      </div>
                      <p className="font-semibold text-charcoal-900">{c.title}</p>
                      <p className="text-sm text-charcoal-500 mt-0.5">{c.client_name}{c.client_email ? ` · ${c.client_email}` : ''}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-serif text-charcoal-900 text-2xl" style={{ fontWeight: 300 }}>{c.amount.toLocaleString('fr-FR')} €</p>
                      <p className="text-xs text-charcoal-400 mt-0.5">{c.type}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-charcoal-50">
                    <button
                      onClick={() => setOpenMenuId((p) => p === c.id ? null : c.id)}
                      className="p-2 rounded-lg hover:bg-charcoal-50 transition-colors"
                      title="Actions"
                    >
                      <MoreVertical className="w-4 h-4 text-charcoal-600" />
                    </button>

                    {openMenuId === c.id && (
                      <div className="absolute right-5 top-[calc(100%-14px)] z-30 w-56 bg-white border border-charcoal-100 rounded-xl shadow-soft overflow-hidden">
                        <div className="py-1">
                          {c.status !== 'signed' && c.status !== 'cancelled' && (
                            <button
                              onClick={() => { setOpenMenuId(null); handleSendToClient(c); }}
                              disabled={isSending}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-700 disabled:opacity-50"
                            >
                              {isSending ? 'Envoi…' : c.status === 'sent' ? 'Renvoyer au client' : 'Envoyer au client'}
                            </button>
                          )}

                          <div className="h-px bg-charcoal-100 my-1" />

                          <button
                            onClick={() => { setOpenMenuId(null); handleView(c); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                          >
                            Voir PDF
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); handleDownload(c); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                          >
                            Télécharger
                          </button>
                          <button
                            onClick={() => { setOpenMenuId(null); openEdit(c); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                          >
                            Modifier
                          </button>

                          <div className="h-px bg-charcoal-100 my-1" />
                          <button
                            onClick={() => { setOpenMenuId(null); handleDelete(c.id); }}
                            className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-600"
                          >
                            Supprimer
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Statut sent: info */}
                  {c.status === 'sent' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Contrat envoyé au client — visible dans ses documents et sa messagerie. En attente de signature.
                    </div>
                  )}
                  {c.status === 'signed' && (
                    <div className="mt-3 flex items-center gap-2 text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2">
                      <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />
                      Contrat signé le {c.signed_at ? new Date(c.signed_at).toLocaleDateString('fr-FR') : '—'}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ===== MODAL ===== */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[95vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100 flex-shrink-0">
              <h2 className="font-serif text-charcoal-900 text-xl" style={{ fontWeight: 400 }}>
                {editItem ? 'Modifier le contrat' : 'Nouveau contrat'}
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

            {/* Modal body */}
            <div className="flex-1 overflow-y-auto">
              {modalTab === 'preview' ? (
                <div className="p-6">
                  <div className="bg-white border border-stone-200 rounded-xl shadow-sm font-sans text-sm max-w-2xl mx-auto overflow-hidden">
                    <div className="bg-charcoal-900 text-white text-center py-4 px-6">
                      <p className="text-xs tracking-widest uppercase text-white/60 mb-1">Contrat de prestation de services</p>
                      <p className="text-xs text-white/50">{editItem?.reference || 'Nouvelle référence'} — {new Date().toLocaleDateString('fr-FR')}</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-2 gap-6 mb-5 text-xs">
                        <div><p className="font-semibold text-charcoal-400 uppercase tracking-wider mb-1.5">Prestataire</p><p className="font-bold text-charcoal-900 text-base">{vendorName}</p>{vendorAddress && <p className="text-charcoal-500 mt-1">{vendorAddress}</p>}</div>
                        <div><p className="font-semibold text-charcoal-400 uppercase tracking-wider mb-1.5">Client</p><p className="font-bold text-charcoal-900 text-base">{form.client_name || '—'}</p>{form.client_email && <p className="text-charcoal-500 mt-1">{form.client_email}</p>}</div>
                      </div>
                      <div className="mb-5 text-xs space-y-1 bg-stone-50 rounded-xl p-4">
                        <div className="flex gap-4"><span className="font-semibold text-charcoal-500 w-32">Intitulé</span><span className="text-charcoal-900 font-medium">{form.title || '—'}</span></div>
                        <div className="flex gap-4"><span className="font-semibold text-charcoal-500 w-32">Type</span><span>{form.type}</span></div>
                        {form.event_date && <div className="flex gap-4"><span className="font-semibold text-charcoal-500 w-32">Événement</span><span>{new Date(form.event_date).toLocaleDateString('fr-FR')}</span></div>}
                      </div>
                      {/* Prestations preview */}
                      {items.filter(it => it.description).length > 0 && (
                        <div className="mb-5">
                          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider mb-2">Prestations</p>
                          <table className="w-full text-xs">
                            <thead><tr className="bg-stone-100">
                              <th className="text-left py-2 px-2 font-semibold text-charcoal-600">Désignation</th>
                              <th className="text-right py-2 px-2 font-semibold text-charcoal-600 w-10">Qté</th>
                              <th className="text-right py-2 px-2 font-semibold text-charcoal-600 w-20">PU HT</th>
                              <th className="text-right py-2 px-2 font-semibold text-charcoal-600 w-20">Total HT</th>
                            </tr></thead>
                            <tbody>
                              {items.filter(it => it.description).map((it, idx) => (
                                <tr key={idx} className="border-b border-charcoal-100">
                                  <td className="py-1.5 px-2">{it.description}</td>
                                  <td className="py-1.5 px-2 text-right">{it.qty}</td>
                                  <td className="py-1.5 px-2 text-right">{it.unit_price.toFixed(2)} €</td>
                                  <td className="py-1.5 px-2 text-right font-medium">{(it.qty * it.unit_price).toFixed(2)} €</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <div className="flex flex-col items-end gap-1 mt-2 text-xs">
                            <div className="flex gap-6 text-charcoal-600"><span>HT</span><span>{ht.toFixed(2)} €</span></div>
                            {Number(form.tva) > 0 && <div className="flex gap-6 text-charcoal-600"><span>TVA {form.tva}%</span><span>{(ttc - ht).toFixed(2)} €</span></div>}
                            <div className="flex gap-6 font-bold text-charcoal-900 border-t border-charcoal-200 pt-1"><span>TOTAL TTC</span><span>{ttc.toFixed(2)} €</span></div>
                          </div>
                        </div>
                      )}
                      {/* Clauses preview */}
                      {form.content && (
                        <div className="border-t border-charcoal-100 pt-4">
                          <p className="text-xs font-semibold text-charcoal-700 mb-2 uppercase tracking-wider">Conditions générales et clauses contractuelles</p>
                          <p className="whitespace-pre-wrap text-xs text-charcoal-600 leading-relaxed max-h-48 overflow-y-auto">{form.content}</p>
                        </div>
                      )}
                      <div className="border-t border-charcoal-200 mt-6 pt-5 grid grid-cols-2 gap-8 text-xs text-charcoal-500">
                        <div><p className="font-semibold mb-8">Lu et approuvé — Signature prestataire</p><div className="border-b border-charcoal-300 w-36" /><p className="mt-1">Nom : _______________ Date ___________</p></div>
                        <div><p className="font-semibold mb-8">Lu et approuvé — Signature client</p><div className="border-b border-charcoal-300 w-36" /><p className="mt-1">Nom : _______________ Date ___________</p></div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6 space-y-5">
                  {/* Client selection */}
                  {linkedClients.length > 0 && (
                    <div className="bg-rose-50 border border-rose-100 rounded-xl p-4">
                      <label className="block text-sm font-semibold text-rose-700 mb-2">Client lié — sélectionner pour auto-remplir</label>
                      <select onChange={e => {
                        const cl = linkedClients.find(x => x.id === e.target.value);
                        if (cl) setForm(p => ({ ...p, client_name: cl.name, client_email: cl.email, client_id: cl.client_id || cl.id }));
                      }} className="w-full px-4 py-2.5 border border-rose-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400">
                        <option value="">— Choisir un client lié —</option>
                        {linkedClients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>)}
                      </select>
                    </div>
                  )}

                  {/* Infos principales */}
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Intitulé du contrat *</label>
                    <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" placeholder="Ex: Prestation photographique — Mariage Sophie & Thomas" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Nom du client *</label>
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
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Type de contrat</label>
                      <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                        {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">TVA (%)</label>
                      <input type="number" value={form.tva} onChange={e => setForm(p => ({ ...p, tva: e.target.value }))} min="0" max="100"
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date de l'événement</label>
                      <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                        className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
                    </div>
                  </div>

                  {/* ===== PRESTATIONS ===== */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-charcoal-700">Prestations &amp; tarifs</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={applyDefaultServices}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-champagne-300 text-champagne-700 rounded-lg hover:bg-champagne-50 transition-colors">
                          <Sparkles className="w-3.5 h-3.5" /> Prestations {vendorCategory}
                        </button>
                        <button type="button" onClick={() => setItems(p => [...p, { ...EMPTY_LINE }])}
                          className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-charcoal-200 text-charcoal-600 rounded-lg hover:bg-stone-50 transition-colors">
                          <Plus className="w-3.5 h-3.5" /> Ajouter
                        </button>
                      </div>
                    </div>
                    <div className="border border-charcoal-200 rounded-xl overflow-hidden">
                      <div className="grid grid-cols-12 gap-2 bg-stone-50 px-3 py-2 text-xs font-semibold text-charcoal-500">
                        <div className="col-span-6">Désignation</div>
                        <div className="col-span-2 text-right">Qté</div>
                        <div className="col-span-3 text-right">Prix HT</div>
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
                    <div className="mt-3 flex flex-col items-end gap-1 text-sm">
                      <div className="flex items-center gap-6 text-charcoal-500 text-xs"><span>Sous-total HT</span><span className="w-24 text-right">{ht.toFixed(2)} €</span></div>
                      {Number(form.tva) > 0 && <div className="flex items-center gap-6 text-charcoal-500 text-xs"><span>TVA ({form.tva}%)</span><span className="w-24 text-right">{(ttc - ht).toFixed(2)} €</span></div>}
                      <div className="flex items-center gap-6 font-bold text-charcoal-900 border-t border-charcoal-200 pt-1.5"><span>Total TTC</span><span className="w-24 text-right">{ttc.toFixed(2)} €</span></div>
                    </div>
                  </div>

                  {/* ===== CONDITIONS JURIDIQUES ===== */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-sm font-semibold text-charcoal-700">Conditions générales &amp; clauses juridiques</label>
                      <button type="button" onClick={applyLegalTemplate}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-blue-200 text-blue-700 rounded-lg hover:bg-blue-50 transition-colors">
                        <Sparkles className="w-3.5 h-3.5" /> Template {vendorCategory}
                      </button>
                    </div>
                    <textarea value={form.content} onChange={e => setForm(p => ({ ...p, content: e.target.value }))} rows={12}
                      className="w-full px-4 py-3 border border-charcoal-200 rounded-xl text-xs bg-stone-50 focus:outline-none focus:border-rose-400 resize-y font-mono leading-relaxed"
                      placeholder="Les clauses juridiques seront pré-remplies selon votre catégorie. Cliquez sur 'Template' pour appliquer." />
                  </div>

                  {/* Statut */}
                  <div>
                    <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Statut</label>
                    <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as keyof typeof STATUS_CFG }))}
                      className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                      {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50 rounded-b-2xl flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-charcoal-200 text-charcoal-600 rounded-xl text-sm hover:bg-stone-50 transition-colors">Annuler</button>
              <div className="flex-1" />
              <button onClick={() => { setModalTab('preview'); }} className="flex items-center gap-1.5 px-4 py-2.5 border border-charcoal-300 text-charcoal-700 rounded-xl text-sm hover:bg-stone-100 transition-colors">
                <Eye className="w-4 h-4" /> Prévisualiser
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-charcoal-800 text-white rounded-xl text-sm font-semibold hover:bg-charcoal-900 disabled:opacity-50 transition-colors">
                {saving ? 'Sauvegarde…' : editItem ? 'Mettre à jour' : '💾 Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
