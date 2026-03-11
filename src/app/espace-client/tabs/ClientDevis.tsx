'use client';

import { useEffect, useState } from 'react';
import { FileText, Eye, CheckCircle, XCircle, ChevronRight } from 'lucide-react';
import { getClientDevis, DevisData } from '@/lib/client-helpers';
import { updateDocument } from '@/lib/db';
import Link from 'next/link';
import { toast } from 'sonner';

interface Props {
  clientId: string;
  clientEmail?: string;
}

const statusBadge: Record<string, { cls: string; label: string }> = {
  draft:    { cls: 'bg-charcoal-100 text-charcoal-600', label: 'Brouillon' },
  sent:     { cls: 'bg-charcoal-100 text-charcoal-700', label: 'Reçu' },
  accepted: { cls: 'bg-green-100 text-green-700', label: 'Accepté' },
  rejected: { cls: 'bg-rose-100 text-rose-700', label: 'Refusé' },
};

export function ClientDevis({ clientId, clientEmail }: Props) {
  const [devis, setDevis] = useState<DevisData[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    if (!clientId) return;
    getClientDevis(clientId, clientEmail)
      .then((items) => setDevis(items.filter((d) => d.status !== 'draft')))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId, clientEmail]);

  const acceptDevis = async (d: DevisData) => {
    setSavingId(d.id);
    try {
      await updateDocument('devis', d.id, { status: 'accepted', accepted_at: new Date().toISOString() });
      setDevis((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'accepted' } : x)));
      toast.success('Devis accepté');
    } catch {
      toast.error('Erreur lors de la validation');
    } finally {
      setSavingId(null);
    }
  };

  const rejectDevis = async (d: DevisData) => {
    setSavingId(d.id);
    try {
      await updateDocument('devis', d.id, { status: 'rejected', rejected_at: new Date().toISOString() });
      setDevis((prev) => prev.map((x) => (x.id === d.id ? { ...x, status: 'rejected' } : x)));
      toast.success('Devis refusé');
    } catch {
      toast.error('Erreur lors du refus');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-heading-sm text-charcoal-900 flex items-center gap-2">
          <FileText className="w-5 h-5 text-rose-500" />Devis
        </h3>
        <Link href="/espace-client/documents" className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700">
          Voir tout<ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-14 bg-charcoal-50 rounded-xl animate-pulse" />)}</div>
      ) : devis.length === 0 ? (
        <p className="text-charcoal-400 text-sm text-center py-4 italic">Aucun devis reçu.</p>
      ) : (
        <div className="space-y-2">
          {devis.slice(0, 4).map((d) => {
            const cfg = statusBadge[d.status] || statusBadge.sent;
            const canDecide = d.status === 'sent';
            return (
              <div key={d.id} className="p-3 rounded-xl bg-ivory-50 border border-charcoal-100 hover:border-rose-200 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-charcoal-900 truncate">{d.reference}</p>
                    <p className="text-xs text-charcoal-400">{String(d.date || '').trim() || '—'}</p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${cfg.cls}`}>{cfg.label}</span>
                </div>
                <div className="flex items-center justify-end gap-2">
                  {d.pdf_url && (
                    <a href={d.pdf_url} target="_blank" rel="noreferrer" className="p-1.5 hover:bg-charcoal-100 rounded-lg transition-colors">
                      <Eye className="w-3.5 h-3.5 text-charcoal-500" />
                    </a>
                  )}
                  {canDecide && (
                    <>
                      <button onClick={() => void acceptDevis(d)} disabled={savingId === d.id}
                        className="flex items-center gap-1 px-2.5 py-1 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all">
                        <CheckCircle className="w-3 h-3" />Valider
                      </button>
                      <button onClick={() => void rejectDevis(d)} disabled={savingId === d.id}
                        className="flex items-center gap-1 px-2.5 py-1 border border-rose-200 text-rose-600 text-xs font-semibold rounded-lg hover:bg-rose-50 disabled:opacity-50 transition-all">
                        <XCircle className="w-3 h-3" />Refuser
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
