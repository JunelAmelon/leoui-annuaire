'use client';

import { useEffect, useState } from 'react';
import { getDocuments, addDocument } from '@/lib/db';
import { toast } from 'sonner';
import { Users, Search, Calendar, Mail, Phone, ArrowRight, Plus, X, ChevronLeft, ChevronRight } from 'lucide-react';
import Link from 'next/link';

interface Client {
  id: string;
  name: string;
  partner?: string;
  email: string;
  phone?: string;
  event_date?: string;
  planner_id?: string;
  status?: string;
  photoURL?: string;
  photo?: string;
  created_at?: any;
}

const ITEMS_PER_PAGE = 10;
const BLANK_FORM = { name: '', partner: '', email: '', phone: '', event_date: '', budget: '' };

export default function AdminClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(BLANK_FORM);
  const [saving, setSaving] = useState(false);

  const fetchClients = () => {
    setLoading(true);
    getDocuments('clients', [])
      .then((docs) => {
        const sorted = (docs as any[]).sort((a, b) => {
          const da = a?.created_at?.toDate?.()?.getTime?.() || new Date(a?.created_at || 0).getTime() || 0;
          const db = b?.created_at?.toDate?.()?.getTime?.() || new Date(b?.created_at || 0).getTime() || 0;
          return db - da;
        });
        setClients(sorted as Client[]);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchClients(); }, []);
  useEffect(() => setPage(1), [search]);

  const filtered = clients.filter((c) => {
    const q = search.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) || (c.partner || '').toLowerCase().includes(q) || (c.email || '').toLowerCase().includes(q);
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE);

  const getDays = (dateStr?: string) => {
    if (!dateStr) return null;
    const today = new Date(); today.setHours(0,0,0,0);
    const target = new Date(dateStr); target.setHours(0,0,0,0);
    return Math.ceil((target.getTime() - today.getTime()) / 86400000);
  };

  const handleAdd = async () => {
    if (!form.name.trim() || !form.email.trim()) { toast.error('Nom et email requis'); return; }
    setSaving(true);
    try {
      await addDocument('clients', {
        name: form.name.trim(), partner: form.partner.trim(),
        email: form.email.trim(), phone: form.phone.trim(),
        event_date: form.event_date || null,
        budget: Number(form.budget) || 0,
        created_at: new Date().toISOString(),
      });
      toast.success('Client ajouté');
      setShowAdd(false);
      setForm(BLANK_FORM);
      fetchClients();
    } catch { toast.error('Erreur lors de l\'ajout'); }
    finally { setSaving(false); }
  };

  if (loading) return (
    <div className="animate-pulse space-y-4">
      <div className="h-7 w-48 bg-charcoal-100 rounded" />
      <div className="grid grid-cols-3 gap-4">{[1,2,3,4,5,6].map(i => <div key={i} className="h-28 bg-charcoal-100 rounded-2xl" />)}</div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Gestion des clients</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">{clients.length} couple{clients.length > 1 ? 's' : ''} enregistré{clients.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors flex-shrink-0">
          <Plus className="w-4 h-4" /> Ajouter un couple
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
        <input
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-colors"
        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-charcoal-100 p-16 text-center">
          <Users className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
          <p className="text-sm text-charcoal-400 font-light">Aucun couple trouvé</p>
        </div>
      ) : (
        <>
          <div className="bg-white rounded-2xl border border-charcoal-100 overflow-hidden shadow-soft divide-y divide-charcoal-100">
            {paginated.map((client, i) => {
              const days = getDays(client.event_date);
              const initials = (client.name || 'C').charAt(0).toUpperCase();
              return (
                <Link key={client.id} href={`/admin/clients/${client.id}`}
                  className="group flex items-center gap-4 px-6 py-4 hover:bg-ivory-50 transition-colors">
                  {/* Number */}
                  <span className="hidden sm:block font-serif text-charcoal-200 w-6 text-right flex-shrink-0 italic"
                    style={{ fontSize: '1.1rem', fontWeight: 300 }}>
                    {String((page - 1) * ITEMS_PER_PAGE + i + 1).padStart(2, '0')}
                  </span>
                  {/* Avatar */}
                  {(client.photoURL || client.photo) ? (
                    <img src={client.photoURL || client.photo} alt={client.name} className="w-9 h-9 rounded-xl object-cover flex-shrink-0" />
                  ) : (
                  <div className="w-9 h-9 rounded-xl bg-champagne-100 border border-champagne-200 flex items-center justify-center flex-shrink-0 group-hover:border-champagne-400 transition-colors">
                    <span className="font-serif text-champagne-700 text-sm font-medium">{initials}</span>
                  </div>
                  )}
                  {/* Name + email */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 group-hover:text-rose-700 transition-colors truncate">
                      {client.name}{client.partner ? ` & ${client.partner}` : ''}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-charcoal-400 truncate">{client.email}</span>
                      {client.phone && <span className="text-xs text-charcoal-300 hidden sm:inline">· {client.phone}</span>}
                    </div>
                  </div>
                  {/* Date */}
                  {client.event_date && (
                    <div className="hidden md:flex items-center gap-1.5 text-charcoal-400 flex-shrink-0">
                      <Calendar className="w-3 h-3" />
                      <span className="text-xs">{new Date(client.event_date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  )}
                  {/* Days badge */}
                  {days !== null && (
                    <span className={`hidden sm:inline text-[0.65rem] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      days > 0 ? 'bg-champagne-100 text-champagne-700' : days === 0 ? 'bg-green-100 text-green-700' : 'bg-charcoal-100 text-charcoal-500'
                    }`}>
                      {days > 0 ? `J-${days}` : days === 0 ? "Aujourd'hui" : `J+${Math.abs(days)}`}
                    </span>
                  )}
                  <ArrowRight className="w-3.5 h-3.5 text-charcoal-300 group-hover:text-rose-500 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                </Link>
              );
            })}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
                className="p-2 rounded-xl border border-charcoal-200 disabled:opacity-40 hover:bg-charcoal-50 transition-colors">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm text-charcoal-500">Page {page} / {totalPages}</span>
              <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="p-2 rounded-xl border border-charcoal-200 disabled:opacity-40 hover:bg-charcoal-50 transition-colors">
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </>
      )}

      {/* Add client modal */}
      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <h3 className="font-semibold text-charcoal-900 text-sm">Ajouter un couple</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 hover:bg-charcoal-50 rounded-lg transition-colors">
                <X className="w-4 h-4 text-charcoal-500" />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Prénom (partenaire 1) *</label>
                  <input type="text" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Sophie" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Prénom (partenaire 2)</label>
                  <input type="text" value={form.partner} onChange={e => setForm(f => ({ ...f, partner: e.target.value }))} placeholder="Thomas" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="couple@email.com" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Téléphone</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="+33 6 12 34 56 78" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Date du mariage</label>
                  <input type="date" value={form.event_date} onChange={e => setForm(f => ({ ...f, event_date: e.target.value }))} className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Budget (€)</label>
                  <input type="number" min="0" value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} placeholder="15000" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-charcoal-100 flex justify-end gap-3">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-charcoal-600 hover:bg-charcoal-50 rounded-xl transition-colors">Annuler</button>
              <button onClick={handleAdd} disabled={saving} className="px-4 py-2 text-sm bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {saving ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
