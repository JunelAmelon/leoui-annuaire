'use client';

import { useEffect, useMemo, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, addDocument, deleteDocument } from '@/lib/db';
import { getClientDevis } from '@/lib/client-helpers';
import { uploadFile } from '@/lib/storage';
import { FileText, Search, Upload, Eye, Download, FileCheck, FilePen, File, Trash2, ChevronLeft, ChevronRight, X, CheckCircle2, XCircle, AlertCircle, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  file_url?: string;
  uploaded_at?: string;
  uploaded_by?: string;
  status?: string;
  source?: string;
}

const typeColors: Record<string, string> = {
  contrat: 'bg-rose-100 text-rose-700',
  devis: 'bg-charcoal-100 text-charcoal-700',
  facture: 'bg-green-100 text-green-700',
  planning: 'bg-champagne-100 text-champagne-700',
  photo: 'bg-charcoal-100 text-charcoal-700',
  autre: 'bg-charcoal-100 text-charcoal-600',
};

const typeLabels: Record<string, string> = {
  contrat: 'Contrat', devis: 'Devis', facture: 'Facture', planning: 'Planning', photo: 'Photo', autre: 'Autre',
};

const ITEMS_PER_PAGE = 8;

export default function DocumentsPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [docName, setDocName] = useState('');
  const [docType, setDocType] = useState('autre');
  const [uploading, setUploading] = useState(false);
  const [successOpen, setSuccessOpen] = useState(false);

  const [validating, setValidating] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const fetchDocs = async () => {
    if (!client?.id) { setLoading(false); return; }
    try {
      const [docItems, devisItems] = await Promise.all([
        getDocuments('documents', [{ field: 'client_id', operator: '==', value: client.id }]),
        getClientDevis(client.id, client.email),
      ]);
      const mapped = (docItems as any[]).map((d) => ({ ...d, source: 'documents' }));
      const devisMapped = (devisItems as any[])
        .filter((dv) => dv?.status !== 'draft')
        .map((dv) => ({
          id: `devis:${dv.id}`,
          name: `Devis - ${dv.reference || ''}`,
          type: 'devis',
          file_url: dv.pdf_url || '',
          uploaded_at: dv.sent_at || dv.date || '',
          uploaded_by: 'vendor',
          status: dv.status,
          source: 'devis',
          raw: dv,
        }));
      setDocs([...mapped, ...devisMapped]);
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  const handleValidateDevis = async (doc: DocumentItem) => {
    const devisId = (doc as any).raw?.id || doc.id.replace('devis:', '');
    setValidating(doc.id);
    try {
      const { updateDocument: upd, addDocument: add } = await import('@/lib/db');
      await upd('devis', devisId, { status: 'accepted', accepted_at: new Date().toISOString() });
      // Créer la facture automatiquement
      const raw = (doc as any).raw;
      const invoiceRef = `FAC-${Date.now().toString().slice(-6)}`;
      await add('invoices', {
        vendor_id: raw?.vendor_id || '',
        client_id: client?.id || '',
        client_name: client?.name || '',
        client_email: client?.email || '',
        devis_id: devisId,
        reference: invoiceRef,
        amount_ht: (raw?.items || []).reduce((s: number, i: any) => s + i.qty * i.unit_price, 0),
        amount_ttc: raw?.amount || 0,
        tva: raw?.tva || 0,
        items: raw?.items || [],
        status: 'pending',
        created_at: new Date().toISOString(),
        notes: `Facture générée depuis le devis ${raw?.reference}`,
      });
      toast.success('Devis accepté ✓ — Une facture a été générée');
      await fetchDocs();
    } catch { toast.error('Erreur'); } finally { setValidating(null); }
  };

  const handleRejectDevis = async (doc: DocumentItem) => {
    const devisId = (doc as any).raw?.id || doc.id.replace('devis:', '');
    setValidating(doc.id);
    try {
      const { updateDocument: upd } = await import('@/lib/db');
      await upd('devis', devisId, { status: 'rejected', rejected_at: new Date().toISOString() });
      toast.success('Devis refusé');
      await fetchDocs();
    } catch { toast.error('Erreur'); } finally { setValidating(null); }
  };

  const handleSignContract = async (doc: DocumentItem) => {
    const contractId = (doc as any).contract_id || '';
    if (!contractId) { toast.error('Contrat introuvable'); return; }
    setValidating(doc.id);
    try {
      const { updateDocument: upd } = await import('@/lib/db');
      await upd('contracts', contractId, { status: 'signed', signed_at: new Date().toISOString() });
      // Aussi mettre à jour le document
      await upd('documents', doc.id, { status: 'signed' });
      toast.success('Contrat signé ✓');
      await fetchDocs();
    } catch { toast.error('Erreur'); } finally { setValidating(null); }
  };

  useEffect(() => { if (!dataLoading) fetchDocs(); }, [client?.id, dataLoading]);

  const categories = useMemo(() => {
    const count = (t: string) => docs.filter((d) => (d.type || '').toLowerCase() === t).length;
    return [
      { id: 'all', label: 'Tous', count: docs.length },
      { id: 'contrat', label: 'Contrats', count: count('contrat') },
      { id: 'devis', label: 'Devis', count: count('devis') },
      { id: 'facture', label: 'Factures', count: count('facture') },
    ];
  }, [docs]);

  const filtered = docs.filter((d) => {
    const matchSearch = (d.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = categoryFilter === 'all' || (d.type || '').toLowerCase() === categoryFilter;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  const getTypeIcon = (type: string) => {
    switch ((type || '').toLowerCase()) {
      case 'contrat': return <FileCheck className="w-4 h-4 text-rose-500" />;
      case 'devis': return <FilePen className="w-4 h-4 text-charcoal-500" />;
      case 'facture': return <File className="w-4 h-4 text-green-500" />;
      default: return <FileText className="w-4 h-4 text-charcoal-400" />;
    }
  };

  const handleDeleteDoc = async (doc: DocumentItem, e: React.MouseEvent) => {
    e.stopPropagation();
    if (doc.source !== 'documents') { toast.error('Impossible de supprimer un devis'); return; }
    if (!confirm(`Supprimer « ${doc.name} » ?`)) return;
    try {
      await deleteDocument('documents', doc.id);
      setDocs(prev => prev.filter(d => d.id !== doc.id));
      toast.success('Document supprimé');
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const handleUpload = async () => {
    if (!client?.id || !selectedFile || !docName) { toast.error('Veuillez remplir tous les champs'); return; }
    setUploading(true);
    try {
      const fileUrl = await uploadFile(selectedFile, 'documents');
      await addDocument('documents', {
        planner_id: client.planner_id,
        client_id: client.id,
        event_id: event?.id || null,
        name: docName,
        type: docType,
        file_url: fileUrl,
        file_type: selectedFile.type,
        file_size: selectedFile.size,
        uploaded_by: 'client',
        uploaded_at: new Date().toLocaleDateString('fr-FR'),
        created_timestamp: new Date(),
      });
      toast.success('Document ajouté');
      setIsUploadOpen(false);
      setSelectedFile(null);
      setDocName('');
      await fetchDocs();
    } catch { toast.error("Erreur lors de l'upload"); }
    finally { setUploading(false); }
  };

  if (dataLoading || loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-charcoal-100 rounded-xl" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-20 bg-charcoal-100 rounded-2xl" />)}</div>
      <div className="h-64 bg-charcoal-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Documents &amp; devis</h1>
        </div>
        <button onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors">
          <Upload className="w-4 h-4" />Ajouter
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
            className={`text-left p-4 rounded-2xl border transition-all shadow-soft ${
              categoryFilter === cat.id
                ? 'bg-rose-600 border-rose-600 text-white'
                : 'bg-white border-charcoal-100 hover:border-rose-200'
            }`}>
            <p className={`text-2xl font-bold ${categoryFilter === cat.id ? 'text-white' : 'text-charcoal-900'}`}>{cat.count}</p>
            <p className={`text-sm mt-0.5 ${categoryFilter === cat.id ? 'text-rose-200' : 'text-charcoal-500'}`}>{cat.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft">
        <div className="relative mb-5">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
          <input
            type="text" placeholder="Rechercher un document…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 mx-auto mb-3 text-charcoal-200" />
            <p className="text-charcoal-500 font-medium">Aucun document trouvé</p>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {paginated.map((doc) => (
                <div key={doc.id} className="relative flex items-center gap-3 p-3.5 rounded-xl border border-charcoal-100 hover:border-rose-200 bg-ivory-50 transition-all">
                  <div className="w-9 h-9 rounded-xl bg-white border border-charcoal-100 flex items-center justify-center flex-shrink-0">
                    {getTypeIcon(doc.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-charcoal-900 truncate">{doc.name}</p>
                    <p className="text-xs text-charcoal-400">{doc.uploaded_at || '—'} • {doc.uploaded_by === 'client' ? 'Vous' : 'Prestataire'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${typeColors[(doc.type||'').toLowerCase()]||typeColors.autre}`}>
                    {typeLabels[(doc.type||'').toLowerCase()]||doc.type}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {doc.type === 'devis' && doc.status === 'accepted' && (
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Accepté
                      </span>
                    )}
                    {doc.type === 'devis' && doc.status === 'rejected' && (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-medium">
                        <XCircle className="w-3 h-3" /> Refusé
                      </span>
                    )}
                    {doc.type === 'contrat' && doc.status === 'signed' && (
                      <span className="flex items-center gap-1 text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full font-medium">
                        <CheckCircle2 className="w-3 h-3" /> Signé
                      </span>
                    )}

                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenuId((p) => p === doc.id ? null : doc.id); }}
                      className="p-2 rounded-lg hover:bg-charcoal-100 transition-colors"
                      title="Actions"
                    >
                      <MoreVertical className="w-4 h-4 text-charcoal-500" />
                    </button>

                    {openMenuId === doc.id && (
                      <div className="absolute right-3 top-12 z-30 w-56 bg-white border border-charcoal-100 rounded-xl shadow-soft overflow-hidden">
                        <div className="py-1">
                          {doc.type === 'devis' && doc.status === 'sent' && (
                            <>
                              <button
                                onClick={() => { setOpenMenuId(null); handleValidateDevis(doc); }}
                                disabled={validating === doc.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-green-50 text-green-700 disabled:opacity-50"
                              >
                                Accepter
                              </button>
                              <button
                                onClick={() => { setOpenMenuId(null); handleRejectDevis(doc); }}
                                disabled={validating === doc.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-red-50 text-red-600 disabled:opacity-50"
                              >
                                Refuser
                              </button>
                              <div className="h-px bg-charcoal-100 my-1" />
                            </>
                          )}

                          {doc.type === 'contrat' && doc.status === 'sent' && (
                            <>
                              <button
                                onClick={() => { setOpenMenuId(null); handleSignContract(doc); }}
                                disabled={validating === doc.id}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-800 disabled:opacity-50"
                              >
                                Signer
                              </button>
                              <div className="h-px bg-charcoal-100 my-1" />
                            </>
                          )}

                          {doc.file_url && (
                            <>
                              <a
                                href={doc.file_url}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpenMenuId(null)}
                                className="block px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                              >
                                Ouvrir
                              </a>
                              <a
                                href={doc.file_url}
                                download={doc.name}
                                target="_blank"
                                rel="noreferrer"
                                onClick={() => setOpenMenuId(null)}
                                className="block px-3 py-2 text-sm hover:bg-charcoal-50 text-charcoal-700"
                              >
                                Télécharger
                              </a>
                            </>
                          )}

                          {doc.source === 'documents' && doc.type !== 'devis' && (
                            <>
                              <div className="h-px bg-charcoal-100 my-1" />
                              <button
                                onClick={(e) => { setOpenMenuId(null); handleDeleteDoc(doc, e as any); }}
                                className="w-full text-left px-3 py-2 text-sm hover:bg-rose-50 text-rose-600"
                              >
                                Supprimer
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-3 mt-5">
                <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-2 rounded-xl border border-charcoal-200 disabled:opacity-40 hover:bg-charcoal-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                <span className="text-sm text-charcoal-500">Page {page} / {totalPages}</span>
                <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-2 rounded-xl border border-charcoal-200 disabled:opacity-40 hover:bg-charcoal-50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
          </>
        )}
      </div>

      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-soft-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-display text-heading-sm text-charcoal-900">Ajouter un document</h3>
              <button onClick={() => setIsUploadOpen(false)} className="p-1.5 hover:bg-charcoal-100 rounded-lg transition-colors"><X className="w-4 h-4 text-charcoal-500" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Nom du document</label>
                <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Ex: Contrat photographe"
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Type</label>
                <select value={docType} onChange={(e) => setDocType(e.target.value)}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all">
                  <option value="contrat">Contrat</option>
                  <option value="facture">Facture</option>
                  <option value="planning">Planning</option>
                  <option value="photo">Photo</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Fichier</label>
                <input type="file" onChange={(e) => { const f = e.target.files?.[0]||null; setSelectedFile(f); if (f&&!docName) setDocName(f.name.replace(/\.[^/.]+$/, '')); }}
                  className="w-full text-sm text-charcoal-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-charcoal-100 file:text-charcoal-700 file:text-sm file:font-medium hover:file:bg-charcoal-200 transition-all" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setIsUploadOpen(false)}
                className="flex-1 py-2.5 border border-charcoal-200 text-charcoal-700 text-sm font-medium rounded-xl hover:bg-charcoal-50 transition-colors">Annuler</button>
              <button onClick={handleUpload} disabled={uploading||!selectedFile||!docName}
                className="flex-1 py-2.5 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-all">
                {uploading ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
