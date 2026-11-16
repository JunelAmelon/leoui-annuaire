'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { FileCheck2, Plus, Search, Download, Eye, Send, Edit, CheckCircle, XCircle, X, Trash2, MoreVertical, Save, Upload, Clock } from 'lucide-react';
import { getDocuments, addDocument, updateDocument, deleteDocument, getDocument } from '@/lib/db';
import { getClientEvent } from '@/lib/client-helpers';
import { createNotification, resolveClientRecipientId } from '@/lib/notifications';
import { sendEmail } from '@/lib/email';
import { renderContractEmail } from '@/lib/email-template';
import { toast } from 'sonner';
import { uploadPdf } from '@/lib/storage';

interface Contract {
  id: string;
  reference: string;
  title: string;
  client_name: string;
  client_email: string;
  client_id?: string;
  amount: number;
  documentType: 'contract' | 'quote' | 'invoice' | 'other';
  status: 'draft' | 'sent' | 'signed' | 'cancelled';
  created_at: string;
  signed_at: string | null;
  event_date?: string;
  pdf_url?: string;
}

const STATUS_CFG = {
  draft:     { label: 'Brouillon', color: 'bg-stone-100 text-stone-600',  icon: Edit },
  sent:      { label: 'Envoyé',    color: 'bg-blue-100 text-blue-700',    icon: Clock },
  signed:    { label: 'Signé',     color: 'bg-green-100 text-green-700',  icon: CheckCircle },
  cancelled: { label: 'Annulé',   color: 'bg-red-100 text-red-700',      icon: XCircle },
} as const;

const STATUS_DOT: Record<keyof typeof STATUS_CFG, string> = {
  draft: 'bg-stone-400', sent: 'bg-amber-500', signed: 'bg-emerald-600', cancelled: 'bg-rose-600',
};

