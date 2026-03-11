'use client';

import { useEffect, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { getClientPayments, getClientBudgetSummary, PaymentData } from '@/lib/client-helpers';
import { addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import {
  Euro, CheckCircle, Clock, AlertCircle, Plus, X, Trash2, PenLine,
  ChevronLeft, ChevronRight, Calculator,
} from 'lucide-react';

const CATEGORIES = [
  { label: 'Photographe',  color: '#A68540' },
  { label: 'Vidéaste',     color: '#BE6040' },
  { label: 'Traiteur',     color: '#7D6E60' },
  { label: 'Fleuriste',    color: '#8B9E60' },
  { label: 'Musique / DJ', color: '#6080A6' },
  { label: 'Décoration',   color: '#A06090' },
  { label: 'Lieu',         color: '#A06050' },
  { label: 'Robe / Costume', color: '#608090' },
  { label: 'Autre',        color: '#909090' },
];

interface BudgetLine { id: string; label: string; category: string; budgeted: number; paid: number; }

const PER_PAGE = 8;

export default function PaiementsPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [payments, setPayments] = useState<PaymentData[]>([]);
  const [summary, setSummary] = useState({ total: 0, paid: 0, pending: 0, remaining: 0 });
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [editingPaid, setEditingPaid] = useState<string | null>(null);
  const [editPaidValue, setEditPaidValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: '', category: 'Photographe', budgeted: '', paid: '' });

  useEffect(() => {
    if (!dataLoading && client?.id) {
      Promise.all([
        getClientPayments(client.id),
        getClientBudgetSummary(client.id),
      ]).then(([p, s]) => {
        setPayments(p);
        setSummary(s);
        if (p.length > 0) {
          setBudgetLines(p.map((pay: any) => ({
            id: pay.id,
            label: pay.description || pay.vendor || 'Paiement',
            category: pay.category || 'Autre',
            budgeted: Number(pay.amount) || 0,
            paid: pay.status === 'paid' || pay.status === 'completed' ? Number(pay.amount) : 0,
          })));
        }
      }).catch(console.error).finally(() => setLoading(false));
    } else if (!dataLoading) {
      setLoading(false);
    }
  }, [client?.id, dataLoading]);

  const totalBudgeted = budgetLines.reduce((s, l) => s + l.budgeted, 0);
  const totalPaid = budgetLines.reduce((s, l) => s + l.paid, 0);
  const progress = totalBudgeted > 0 ? (totalPaid / totalBudgeted) * 100 : 0;

  const sorted = payments.slice().sort((a, b) => {
    const da = (a.created_at as any)?.toDate?.()?.getTime?.() || 0;
    const db = (b.created_at as any)?.toDate?.()?.getTime?.() || 0;
    return db - da;
  });
  const upcoming = sorted.filter(p => p.status !== 'paid' && p.status !== 'completed');
  const historyPages = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const historyPaged = sorted.slice((historyPage - 1) * PER_PAGE, historyPage * PER_PAGE);

  const getStatusCls = (status: string) => {
    switch (status) {
      case 'paid': case 'completed': return 'bg-green-50 text-green-700 border border-green-200';
      case 'pending': return 'bg-champagne-50 text-champagne-700 border border-champagne-200';
      case 'overdue':  return 'bg-rose-50 text-rose-700 border border-rose-200';
      default: return 'bg-charcoal-50 text-charcoal-600 border border-charcoal-200';
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': case 'completed': return 'Payé';
      case 'pending': return 'En attente';
      case 'overdue':  return 'En retard';
      case 'partial':  return 'Partiel';
      default: return status;
    }
  };

  const handleAddLine = async () => {
    if (!form.label.trim()) { toast.error('Description requise'); return; }
    if (!client?.id) { toast.error('Données client manquantes'); return; }
    setSaving(true);
    try {
      const budgeted = Number(form.budgeted) || 0;
      const paid = Number(form.paid) || 0;
      const status = paid >= budgeted && budgeted > 0 ? 'paid' : paid > 0 ? 'partial' : 'pending';
      const ref = await addDocument('payments', {
        client_id: client.id, event_id: event?.id || null,
        description: form.label, category: form.category,
        amount: budgeted, amount_paid: paid, status,
        created_at: new Date().toISOString(),
      });
      const newLine: BudgetLine = { id: ref.id, label: form.label, category: form.category, budgeted, paid };
      setBudgetLines(prev => [...prev, newLine]);
      toast.success('Ligne ajoutée');
      setShowAddModal(false);
      setForm({ label: '', category: 'Photographe', budgeted: '', paid: '' });
    } catch { toast.error('Erreur lors de l\'ajout'); }
    finally { setSaving(false); }
  };

  const handleDeleteLine = async (line: BudgetLine, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer « ${line.label} » ?`)) return;
    try {
      await deleteDocument('payments', line.id);
      setBudgetLines(prev => prev.filter(l => l.id !== line.id));
      toast.success('Ligne supprimée');
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const handleMarkPaid = async (line: BudgetLine, e: React.MouseEvent) => {
    e.stopPropagation();
    if (line.paid >= line.budgeted && line.budgeted > 0) return;
    try {
      await updateDocument('payments', line.id, { amount_paid: line.budgeted, status: 'paid' });
      setBudgetLines(prev => prev.map(l => l.id === line.id ? { ...l, paid: l.budgeted } : l));
      toast.success('Marqué comme payé');
    } catch { toast.error('Erreur'); }
  };

  const handleSavePaidEdit = async (line: BudgetLine) => {
    const val = Number(editPaidValue);
    if (isNaN(val) || val < 0) { toast.error('Montant invalide'); return; }
    try {
      const status = val >= line.budgeted && line.budgeted > 0 ? 'paid' : val > 0 ? 'partial' : 'pending';
      await updateDocument('payments', line.id, { amount_paid: val, status });
      setBudgetLines(prev => prev.map(l => l.id === line.id ? { ...l, paid: val } : l));
      toast.success('Montant mis à jour');
    } catch { toast.error('Erreur'); }
    finally { setEditingPaid(null); setEditPaidValue(''); }
  };

  if (dataLoading || loading) return (
    <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
      <div className="h-7 w-36 bg-charcoal-100" />
      <div className="grid grid-cols-4 gap-px h-24 bg-charcoal-100" />
      <div className="h-2 bg-charcoal-100" />
      <div className="h-64 bg-charcoal-100" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Budget &amp; paiements</h1>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Ajouter une dépense
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-charcoal-100 border border-charcoal-100">
        {[
          { label: 'Budget total',  value: totalBudgeted },
          { label: 'Déjà payé',     value: totalPaid },
          { label: 'Reste à payer', value: totalBudgeted - totalPaid },
          { label: 'À venir',       value: upcoming.length, suffix: ' échéances' },
        ].map(({ label, value, suffix }) => (
          <div key={label} className="bg-white px-4 sm:px-6 py-5">
            <p className="label-xs text-charcoal-400 mb-2 tracking-[0.1em]">{label}</p>
            <p className="font-serif text-charcoal-900" style={{ fontSize: '1.75rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em' }}>
              {suffix ? value : `${value.toLocaleString('fr-FR')} €`}
              {suffix && <span className="text-sm text-charcoal-400 ml-1 font-light">{suffix}</span>}
            </p>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="bg-white border border-charcoal-100 px-6 py-5">
        <div className="flex items-end justify-between mb-3">
          <p className="font-serif text-charcoal-900 text-sm font-light">Avancement des paiements</p>
          <p className="font-serif text-charcoal-900" style={{ fontSize: '1.5rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em' }}>
            {progress.toFixed(0)}<span className="text-sm text-charcoal-400 ml-0.5">%</span>
          </p>
        </div>
        <div className="w-full h-0.5 bg-charcoal-100">
          <div className="h-full bg-charcoal-900 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <div className="flex justify-between mt-2">
          <p className="label-xs text-charcoal-400">0 €</p>
          <p className="label-xs text-charcoal-400">{totalBudgeted.toLocaleString('fr-FR')} €</p>
        </div>
      </div>

      {/* Budget breakdown */}
      <div className="bg-white border border-charcoal-100">
        <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100">
          <h2 className="font-serif text-charcoal-900 text-base font-light flex items-center gap-2">
            <Calculator className="w-4 h-4 text-charcoal-400" /> Détail par poste
          </h2>
        </div>
        {budgetLines.length === 0 ? (
          <div className="py-12 text-center">
            <p className="font-serif text-charcoal-400 text-base font-light">Aucune dépense enregistrée</p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-100">
            {budgetLines.map((line) => {
              const catColor = CATEGORIES.find(c => c.label === line.category)?.color || '#909090';
              const pct = line.budgeted > 0 ? Math.min(100, (line.paid / line.budgeted) * 100) : 0;
              return (
                <div key={line.id} className="group px-6 py-4 hover:bg-ivory-50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-2.5 h-2.5 mt-1.5 flex-shrink-0 rounded-full" style={{ backgroundColor: catColor }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-4 mb-1">
                        <div>
                          <p className="text-sm font-light text-charcoal-900">{line.label}</p>
                          <p className="label-xs text-charcoal-400 mt-0.5">{line.category}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          {editingPaid === line.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number" value={editPaidValue}
                                onChange={e => setEditPaidValue(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSavePaidEdit(line); if (e.key === 'Escape') { setEditingPaid(null); } }}
                                className="w-20 px-2 py-1 border border-charcoal-300 text-xs text-right focus:outline-none focus:border-charcoal-500"
                                autoFocus
                              />
                              <button onClick={() => handleSavePaidEdit(line)} className="p-1 text-green-600 hover:text-green-700"><CheckCircle className="w-3.5 h-3.5" /></button>
                              <button onClick={() => setEditingPaid(null)} className="p-1 text-charcoal-400 hover:text-charcoal-600"><X className="w-3.5 h-3.5" /></button>
                            </div>
                          ) : (
                            <p className="text-sm font-light text-charcoal-900">
                              <span className="text-champagne-700">{line.paid.toLocaleString('fr-FR')} €</span>
                              <span className="text-charcoal-400"> / {line.budgeted.toLocaleString('fr-FR')} €</span>
                            </p>
                          )}
                          <p className="label-xs text-charcoal-400 mt-0.5">{pct.toFixed(0)}% payé</p>
                        </div>
                      </div>
                      {/* Thin progress bar */}
                      <div className="h-px bg-charcoal-100 mt-2">
                        <div className="h-full transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: catColor }} />
                      </div>
                      {/* Row actions — visible on hover */}
                      <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        {line.paid < line.budgeted && (
                          <button onClick={e => handleMarkPaid(line, e)}
                            className="flex items-center gap-1 px-2 py-1 text-[0.65rem] font-medium bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors">
                            <CheckCircle className="w-3 h-3" /> Marquer payé
                          </button>
                        )}
                        <button onClick={() => { setEditingPaid(line.id); setEditPaidValue(String(line.paid)); }}
                          className="flex items-center gap-1 px-2 py-1 text-[0.65rem] font-medium bg-charcoal-50 text-charcoal-600 border border-charcoal-200 hover:bg-charcoal-100 transition-colors">
                          <PenLine className="w-3 h-3" /> Modifier payé
                        </button>
                        <button onClick={e => handleDeleteLine(line, e)}
                          className="flex items-center gap-1 px-2 py-1 text-[0.65rem] font-medium bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 transition-colors">
                          <Trash2 className="w-3 h-3" /> Supprimer
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {/* Category summary */}
        <div className="px-6 py-4 border-t border-charcoal-100 bg-ivory-50 flex items-center justify-between">
          <p className="label-xs text-charcoal-500 tracking-[0.08em]">Total budgété</p>
          <p className="font-serif text-charcoal-900" style={{ fontSize: '1.25rem', fontWeight: 300, letterSpacing: '-0.01em' }}>
            {totalBudgeted.toLocaleString('fr-FR')} €
          </p>
        </div>
      </div>

      {/* Upcoming payments */}
      {upcoming.length > 0 && (
        <div className="bg-white border border-charcoal-100">
          <div className="px-6 py-4 border-b border-charcoal-100">
            <h2 className="font-serif text-charcoal-900 text-base font-light flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-champagne-600" /> Prochains paiements
            </h2>
          </div>
          <div className="divide-y divide-charcoal-100">
            {upcoming.slice(0, 5).map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-3.5">
                <Clock className="w-3.5 h-3.5 text-charcoal-300 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-light text-charcoal-900 truncate">{p.description}</p>
                  <p className="label-xs text-charcoal-400 mt-0.5">{p.vendor || '—'}{p.due_date ? ` · Échéance ${new Date(p.due_date).toLocaleDateString('fr-FR')}` : ''}</p>
                </div>
                <p className="font-serif text-charcoal-900 flex-shrink-0" style={{ fontWeight: 300, fontSize: '1.1rem' }}>
                  {Number(p.amount).toLocaleString('fr-FR')} €
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment history */}
      {sorted.length > 0 && (
        <div className="bg-white border border-charcoal-100">
          <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100">
            <h2 className="font-serif text-charcoal-900 text-base font-light">Historique</h2>
          </div>
          <div className="divide-y divide-charcoal-100">
            {historyPaged.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-6 py-3.5 hover:bg-ivory-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-light text-charcoal-900 truncate">{p.description}</p>
                  <p className="label-xs text-charcoal-400 mt-0.5">{p.vendor || '—'} · {p.status === 'paid' || p.status === 'completed' ? `Payé le ${p.date || '—'}` : `Dû: ${p.due_date || '?'}`}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-sm font-light text-charcoal-900">{Number(p.amount).toLocaleString('fr-FR')} €</p>
                  <span className={`inline-block mt-0.5 text-[0.65rem] font-semibold tracking-[0.06em] uppercase px-2 py-0.5 ${getStatusCls(p.status)}`}>
                    {getStatusLabel(p.status)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          {historyPages > 1 && (
            <div className="flex items-center justify-center gap-4 py-4 border-t border-charcoal-100">
              <button onClick={() => setHistoryPage(p => Math.max(1, p - 1))} disabled={historyPage === 1}
                className="p-2 border border-charcoal-200 disabled:opacity-40 hover:bg-charcoal-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="label-xs text-charcoal-500 tracking-[0.1em]">{historyPage} / {historyPages}</span>
              <button onClick={() => setHistoryPage(p => Math.min(historyPages, p + 1))} disabled={historyPage === historyPages}
                className="p-2 border border-charcoal-200 disabled:opacity-40 hover:bg-charcoal-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── ADD EXPENSE MODAL ── */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal-900/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100">
              <h2 className="font-serif text-charcoal-900 text-base font-light">Ajouter une dépense</h2>
              <button onClick={() => setShowAddModal(false)} className="p-1.5 text-charcoal-400 hover:text-charcoal-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Description *</label>
                <input value={form.label} onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors"
                  placeholder="Nom du prestataire ou de la dépense" />
              </div>
              <div>
                <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Catégorie</label>
                <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors cursor-pointer">
                  {CATEGORIES.map(c => <option key={c.label} value={c.label}>{c.label}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Budget prévu (€)</label>
                  <input type="number" value={form.budgeted} onChange={e => setForm(f => ({ ...f, budgeted: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors"
                    placeholder="0" min="0" />
                </div>
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Montant payé (€)</label>
                  <input type="number" value={form.paid} onChange={e => setForm(f => ({ ...f, paid: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors"
                    placeholder="0" min="0" />
                </div>
              </div>
              {/* Calculator preview */}
              {(form.budgeted || form.paid) && (
                <div className="bg-ivory-50 border border-charcoal-100 px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calculator className="w-3.5 h-3.5 text-charcoal-400" />
                    <p className="label-xs text-charcoal-500">Reste à payer</p>
                  </div>
                  <p className="font-serif text-charcoal-900" style={{ fontWeight: 300, fontSize: '1.1rem' }}>
                    {Math.max(0, (Number(form.budgeted) || 0) - (Number(form.paid) || 0)).toLocaleString('fr-FR')} €
                  </p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-charcoal-100 flex gap-3">
              <button onClick={() => setShowAddModal(false)} className="flex-1 py-2.5 border border-charcoal-200 text-charcoal-700 text-sm font-light hover:bg-charcoal-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleAddLine} disabled={saving}
                className="flex-1 py-2.5 bg-charcoal-900 text-white text-sm font-medium hover:bg-charcoal-700 disabled:opacity-50 transition-colors">
                {saving ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
