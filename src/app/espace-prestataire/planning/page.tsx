'use client';

import { useState } from 'react';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { CalendarDays, ChevronLeft, ChevronRight, Plus, Clock, MapPin } from 'lucide-react';

const DAYS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
const MONTHS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year: number, month: number) {
  const d = new Date(year, month, 1).getDay();
  return d === 0 ? 6 : d - 1;
}

const SAMPLE_EVENTS = [
  { date: '2026-03-15', title: 'Mariage Sophie & Thomas', location: 'Château de Versailles', type: 'mariage' },
  { date: '2026-03-22', title: 'Séance engagement', location: 'Paris 16e', type: 'seance' },
  { date: '2026-04-05', title: 'Mariage Julie & Marc', location: 'Domaine de la Rose', type: 'mariage' },
  { date: '2026-04-18', title: 'Consultation couple', location: 'Mon studio', type: 'rdv' },
];

export default function PlanningPage() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const eventsByDate = SAMPLE_EVENTS.reduce((acc, ev) => {
    const d = new Date(ev.date);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      acc[day] = acc[day] || [];
      acc[day].push(ev);
    }
    return acc;
  }, {} as Record<number, typeof SAMPLE_EVENTS>);

  const typeColors = {
    mariage: 'bg-rose-100 text-rose-700',
    seance: 'bg-champagne-100 text-champagne-700',
    rdv: 'bg-charcoal-100 text-charcoal-600',
  };

  const upcoming = SAMPLE_EVENTS.filter(ev => new Date(ev.date) >= today).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return (
    <PrestataireDashboardLayout>
      <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Planning</h1>
          <p className="text-sm text-charcoal-500 mt-0.5">Visualisez vos dates réservées et vos disponibilités.</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
          <Plus className="w-4 h-4" /> Ajouter un événement
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm p-6">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-5">
            <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-charcoal-50 text-charcoal-600 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h2 className="font-display text-heading-sm text-charcoal-900">
              {MONTHS[month]} {year}
            </h2>
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
              const events = eventsByDate[day] || [];
              return (
                <div
                  key={day}
                  className={`min-h-[56px] p-1 rounded-xl border transition-colors cursor-pointer hover:bg-ivory-50 ${
                    isToday ? 'border-rose-300 bg-rose-50' : 'border-transparent'
                  } ${events.length > 0 ? 'bg-champagne-50 border-champagne-200' : ''}`}
                >
                  <p className={`text-xs font-semibold text-center mb-1 ${isToday ? 'text-rose-600' : 'text-charcoal-600'}`}>{day}</p>
                  {events.slice(0, 2).map((ev, ei) => (
                    <div key={ei} className={`text-[10px] leading-tight px-1 py-0.5 rounded font-medium truncate ${typeColors[ev.type as keyof typeof typeColors] || 'bg-charcoal-100 text-charcoal-600'}`}>
                      {ev.title.split(' ')[0]}
                    </div>
                  ))}
                  {events.length > 2 && <div className="text-[10px] text-charcoal-400 px-1">+{events.length - 2}</div>}
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-5 pt-4 border-t border-charcoal-100">
            {[
              { label: 'Mariage', color: 'bg-rose-400' },
              { label: 'Séance', color: 'bg-champagne-500' },
              { label: 'Rendez-vous', color: 'bg-charcoal-400' },
            ].map(l => (
              <div key={l.label} className="flex items-center gap-1.5">
                <div className={`w-2.5 h-2.5 rounded-full ${l.color}`} />
                <span className="text-xs text-charcoal-500">{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming events */}
        <div>
          <h2 className="font-display text-heading-sm text-charcoal-900 mb-4">Prochains événements</h2>
          {upcoming.length === 0 ? (
            <div className="bg-white border border-charcoal-100 rounded-2xl p-8 text-center shadow-soft">
              <CalendarDays className="w-8 h-8 text-charcoal-300 mx-auto mb-2" />
              <p className="text-sm text-charcoal-500">Aucun événement à venir</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcoming.map((ev, i) => {
                const d = new Date(ev.date);
                const diff = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                return (
                  <div key={i} className="bg-white border border-charcoal-100 rounded-2xl p-4 shadow-soft hover:border-rose-200 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 w-12 text-center">
                        <p className="text-xs font-semibold text-charcoal-400 uppercase">{MONTHS[d.getMonth()].slice(0,3)}</p>
                        <p className="text-2xl font-bold text-charcoal-900 leading-none">{d.getDate()}</p>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-charcoal-900 truncate">{ev.title}</p>
                        <div className="flex items-center gap-1 mt-1 text-xs text-charcoal-500">
                          <MapPin className="w-3 h-3" />{ev.location}
                        </div>
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
    </PrestataireDashboardLayout>
  );
}