export default function ContratsPage() {
  const { user } = useAuth();
  const importInputRef = useRef<HTMLInputElement>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<Contract | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ bottom: number; left: number; maxHeight: number } | null>(null);
  const [linkedClients, setLinkedClients] = useState<{id: string; name: string; email: string; client_id?: string}[]>([]);
  const [importedPdfUrl, setImportedPdfUrl] = useState<string>('');
  const [form, setForm] = useState({
    title: '', client_name: '', client_email: '', client_id: '',
    event_date: '', documentType: 'contract' as 'contract' | 'quote' | 'invoice' | 'other', status: 'draft' as keyof typeof STATUS_CFG
  });

  const vendorName = user?.displayName || user?.email?.split('@')[0] || 'Prestataire';

  useEffect(() => {
    if (!openMenuId) return;
    const close = () => { setOpenMenuId(null); setMenuPos(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [openMenuId]);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('contracts', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setContracts((data as any[]).map(d => ({
        id: d.id, reference: d.reference || '', title: d.title || '',
        client_name: d.client_name || '', client_email: d.client_email || '', client_id: d.client_id || '',
        amount: d.amount || 0, documentType: d.documentType || 'contract', status: d.status || 'draft',
        created_at: d.created_at || new Date().toISOString(), signed_at: d.signed_at || null,
        event_date: d.event_date || '', pdf_url: d.pdf_url || ''
      })));
    } catch { setContracts([]); } finally { setLoading(false); }
  };

  useEffect(() => {
    if (!user) return;
    load();
    getDocuments('collaborations', [{ field: 'vendor_id', operator: '==', value: user.uid }])
      .then(collabs => setLinkedClients((collabs as any[]).map(c => ({
        id: c.client_id, name: c.client_name || '', email: c.client_email || '', client_id: c.client_id
      })).filter(c => c.name || c.email)))
      .catch(() => {});
  }, [user]);

  const handleImportPdf = async (file: File) => {
    try {
      if (file.size > 20 * 1024 * 1024) {
        toast.error('Fichier trop volumineux (max 20MB)');
        return;
      }
      const safeRef = (form.title || 'contrat').replace(/[^a-z0-9-_ ]/gi, '').slice(0, 40) || 'contrat';
      const url = await uploadPdf(file, `contrat-${Date.now()}-${safeRef}`);
      setImportedPdfUrl(url);
      toast.success('PDF importé');
    } catch {
      toast.error('Import impossible');
    }
  };

  const openCreate = () => {
    setEditItem(null);
    setForm({ title: '', client_name: '', client_email: '', client_id: '', event_date: '', documentType: 'contract', status: 'draft' });
    setImportedPdfUrl('');
    setShowModal(true);
  };

  const openEdit = (c: Contract) => {
    setEditItem(c);
    setForm({
      title: c.title, client_name: c.client_name, client_email: c.client_email,
      client_id: c.client_id || '', event_date: c.event_date || '',
      documentType: c.documentType || 'contract', status: c.status
    });
    setImportedPdfUrl(c.pdf_url || '');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !form.title || !form.client_name) {
      toast.error('Remplissez les champs obligatoires');
      return;
    }
    setSaving(true);
    try {
      const ref = editItem?.reference || `CTR-${Date.now().toString(36).toUpperCase()}`;
      const data = {
        vendor_id: user.uid,
        reference: ref,
        title: form.title,
        client_name: form.client_name,
        client_email: form.client_email,
        client_id: form.client_id,
        amount: 0,
        documentType: form.documentType,
        event_date: form.event_date,
        status: form.status,
        pdf_url: importedPdfUrl || (editItem as any)?.pdf_url || '',
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
    if (!c.pdf_url) { toast.error('Importez un PDF avant d\'envoyer'); return; }
    setSending(c.id);
    try {
      const file_url = c.pdf_url;
      const docType = c.documentType || 'contract';
      const typeLabel = docType === 'invoice' ? 'facture' : docType === 'quote' ? 'devis' : docType === 'contract' ? 'contrat' : 'document';
      const typeLabelCap = docType === 'invoice' ? 'Facture' : docType === 'quote' ? 'Devis' : docType === 'contract' ? 'Contrat' : 'Document';

      // Chercher client par email
      const clients = await getDocuments('clients', [{ field: 'email', operator: '==', value: c.client_email }]);
      const client = (clients[0] as any) || null;
      const resolvedClientId = c.client_id || client?.id || null;

      if (resolvedClientId) {
        // Créer document dans l'espace client
        await addDocument('documents', {
          client_id: resolvedClientId, vendor_id: user.uid,
          name: `${typeLabelCap} ${c.reference} — ${c.client_name}`,
          type: typeLabel, file_url,
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
        const msgContent = `📄 ${typeLabelCap} envoyé(e) : ${c.title}\nRéf. ${c.reference}\n${file_url ? `Voir le document : ${file_url}` : 'Disponible dans vos documents.'}`;
        await addDocument('messages', {
          conversation_id: convId,
          sender_id: user.uid,
          sender_role: 'vendor',
          sender_name: vendorName,
          content: msgContent,
          created_at: new Date().toISOString(),
          type: 'document',
          file_url,
          document_type: typeLabel,
          contract_id: c.id,
        } as any);
        await updateDocument('conversations', convId, {
          last_message: `${typeLabelCap} envoyé(e) : ${c.title}`,
          last_message_at: new Date().toISOString(),
          unread_count_client: 1,
          updated_at: new Date().toISOString(),
        });
      }

      if (resolvedClientId) {
        resolveClientRecipientId(resolvedClientId)
          .then((recipientId) => createNotification({
            recipientId,
            type: 'document',
            title: `${typeLabelCap} reçu(e)`,
            message: `${vendorName} vous a envoyé la ${typeLabel} ${c.reference}. À consulter.`,
            link: '/espace-client/documents',
          }))
          .catch(() => {});
      }
      // Email au client (on a toujours c.client_email ici)
      sendEmail({
        to: c.client_email,
        subject: `${vendorName} vous a envoyé un${typeLabel === 'facture' ? 'e ' : (typeLabel === 'devis' ? ' ' : ' ')}${typeLabel}`,
        html: renderContractEmail({ clientName: c.client_name || '', vendorName, contractName: c.title || c.reference }),
      });
      await updateDocument('contracts', c.id, { status: 'sent', pdf_url: file_url });
      toast.success(resolvedClientId ? `${typeLabelCap} envoyé(e) et visible dans les documents du client` : `${typeLabelCap} envoyé(e), email non trouvé dans la base`, { duration: 4000 });
      load();
    } catch (e) { console.error(e); toast.error('Erreur lors de l\'envoi'); } finally { setSending(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce contrat ?')) return;
    try { await deleteDocument('contracts', id); toast.success('Supprimé'); load(); } catch { toast.error('Erreur'); }
  };

  const handleView = (c: Contract) => {
    if (!c.pdf_url) { toast.error('Aucun PDF disponible'); return; }
    setPreviewUrl(c.pdf_url);
  };

  const handleDownload = (c: Contract) => {
    if (!c.pdf_url) { toast.error('Aucun PDF disponible'); return; }
    const a = document.createElement('a');
    a.href = c.pdf_url;
    a.download = `${c.reference}.pdf`;
    a.target = '_blank';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const filtered = contracts.filter(c =>
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.client_name.toLowerCase().includes(search.toLowerCase()) ||
    c.reference.toLowerCase().includes(search.toLowerCase())
  );
  const menuContract = openMenuId ? contracts.find(c => c.id === openMenuId) : null;

  return (
    <PrestataireDashboardLayout>
      <div className="w-full pb-10">
        <div className="bg-white border border-stone-200 shadow-[0_1px_3px_rgba(60,40,30,0.05)] px-5 sm:px-9 lg:px-12 pt-8 sm:pt-11 pb-8 min-h-[calc(100dvh-9rem)]">

          {/* ── En-tête ── */}
          <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-7 border-b border-charcoal-200/70">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">Espace prestataire</p>
              <h1 className="font-serif text-charcoal-900 mt-3 leading-none" style={{ fontSize: 'clamp(2.1rem, 4.4vw, 3.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>Documents</h1>
              <p className="text-sm text-charcoal-500 mt-3">Contrats, devis et factures à partager avec vos clients.</p>
            </div>
            <button onClick={openCreate}
              className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 transition-colors rounded-sm self-start sm:self-auto">
              <Plus className="w-4 h-4" /> Nouveau document
            </button>
          </header>

          {/* ── Chiffres ── */}
          <dl className="grid grid-cols-2 sm:grid-cols-4 border-b border-charcoal-100">
            {(Object.keys(STATUS_CFG) as Array<keyof typeof STATUS_CFG>).map((s, i) => (
              <div key={s} className={`py-5 sm:py-6 ${i % 2 === 1 ? 'pl-5 border-l border-charcoal-100' : ''} ${i > 0 ? 'sm:pl-7 sm:border-l sm:border-charcoal-100' : ''} ${i < 2 ? 'border-b sm:border-b-0 border-charcoal-100' : ''}`}>
                <dd className="font-serif text-charcoal-900 tabular-nums leading-none" style={{ fontSize: '2.4rem', fontWeight: 300 }}>
                  {contracts.filter(c => c.status === s).length}
                </dd>
                <dt className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400 mt-2.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[s]}`} />{STATUS_CFG[s].label}
                </dt>
              </div>
            ))}
          </dl>

          {/* ── Recherche ── */}
          <div className="flex items-center justify-between gap-4 py-4 border-b border-charcoal-100">
            <p className="text-[13px] text-charcoal-500 hidden sm:block">
              {filtered.length} document{filtered.length > 1 ? 's' : ''}
            </p>
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un titre, un client, une référence"
                className="w-full pl-6 py-2 bg-transparent border-b border-stone-300 text-sm placeholder:text-charcoal-300 focus:outline-none focus:border-rose-500 transition-colors" />
            </div>
          </div>

          {/* ── Liste ── */}
          {loading ? (
            <div className="space-y-4 pt-6 animate-pulse">{[1, 2, 3, 4].map(i => <div key={i} className="h-14 bg-stone-200/50" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center">
              <p className="font-serif italic text-charcoal-500 text-2xl" style={{ fontWeight: 400 }}>{search ? 'Aucun résultat' : 'Aucun document pour l’instant'}</p>
              <p className="text-sm text-charcoal-400 mt-2">{search ? 'Essayez d’autres mots-clés.' : 'Importez votre premier contrat ou devis en PDF.'}</p>
            </div>
          ) : (
            <ul>
              {filtered.map(c => {
                const cfg = STATUS_CFG[c.status] || STATUS_CFG.draft;
                return (
                  <li key={c.id} className="group grid grid-cols-[1fr_auto] md:grid-cols-[7.5rem_1fr_8rem_7rem_auto] items-center gap-x-4 md:gap-x-6 py-5 border-b border-charcoal-100 hover:bg-[#FBF8F4] -mx-3 px-3 transition-colors">
                    <span className="hidden md:block text-[11px] tracking-[0.08em] text-charcoal-400 tabular-nums truncate">{c.reference}</span>
                    <div className="min-w-0">
                      <button type="button" onClick={() => (c.pdf_url ? handleView(c) : openEdit(c))}
                        className="block text-left font-serif text-charcoal-900 text-[1.15rem] leading-snug truncate max-w-full hover:text-rose-700 transition-colors" style={{ fontWeight: 500 }}>
                        {c.title}
                      </button>
                      <p className="text-[13px] text-charcoal-500 mt-0.5 truncate">
                        {c.client_name}{c.client_email ? <span className="text-charcoal-400"> · {c.client_email}</span> : null}
                      </p>
                      <p className="md:hidden flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase text-charcoal-400 mt-1.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status] || STATUS_DOT.draft}`} />{cfg.label}
                        {!c.pdf_url && <span className="text-rose-600 normal-case tracking-normal font-medium">· PDF manquant</span>}
                      </p>
                    </div>
                    <span className="hidden md:block text-[13px] text-charcoal-500 tabular-nums">
                      {c.event_date ? new Date(c.event_date).toLocaleDateString('fr-FR') : '—'}
                    </span>
                    <span className="hidden md:block">
                      <span className="flex items-center gap-2 text-[10px] font-semibold tracking-[0.14em] uppercase text-charcoal-600">
                        <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[c.status] || STATUS_DOT.draft}`} />{cfg.label}
                      </span>
                      {!c.pdf_url && <span className="block text-[11px] text-rose-600 mt-1">PDF manquant</span>}
                    </span>
                    <button
                      onClick={(e) => {
                        if (openMenuId === c.id) {
                          setOpenMenuId(null);
                          setMenuPos(null);
                        } else {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const menuWidth = 224;
                          let left = rect.right - menuWidth - 8;
                          if (left + menuWidth > window.innerWidth - 16) left = window.innerWidth - menuWidth - 16;
                          if (left < 8) left = 8;
                          const bottom = window.innerHeight - rect.top + 6;
                          const maxHeight = Math.max(120, rect.top - 24);
                          setMenuPos({ bottom, left, maxHeight });
                          setOpenMenuId(c.id);
                        }
                      }}
                      className="p-2 text-charcoal-500 hover:text-rose-600 transition-colors"
                      title="Actions"
                      aria-label="Actions"
                    >
                      {sending === c.id ? <Clock className="w-4 h-4 animate-pulse" /> : <MoreVertical className="w-4 h-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      {typeof document !== 'undefined' && menuContract && menuPos && createPortal(
        <div
          style={{ bottom: menuPos.bottom, left: menuPos.left, maxHeight: menuPos.maxHeight }}
          className="fixed z-[60] w-56 bg-white border border-stone-200 rounded-sm shadow-xl overflow-y-auto flex flex-col"
        >
          <div className="py-1">
            {menuContract.status !== 'signed' && menuContract.status !== 'cancelled' && menuContract.pdf_url && (
              <button
                onClick={() => { setOpenMenuId(null); setMenuPos(null); handleSendToClient(menuContract); }}
                disabled={sending === menuContract.id}
                className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-700 disabled:opacity-50"
              >
                {sending === menuContract.id ? 'Envoi…' : menuContract.status === 'sent' ? 'Renvoyer au client' : 'Envoyer au client'}
              </button>
            )}

            <div className="h-px bg-charcoal-100 my-1" />

            {menuContract.pdf_url && (
              <>
                <button
                  onClick={() => { setOpenMenuId(null); setMenuPos(null); handleView(menuContract); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                >
                  Voir PDF
                </button>
                <button
                  onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDownload(menuContract); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                >
                  Télécharger
                </button>
              </>
            )}

            <button
              onClick={() => { setOpenMenuId(null); setMenuPos(null); openEdit(menuContract); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
            >
              Modifier
            </button>

            <div className="h-px bg-charcoal-100 my-1" />
            <button
              onClick={() => { setOpenMenuId(null); setMenuPos(null); handleDelete(menuContract.id); }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-600"
            >
              Supprimer
            </button>
          </div>
        </div>,
        document.body
      )}

      {/* ===== MODAL ===== */}
      {showModal && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-charcoal-950/55 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-white w-full sm:max-w-2xl max-h-[94dvh] flex flex-col sm:rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>

            {/* Modal header */}
            <div className="relative h-28 sm:h-36 flex-shrink-0 bg-charcoal-900">
              <img src="/mariage (3).jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <button onClick={() => setShowModal(false)} aria-label="Fermer" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"><X className="w-4 h-4" /></button>
              <div className="absolute bottom-4 left-6 right-6">
                <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/70">Documents</p>
                <h2 className="font-serif text-white text-2xl leading-tight" style={{ fontWeight: 400 }}>
                  {editItem ? 'Modifier le document' : 'Nouveau document'}
                </h2>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 sm:p-7 space-y-6 overflow-y-auto flex-1 overscroll-contain subtle-scroll">

              {/* Client selection */}
              {linkedClients.length > 0 && (
                <div className="border-l-2 border-rose-500 bg-[#FBF8F4] p-4">
                  <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-rose-600 mb-2">Client lié — sélectionner pour auto-remplir</label>
                  <select onChange={async e => {
                    const cl = linkedClients.find(x => x.id === e.target.value);
                    if (cl) {
                      const event = await getClientEvent(cl.id);
                      const eventDate = (event as any)?.event_date;
                      const formatted = eventDate && !isNaN(new Date(eventDate).getTime())
                        ? new Date(eventDate).toISOString().split('T')[0]
                        : '';
                      setForm(p => ({ ...p, client_name: cl.name, client_email: cl.email, client_id: cl.client_id || cl.id, event_date: formatted }));
                    }
                  }} className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 focus:outline-none focus:ring-0 focus:border-rose-500 rounded-none">
                    <option value="">— Choisir un client lié —</option>
                    {linkedClients.map(c => <option key={c.id} value={c.id}>{c.name}{c.email ? ` (${c.email})` : ''}</option>)}
                  </select>
                </div>
              )}

              {/* Infos principales */}
              <div>
                <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">Intitulé du document *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none" placeholder="Ex: Prestation photographique — Mariage Sophie & Thomas" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">Nom du client *</label>
                  <input value={form.client_name} onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                    className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none" placeholder="Sophie & Thomas" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">Email client</label>
                  <input type="email" value={form.client_email} onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                    className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none" placeholder="email@exemple.com" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">Date de l'événement</label>
                <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                  className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none" />
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">Type de document</label>
                <select value={form.documentType} onChange={e => setForm(p => ({ ...p, documentType: e.target.value as 'contract' | 'quote' | 'invoice' | 'other' }))}
                  className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none">
                  <option value="contract">Contrat</option>
                  <option value="quote">Devis</option>
                  <option value="invoice">Facture</option>
                  <option value="other">Autre</option>
                </select>
              </div>

              {/* Import PDF */}
              <div className="border border-dashed border-stone-300 p-4">
                <p className="text-sm font-semibold text-charcoal-900">Importer votre document PDF</p>
                <p className="text-xs text-charcoal-500 mt-1">Importez votre document officiel signé ou à signer.</p>
                {importedPdfUrl ? (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewUrl(importedPdfUrl)}
                      className="inline-flex items-center gap-2 h-10 px-4 border border-stone-300 text-[13px] hover:border-charcoal-900 transition-colors w-fit rounded-sm"
                    >
                      <Eye className="w-4 h-4" /> Ouvrir le PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportedPdfUrl('')}
                      className="inline-flex items-center gap-2 h-10 px-4 text-[13px] text-charcoal-500 hover:text-rose-600 transition-colors w-fit"
                    >
                      <X className="w-4 h-4" /> Retirer
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-rose-700 mt-3">Aucun PDF importé pour le moment.</p>
                )}
              </div>

              {/* Statut */}
              <div>
                <label className="block text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400">Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as keyof typeof STATUS_CFG }))}
                  className="w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none">
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex flex-wrap gap-3 px-6 sm:px-7 py-4 border-t border-stone-200 flex-shrink-0 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button onClick={() => setShowModal(false)} className="h-11 px-5 border border-stone-300 text-charcoal-700 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm">Annuler</button>
              <div className="flex-1" />
              <input
                ref={importInputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleImportPdf(f);
                  e.currentTarget.value = '';
                }}
              />
              <button
                type="button"
                onClick={() => importInputRef.current?.click()}
                className="flex items-center gap-1.5 h-11 px-4 border border-stone-300 text-charcoal-700 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm"
              >
                <Upload className="w-4 h-4" /> Importer PDF
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 h-11 px-5 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 disabled:opacity-40 transition-colors rounded-sm">
                <Save className="w-4 h-4" /> {saving ? 'Sauvegarde…' : editItem ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* PDF preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[110] bg-charcoal-900/90 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
          <button
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors rounded-xl"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <embed src={previewUrl} type="application/pdf" className="w-full h-full" />
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
