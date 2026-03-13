'use client';

import { useEffect, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import { Calendar, CheckCircle, Clock, MapPin, Plus, Trash2, User, X, Building2 } from 'lucide-react';

interface Appointment {
  id: string;
  title: string;
  date: string;
  time?: string;
  location?: string;
  with_whom?: string;
  description?: string;
  type?: string;
}

interface Step {
  id: string;
  title: string;
  description?: string;
  deadline?: string;
  admin_confirmed?: boolean;
  client_confirmed?: boolean;
  kind?: string;
}

interface VendorEvent {
  id: string;
  title: string;
  date: string;
  location?: string;
  type?: string;
  vendor_name?: string;
  notes?: string;
}

export default function PlanningPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [steps, setSteps] = useState<Step[]>([]);
  const [vendorEvents, setVendorEvents] = useState<VendorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showPast, setShowPast] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    date: '',
    time: '',
    location: '',
    with_whom: '',
    description: '',
    type: 'RDV',
  });

  useEffect(() => {
    async function fetchData() {
      const eventId = event?.id;
      const clientId = client?.id;
      if (!eventId && !clientId) { setLoading(false); return; }

      try {
        const filter = eventId
          ? { field: 'event_id', operator: '==', value: eventId }
          : { field: 'client_id', operator: '==', value: clientId! };

        const [items, vendorItems] = await Promise.all([
          getDocuments('tasks', [filter as any]),
          clientId ? getDocuments('client_planning_events', [{ field: 'client_id', operator: '==', value: clientId }]) : Promise.resolve([]),
        ]);
        const allTasks = items as any[];
        setSteps(allTasks.filter((t) => t?.kind === 'milestone'));
        setAppointments(allTasks.filter((t) => t?.kind === 'appointment' || t?.kind === 'rdv'));
        const sorted = (vendorItems as VendorEvent[]).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        setVendorEvents(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (!dataLoading) fetchData();
  }, [event?.id, client?.id, dataLoading]);

  const confirmStep = async (step: Step) => {
    setConfirmingId(step.id);
    try {
      await updateDocument('tasks', step.id, { client_confirmed: true });
      setSteps((prev) => prev.map((s) => (s.id === step.id ? { ...s, client_confirmed: true } : s)));
    } finally {
      setConfirmingId(null);
    }
  };

  const handleAddAppointment = async () => {
    const eventId = event?.id;
    const clientId = client?.id;
    if (!eventId && !clientId) { toast.error('Données client manquantes'); return; }
    if (!form.title.trim() || !form.date) { toast.error('Titre et date requis'); return; }
    setSaving(true);
    try {
      const payload: any = {
        kind: 'appointment',
        title: form.title.trim(),
        date: form.date,
        time: form.time || null,
        location: form.location || null,
        with_whom: form.with_whom || null,
        description: form.description || null,
        type: form.type || null,
        event_id: eventId || null,
        client_id: clientId || null,
        created_at: new Date().toISOString(),
      };
      const ref = await addDocument('tasks', payload);
      setAppointments((prev) => ([...prev, { id: ref.id, title: payload.title, date: payload.date, time: payload.time || undefined, location: payload.location || undefined, with_whom: payload.with_whom || undefined, description: payload.description || undefined, type: payload.type || undefined }]));
      toast.success('Rendez-vous ajouté');
      setShowAdd(false);
      setForm({ title: '', date: '', time: '', location: '', with_whom: '', description: '', type: 'RDV' });
    } catch {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAppointment = async (appt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer « ${appt.title} » ?`)) return;
    try {
      await deleteDocument('tasks', appt.id);
      setAppointments((prev) => prev.filter((a) => a.id !== appt.id));
      if (selectedAppt?.id === appt.id) setSelectedAppt(null);
      toast.success('Rendez-vous supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  if (dataLoading || loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 bg-charcoal-100 rounded-xl" />
      <div className="h-64 bg-charcoal-100 rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6">

      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Planning &amp; étapes</h1>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Appointments */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-start justify-between gap-4 mb-4">
              <h2 className="font-serif text-charcoal-900 text-base font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-charcoal-400" />Rendez-vous
              </h2>
              <button
                onClick={() => setShowAdd(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-charcoal-900 text-white text-xs font-medium hover:bg-charcoal-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Ajouter
              </button>
            </div>

            {/* Vendor events synced */}
            {vendorEvents.length > 0 && (() => {
              const today = new Date(); today.setHours(0,0,0,0);
              const upcoming = vendorEvents.filter(ev => new Date(ev.date) >= today);
              const past = vendorEvents.filter(ev => new Date(ev.date) < today);
              const displayed = showPast ? vendorEvents : upcoming;
              return (
                <div className="mb-5 border-b border-charcoal-100 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-charcoal-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5" /> Événements prestataires
                    </p>
                    {past.length > 0 && (
                      <button onClick={() => setShowPast(p => !p)} className="text-xs text-charcoal-500 hover:text-charcoal-800 underline underline-offset-2">
                        {showPast ? 'Masquer passés' : `+ ${past.length} passé${past.length > 1 ? 's' : ''}`}
                      </button>
                    )}
                  </div>
                  {displayed.length === 0 ? (
                    <p className="text-xs text-charcoal-400 italic">Aucun événement à venir.</p>
                  ) : (
                    <div className="space-y-2">
                      {displayed.map(ev => {
                        const evDate = new Date(ev.date);
                        const isPast = evDate < today;
                        return (
                          <div key={ev.id} className={`flex items-start gap-3 p-3 border rounded-xl ${isPast ? 'bg-stone-50 border-charcoal-100 opacity-60' : 'bg-rose-50 border-rose-100'}`}>
                            <div className="flex-shrink-0 text-center min-w-[40px]">
                              <p className={`text-[10px] font-semibold uppercase leading-none ${isPast ? 'text-charcoal-400' : 'text-rose-400'}`}>{evDate.toLocaleDateString('fr-FR', { month: 'short' })}</p>
                              <p className={`text-lg font-bold leading-tight ${isPast ? 'text-charcoal-500' : 'text-rose-700'}`}>{evDate.getDate()}</p>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-charcoal-900 truncate">{ev.title}</p>
                              {ev.vendor_name && <p className="text-xs text-charcoal-500 mt-0.5 flex items-center gap-1"><Building2 className="w-3 h-3" />{ev.vendor_name}</p>}
                              {ev.location && <p className="text-xs text-charcoal-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3" />{ev.location}</p>}
                            </div>
                            <div className="flex flex-col items-end gap-1 flex-shrink-0">
                              {ev.type && <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${isPast ? 'bg-charcoal-100 text-charcoal-500' : 'bg-rose-100 text-rose-600'}`}>{ev.type}</span>}
                              {isPast && <span className="text-[10px] text-charcoal-400">Passé</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })()}
            {appointments.length === 0 ? (
              <p className="text-charcoal-400 text-sm text-center py-8 italic">Aucun rendez-vous planifié.</p>
            ) : (
              <div className="space-y-3">
                {appointments.map((appt) => (
                  <div
                    key={appt.id}
                    className="p-4 rounded-xl border border-charcoal-100 hover:border-rose-200 hover:bg-ivory-50 cursor-pointer transition-all"
                    onClick={() => setSelectedAppt(appt)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-charcoal-900 text-sm">{appt.title}</p>
                      <div className="flex items-center gap-2">
                        {appt.type && <span className="text-xs px-2 py-0.5 bg-champagne-100 text-champagne-700 rounded-full font-medium">{appt.type}</span>}
                        <button
                          onClick={(e) => handleDeleteAppointment(appt, e)}
                          className="p-1 text-charcoal-300 hover:text-rose-600 transition-colors"
                          aria-label="Supprimer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-charcoal-500 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />{appt.date}{appt.time && ` • ${appt.time}`}
                      </p>
                      {appt.location && (
                        <p className="text-xs text-charcoal-500 flex items-center gap-1.5">
                          <MapPin className="w-3 h-3" />{appt.location}
                        </p>
                      )}
                      {appt.with_whom && (
                        <p className="text-xs text-charcoal-500 flex items-center gap-1.5">
                          <User className="w-3 h-3" />{appt.with_whom}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Steps / Milestones */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <h2 className="font-serif text-charcoal-900 text-base font-medium mb-4 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-charcoal-400" />Étapes clés
            </h2>
            {steps.length === 0 ? (
              <p className="text-charcoal-400 text-sm text-center py-8 italic">Aucune étape définie.</p>
            ) : (
              <div className="space-y-3">
                {steps.map((step) => {
                  const done = Boolean(step.client_confirmed);
                  const pending = step.admin_confirmed && !done;
                  return (
                    <div key={step.id} className={`p-4 rounded-xl border transition-all ${done ? 'border-green-200 bg-green-50' : pending ? 'border-rose-200 bg-rose-50' : 'border-charcoal-100 bg-ivory-50'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${done ? 'bg-green-500' : pending ? 'bg-rose-500' : 'bg-charcoal-200'}`}>
                          {done && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold text-sm ${done ? 'text-green-700 line-through' : 'text-charcoal-900'}`}>{step.title}</p>
                          {step.description && <p className="text-xs text-charcoal-500 mt-0.5">{step.description}</p>}
                          {step.deadline && <p className="text-xs text-charcoal-400 mt-1">Échéance : {new Date(step.deadline).toLocaleDateString('fr-FR')}</p>}
                        </div>
                        {pending && (
                          <button
                            onClick={() => confirmStep(step)}
                            disabled={confirmingId === step.id}
                            className="flex-shrink-0 px-3 py-1.5 bg-rose-600 text-white text-xs font-semibold rounded-lg hover:bg-rose-700 disabled:opacity-50 transition-all"
                          >
                            {confirmingId === step.id ? '…' : 'Confirmer'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      {selectedAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-soft-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-heading-sm text-charcoal-900">{selectedAppt.title}</h3>
              <button onClick={() => setSelectedAppt(null)} className="p-1.5 hover:bg-charcoal-100 rounded-lg transition-colors"><X className="w-4 h-4 text-charcoal-500" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <p className="flex items-center gap-2 text-charcoal-600"><Calendar className="w-4 h-4" />{selectedAppt.date}{selectedAppt.time && ` à ${selectedAppt.time}`}</p>
              {selectedAppt.location && <p className="flex items-center gap-2 text-charcoal-600"><MapPin className="w-4 h-4" />{selectedAppt.location}</p>}
              {selectedAppt.with_whom && <p className="flex items-center gap-2 text-charcoal-600"><User className="w-4 h-4" />{selectedAppt.with_whom}</p>}
              {selectedAppt.description && <p className="text-charcoal-600 mt-2">{selectedAppt.description}</p>}
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-charcoal-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-soft-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-heading-sm text-charcoal-900">Nouveau rendez-vous</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 hover:bg-charcoal-100 rounded-lg transition-colors"><X className="w-4 h-4 text-charcoal-500" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Titre *</label>
                <input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400" />
                </div>
                <div>
                  <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Heure</label>
                  <input value={form.time} onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400" placeholder="18:30" />
                </div>
              </div>
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Lieu</label>
                <input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400" />
              </div>
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Avec</label>
                <input value={form.with_whom} onChange={(e) => setForm((f) => ({ ...f, with_whom: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400" />
              </div>
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Type</label>
                <input value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400" placeholder="RDV" />
              </div>
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Notes</label>
                <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400" rows={3} />
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 border border-charcoal-200 text-charcoal-700 text-sm font-light hover:bg-charcoal-50 transition-colors">Annuler</button>
              <button onClick={handleAddAppointment} disabled={saving}
                className="flex-1 py-2.5 bg-charcoal-900 text-white text-sm font-medium hover:bg-charcoal-700 disabled:opacity-50 transition-colors">
                {saving ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
