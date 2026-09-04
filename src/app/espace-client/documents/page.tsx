'use client';

import { useEffect, useMemo, useState } from 'react';
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
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Documents</h1>
        </div>
        <button onClick={() => setIsUploadOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors">
          <Upload className="w-4 h-4" />Ajouter
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {categories.map((cat) => (
          <button key={cat.id} onClick={() => setCategoryFilter(cat.id)}
            className={`group text-left p-4 rounded-2xl border transition-all shadow-soft ${
              categoryFilter === cat.id
                ? 'bg-rose-600 border-rose-600 text-white'
                : 'bg-white border-charcoal-100 hover:border-rose-200'
            }`}>
            <div className="flex items-start justify-between">
              <span className={`text-2xl font-bold leading-none ${categoryFilter === cat.id ? 'text-white' : 'text-charcoal-900'}`}>{cat.count}</span>
              {categoryFilter === cat.id && <span className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <p className={`text-sm mt-2 ${categoryFilter === cat.id ? 'text-rose-100' : 'text-charcoal-500'}`}>{cat.label}</p>
          </button>
        ))}
      </div>

      <div className="bg-white border border-charcoal-100 rounded-2xl shadow-soft overflow-hidden">
        <div className="px-5 py-4 border-b border-charcoal-100 flex items-center gap-3">
          <Search className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
          <input
            type="text" placeholder="Rechercher un document…"
            value={search} onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-0 text-sm bg-transparent focus:outline-none text-charcoal-700 placeholder:text-charcoal-400"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="bg-ivory-50 text-charcoal-500 text-xs uppercase tracking-wider">
                <th className="px-5 py-3 font-medium w-1/2">Nom</th>
                <th className="px-5 py-3 font-medium w-24">Type</th>
                <th className="px-5 py-3 font-medium w-40">Date</th>
                <th className="px-5 py-3 font-medium w-32 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal-100">
              {paginated.map((doc) => (
                <tr key={doc.id} className="hover:bg-ivory-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white border border-charcoal-100 flex items-center justify-center flex-shrink-0">
                        {getTypeIcon(doc.type)}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-charcoal-900 truncate">{doc.name}</p>
                        <p className="text-xs text-charcoal-400">{doc.uploaded_by === 'client' ? 'Vous' : 'Prestataire'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[(doc.type||'').toLowerCase()] || typeColors.autre}`}>
                      {typeLabels[(doc.type||'').toLowerCase()] || (doc.type ? doc.type.charAt(0).toUpperCase() + doc.type.slice(1) : 'Autre')}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-charcoal-600">{doc.uploaded_at || '—'}</td>
                  <td className="px-5 py-3.5 text-right">
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
                </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-12">
            <FileText className="w-10 h-10 mx-auto mb-3 text-charcoal-200" />
            <p className="text-charcoal-500 font-medium">Aucun document trouvé</p>
          </div>
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-5 py-4 border-t border-charcoal-100">
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} className="p-2 rounded-xl border border-charcoal-200 disabled:opacity-40 hover:bg-charcoal-50 transition-colors"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm text-charcoal-500">Page {page} / {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} className="p-2 rounded-xl border border-charcoal-200 disabled:opacity-40 hover:bg-charcoal-50 transition-colors"><ChevronRight className="w-4 h-4" /></button>
          </div>
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
                  <option value="planning">Planning</option>
                  <option value="photo">Photo</option>
                  <option value="autre">Autre</option>
                </select>
              </div>
              {docType === 'autre' && (
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Précisez le type</label>
                  <input type="text" value={customType} onChange={(e) => setCustomType(e.target.value)} placeholder="Ex: Note, Croquis, Devis…"
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all" />
                </div>
              )}
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

      {/* Document preview modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-[60] bg-charcoal-900/90 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <button
            className="absolute top-4 right-4 w-9 h-9 bg-white/10 flex items-center justify-center hover:bg-white/20 transition-colors rounded-xl"
            onClick={() => setPreviewDoc(null)}
          >
            <X className="w-5 h-5 text-white" />
          </button>
          <div className="w-full max-w-4xl h-[85vh] bg-white rounded-xl overflow-hidden" onClick={e => e.stopPropagation()}>
            {previewDoc.url.toLowerCase().endsWith('.pdf') ? (
              <embed src={previewDoc.url} type="application/pdf" className="w-full h-full" />
            ) : /\.(jpg|jpeg|png|gif|webp)$/i.test(previewDoc.url) ? (
              <img src={previewDoc.url} alt={previewDoc.name} className="w-full h-full object-contain" />
            ) : (
              <iframe src={previewDoc.url} className="w-full h-full" title={previewDoc.name} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
