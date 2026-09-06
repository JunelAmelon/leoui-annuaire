'use client';

import { useEffect, useMemo, useState } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, addDocument, deleteDocument, updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, MapPin, Pencil, Plus, Trash2, User, X, Building2 } from 'lucide-react';
import { TableActionsMenu } from '@/components/TableActionsMenu';

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

interface VendorEvent {
  id: string;
  title: string;
  date: string;
  location?: string;
  type?: string;
  vendor_name?: string;
  notes?: string;
}

interface CalendarEvent extends Appointment {
  source: 'couple' | 'provider';
  vendor_name?: string;
}

const TYPE_OPTIONS = ['RDV', 'Visite', 'Appel', 'Essai', 'Répétition', 'Autre'];

const parseDate = (v: string | undefined): Date | null => {
  if (!v) return null;
  if (v.includes('T')) {
    const d = new Date(v);
    if (isNaN(d.getTime())) return null;
    return d;
  }
  const [y, m, d] = v.split('-').map(Number);
  if (y && m && d) return new Date(y, m - 1, d);
  const fallback = new Date(v);
  if (isNaN(fallback.getTime())) return null;
  return fallback;
};

const isSameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

function EventsTable({
  events,
  onSelect,
  onDelete,
  onEdit,
}: {
  events: CalendarEvent[];
  onSelect: (ev: CalendarEvent) => void;
  onDelete: (ev: CalendarEvent, e?: React.MouseEvent) => void;
  onEdit?: (ev: CalendarEvent) => void;
}) {
  if (events.length === 0) {
    return (
      <div className="text-center py-12" data-tour="upcoming">
        <CalendarIcon className="w-10 h-10 mx-auto mb-3 text-charcoal-200" />
        <p className="text-charcoal-500 font-medium">Aucun événement trouvé</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto" data-tour="upcoming">
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="bg-ivory-50 text-charcoal-500 text-xs uppercase tracking-wider">
            <th className="px-4 py-3 font-medium w-40">Date</th>
            <th className="px-4 py-3 font-medium w-24">Heure</th>
            <th className="px-4 py-3 font-medium">Événement</th>
            <th className="px-4 py-3 font-medium w-44">Lieu</th>
            <th className="px-4 py-3 font-medium w-40">Avec</th>
            <th className="px-4 py-3 font-medium w-28">Source</th>
            <th className="px-4 py-3 font-medium w-24 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal-100">
          {events.map((ev) => {
            const d = parseDate(ev.date);
            return (
              <tr key={`${ev.source}-${ev.id}`} className="hover:bg-ivory-50/60 transition-colors">
                <td className="px-4 py-3 text-charcoal-700">
                  {d ? d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }) : ev.date}
                </td>
                <td className="px-4 py-3 text-charcoal-600">{ev.time || '—'}</td>
                <td className="px-4 py-3 font-medium text-charcoal-900">
                  <div className="flex items-center gap-2">
                    {ev.source === 'provider' ? <Building2 className="w-3.5 h-3.5 text-charcoal-400" /> : <User className="w-3.5 h-3.5 text-charcoal-400" />}
                    <span className="truncate">{ev.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-charcoal-600 truncate">{ev.location || '—'}</td>
                <td className="px-4 py-3 text-charcoal-600 truncate">{ev.with_whom || '—'}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium border ${
                      ev.source === 'couple'
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-champagne-100 text-champagne-700 border-champagne-200'
                    }`}
                  >
                    {ev.source === 'couple' ? 'Vous' : 'Prestataire'}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <TableActionsMenu
                    items={[
                      { label: 'Voir', icon: CalendarIcon, onClick: () => onSelect(ev) },
                      { label: 'Modifier', icon: Pencil, hidden: !onEdit || ev.source !== 'couple', onClick: () => onEdit?.(ev) },
                      { label: 'Supprimer', icon: Trash2, danger: true, hidden: ev.source !== 'couple', onClick: () => onDelete(ev) },
                    ]}
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function PlanningPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [vendorEvents, setVendorEvents] = useState<VendorEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [filter, setFilter] = useState<'all' | 'couple' | 'provider'>('all');
  const [view, setView] = useState<'calendar' | 'list'>('calendar');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
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
    if (!showAdd) {
      setForm({ title: '', date: '', time: '', location: '', with_whom: '', description: '', type: 'RDV' });
      setEditingId(null);
    }
  }, [showAdd]);

  useEffect(() => {
    async function fetchData() {
      const eventId = event?.id;
      const clientId = client?.id;
      if (!eventId && !clientId) {
        setLoading(false);
        return;
      }

      try {
        const filter = eventId
          ? { field: 'event_id', operator: '==' as const, value: eventId }
          : { field: 'client_id', operator: '==' as const, value: clientId! };

        const [items, vendorItems] = await Promise.all([
          getDocuments('tasks', [filter as any]),
          clientId
            ? getDocuments('client_planning_events', [{ field: 'client_id', operator: '==', value: clientId }])
            : Promise.resolve([]),
        ]);

        const allTasks = items as any[];
        const nextAppointments = allTasks
          .filter((t) => t?.kind === 'appointment' || t?.kind === 'rdv')
          .sort((a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0)) as Appointment[];

        setAppointments(nextAppointments);

        const sorted = (vendorItems as VendorEvent[]).sort(
          (a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0)
        );
        setVendorEvents(sorted);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (!dataLoading) fetchData();
  }, [event?.id, client?.id, dataLoading]);

  const allEvents = useMemo<CalendarEvent[]>(() => {
    const couple = appointments.map((a) => ({ ...a, source: 'couple' as const }));
    const provider = vendorEvents.map((v) => ({
      ...v,
      source: 'provider' as const,
      with_whom: v.vendor_name,
    }));
    return [...couple, ...provider].sort(
      (a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0)
    );
  }, [appointments, vendorEvents]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents;
    return allEvents.filter((ev) => ev.source === filter);
  }, [allEvents, filter]);

  const listEvents = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return filteredEvents.filter((ev) => {
      const d = parseDate(ev.date);
      if (!d) return true;
      const eventDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
      return eventDay.getTime() >= today.getTime();
    });
  }, [filteredEvents]);

  const handleSaveAppointment = async () => {
    const eventId = event?.id;
    const clientId = client?.id;
    if (!eventId && !clientId) {
      toast.error('Données client manquantes');
      return;
    }
    if (!form.title.trim() || !form.date) {
      toast.error('Titre et date requis');
      return;
    }
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
      };
      if (editingId) {
        await updateDocument('tasks', editingId, payload);
        setAppointments((prev) =>
          prev.map((a) => (a.id === editingId ? { ...a, ...payload } : a)).sort(
            (a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0)
          )
        );
        toast.success('Rendez-vous mis à jour');
      } else {
        const ref = await addDocument('tasks', { ...payload, created_at: new Date().toISOString() });
        setAppointments((prev) =>
          [...prev, { id: ref.id, title: payload.title, date: payload.date, time: payload.time || undefined, location: payload.location || undefined, with_whom: payload.with_whom || undefined, description: payload.description || undefined, type: payload.type || undefined }].sort(
            (a, b) => (parseDate(a.date)?.getTime() || 0) - (parseDate(b.date)?.getTime() || 0)
          )
        );
        toast.success('Rendez-vous ajouté');
      }
      setShowAdd(false);
      setForm({ title: '', date: '', time: '', location: '', with_whom: '', description: '', type: 'RDV' });
      setEditingId(null);
    } catch {
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteEvent = async (ev: CalendarEvent, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (ev.source !== 'couple') {
      toast.error('Impossible de supprimer cet événement');
      return;
    }
    if (!confirm(`Supprimer « ${ev.title} » ?`)) return;
    try {
      await deleteDocument('tasks', ev.id);
      setAppointments((prev) => prev.filter((a) => a.id !== ev.id));
      setSelectedEvent(null);
      toast.success('Rendez-vous supprimé');
    } catch {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleEdit = (ev: CalendarEvent) => {
    setForm({
      title: ev.title,
      date: ev.date,
      time: ev.time || '',
      location: ev.location || '',
      with_whom: ev.with_whom || '',
      description: ev.description || '',
      type: ev.type || 'RDV',
    });
    setEditingId(ev.id);
    setShowAdd(true);
  };

  // Calendar data
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const monthLabel = currentMonth.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  const capitalizedMonthLabel = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);
  const firstOfMonth = new Date(year, month, 1);
  const startDay = firstOfMonth.getDay();
  const offset = (startDay + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((daysInMonth + offset) / 7) * 7;
  const calendarDays = Array.from({ length: totalCells }, (_, i) => new Date(year, month, i - offset + 1));
  const weekDays = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const today = new Date();

  const getDayEvents = (day: Date) =>
    filteredEvents.filter((ev) => {
      const d = parseDate(ev.date);
      return d ? isSameDay(d, day) : false;
    });

  const changeMonth = (delta: number) => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  };

  if (dataLoading || loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-charcoal-100 rounded-xl" />
        <div className="h-64 bg-charcoal-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
        <h1
          className="font-serif text-charcoal-900"
          style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}
        >
          Planning
        </h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-4 sm:p-6">
        {/* Toolbar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => changeMonth(-1)}
              className="p-2 rounded-xl border border-charcoal-200 hover:bg-charcoal-50 transition-colors"
              aria-label="Mois précédent"
            >
              <ChevronLeft className="w-4 h-4 text-charcoal-600" />
            </button>
            <h2 className="font-serif text-lg text-charcoal-900 min-w-[10rem] text-center">{capitalizedMonthLabel}</h2>
            <button
              onClick={() => changeMonth(1)}
              className="p-2 rounded-xl border border-charcoal-200 hover:bg-charcoal-50 transition-colors"
              aria-label="Mois suivant"
            >
              <ChevronRight className="w-4 h-4 text-charcoal-600" />
            </button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center bg-charcoal-100 rounded-xl p-1">
              {(['all', 'couple', 'provider'] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    filter === key
                      ? 'bg-white text-charcoal-900 shadow-sm'
                      : 'text-charcoal-500 hover:text-charcoal-700'
                  }`}
                >
                  {key === 'all' ? 'Tous' : key === 'couple' ? 'Vous' : 'Prestataires'}
                </button>
              ))}
            </div>

            <div className="flex items-center bg-charcoal-100 rounded-xl p-1">
              <button
                onClick={() => setView('calendar')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === 'calendar' ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-700'
                }`}
              >
                Calendrier
              </button>
              <button
                onClick={() => setView('list')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  view === 'list' ? 'bg-white text-charcoal-900 shadow-sm' : 'text-charcoal-500 hover:text-charcoal-700'
                }`}
              >
                Liste
              </button>
            </div>

            <button
              onClick={() => setShowAdd(true)}
              data-tour="add-appointment"
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 text-white text-xs font-medium hover:bg-charcoal-700 transition-colors rounded-xl"
            >
              <Plus className="w-3.5 h-3.5" /> Ajouter
            </button>
          </div>
        </div>

        {view === 'calendar' ? (
          <>
            <div className="grid grid-cols-7 gap-1 mb-2 text-center">
              {weekDays.map((day) => (
                <div key={day} className="text-xs font-medium text-charcoal-500 uppercase tracking-wider py-2">
                  {day}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1" data-tour="calendar">
              {calendarDays.map((day, idx) => {
                const isCurrentMonth = day.getMonth() === month;
                const isToday = isSameDay(day, today);
                const dayEvents = getDayEvents(day);
                return (
                  <div
                    key={idx}
                    className={`min-h-[110px] p-2 rounded-xl border transition-colors ${
                      isCurrentMonth ? 'bg-white border-charcoal-100' : 'bg-charcoal-50 border-charcoal-50'
                    } ${isToday ? 'ring-2 ring-rose-300 ring-offset-1' : ''}`}
                  >
                    <p
                      className={`text-sm font-medium ${
                        isCurrentMonth ? 'text-charcoal-900' : 'text-charcoal-300'
                      }`}
                    >
                      {day.getDate()}
                    </p>
                    <div className="mt-1 space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => (
                        <button
                          key={`${ev.source}-${ev.id}`}
                          onClick={() => setSelectedEvent(ev)}
                          className={`block w-full text-left text-[10px] leading-tight px-1.5 py-1 rounded-md truncate border ${
                            ev.source === 'couple'
                              ? 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-200'
                              : 'bg-champagne-100 text-champagne-700 border-champagne-200 hover:bg-champagne-200'
                          }`}
                          title={ev.title}
                        >
                          {ev.title}
                        </button>
                      ))}
                      {dayEvents.length > 3 && (
                        <button
                          onClick={() => setView('list')}
                          className="block w-full text-left text-[10px] text-charcoal-500 hover:text-charcoal-700 px-1.5 py-1"
                        >
                          +{dayEvents.length - 3} événements
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <EventsTable events={listEvents} onSelect={setSelectedEvent} onDelete={handleDeleteEvent} onEdit={handleEdit} />
        )}
      </div>

      {selectedEvent && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm"
          onClick={() => setSelectedEvent(null)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-soft-xl w-full max-w-md max-h-[85dvh] flex flex-col animate-slide-up sm:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full pt-3 pb-1 sm:hidden flex justify-center">
              <div className="w-12 h-1.5 bg-charcoal-200 rounded-full" />
            </div>
            <div className="px-4 sm:px-6 py-4 flex-shrink-0">
              <div className="flex items-center justify-between mb-4">
                <div className="pr-4">
                  <h3 className="font-display text-lg font-semibold text-charcoal-900">{selectedEvent.title}</h3>
                  <span
                    className={`inline-flex items-center gap-1 mt-1.5 text-xs px-2 py-0.5 rounded-full font-medium border ${
                      selectedEvent.source === 'couple'
                        ? 'bg-rose-100 text-rose-700 border-rose-200'
                        : 'bg-champagne-100 text-champagne-700 border-champagne-200'
                    }`}
                  >
                    {selectedEvent.source === 'couple' ? 'Vous' : `Prestataire ${selectedEvent.vendor_name ? `: ${selectedEvent.vendor_name}` : ''}`}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-10 h-10 flex items-center justify-center hover:bg-charcoal-100 rounded-xl transition-colors flex-shrink-0"
                >
                  <X className="w-5 h-5 text-charcoal-500" />
                </button>
              </div>
              <div className="space-y-3 text-sm">
                <p className="flex items-center gap-3 text-charcoal-600">
                  <CalendarIcon className="w-5 h-5 text-charcoal-400" />
                  {parseDate(selectedEvent.date)?.toLocaleDateString('fr-FR', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }) || selectedEvent.date}
                  {selectedEvent.time && ` à ${selectedEvent.time}`}
                </p>
                {selectedEvent.location && (
                  <p className="flex items-center gap-3 text-charcoal-600">
                    <MapPin className="w-5 h-5 text-charcoal-400" />
                    {selectedEvent.location}
                  </p>
                )}
                {selectedEvent.with_whom && (
                  <p className="flex items-center gap-3 text-charcoal-600">
                    <User className="w-5 h-5 text-charcoal-400" />
                    {selectedEvent.with_whom}
                  </p>
                )}
                {selectedEvent.type && (
                  <p className="flex items-center gap-3 text-charcoal-600">
                    <Clock className="w-5 h-5 text-charcoal-400" />
                    {selectedEvent.type}
                  </p>
                )}
                {selectedEvent.description && (
                  <p className="text-charcoal-600 mt-2 bg-charcoal-50 p-3 rounded-xl">{selectedEvent.description}</p>
                )}
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-charcoal-100 flex-shrink-0">
              {selectedEvent.source === 'couple' ? (
                <div className="flex gap-3">
                  <button
                    onClick={() => setSelectedEvent(null)}
                    className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-charcoal-700 transition-colors min-h-[48px]"
                  >
                    Fermer
                  </button>
                  <button
                    onClick={(e) => handleDeleteEvent(selectedEvent, e)}
                    className="py-3 px-4 border border-rose-200 text-rose-600 rounded-xl font-medium hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="w-full py-3 bg-rose-600 text-white rounded-xl font-medium hover:bg-charcoal-700 transition-colors min-h-[48px]"
                >
                  Fermer
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-charcoal-900/60 backdrop-blur-sm"
          onClick={() => setShowAdd(false)}
        >
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl shadow-soft-xl w-full max-w-md max-h-[90dvh] flex flex-col animate-slide-up sm:animate-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-full pt-3 pb-1 sm:hidden flex justify-center">
              <div className="w-12 h-1.5 bg-charcoal-200 rounded-full" />
            </div>
            <div className="px-4 sm:px-6 py-4 border-b border-charcoal-100 flex items-center justify-between flex-shrink-0">
              <h3 className="font-display text-lg font-semibold text-charcoal-900">{editingId ? 'Modifier le rendez-vous' : 'Nouveau rendez-vous'}</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="w-10 h-10 flex items-center justify-center hover:bg-charcoal-100 rounded-xl transition-colors"
              >
                <X className="w-5 h-5 text-charcoal-500" />
              </button>
            </div>
            <div className="px-4 sm:px-6 py-4 space-y-3 overflow-y-auto flex-1 overscroll-contain">
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Titre *</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Date *</label>
                  <input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                    className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400"
                  />
                </div>
                <div>
                  <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Heure</label>
                  <input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((f) => ({ ...f, time: e.target.value }))}
                    className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Lieu</label>
                <input
                  value={form.location}
                  onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400"
                />
              </div>
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Avec</label>
                <input
                  value={form.with_whom}
                  onChange={(e) => setForm((f) => ({ ...f, with_whom: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400"
                />
              </div>
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 bg-white"
                >
                  <option value="">— Type —</option>
                  {TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-charcoal-500 uppercase tracking-wider mb-1 block">Notes</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400"
                  rows={3}
                />
              </div>
            </div>
            <div className="px-4 sm:px-6 py-4 border-t border-charcoal-100 flex flex-col-reverse sm:flex-row gap-3 flex-shrink-0 bg-white">
              <button
                onClick={() => setShowAdd(false)}
                className="w-full sm:flex-1 py-3 border border-charcoal-200 text-charcoal-700 text-sm font-medium hover:bg-charcoal-50 transition-colors rounded-xl min-h-[48px]"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveAppointment}
                disabled={saving}
                className="w-full sm:flex-1 py-3 bg-rose-600 text-white text-sm font-semibold hover:bg-charcoal-700 disabled:opacity-50 transition-colors rounded-xl min-h-[48px]"
              >
                {saving ? 'Enregistrement…' : (editingId ? 'Enregistrer' : 'Ajouter')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
