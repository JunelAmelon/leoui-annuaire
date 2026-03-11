'use client';

import { useEffect, useState } from 'react';
import { Euro, CheckCircle, Clock, AlertCircle, ChevronRight } from 'lucide-react';
import { getClientPayments, PaymentData } from '@/lib/client-helpers';
import Link from 'next/link';

interface Props {
  clientId: string;
}

const statusConfig: Record<string, { cls: string; label: string; icon: React.ReactNode }> = {
  paid:      { cls: 'bg-green-100 text-green-700', label: 'Payé', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
  completed: { cls: 'bg-green-100 text-green-700', label: 'Payé', icon: <CheckCircle className="w-4 h-4 text-green-500" /> },
  pending:   { cls: 'bg-champagne-100 text-champagne-700', label: 'En attente', icon: <Clock className="w-4 h-4 text-champagne-600" /> },
  overdue:   { cls: 'bg-rose-100 text-rose-700', label: 'En retard', icon: <AlertCircle className="w-4 h-4 text-rose-500" /> },
  partial:   { cls: 'bg-charcoal-100 text-charcoal-600', label: 'Partiel', icon: <AlertCircle className="w-4 h-4 text-charcoal-400" /> },
};

export function ClientPayments({ clientId }: Props) {
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!clientId) return;
    getClientPayments(clientId)
      .then(setPayments)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [clientId]);

  return (
    <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft">
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-display text-heading-sm text-charcoal-900 flex items-center gap-2">
          <Euro className="w-5 h-5 text-rose-500" />Paiements
        </h3>
        <Link href="/espace-client/paiements" className="flex items-center gap-1 text-xs font-medium text-rose-600 hover:text-rose-700">
          Voir tout<ChevronRight className="w-3 h-3" />
        </Link>
      </div>
      {loading ? (
        <div className="space-y-2">{[1,2,3].map(i=><div key={i} className="h-12 bg-charcoal-50 rounded-xl animate-pulse" />)}</div>
      ) : payments.length === 0 ? (
        <p className="text-charcoal-400 text-sm text-center py-4 italic">Aucun paiement enregistré.</p>
      ) : (
        <div className="space-y-2">
          {payments.slice(0, 4).map((p) => {
            const cfg = statusConfig[p.status] || statusConfig.pending;
            return (
              <div key={p.id} className="flex items-center gap-3 p-3 rounded-xl bg-ivory-50 border border-charcoal-100 hover:border-rose-200 transition-colors">
                <div className="flex-shrink-0">{cfg.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-charcoal-900 truncate">{p.description}</p>
                  <p className="text-xs text-charcoal-400">{p.vendor || p.due_date || '—'}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-bold text-charcoal-900">{Number(p.amount).toLocaleString('fr-FR')}€</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>{cfg.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
