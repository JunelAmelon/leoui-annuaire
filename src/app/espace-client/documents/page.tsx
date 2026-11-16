'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, addDocument, deleteDocument } from '@/lib/db';
import { uploadFile } from '@/lib/storage';
import { FileText, Search, Upload, FileCheck, Trash2, ChevronLeft, ChevronRight, X, Eye, Download as DownloadIcon } from 'lucide-react';
import { TableActionsMenu } from '@/components/TableActionsMenu';
import { toast } from 'sonner';

interface DocumentItem {
  id: string;
  name: string;
  type: string;
  file_url?: string;
  uploaded_at?: string;
  uploaded_by?: string;
  source?: string;
}

const typeColors: Record<string, string> = {
  contrat: 'bg-rose-100 text-rose-700',
  planning: 'bg-champagne-100 text-champagne-700',
  photo: 'bg-charcoal-100 text-charcoal-700',
  autre: 'bg-charcoal-100 text-charcoal-600',
};

const typeLabels: Record<string, string> = {
  contrat: 'Contrat', planning: 'Planning', photo: 'Photo', autre: 'Autre',
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
  const [customType, setCustomType] = useState('');
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string } | null>(null);

  const fetchDocs = async () => {
    if (!client?.id) { setLoading(false); return; }
    try {
      const docItems = await getDocuments('documents', [{ field: 'client_id', operator: '==', value: client.id }]);
      setDocs((docItems as any[]).map((d) => ({ ...d, source: 'documents' })));
    } catch { toast.error('Erreur lors du chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!dataLoading) fetchDocs(); }, [client?.id, dataLoading]);

  const categories = useMemo(() => {
    const count = (filter: (t: string) => boolean) => docs.filter((d) => filter((d.type || '').toLowerCase())).length;
    return [
      { id: 'all', label: 'Tous', count: docs.length, filter: () => true },
      { id: 'contrat', label: 'Contrats', count: count((t) => t === 'contrat'), filter: (t: string) => t === 'contrat' },
      { id: 'planning', label: 'Planning', count: count((t) => t === 'planning'), filter: (t: string) => t === 'planning' },
      { id: 'autre', label: 'Autres', count: count((t) => !['contrat', 'planning'].includes(t)), filter: (t: string) => !['contrat', 'planning'].includes(t) },
    ];
  }, [docs]);

  const activeCategory = categories.find((c) => c.id === categoryFilter);

  const filtered = docs.filter((d) => {
    const matchSearch = (d.name || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory ? activeCategory.filter((d.type || '').toLowerCase()) : true;
    return matchSearch && matchCat;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  useEffect(() => { setPage(1); }, [search, categoryFilter]);

  const getTypeIcon = (type: string) => {
    switch ((type || '').toLowerCase()) {
      case 'contrat': return <FileCheck className="w-4 h-4 text-rose-500" />;
      default: return <FileText className="w-4 h-4 text-charcoal-400" />;
    }
  };

  const handleDeleteDoc = async (doc: DocumentItem, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (doc.source !== 'documents') { toast.error('Impossible de supprimer ce document'); return; }
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
        type: docType === 'autre' ? (customType.trim() || 'autre') : docType,
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
    <div className="w-full bg-white border border-stone-200 p-6 sm:p-10 space-y-5 animate-pulse">
      <div className="h-12 w-56 bg-stone-200/70" />
      {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 bg-stone-200/50" />)}
    </div>
  );

  const extOf = (d: DocumentItem) => {
    const m = (d.file_url || d.name || '').split('?')[0].match(/\.([a-zA-Z0-9]{2,4})$/);
    return (m ? m[1] : 'doc').toUpperCase();
  };
  const typeLabel = (t?: string) => typeLabels[(t || '').toLowerCase()] || (t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Autre');

  const fieldCls = 'w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2.5 text-[15px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none';
  const labelCls = 'text-[10px] font-semibold tracking-[0.18em] uppercase text-charcoal-400';

  return (
    <div className="w-full pb-10">
      <div className="bg-white border border-stone-200 shadow-[0_1px_3px_rgba(60,40,30,0.05)] px-5 sm:px-9 lg:px-12 pt-8 sm:pt-11 pb-8 min-h-[calc(100dvh-9rem)]">
      {/* ── En-tête ── */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-5 pb-7 border-b border-charcoal-200/70">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-rose-600">Espace client</p>
          <h1 className="font-serif text-charcoal-900 mt-3 leading-none" style={{ fontSize: 'clamp(2.1rem, 4.4vw, 3.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>Documents</h1>
          <p className="text-sm text-charcoal-500 mt-3">
            {docs.length === 0 ? 'Contrats, devis et plannings — tout au même endroit.' : `${docs.length} document${docs.length > 1 ? 's' : ''} classé${docs.length > 1 ? 's' : ''}`}
          </p>
        </div>
        <button onClick={() => setIsUploadOpen(true)}
          className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 transition-colors rounded-sm self-start sm:self-auto">
          <Upload className="w-4 h-4" /> Ajouter un document
        </button>
      </header>

      {/* ── Rubriques + recherche ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 py-4 border-b border-charcoal-100">
        <nav className="flex gap-x-7 gap-y-1 flex-wrap" aria-label="Rubriques">
          {categories.map((cat) => (
            <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
              className={`pb-1.5 text-[13px] border-b-2 transition-colors ${
                categoryFilter === cat.id ? 'border-rose-600 text-charcoal-900 font-medium' : 'border-transparent text-charcoal-400 hover:text-charcoal-800'
              }`}>
              {cat.label} <span className="text-charcoal-300 tabular-nums ml-0.5">{cat.count}</span>
            </button>
          ))}
        </nav>
        <div className="relative md:w-72">
          <Search className="absolute left-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400" />
          <input type="text" placeholder="Rechercher" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-6 py-2 bg-transparent border-b border-stone-300 text-sm placeholder:text-charcoal-300 focus:outline-none focus:border-rose-500 transition-colors" />
        </div>
      </div>

      {/* ── Liste ── */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center">
          <p className="font-serif italic text-charcoal-500 text-2xl" style={{ fontWeight: 400 }}>
            {docs.length === 0 ? 'Aucun document pour l’instant' : 'Aucun résultat'}
          </p>
          <p className="text-sm text-charcoal-400 mt-2">{docs.length === 0 ? 'Ajoutez votre premier contrat ou devis.' : 'Essayez une autre rubrique ou un autre mot.'}</p>
        </div>
      ) : (
        <ul>
          {paginated.map((doc) => (
            <li key={doc.id} className="group grid grid-cols-[3rem_1fr_auto] sm:grid-cols-[4rem_1fr_9rem_auto] items-center gap-x-4 sm:gap-x-6 py-5 border-b border-charcoal-100 hover:bg-[#FBF8F4] -mx-3 px-3 transition-colors">
              <span className="font-serif text-charcoal-300 text-xl sm:text-2xl leading-none tracking-wide group-hover:text-rose-500 transition-colors">{extOf(doc)}</span>
              <div className="min-w-0">
                <button type="button" disabled={!doc.file_url} onClick={() => doc.file_url && setPreviewDoc({ url: doc.file_url, name: doc.name })}
                  className="text-left font-serif text-charcoal-900 text-[1.15rem] leading-snug truncate max-w-full hover:text-rose-700 transition-colors" style={{ fontWeight: 500 }}>
                  {doc.name}
                </button>
                <p className="text-[10px] font-semibold tracking-[0.16em] uppercase text-charcoal-400 mt-1">
                  {typeLabel(doc.type)} · {doc.uploaded_by === 'client' ? 'Ajouté par vous' : 'Prestataire'}
                  <span className="sm:hidden normal-case tracking-normal font-normal"> · {doc.uploaded_at || ''}</span>
                </p>
              </div>
              <span className="hidden sm:block text-[13px] text-charcoal-500 tabular-nums">{doc.uploaded_at || '—'}</span>
              <TableActionsMenu
                items={[
                  { label: 'Ouvrir', icon: Eye, hidden: !doc.file_url, onClick: () => setPreviewDoc({ url: doc.file_url || '', name: doc.name }) },
                  { label: 'Télécharger', icon: DownloadIcon, hidden: !doc.file_url, onClick: () => {
                    if (!doc.file_url) return;
                    const a = document.createElement('a');
                    a.href = doc.file_url;
                    a.download = doc.name;
                    a.click();
                  } },
                  { label: 'Supprimer', icon: Trash2, danger: true, hidden: doc.source !== 'documents', onClick: () => handleDeleteDoc(doc) },
                ]}
              />
            </li>
          ))}
        </ul>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
            className="inline-flex items-center gap-1.5 text-[13px] text-charcoal-700 disabled:opacity-30 hover:text-rose-600 transition-colors"><ChevronLeft className="w-4 h-4" /> Précédent</button>
          <span className="text-xs text-charcoal-400 tabular-nums">{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
            className="inline-flex items-center gap-1.5 text-[13px] text-charcoal-700 disabled:opacity-30 hover:text-rose-600 transition-colors">Suivant <ChevronRight className="w-4 h-4" /></button>
        </div>
      )}

      </div>

      {/* ── Ajout d'un document (portail : le fond couvre toute la fenêtre) ── */}
      {isUploadOpen && createPortal(
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-charcoal-950/55 backdrop-blur-sm" onClick={() => setIsUploadOpen(false)}>
          <div className="bg-white w-full sm:max-w-lg max-h-[94dvh] flex flex-col sm:rounded-2xl overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="relative h-28 sm:h-36 flex-shrink-0 bg-charcoal-900">
              <img src="/mariage (3).jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <button onClick={() => setIsUploadOpen(false)} aria-label="Fermer" className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 text-white flex items-center justify-center hover:bg-black/60"><X className="w-4 h-4" /></button>
              <div className="absolute bottom-4 left-6 right-6">
                <p className="text-[10px] font-semibold tracking-[0.22em] uppercase text-white/70">Documents</p>
                <h3 className="font-serif text-white text-2xl leading-tight" style={{ fontWeight: 400 }}>Ajouter un document</h3>
              </div>
            </div>
            <div className="p-6 sm:p-7 space-y-6 overflow-y-auto flex-1 overscroll-contain subtle-scroll">
              <label className="block">
                <span className={labelCls}>Nom du document</span>
                <input type="text" value={docName} onChange={(e) => setDocName(e.target.value)} placeholder="Ex : Contrat photographe" className={fieldCls} />
              </label>
              <label className="block">
                <span className={labelCls}>Rubrique</span>
                <select value={docType} onChange={(e) => setDocType(e.target.value)} className={fieldCls}>
                  <option value="contrat">Contrat</option>
                  <option value="planning">Planning</option>
                  <option value="photo">Photo</option>
                  <option value="autre">Autre</option>
                </select>
              </label>
              {docType === 'autre' && (
                <label className="block">
                  <span className={labelCls}>Précisez</span>
                  <input type="text" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Ex : Devis, croquis, note…" className={fieldCls} />
                </label>
              )}
              <label className="block cursor-pointer">
                <span className={labelCls}>Fichier</span>
                <div className={`mt-2 border border-dashed px-4 py-6 text-center transition-colors ${selectedFile ? 'border-rose-400 bg-rose-50/30' : 'border-stone-300 hover:border-rose-400'}`}>
                  <Upload className="w-5 h-5 mx-auto text-charcoal-400" />
                  <p className="text-sm text-charcoal-700 mt-2 break-all">{selectedFile ? selectedFile.name : 'Touchez pour choisir un fichier'}</p>
                  {!selectedFile && <p className="text-[11px] text-charcoal-400 mt-1">PDF, image ou document</p>}
                </div>
                <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0] || null; setSelectedFile(f); if (f && !docName) setDocName(f.name.replace(/\.[^/.]+$/, '')); }} />
              </label>
            </div>
            <div className="px-6 sm:px-7 py-4 border-t border-stone-200 flex gap-3 pb-[max(1rem,env(safe-area-inset-bottom))]">
              <button onClick={() => setIsUploadOpen(false)} className="flex-1 h-11 border border-stone-300 text-charcoal-700 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm">Annuler</button>
              <button onClick={handleUpload} disabled={uploading || !selectedFile || !docName}
                className="flex-1 h-11 bg-charcoal-900 text-white text-[13px] font-medium hover:bg-rose-600 disabled:opacity-35 disabled:hover:bg-charcoal-900 transition-colors rounded-sm">
                {uploading ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ── Aperçu ── */}
      {previewDoc && createPortal(
        <div className="fixed inset-0 z-[110] bg-charcoal-950/90 flex items-center justify-center p-3 sm:p-6" onClick={() => setPreviewDoc(null)}>
          <button aria-label="Fermer" className="absolute top-4 right-4 w-10 h-10 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors rounded-full" onClick={() => setPreviewDoc(null)}>
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="w-full max-w-4xl h-[88dvh] bg-white overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
              <embed src={previewDoc.url} type="application/pdf" className="w-full h-full" />
            ) : /\.(jpg|jpeg|png|gif|webp)$/i.test(previewDoc.url) ? (
              <img src={previewDoc.url} alt={previewDoc.name} className="w-full h-full object-contain" />
            ) : (
              <iframe src={previewDoc.url} className="w-full h-full" title={previewDoc.name} />
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
