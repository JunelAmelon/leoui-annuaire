'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, MapPin, X, Trash2, Loader2 } from 'lucide-react';
import { getDocuments, addDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

type PlanningEvent = {
  id: string;
  date: string;
  title: string;
  location: string;
  type: 'mariage' | 'seance' | 'rdv' | 'autre';
  notes?: string;
  uid: string;
};

const TYPE_OPTIONS = [
  { value: 'mariage', label: 'Mariage' },
  { value: 'seance', label: 'Séance photo / vidéo' },
  { value: 'rdv', label: 'Rendez-vous client' },
  { value: 'autre', label: 'Autre' },
];

const TYPE_COLORS: Record<string, string> = {
  mariage: 'bg-rose-100 text-rose-700',
  seance: 'bg-champagne-100 text-champagne-700',
  rdv: 'bg-charcoal-100 text-charcoal-600',
  autre: 'bg-stone-100 text-stone-600',
};

const TYPE_DOT: Record<string, string> = {
  mariage: 'bg-rose-400',
  seance: 'bg-champagne-500',
  rdv: 'bg-charcoal-400',
  autre: 'bg-stone-400',
};

export default function PlanningPage() {
  const { user } = useAuth();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [events, setEvents] = useState<PlanningEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    date: '',
    title: '',
    location: '',
    type: 'mariage' as PlanningEvent['type'],
    notes: '',
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      try {
        const docs = await getDocuments('planning_events', [
          { field: 'uid', operator: '==', value: user.uid },
        ]);
        setEvents(docs as PlanningEvent[]);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const eventsByDate = events.reduce((acc, ev) => {
    const d = new Date(ev.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      acc[day] = acc[day] || [];
      acc[day].push(ev);
    }
    return acc;
  }, {} as Record<number, PlanningEvent[]>);

  const upcoming = events
    .filter(ev => new Date(ev.date) >= today)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 8);

  const openAddModal = (day?: number) => {
    const dateStr = day
      ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      : '';
    setForm({ date: dateStr, title: '', location: '', type: 'mariage', notes: '' });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!user || !form.title.trim() || !form.date) {
      toast.error('Titre et date requis');
      return;
    }
    setSaving(true);
    try {
      const data = { ...form, uid: user.uid, createdAt: new Date().toISOString() };
      const { id } = await addDocument('planning_events', data);
      setEvents(p => [...p, { ...data, id } as PlanningEvent]);
      setShowModal(false);
      toast.success('Événement ajouté');
    } catch {
      toast.error('Erreur lors de l\'ajout');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDocument('planning_events', id);
      setEvents(p => p.filter(e => e.id !== id));
      toast.success('Événement supprimé');
    } catch {
      toast.error('Erreur suppression');
    }
  };

  return (
    <PrestataireDashboardLayout>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Planning</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">Visualisez vos dates réservées et vos disponibilités.</p>
        </div>
        <button onClick={() => openAddModal()} className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
          <Plus className="w-4 h-4" /> Ajouter un événement
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-white rounded-2xl animate-pulse" />
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-white rounded-2xl animate-pulse" />)}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
            {/* Month nav */}
            <div className="flex items-center justify-between mb-5">
              <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-charcoal-50 text-charcoal-600 transition-colors">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <h2 className="font-display text-heading-sm text-charcoal-900">{MONTHS[month]} {year}</h2>
              <button onClick={nextMonth} className="p-2 rounded-xl hover:bg-charcoal-50 text-charcoal-600 transition-colors">
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-2">
              {DAYS.map(d => (
                <div key={d} className="text-center text-xs font-semibold text-charcoal-400 py-1">{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const day = i + 1;
                const isToday = day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
                const dayEvents = eventsByDate[day] || [];
                return (
                  <div
                    key={day}
                    onClick={() => openAddModal(day)}
                    className={`min-h-[56px] p-1 rounded-xl border transition-colors cursor-pointer ${
                      isToday ? 'border-rose-300 bg-rose-50' : 'border-transparent hover:bg-stone-50'
                    } ${dayEvents.length > 0 && !isToday ? 'bg-champagne-50 border-champagne-200' : ''}`}
                  >
                    <p className={`text-xs font-semibold text-center mb-1 ${isToday ? 'text-rose-600' : 'text-charcoal-600'}`}>{day}</p>
                    {dayEvents.slice(0, 2).map((ev, ei) => (
                      <div key={ei} className={`text-[10px] leading-tight px-1 py-0.5 rounded font-medium truncate ${TYPE_COLORS[ev.type] || 'bg-charcoal-100 text-charcoal-600'}`}>
                        {ev.title.split(' ')[0]}
                      </div>
                    ))}
                    {dayEvents.length > 2 && <div className="text-[10px] text-charcoal-400 px-1">+{dayEvents.length - 2}</div>}
                  </div>
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap items-center gap-4 mt-5 pt-4 border-t border-charcoal-100">
              {TYPE_OPTIONS.map(t => (
                <div key={t.value} className="flex items-center gap-1.5">
                  <div className={`w-2.5 h-2.5 rounded-full ${TYPE_DOT[t.value]}`} />
                  <span className="text-xs text-charcoal-500">{t.label}</span>
                </div>
              ))}
              <span className="ml-auto text-xs text-charcoal-400">{events.length} événement{events.length !== 1 ? 's' : ''} total</span>
            </div>
          </div>

          {/* Upcoming events */}
          <div>
            <h2 className="font-display text-heading-sm text-charcoal-900 mb-4">Prochains événements</h2>
            {upcoming.length === 0 ? (
              <div className="bg-white border border-charcoal-100 rounded-2xl p-8 text-center shadow-soft">
                <CalendarDays className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
                <p className="text-sm text-charcoal-500">Aucun événement à venir</p>
                <button onClick={() => openAddModal()} className="mt-3 text-xs text-rose-600 hover:text-rose-700 font-medium">
                  + Ajouter un événement
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((ev) => {
                  const d = new Date(ev.date);
                  const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <div key={ev.id} className="bg-white border border-charcoal-100 rounded-2xl p-4 shadow-soft hover:border-rose-200 transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-12 text-center">
                          <p className="text-xs font-semibold text-charcoal-400 uppercase">{MONTHS[d.getMonth()].slice(0, 3)}</p>
                          <p className="text-2xl font-bold text-charcoal-900 leading-none">{d.getDate()}</p>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className="text-sm font-semibold text-charcoal-900 truncate">{ev.title}</p>
                            <button onClick={() => handleDelete(ev.id)}
                              className="opacity-0 group-hover:opacity-100 text-charcoal-300 hover:text-red-500 transition-all flex-shrink-0">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {ev.location && (
                            <div className="flex items-center gap-1 mt-1 text-xs text-charcoal-500">
                              <MapPin className="w-3 h-3" />{ev.location}
                            </div>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-xs text-charcoal-400">
                            <Clock className="w-3 h-3" />
                            {diff === 0 ? "Aujourd'hui" : diff === 1 ? 'Demain' : `Dans ${diff} jours`}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add event modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-serif text-charcoal-900 text-lg">Nouvel événement</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-stone-100 rounded-lg transition-colors">
                <X className="w-4 h-4 text-charcoal-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Titre *</label>
                <input type="text" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                  placeholder="Ex: Mariage Sophie & Thomas" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Date *</label>
                  <input type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Type</label>
                  <select value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value as PlanningEvent['type'] }))}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all">
                    {TYPE_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Lieu</label>
                <input type="text" value={form.location} onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all"
                  placeholder="Ex: Château de Versailles" />
              </div>
              <div>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 transition-all resize-none"
                  placeholder="Informations complémentaires…" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2.5 border border-charcoal-200 text-charcoal-700 rounded-xl text-sm hover:bg-stone-50 transition-colors">
                Annuler
              </button>
              <button onClick={handleSave} disabled={saving || !form.title.trim() || !form.date}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                {saving ? 'Sauvegarde…' : 'Enregistrer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
