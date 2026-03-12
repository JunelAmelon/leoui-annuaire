'use client';

import { useEffect, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import {
  Users, Plus, X, Check, Clock, XCircle, Search,
  ChevronDown, Mail, Phone, Trash2, Utensils,
} from 'lucide-react';

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  rsvp: 'confirmed' | 'pending' | 'declined';
  side: 'mariée' | 'marié' | 'commun';
  table?: string;
  menu?: string;
  plus_one?: boolean;
  notes?: string;
  event_id?: string;
  client_id?: string;
}

const RSVP_CONFIG = {
  confirmed: { label: 'Confirmé',  icon: Check,    cls: 'bg-green-50 text-green-700 border border-green-200' },
  pending:   { label: 'En attente', icon: Clock,    cls: 'bg-champagne-50 text-champagne-700 border border-champagne-200' },
  declined:  { label: 'Décliné',   icon: XCircle,  cls: 'bg-rose-50 text-rose-700 border border-rose-200' },
};

const SIDES = ['mariée', 'marié', 'commun'] as const;
const MENUS = ['Standard', 'Végétarien', 'Vegan', 'Sans gluten', 'Enfant'];

export default function InvitesPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'confirmed' | 'pending' | 'declined'>('all');
  const [sideFilter, setSideFilter] = useState<'all' | 'mariée' | 'marié' | 'commun'>('all');
  const [showModal, setShowModal] = useState(false);
  const [editGuest, setEditGuest] = useState<Guest | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '', phone: '',
    rsvp: 'pending' as Guest['rsvp'],
    side: 'commun' as Guest['side'],
    table: '', menu: 'Standard', plus_one: false, notes: '',
  });

  const fetchGuests = async () => {
    const id = event?.id || client?.id;
    if (!id) { setGuests([]); setLoading(false); return; }
    try {
      const field = event?.id ? 'event_id' : 'client_id';
      const docs = await getDocuments('guests', [{ field, operator: '==', value: id }]);
      setGuests(docs as Guest[]);
    } catch {
      setGuests([]);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { if (!dataLoading) fetchGuests(); }, [event?.id, client?.id, dataLoading]);

  const openAdd = () => {
    setEditGuest(null);
    setForm({ first_name: '', last_name: '', email: '', phone: '', rsvp: 'pending', side: 'commun', table: '', menu: 'Standard', plus_one: false, notes: '' });
    setShowModal(true);
  };
  const openEdit = (g: Guest) => {
    setEditGuest(g);
    setForm({ first_name: g.first_name, last_name: g.last_name, email: g.email || '', phone: g.phone || '', rsvp: g.rsvp, side: g.side, table: g.table || '', menu: g.menu || 'Standard', plus_one: g.plus_one || false, notes: g.notes || '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.first_name.trim() || !form.last_name.trim()) { toast.error('Prénom et nom requis'); return; }
    setSaving(true);
    try {
      const payload: any = { ...form, event_id: event?.id || null, client_id: client?.id || null };
      if (editGuest) {
        await updateDocument('guests', editGuest.id, payload);
        setGuests(prev => prev.map(g => g.id === editGuest.id ? { ...g, ...payload } : g));
        toast.success('Invité mis à jour');
      } else {
        const ref = await addDocument('guests', payload);
        setGuests(prev => [...prev, { ...payload, id: ref.id }]);
        toast.success('Invité ajouté');
      }
      setShowModal(false);
    } catch { toast.error('Erreur lors de la sauvegarde'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (guest: Guest, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer « ${guest.first_name} ${guest.last_name} » ?`)) return;
    try {
      await deleteDocument('guests', guest.id);
      setGuests((prev) => prev.filter((g) => g.id !== guest.id));
      toast.success('Invité supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const filtered = guests.filter(g => {
    const q = search.toLowerCase();
    const matchSearch = !q || g.first_name.toLowerCase().includes(q) || g.last_name.toLowerCase().includes(q) || (g.email || '').toLowerCase().includes(q);
    const matchStatus = filter === 'all' || g.rsvp === filter;
    const matchSide = sideFilter === 'all' || g.side === sideFilter;
    return matchSearch && matchStatus && matchSide;
  });

  const stats = {
    total: guests.length,
    confirmed: guests.filter(g => g.rsvp === 'confirmed').length,
    pending: guests.filter(g => g.rsvp === 'pending').length,
    declined: guests.filter(g => g.rsvp === 'declined').length,
  };

  if (dataLoading || loading) return (
    <div className="animate-pulse space-y-4 max-w-4xl mx-auto">
      <div className="h-7 w-36 bg-charcoal-100" />
      <div className="grid grid-cols-4 gap-px bg-charcoal-100 h-24" />
      <div className="h-64 bg-charcoal-100" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Vos invités</h1>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white text-sm font-medium rounded-xl hover:bg-rose-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Ajouter un invité
        </button>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-charcoal-100 border border-charcoal-100">
        {[
          { label: 'Total', value: stats.total, sub: 'invités' },
          { label: 'Confirmés', value: stats.confirmed, sub: `${stats.total > 0 ? Math.round(stats.confirmed / stats.total * 100) : 0}%` },
          { label: 'En attente', value: stats.pending, sub: 'à répondre' },
          { label: 'Déclinés', value: stats.declined, sub: 'absents' },
        ].map(({ label, value, sub }) => (
          <div key={label} className="bg-white px-4 py-5 sm:px-6">
            <p className="label-xs text-charcoal-400 mb-2 tracking-[0.1em]">{label}</p>
            <p className="font-serif text-charcoal-900" style={{ fontSize: '2rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em' }}>{value}</p>
            <p className="label-xs text-charcoal-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-400 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un invité…"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {(['all', 'confirmed', 'pending', 'declined'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-2 text-xs font-medium tracking-[0.06em] uppercase transition-colors ${filter === f ? 'bg-charcoal-900 text-white' : 'bg-white border border-charcoal-200 text-charcoal-500 hover:border-charcoal-400'}`}>
              {f === 'all' ? 'Tous' : RSVP_CONFIG[f].label}
            </button>
          ))}
          <div className="relative">
            <select value={sideFilter} onChange={e => setSideFilter(e.target.value as any)}
              className="appearance-none pl-3 pr-8 py-2 bg-white border border-charcoal-200 text-xs font-medium tracking-wide uppercase text-charcoal-500 focus:outline-none cursor-pointer">
              <option value="all">Côté</option>
              <option value="mariée">Mariée</option>
              <option value="marié">Marié</option>
              <option value="commun">Commun</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-charcoal-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Guest count */}
      <p className="label-xs text-charcoal-400 tracking-[0.08em]">
        {filtered.length} invité{filtered.length !== 1 ? 's' : ''} affiché{filtered.length !== 1 ? 's' : ''}
      </p>

      {/* Guest list */}
      <div className="bg-white border border-charcoal-100">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 mx-auto mb-3 text-charcoal-200" />
            <p className="font-serif text-charcoal-400 text-base font-light">Aucun invité trouvé</p>
          </div>
        ) : (
          <>
            {/* Table header */}
            <div className="hidden sm:grid grid-cols-[1fr_auto_auto_auto] gap-4 px-6 py-3 border-b border-charcoal-100 bg-ivory-50">
              <p className="label-xs text-charcoal-400 tracking-[0.1em]">Invité</p>
              <p className="label-xs text-charcoal-400 tracking-[0.1em] w-24 text-center">Côté</p>
              <p className="label-xs text-charcoal-400 tracking-[0.1em] w-24 text-center">Table</p>
              <p className="label-xs text-charcoal-400 tracking-[0.1em] w-28 text-center">RSVP</p>
            </div>
            <div className="divide-y divide-charcoal-100">
              {filtered.map(guest => {
                const rsvp = RSVP_CONFIG[guest.rsvp];
                const RsvpIcon = rsvp.icon;
                return (
                  <div key={guest.id} className="group px-6 py-3.5 hover:bg-ivory-50 transition-colors cursor-pointer" onClick={() => openEdit(guest)}>
                    <div className="sm:grid sm:grid-cols-[1fr_auto_auto_auto] sm:gap-4 sm:items-center">
                      <div className="flex items-start gap-3">
                        {/* Avatar */}
                        <div className="w-8 h-8 border border-charcoal-200 flex items-center justify-center flex-shrink-0 group-hover:border-champagne-400 transition-colors">
                          <span className="font-serif text-charcoal-500 text-xs">
                            {guest.first_name.charAt(0)}{guest.last_name.charAt(0)}
                          </span>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-light text-charcoal-900 group-hover:text-champagne-800 transition-colors">
                            {guest.first_name} {guest.last_name}
                            {guest.plus_one && <span className="ml-1.5 label-xs text-charcoal-400">+1</span>}
                          </p>
                          <div className="flex items-center gap-3 mt-0.5">
                            {guest.email && <p className="label-xs text-charcoal-400 flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{guest.email}</p>}
                            {guest.menu && <p className="label-xs text-charcoal-400 flex items-center gap-1"><Utensils className="w-2.5 h-2.5" />{guest.menu}</p>}
                          </div>
                        </div>
                      </div>
                      {/* Côté */}
                      <div className="mt-2 sm:mt-0 sm:w-24 sm:text-center">
                        <span className="label-xs text-charcoal-500 capitalize">{guest.side}</span>
                      </div>
                      {/* Table */}
                      <div className="sm:w-24 sm:text-center">
                        <span className="label-xs text-charcoal-500">{guest.table || '—'}</span>
                      </div>
                      {/* RSVP */}
                      <div className="mt-2 sm:mt-0 sm:w-28 sm:flex sm:justify-center">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-[0.65rem] font-semibold tracking-[0.06em] uppercase ${rsvp.cls}`}>
                            <RsvpIcon className="w-3 h-3" />
                            {rsvp.label}
                          </span>
                          <button
                            onClick={(e) => handleDelete(guest, e)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 text-charcoal-300 hover:text-rose-600"
                            aria-label="Supprimer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* ── ADD / EDIT MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/50">
          <div className="w-full sm:max-w-lg bg-white shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100">
              <h2 className="font-serif text-charcoal-900 text-base font-light">
                {editGuest ? 'Modifier l\u2019invité' : 'Ajouter un invité'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-charcoal-400 hover:text-charcoal-700 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Prénom *</label>
                  <input value={form.first_name} onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors" placeholder="Marie" />
                </div>
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Nom *</label>
                  <input value={form.last_name} onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors" placeholder="Dupont" />
                </div>
              </div>

              <div>
                <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-300 pointer-events-none" />
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors" placeholder="marie@email.com" />
                </div>
              </div>

              <div>
                <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-charcoal-300 pointer-events-none" />
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full pl-9 pr-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors" placeholder="+33 6 00 00 00 00" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">RSVP</label>
                  <select value={form.rsvp} onChange={e => setForm(f => ({ ...f, rsvp: e.target.value as Guest['rsvp'] }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors cursor-pointer">
                    <option value="pending">En attente</option>
                    <option value="confirmed">Confirmé</option>
                    <option value="declined">Décliné</option>
                  </select>
                </div>
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Côté</label>
                  <select value={form.side} onChange={e => setForm(f => ({ ...f, side: e.target.value as Guest['side'] }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors cursor-pointer">
                    {SIDES.map(s => <option key={s} value={s} className="capitalize">{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Table</label>
                  <input value={form.table} onChange={e => setForm(f => ({ ...f, table: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors" placeholder="Table 1" />
                </div>
              </div>

              <div>
                <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Menu</label>
                <div className="flex gap-2 flex-wrap">
                  {MENUS.map(m => (
                    <button key={m} type="button" onClick={() => setForm(f => ({ ...f, menu: m }))}
                      className={`px-3 py-1.5 text-xs font-light transition-colors ${form.menu === m ? 'bg-charcoal-900 text-white' : 'bg-white border border-charcoal-200 text-charcoal-500 hover:border-charcoal-400'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <div className={`w-4 h-4 border flex items-center justify-center transition-colors ${form.plus_one ? 'bg-charcoal-900 border-charcoal-900' : 'border-charcoal-300'}`}
                  onClick={() => setForm(f => ({ ...f, plus_one: !f.plus_one }))}>
                  {form.plus_one && <Check className="w-3 h-3 text-white" />}
                </div>
                <span className="text-sm font-light text-charcoal-700">Vient avec un +1</span>
              </label>

              <div>
                <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2}
                  className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors resize-none" placeholder="Allergie, mobilité réduite…" />
              </div>
            </div>

            {/* Actions */}
            <div className="px-6 py-4 border-t border-charcoal-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-charcoal-200 text-charcoal-700 text-sm font-light hover:bg-charcoal-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving}
                className="flex-1 py-2.5 bg-charcoal-900 text-white text-sm font-medium hover:bg-charcoal-700 disabled:opacity-50 transition-colors">
                {saving ? 'Sauvegarde…' : editGuest ? 'Mettre à jour' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
