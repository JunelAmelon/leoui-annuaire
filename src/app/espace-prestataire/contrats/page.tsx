'use client';

import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { FileCheck2, Plus, Search, Download, Eye, Send, Edit, CheckCircle, XCircle, X, Trash2, MoreVertical, Save, Upload, Clock } from 'lucide-react';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
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
    event_date: '', status: 'draft' as keyof typeof STATUS_CFG
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
        amount: d.amount || 0, status: d.status || 'draft',
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
    setForm({ title: '', client_name: '', client_email: '', client_id: '', event_date: '', status: 'draft' });
    setImportedPdfUrl('');
    setShowModal(true);
  };

  const openEdit = (c: Contract) => {
    setEditItem(c);
    setForm({
      title: c.title, client_name: c.client_name, client_email: c.client_email,
      client_id: c.client_id || '', event_date: c.event_date || '', status: c.status
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
        const msgContent = `📄 Contrat envoyé : ${c.title}\nRéf. ${c.reference}\n${file_url ? `Voir le contrat : ${file_url}` : 'Disponible dans vos documents.'}`;
        await addDocument('messages', {
          conversation_id: convId,
          sender_id: user.uid,
          sender_role: 'vendor',
          sender_name: vendorName,
          content: msgContent,
          created_at: new Date().toISOString(),
          type: 'document',
          file_url,
          document_type: 'contrat',
          contract_id: c.id,
        } as any);
        await updateDocument('conversations', convId, {
          last_message: `Contrat envoyé : ${c.title}`,
          last_message_at: new Date().toISOString(),
          unread_count_client: 1,
          updated_at: new Date().toISOString(),
        });
      }

      if (resolvedClientId) {
        resolveClientRecipientId(resolvedClientId)
          .then((recipientId) => createNotification({
            recipientId,
            type: 'contrat',
            title: 'Contrat reçu',
            message: `${vendorName} vous a envoyé le contrat ${c.reference}. À consulter.`,
            link: '/espace-client/documents',
          }))
          .catch(() => {});
      }
      // Email au client (on a toujours c.client_email ici)
      sendEmail({
        to: c.client_email,
        subject: `${vendorName} vous a envoyé un contrat`,
        html: renderContractEmail({ clientName: c.client_name || '', vendorName, contractName: c.title || c.reference }),
      });
      await updateDocument('contracts', c.id, { status: 'sent', pdf_url: file_url });
      toast.success(resolvedClientId ? `Contrat envoyé et visible dans les documents du client` : `Contrat envoyé — email non trouvé dans la base`, { duration: 4000 });
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
      <div className="max-w-5xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Contrats</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Importez votre propre contrat PDF pour le partager avec un client.</p>
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
            <p className="text-sm text-charcoal-400">{search ? 'Essayez d\'autres mots-clés' : 'Importez votre premier contrat PDF'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto bg-white rounded-2xl shadow-sm border border-charcoal-100">
            <table className="w-full min-w-[768px] text-left text-sm">
              <thead>
                <tr className="bg-ivory-50 text-charcoal-500 text-xs uppercase tracking-wider">
                  <th className="px-4 py-3 font-medium w-28">Référence</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Titre</th>
                  <th className="px-4 py-3 font-medium w-32">Événement</th>
                  <th className="px-4 py-3 font-medium w-28">Statut</th>
                  <th className="px-4 py-3 font-medium w-24 text-center">PDF</th>
                  <th className="px-4 py-3 font-medium w-40 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-100">
                {filtered.map(c => {
                  const cfg = STATUS_CFG[c.status] || STATUS_CFG.draft;
                  const Icon = cfg.icon;
                  const isSending = sending === c.id;
                  return (
                    <tr key={c.id} className="hover:bg-ivory-50/60 transition-colors">
                      <td className="px-4 py-3 text-charcoal-600 font-mono text-xs">{c.reference}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-charcoal-900">{c.client_name}</p>
                        {c.client_email && <p className="text-xs text-charcoal-500">{c.client_email}</p>}
                      </td>
                      <td className="px-4 py-3 text-charcoal-900 font-medium truncate max-w-[200px]">{c.title}</td>
                      <td className="px-4 py-3 text-charcoal-600 text-xs">
                        {c.event_date ? new Date(c.event_date).toLocaleDateString('fr-FR') : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                          <Icon className="w-3 h-3" />{cfg.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {c.pdf_url ? (
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Oui</span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-charcoal-500 bg-charcoal-100 px-2 py-0.5 rounded-full">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
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
                          className="p-2 rounded-lg hover:bg-charcoal-50 transition-colors"
                          title="Actions"
                        >
                          <MoreVertical className="w-4 h-4 text-charcoal-600" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {typeof document !== 'undefined' && menuContract && menuPos && createPortal(
        <div
          style={{ bottom: menuPos.bottom, left: menuPos.left, maxHeight: menuPos.maxHeight }}
          className="fixed z-[60] w-56 bg-white border border-charcoal-100 rounded-xl shadow-soft overflow-y-auto flex flex-col"
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
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] flex flex-col overflow-hidden">

            {/* Modal header */}
            <div className="relative h-36 flex-shrink-0">
              <img src="/mariage (3).jpg" alt="Contrat" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <button onClick={() => setShowModal(false)} className="absolute top-3 right-3 p-1.5 rounded-lg bg-white/90 hover:bg-white text-charcoal-500 transition-colors"><X className="w-4 h-4" /></button>
              <div className="absolute bottom-3 left-6 right-6">
                <h2 className="font-serif text-white text-xl" style={{ fontWeight: 400 }}>
                  {editItem ? 'Modifier le contrat' : 'Nouveau contrat'}
                </h2>
              </div>
            </div>

            {/* Modal body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">

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
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date de l'événement</label>
                <input type="date" value={form.event_date} onChange={e => setForm(p => ({ ...p, event_date: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400" />
              </div>

              {/* Import PDF */}
              <div className="bg-ivory-50 border border-charcoal-100 rounded-xl p-4">
                <p className="text-sm font-semibold text-charcoal-900">Importer votre contrat PDF</p>
                <p className="text-xs text-charcoal-500 mt-1">Importez votre document officiel signé ou à signer.</p>
                {importedPdfUrl ? (
                  <div className="mt-3 flex flex-col sm:flex-row sm:items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPreviewUrl(importedPdfUrl)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-charcoal-200 rounded-xl text-sm hover:bg-charcoal-50 transition-colors w-fit"
                    >
                      <Eye className="w-4 h-4" /> Ouvrir le PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportedPdfUrl('')}
                      className="inline-flex items-center gap-2 px-4 py-2 border border-charcoal-200 rounded-xl text-sm hover:bg-stone-100 transition-colors w-fit"
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
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Statut</label>
                <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value as keyof typeof STATUS_CFG }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400">
                  {Object.entries(STATUS_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </div>
            </div>

            {/* Modal footer */}
            <div className="flex gap-3 px-6 py-4 border-t border-stone-100 bg-stone-50 rounded-b-2xl flex-shrink-0">
              <button onClick={() => setShowModal(false)} className="px-4 py-2.5 border border-charcoal-200 text-charcoal-600 rounded-xl text-sm hover:bg-stone-50 transition-colors">Annuler</button>
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
                className="flex items-center gap-1.5 px-4 py-2.5 border border-charcoal-300 text-charcoal-700 rounded-xl text-sm hover:bg-stone-100 transition-colors"
              >
                <Upload className="w-4 h-4" /> Importer PDF
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-1.5 px-5 py-2.5 bg-rose-700 text-white rounded-xl text-sm font-semibold hover:bg-rose-600 disabled:opacity-50 transition-colors">
                <Save className="w-4 h-4" /> {saving ? 'Sauvegarde…' : editItem ? 'Mettre à jour' : 'Sauvegarder'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF preview modal */}
      {previewUrl && (
        <div className="fixed inset-0 z-[60] bg-charcoal-900/90 flex items-center justify-center p-4" onClick={() => setPreviewUrl(null)}>
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
