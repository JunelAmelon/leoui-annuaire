'use client';

import { useEffect, useState } from 'react';
import { FileText, Eye, ChevronRight } from 'lucide-react';
import { getClientDocuments } from '@/lib/client-helpers';
import Link from 'next/link';

interface Props {
  clientId: string;
}

const typeColors: Record<string, string> = {
  contrat: 'bg-rose-100 text-rose-700',
  devis: 'bg-charcoal-100 text-charcoal-700',
  facture: 'bg-green-100 text-green-700',
  planning: 'bg-champagne-100 text-champagne-700',
  autre: 'bg-charcoal-100 text-charcoal-600',
};

export function ClientDocuments({ clientId }: Props) {
  const [docs, setDocs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    getClientDocuments(clientId)
      .then(setDocs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-heading-sm text-charcoal-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-rose-500" />Documents
        </h3>
        <Link href="/espace-client/documents" className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700">
          Voir tout<ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-12 bg-charcoal-50 rounded-xl animate-pulse" />)}</div>
      ) : docs.length === 0 ? (
        <p className="text-charcoal-400 text-sm text-center py-4 italic">Aucun document pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {docs.slice(0, 4).map((doc) => (
            <div key={doc.id} className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50 border border-charcoal-100 hover:border-rose-200 transition-colors">
              <FileText className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-charcoal-900 truncate">{doc.name}</p>
                <p className="text-xs text-charcoal-400">{doc.uploaded_at || '—'}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColors[(doc.type || '').toLowerCase()] || typeColors.autre}`}>{doc.type || 'autre'}</span>
              {doc.file_url && (
                <a href={doc.file_url} target="_blank" rel="noreferrer" className="p-1 hover:bg-charcoal-100 rounded-lg transition-colors">
                  <Eye className="w-4 h-4 text-charcoal-500" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
