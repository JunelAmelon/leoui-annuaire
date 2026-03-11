'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { getDocument, getDocuments, updateDocument, addDocument, deleteDocument } from '@/lib/db';
import { getClientPayments, getClientDocuments, getClientVendors, calculateDaysRemaining } from '@/lib/client-helpers';
import { toast } from 'sonner';
import {
  ArrowLeft, Calendar, Users, Euro, MapPin, Phone, Mail, CheckCircle, FileText,
  MessageSquare, TrendingUp, CreditCard, User, Pencil, Plus, X, Trash2,
} from 'lucide-react';
import Link from 'next/link';

type Tab = 'overview' | 'planning' | 'vendors' | 'documents' | 'payments' | 'messages';

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<any>(null);
  const [event, setEvent] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [milestones, setMilestones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [showEventEdit, setShowEventEdit] = useState(false);
  const [showAddMilestone, setShowAddMilestone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [eventForm, setEventForm] = useState({ event_date: '', ceremony_time: '', venue: '', reception_venue: '', guest_count: '', budget: '', theme_style: '' });
  const [milestoneForm, setMilestoneForm] = useState({ title: '', deadline: '', priority: 'medium' });

  const fetchAll = async () => {
    try {
      const [clientData, eventDocs, paymentDocs, vendorDocs, docDocs] = await Promise.all([
        getDocument('clients', id),
        getDocuments('events', [{ field: 'client_id', operator: '==', value: id }]),
        getClientPayments(id),
        getClientVendors(id),
        getClientDocuments(id),
      ]);
      setClient(clientData);
      const ev = (eventDocs as any[])[0] || null;
      setEvent(ev);
      setPayments(paymentDocs);
      setVendors(vendorDocs);
      setDocuments(docDocs);
      if (ev?.id) {
        const tasks = await getDocuments('tasks', [{ field: 'event_id', operator: '==', value: ev.id }]);
        setMilestones((tasks as any[]).filter((t) => t?.kind === 'milestone'));
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (id) fetchAll(); }, [id]);

  if (loading) return (
    <div className="animate-pulse space-y-4 max-w-5xl">
      <div className="h-8 w-56 bg-charcoal-100 rounded" />
      <div className="grid grid-cols-4 gap-4">{[1,2,3,4].map(i=><div key={i} className="h-20 bg-charcoal-100 rounded-2xl"/>)}</div>
      <div className="h-64 bg-charcoal-100 rounded-2xl" />
    </div>
  );

  if (!client) return (
    <div className="text-center py-16">
      <p className="text-charcoal-500 text-sm">Client introuvable</p>
      <Link href="/admin/clients" className="mt-4 inline-block px-4 py-2 border border-charcoal-200 text-charcoal-700 rounded-xl text-sm hover:bg-charcoal-50 transition-colors">Retour</Link>
    </div>
  );

  const clientName = `${client.name || ''}${client.name && client.partner ? ' & ' : ''}${client.partner || ''}`.trim();
  const daysRemaining = event?.event_date ? calculateDaysRemaining(event.event_date) : 0;
  const totalPaid = payments.filter(p => p.status === 'paid' || p.status === 'completed').reduce((s, p) => s + Number(p.amount || 0), 0);
  const totalBudget = payments.reduce((s, p) => s + Number(p.amount || 0), 0);

  const openEventEdit = () => {
    setEventForm({
      event_date: event?.event_date || '',
      ceremony_time: event?.ceremony_time || '',
      venue: event?.venue || '',
      reception_venue: event?.reception_venue || '',
      guest_count: String(event?.guest_count || ''),
      budget: String(event?.budget || ''),
      theme_style: event?.theme_style || '',
    });
    setShowEventEdit(true);
  };

  const handleSaveEvent = async () => {
    setSaving(true);
    try {
      const data: any = {
        client_id: id,
        event_date: eventForm.event_date || null,
        ceremony_time: eventForm.ceremony_time || null,
        venue: eventForm.venue || null,
        reception_venue: eventForm.reception_venue || null,
        guest_count: Number(eventForm.guest_count) || 0,
        budget: Number(eventForm.budget) || 0,
        theme_style: eventForm.theme_style || null,
      };
      if (event?.id) {
        await updateDocument('events', event.id, data);
      } else {
        await addDocument('events', { ...data, couple_names: clientName });
      }
      toast.success('Événement mis à jour');
      setShowEventEdit(false);
      setLoading(true);
      await fetchAll();
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  const handleAddMilestone = async () => {
    if (!milestoneForm.title.trim()) { toast.error('Titre requis'); return; }
    if (!event?.id) { toast.error('Créez d\'abord un événement pour ce client'); return; }
    setSaving(true);
    try {
      await addDocument('tasks', {
        event_id: event.id,
        client_id: id,
        kind: 'milestone',
        title: milestoneForm.title.trim(),
        deadline: milestoneForm.deadline || null,
        priority: milestoneForm.priority,
        admin_confirmed: false,
        client_confirmed: false,
        created_at: new Date().toISOString(),
      });
      toast.success('Étape ajoutée');
      setShowAddMilestone(false);
      setMilestoneForm({ title: '', deadline: '', priority: 'medium' });
      const tasks = await getDocuments('tasks', [{ field: 'event_id', operator: '==', value: event.id }]);
      setMilestones((tasks as any[]).filter(t => t?.kind === 'milestone'));
    } catch { toast.error('Erreur'); }
    finally { setSaving(false); }
  };

  const handleDeleteMilestone = async (m: any) => {
    if (!confirm(`Supprimer « ${m.title} » ?`)) return;
    try {
      await deleteDocument('tasks', m.id);
      setMilestones(prev => prev.filter(x => x.id !== m.id));
      toast.success('Étape supprimée');
    } catch { toast.error('Erreur'); }
  };

  const handleConfirmMilestone = async (m: any) => {
    try {
      await updateDocument('tasks', m.id, { admin_confirmed: !m.admin_confirmed });
      setMilestones(prev => prev.map(x => x.id === m.id ? { ...x, admin_confirmed: !m.admin_confirmed } : x));
      toast.success(m.admin_confirmed ? 'Étape désactivée' : 'Étape confirmée');
    } catch { toast.error('Erreur'); }
  };

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'overview', label: 'Vue d\'ensemble' },
    { id: 'planning', label: 'Planning', count: milestones.length },
    { id: 'vendors', label: 'Prestataires', count: vendors.length },
    { id: 'documents', label: 'Documents', count: documents.length },
    { id: 'payments', label: 'Paiements', count: payments.length },
    { id: 'messages', label: 'Messages' },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Link href="/admin/clients" className="p-2 hover:bg-charcoal-100 rounded-xl transition-colors flex-shrink-0">
          <ArrowLeft className="w-4 h-4 text-charcoal-600" />
        </Link>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-0.5">Administration · Clients</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.3rem, 2.5vw, 1.7rem)', fontWeight: 400 }}>{clientName}</h1>
          <p className="text-sm text-charcoal-400 mt-0.5">{client.email}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {daysRemaining > 0 && (
            <span className="text-xs font-medium px-2.5 py-1 bg-champagne-100 text-champagne-700 rounded-full">J-{daysRemaining}</span>
          )}
          <button onClick={openEventEdit} className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors">
            <Pencil className="w-3 h-3" /> Éditer l'événement
          </button>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-charcoal-100 border border-charcoal-100 rounded-2xl overflow-hidden">
        {[
          { icon: Calendar, label: 'Jours restants', value: daysRemaining > 0 ? String(daysRemaining) : '—', color: 'text-champagne-700' },
          { icon: Users,    label: 'Invités',         value: event?.guest_count ? String(event.guest_count) : '—', color: 'text-charcoal-900' },
          { icon: Euro,     label: 'Budget',           value: event?.budget ? `${Number(event.budget).toLocaleString()} €` : '—', color: 'text-charcoal-900' },
          { icon: TrendingUp, label: 'Payé',           value: totalBudget > 0 ? `${Math.round((totalPaid/totalBudget)*100)}%` : '—', color: 'text-green-700' },
        ].map(({ icon: Icon, label, value, color }) => (
          <div key={label} className="bg-white p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Icon className="w-3 h-3 text-charcoal-400" />
              <p className="text-[0.65rem] text-charcoal-400 uppercase tracking-wide">{label}</p>
            </div>
            <p className={`font-serif text-2xl font-light ${color}`} style={{ letterSpacing: '-0.02em' }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 border-b border-charcoal-100 overflow-x-auto">
        {tabs.map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-rose-600 text-rose-600' : 'border-transparent text-charcoal-500 hover:text-charcoal-900'
            }`}>
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 text-[0.6rem] bg-charcoal-100 text-charcoal-600 rounded-full">{tab.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Info */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-charcoal-900 text-sm flex items-center gap-2"><User className="w-4 h-4 text-rose-500" />Informations</h2>
              <button onClick={openEventEdit} className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1"><Pencil className="w-3 h-3" />Modifier</button>
            </div>
            <div className="space-y-3 text-sm">
              {[
                { icon: Mail,     val: client.email },
                { icon: Phone,    val: client.phone || '—' },
                { icon: Calendar, val: event?.event_date ? new Date(event.event_date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                { icon: MapPin,   val: event?.venue || '—' },
              ].map(({ icon: Icon, val }, i) => (
                <div key={i} className="flex items-center gap-2 text-charcoal-600">
                  <Icon className="w-3.5 h-3.5 text-charcoal-300 flex-shrink-0" />{val}
                </div>
              ))}
            </div>
          </div>
          {/* Budget */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-6">
            <h2 className="font-semibold text-charcoal-900 text-sm flex items-center gap-2 mb-4"><CreditCard className="w-4 h-4 text-rose-500" />Budget</h2>
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-500">Payé</span>
                <span className="font-medium text-green-700">{totalPaid.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-charcoal-500">Total engagé</span>
                <span className="font-medium text-charcoal-900">{totalBudget.toLocaleString('fr-FR')} €</span>
              </div>
              {totalBudget > 0 && (
                <>
                  <div className="h-1.5 bg-charcoal-100 rounded-full overflow-hidden">
                    <div className="h-full bg-champagne-500 transition-all duration-500" style={{ width: `${Math.min(100,(totalPaid/totalBudget)*100)}%` }} />
                  </div>
                  <p className="text-xs text-charcoal-400">{Math.round((totalPaid/totalBudget)*100)}% payé</p>
                </>
              )}
            </div>
          </div>
          {/* Theme */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-6">
            <h2 className="font-semibold text-charcoal-900 text-sm mb-4">Thème & style</h2>
            {event?.theme_style ? <p className="text-sm text-charcoal-700 mb-3">{event.theme_style}</p> : <p className="text-xs text-charcoal-400 italic mb-3">Non défini</p>}
            {event?.theme_colors?.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                {event.theme_colors.map((c: string, i: number) => (
                  <div key={i} className="w-7 h-7 rounded-full border-2 border-white shadow-sm" style={{ backgroundColor: c }} title={c} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── PLANNING ── */}
      {activeTab === 'planning' && (
        <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft">
          <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
            <h2 className="font-semibold text-charcoal-900 text-sm">Étapes & Milestones</h2>
            <button onClick={() => setShowAddMilestone(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors">
              <Plus className="w-3 h-3" /> Ajouter
            </button>
          </div>
          {milestones.length === 0 ? (
            <div className="py-12 text-center"><p className="text-sm text-charcoal-400 italic">Aucune étape définie</p></div>
          ) : (
            <div className="divide-y divide-charcoal-100">
              {milestones.map((m) => (
                <div key={m.id} className={`group px-6 py-4 flex items-start justify-between gap-3 ${m.client_confirmed ? 'bg-green-50' : m.admin_confirmed ? 'bg-champagne-50' : ''}`}>
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <button onClick={() => handleConfirmMilestone(m)} className="mt-0.5 flex-shrink-0">
                      <CheckCircle className={`w-4 h-4 transition-colors ${m.admin_confirmed ? 'text-champagne-600' : 'text-charcoal-200 hover:text-champagne-400'}`} />
                    </button>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-charcoal-900 truncate">{m.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {m.deadline && <span className="text-xs text-charcoal-400">Échéance : {new Date(m.deadline).toLocaleDateString('fr-FR')}</span>}
                        {m.admin_confirmed && <span className="text-[0.6rem] font-medium px-1.5 py-0.5 bg-champagne-100 text-champagne-700 rounded-full">Confirmé admin</span>}
                        {m.client_confirmed && <span className="text-[0.6rem] font-medium px-1.5 py-0.5 bg-green-100 text-green-700 rounded-full">Confirmé client</span>}
                      </div>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteMilestone(m)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-rose-50 rounded-lg transition-all">
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── VENDORS ── */}
      {activeTab === 'vendors' && (
        <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft">
          <div className="px-6 py-4 border-b border-charcoal-100">
            <h2 className="font-semibold text-charcoal-900 text-sm">Prestataires assignés</h2>
          </div>
          {vendors.length === 0 ? (
            <div className="py-12 text-center"><p className="text-sm text-charcoal-400 italic">Aucun prestataire assigné</p></div>
          ) : (
            <div className="divide-y divide-charcoal-100">
              {vendors.map(v => (
                <div key={v.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="w-8 h-8 rounded-lg bg-champagne-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-champagne-700">{(v.name||'V').charAt(0)}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900">{v.name}</p>
                    <p className="text-xs text-charcoal-400">{v.category}</p>
                  </div>
                  <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${v.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {v.status === 'confirmed' ? 'Confirmé' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── DOCUMENTS ── */}
      {activeTab === 'documents' && (
        <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft">
          <div className="px-6 py-4 border-b border-charcoal-100">
            <h2 className="font-semibold text-charcoal-900 text-sm">Documents</h2>
          </div>
          {documents.length === 0 ? (
            <div className="py-12 text-center"><p className="text-sm text-charcoal-400 italic">Aucun document</p></div>
          ) : (
            <div className="divide-y divide-charcoal-100">
              {documents.map(d => (
                <div key={d.id} className="flex items-center gap-4 px-6 py-4">
                  <FileText className="w-4 h-4 text-charcoal-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900 truncate">{d.name}</p>
                    <p className="text-xs text-charcoal-400">{d.type}{d.uploaded_at ? ` · ${d.uploaded_at}` : ''}</p>
                  </div>
                  {d.file_url && (
                    <a href={d.file_url} target="_blank" rel="noreferrer"
                      className="text-xs text-rose-600 hover:text-rose-700 font-medium px-2 py-1 hover:bg-rose-50 rounded-lg transition-colors">Ouvrir</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── PAYMENTS ── */}
      {activeTab === 'payments' && (
        <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft">
          <div className="px-6 py-4 border-b border-charcoal-100">
            <h2 className="font-semibold text-charcoal-900 text-sm">Paiements</h2>
          </div>
          {payments.length === 0 ? (
            <div className="py-12 text-center"><p className="text-sm text-charcoal-400 italic">Aucun paiement</p></div>
          ) : (
            <div className="divide-y divide-charcoal-100">
              {payments.map(p => (
                <div key={p.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-charcoal-900">{p.description}</p>
                    <p className="text-xs text-charcoal-400">{p.vendor}{(p.due_date||p.date) ? ` · ${p.due_date||p.date}` : ''}</p>
                  </div>
                  <p className="text-sm font-semibold text-charcoal-900">{Number(p.amount).toLocaleString('fr-FR')} €</p>
                  <span className={`text-[0.65rem] font-medium px-2 py-0.5 rounded-full ${p.status==='paid'||p.status==='completed' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                    {p.status==='paid'||p.status==='completed' ? 'Payé' : p.status==='partial' ? 'Partiel' : 'En attente'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── MESSAGES ── */}
      {activeTab === 'messages' && (
        <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-12 text-center">
          <MessageSquare className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
          <p className="font-semibold text-charcoal-900 text-sm">Messagerie</p>
          <p className="text-xs text-charcoal-400 mt-1 mb-4">Accédez aux messages via l&apos;espace messages</p>
          <Link href="/admin/messages" className="inline-flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
            Aller aux messages
          </Link>
        </div>
      )}

      {/* ── MODAL EDIT EVENT ── */}
      {showEventEdit && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowEventEdit(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <h3 className="font-semibold text-charcoal-900 text-sm">Informations de l'événement</h3>
              <button onClick={() => setShowEventEdit(false)} className="p-1 hover:bg-charcoal-50 rounded-lg transition-colors"><X className="w-4 h-4 text-charcoal-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Date du mariage</label>
                  <input type="date" value={eventForm.event_date} onChange={e => setEventForm(f => ({ ...f, event_date: e.target.value }))} className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Heure cérémonie</label>
                  <input type="time" value={eventForm.ceremony_time} onChange={e => setEventForm(f => ({ ...f, ceremony_time: e.target.value }))} className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Lieu de cérémonie</label>
                <input type="text" value={eventForm.venue} onChange={e => setEventForm(f => ({ ...f, venue: e.target.value }))} placeholder="Nom du lieu" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Lieu de réception</label>
                <input type="text" value={eventForm.reception_venue} onChange={e => setEventForm(f => ({ ...f, reception_venue: e.target.value }))} placeholder="Si différent" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Invités</label>
                  <input type="number" min="0" value={eventForm.guest_count} onChange={e => setEventForm(f => ({ ...f, guest_count: e.target.value }))} placeholder="100" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Budget (€)</label>
                  <input type="number" min="0" value={eventForm.budget} onChange={e => setEventForm(f => ({ ...f, budget: e.target.value }))} placeholder="15000" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Style</label>
                  <input type="text" value={eventForm.theme_style} onChange={e => setEventForm(f => ({ ...f, theme_style: e.target.value }))} placeholder="Bohème…" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-charcoal-100 flex justify-end gap-3">
              <button onClick={() => setShowEventEdit(false)} className="px-4 py-2 text-sm text-charcoal-600 hover:bg-charcoal-50 rounded-xl transition-colors">Annuler</button>
              <button onClick={handleSaveEvent} disabled={saving} className="px-4 py-2 text-sm bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {saving ? 'Enregistrement…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL ADD MILESTONE ── */}
      {showAddMilestone && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setShowAddMilestone(false)}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-charcoal-100 flex items-center justify-between">
              <h3 className="font-semibold text-charcoal-900 text-sm">Ajouter une étape</h3>
              <button onClick={() => setShowAddMilestone(false)} className="p-1 hover:bg-charcoal-50 rounded-lg transition-colors"><X className="w-4 h-4 text-charcoal-500" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Titre *</label>
                <input type="text" value={milestoneForm.title} onChange={e => setMilestoneForm(f => ({ ...f, title: e.target.value }))} placeholder="Ex: Visite du lieu de réception" className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Échéance</label>
                  <input type="date" value={milestoneForm.deadline} onChange={e => setMilestoneForm(f => ({ ...f, deadline: e.target.value }))} className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50" />
                </div>
                <div>
                  <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Priorité</label>
                  <select value={milestoneForm.priority} onChange={e => setMilestoneForm(f => ({ ...f, priority: e.target.value }))} className="w-full border border-charcoal-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-rose-400 bg-ivory-50">
                    <option value="high">Haute</option>
                    <option value="medium">Moyenne</option>
                    <option value="low">Basse</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-charcoal-100 flex justify-end gap-3">
              <button onClick={() => setShowAddMilestone(false)} className="px-4 py-2 text-sm text-charcoal-600 hover:bg-charcoal-50 rounded-xl transition-colors">Annuler</button>
              <button onClick={handleAddMilestone} disabled={saving} className="px-4 py-2 text-sm bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {saving ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
