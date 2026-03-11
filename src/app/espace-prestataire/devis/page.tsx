'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { FileText, Plus, Clock, CheckCircle, XCircle, Send, Euro, Search } from 'lucide-react';
import { getDocuments, addDocument, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

interface Devis {
  id: string;
  client_name?: string;
  client_email?: string;
  reference?: string;
  amount?: number;
  status: 'draft' | 'sent' | 'accepted' | 'rejected';
  description?: string;
  created_at?: string;
  sent_at?: string;
}

const STATUS_CONFIG = {
  draft: { label: 'Brouillon', icon: Clock, color: 'text-charcoal-500', bg: 'bg-charcoal-100' },
  sent: { label: 'Envoyé', icon: Send, color: 'text-champagne-700', bg: 'bg-champagne-100' },
  accepted: { label: 'Accepté', icon: CheckCircle, color: 'text-green-700', bg: 'bg-green-100' },
  rejected: { label: 'Refusé', icon: XCircle, color: 'text-rose-700', bg: 'bg-rose-100' },
};

export default function DevisPage() {
  const { user } = useAuth();
  const [devis, setDevis] = useState<Devis[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState({ client_name: '', client_email: '', amount: '', description: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      try {
        const docs = await getDocuments('devis', [
          { field: 'vendor_id', operator: '==', value: user.uid },
        ]);
        setDevis(docs as Devis[]);
      } catch {
        setDevis([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const createDevis = async () => {
    if (!user || !form.client_name || !form.amount) return;
    setSaving(true);
    try {
      const ref = `DEV-${Date.now().toString().slice(-6)}`;
      const doc = {
        vendor_id: user.uid,
        vendor_email: user.email,
        client_name: form.client_name,
        client_email: form.client_email,
        reference: ref,
        amount: parseFloat(form.amount),
        description: form.description,
        status: 'sent',
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      };
      const res = await addDocument('devis', doc);
      setDevis(prev => [{ id: res.id, ...doc } as Devis, ...prev]);
      setForm({ client_name: '', client_email: '', amount: '', description: '' });
      setShowForm(false);
      toast.success(`Devis ${ref} créé et envoyé`);
    } catch {
      toast.error('Erreur lors de la création du devis');
    } finally {
      setSaving(false);
    }
  };

  const filtered = devis.filter(d =>
    !search || d.client_name?.toLowerCase().includes(search.toLowerCase()) || d.reference?.toLowerCase().includes(search.toLowerCase())
  );

  const totalAccepted = devis.filter(d => d.status === 'accepted').reduce((s, d) => s + (d.amount || 0), 0);
  const totalPending = devis.filter(d => d.status === 'sent').reduce((s, d) => s + (d.amount || 0), 0);

  return (
    <PrestataireDashboardLayout>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Devis</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">Gérez vos propositions tarifaires envoyées aux couples.</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nouveau devis
        </button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total devis', value: devis.length, suffix: '' },
          { label: 'Envoyés', value: devis.filter(d => d.status === 'sent').length, suffix: '' },
          { label: 'Acceptés', value: `${totalAccepted.toLocaleString('fr-FR')}€`, suffix: '' },
          { label: 'En attente', value: `${totalPending.toLocaleString('fr-FR')}€`, suffix: '' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-charcoal-100 rounded-2xl p-4 shadow-soft">
            <p className="text-xl font-bold text-charcoal-900">{s.value}</p>
            <p className="text-xs text-charcoal-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Form overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-soft-xl w-full max-w-md p-6">
            <h2 className="font-display text-heading-sm text-charcoal-900 mb-5">Nouveau devis</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Nom du couple *</label>
                <input
                  value={form.client_name}
                  onChange={e => setForm(p => ({ ...p, client_name: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all"
                  placeholder="Sophie & Thomas"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Email du client</label>
                <input
                  type="email"
                  value={form.client_email}
                  onChange={e => setForm(p => ({ ...p, client_email: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all"
                  placeholder="email@exemple.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Montant (€) *</label>
                <div className="relative">
                  <Euro className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                  <input
                    type="number"
                    value={form.amount}
                    onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all"
                    placeholder="1500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Description des prestations</label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all resize-none"
                  placeholder="Détaillez les services inclus…"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-charcoal-200 text-charcoal-700 rounded-xl text-sm font-medium hover:bg-charcoal-50 transition-colors">
                Annuler
              </button>
              <button
                onClick={createDevis}
                disabled={saving || !form.client_name || !form.amount}
                className="flex-1 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-all"
              >
                {saving ? 'Création…' : 'Créer & envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full max-w-sm pl-10 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-all"
          placeholder="Rechercher un devis…"
        />
      </div>

      {/* Devis list */}
      {loading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <div key={i} className="h-20 bg-charcoal-100 rounded-2xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-charcoal-100 rounded-2xl p-12 text-center shadow-soft">
          <FileText className="w-10 h-10 text-charcoal-300 mx-auto mb-3" />
          <p className="text-charcoal-600 font-medium">Aucun devis</p>
          <p className="text-sm text-charcoal-400 mt-1">Créez votre premier devis en cliquant sur "Nouveau devis"</p>
        </div>
      ) : (
        <div className="bg-white border border-charcoal-100 rounded-2xl shadow-soft overflow-hidden">
          <div className="divide-y divide-charcoal-50">
            {filtered.map(d => {
              const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG.draft;
              return (
                <div key={d.id} className="flex items-center gap-4 px-5 py-4 hover:bg-ivory-50 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-champagne-50 border border-champagne-200 flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-champagne-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-charcoal-900 truncate">{d.client_name || 'Client'}</p>
                      <span className="text-xs text-charcoal-400">• {d.reference}</span>
                    </div>
                    <p className="text-xs text-charcoal-500 mt-0.5 truncate">{d.description || 'Prestation de mariage'}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-bold text-charcoal-900">{d.amount?.toLocaleString('fr-FR')}€</p>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} mt-1`}>
                      <cfg.icon className="w-3 h-3" />{cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
