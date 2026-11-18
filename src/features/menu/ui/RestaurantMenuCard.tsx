'use client';

import { useState } from 'react';
import { Check, Clock, Eye, Pencil, Plus, Sparkles, Trash2, X } from 'lucide-react';
import { COURSE_DEFINITIONS, DISH_STATUS_META } from '../domain/menu-rules';
import type { Course, CourseKey, Dish, DishStatus } from '../domain/types';

interface RestaurantMenuCardProps {
  courses: Course[];
  coupleNames: string;
  eventDate?: string;
  busy?: boolean;
  onAddDish: (
    courseKey: CourseKey,
    input: { name: string; note: string; status: DishStatus }
  ) => Promise<void>;
  onUpdateDish: (
    courseKey: CourseKey,
    dishId: string,
    patch: { name?: string; note?: string; status?: DishStatus }
  ) => Promise<void>;
  onRemoveDish: (courseKey: CourseKey, dishId: string) => Promise<void>;
}

const STATUS_BADGE_CLASSES: Record<DishStatus, string> = {
  retenu: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100',
  a_valider: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100',
  envisage: 'bg-stone-100 text-charcoal-600 border-stone-200 hover:bg-stone-200',
};

export function RestaurantMenuCard({
  courses,
  coupleNames,
  eventDate,
  busy = false,
  onAddDish,
  onUpdateDish,
  onRemoveDish,
}: RestaurantMenuCardProps) {
  const [viewMode, setViewMode] = useState<'all' | 'retenu'>('all');
  const [addingCourse, setAddingCourse] = useState<CourseKey | null>(null);
  const [newName, setNewName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<DishStatus>('envisage');

  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState<DishStatus>('envisage');

  const formattedDate = eventDate
    ? new Date(eventDate).toLocaleDateString('fr-FR', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null;

  const openAddForm = (key: CourseKey) => {
    setAddingCourse(key);
    setNewName('');
    setNewNote('');
    setNewStatus('envisage');
    setEditingDishId(null);
  };

  const submitAdd = async (key: CourseKey) => {
    if (!newName.trim()) return;
    await onAddDish(key, { name: newName, note: newNote, status: newStatus });
    setAddingCourse(null);
    setNewName('');
    setNewNote('');
  };

  const openEditForm = (dish: Dish) => {
    setEditingDishId(dish.id);
    setEditName(dish.name);
    setEditNote(dish.note);
    setEditStatus(dish.status);
    setAddingCourse(null);
  };

  const submitEdit = async (key: CourseKey, dishId: string) => {
    if (!editName.trim()) return;
    await onUpdateDish(key, dishId, {
      name: editName,
      note: editNote,
      status: editStatus,
    });
    setEditingDishId(null);
  };

  return (
    <section className="bg-white rounded-2xl border border-stone-200 p-3 sm:p-6 shadow-sm">
      <div className="border border-stone-200/80 rounded-xl px-5 py-8 sm:px-10 sm:py-12">
        {/* En-tête façon carte de restaurant */}
        <div className="text-center max-w-lg mx-auto">
          <p className="label-xs text-rose-600 tracking-[0.2em]">Menu de Réception</p>
          <h2 className="font-serif text-2xl sm:text-3xl text-charcoal-900 mt-2">
            {coupleNames}
          </h2>
          {formattedDate && (
            <p className="text-xs text-charcoal-400 mt-1.5 capitalize">{formattedDate}</p>
          )}

          <div className="mt-6 inline-flex items-center p-1 rounded-lg bg-stone-100 border border-stone-200">
            <button
              type="button"
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'all'
                  ? 'bg-white text-charcoal-900 shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              Tous les plats
            </button>
            <button
              type="button"
              onClick={() => setViewMode('retenu')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                viewMode === 'retenu'
                  ? 'bg-white text-charcoal-900 shadow-sm'
                  : 'text-charcoal-500 hover:text-charcoal-800'
              }`}
            >
              <Eye className="w-3.5 h-3.5" />
              Carte retenue
            </button>
          </div>
        </div>

        {/* Services du menu */}
        <div className="mt-8 space-y-8">
          {COURSE_DEFINITIONS.map((def, idx) => {
            const course = courses.find((c) => c.key === def.key);
            const allDishes = course?.dishes ?? [];
            const visibleDishes =
              viewMode === 'retenu'
                ? allDishes.filter((d) => d.status === 'retenu')
                : allDishes;

            return (
              <div
                key={def.key}
                className={idx === 0 ? 'pt-6 border-t border-stone-200' : 'pt-8 border-t border-stone-200'}
              >
                <div className="text-center mb-5">
                  <h3 className="label-xs text-rose-600 tracking-[0.18em]">{def.label}</h3>
                  <p className="text-[11px] text-charcoal-400 mt-1">{def.subtitle}</p>
                </div>

                {visibleDishes.length === 0 ? (
                  <p className="text-center text-xs italic text-charcoal-400 py-2">
                    {viewMode === 'retenu'
                      ? 'Aucun plat retenu pour ce service.'
                      : 'Aucun plat proposé pour le moment.'}
                  </p>
                ) : (
                  <div className="space-y-4 max-w-2xl mx-auto">
                    {visibleDishes.map((dish) => {
                      const isEditing = editingDishId === dish.id;
                      const statusMeta = DISH_STATUS_META[dish.status];

                      if (isEditing) {
                        return (
                          <div
                            key={dish.id}
                            className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <input
                                type="text"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Intitulé du plat"
                                maxLength={140}
                                className="sm:col-span-2 h-9 px-3 rounded-lg border border-stone-200 bg-white text-sm text-charcoal-900 focus:outline-none focus:border-rose-400"
                              />
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as DishStatus)}
                                className="h-9 px-3 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-charcoal-800 focus:outline-none focus:border-rose-400"
                              >
                                <option value="envisage">Envisagé</option>
                                <option value="a_valider">À valider</option>
                                <option value="retenu">Retenu</option>
                              </select>
                            </div>
                            <input
                              type="text"
                              value={editNote}
                              onChange={(e) => setEditNote(e.target.value)}
                              placeholder="Note de dégustation, sauce, accompagnement..."
                              maxLength={400}
                              className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-xs text-charcoal-700 focus:outline-none focus:border-rose-400"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => setEditingDishId(null)}
                                className="inline-flex items-center gap-1 px-3 h-8 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-600 hover:border-charcoal-400"
                              >
                                <X className="w-3.5 h-3.5" />
                                Annuler
                              </button>
                              <button
                                type="button"
                                disabled={busy || !editName.trim()}
                                onClick={() => submitEdit(def.key, dish.id)}
                                className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                Enregistrer
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={dish.id}
                          className="group relative flex flex-col items-center text-center px-3 py-2 rounded-xl hover:bg-stone-50/80 transition-colors"
                        >
                          <p className="font-serif text-lg text-charcoal-900 leading-snug">
                            {dish.name}
                          </p>
                          {dish.note && (
                            <p className="text-xs italic text-charcoal-500 mt-1 max-w-lg">
                              {dish.note}
                            </p>
                          )}

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              disabled={busy}
                              title="Cliquer pour changer le statut"
                              onClick={() =>
                                onUpdateDish(def.key, dish.id, {
                                  status: statusMeta.next,
                                })
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[11px] font-semibold transition-colors ${STATUS_BADGE_CLASSES[dish.status]}`}
                            >
                              {dish.status === 'retenu' && <Check className="w-3 h-3" />}
                              {dish.status === 'a_valider' && <Clock className="w-3 h-3" />}
                              {dish.status === 'envisage' && <Sparkles className="w-3 h-3" />}
                              {statusMeta.label}
                            </button>

                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openEditForm(dish)}
                              aria-label="Modifier le plat"
                              className="p-1 rounded-md text-charcoal-400 hover:text-charcoal-800 hover:bg-stone-100 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onRemoveDish(def.key, dish.id)}
                              aria-label="Supprimer le plat"
                              className="p-1 rounded-md text-charcoal-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {viewMode === 'all' && (
                  <div className="mt-4 max-w-2xl mx-auto">
                    {addingCourse === def.key ? (
                      <div className="p-4 rounded-xl bg-stone-50 border border-stone-200 space-y-3">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <input
                            type="text"
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            placeholder="Nom du plat (ex. Filet de bar rôti)"
                            maxLength={140}
                            className="sm:col-span-2 h-9 px-3 rounded-lg border border-stone-200 bg-white text-sm text-charcoal-900 focus:outline-none focus:border-rose-400"
                          />
                          <select
                            value={newStatus}
                            onChange={(e) => setNewStatus(e.target.value as DishStatus)}
                            className="h-9 px-3 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-charcoal-800 focus:outline-none focus:border-rose-400"
                          >
                            <option value="envisage">Envisagé</option>
                            <option value="a_valider">À valider</option>
                            <option value="retenu">Retenu</option>
                          </select>
                        </div>
                        <input
                          type="text"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          placeholder="Note de dégustation ou accord mets-vins (optionnel)"
                          maxLength={400}
                          className="w-full h-9 px-3 rounded-lg border border-stone-200 bg-white text-xs text-charcoal-700 focus:outline-none focus:border-rose-400"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => setAddingCourse(null)}
                            className="px-3 h-8 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-600 hover:border-charcoal-400"
                          >
                            Annuler
                          </button>
                          <button
                            type="button"
                            disabled={busy || !newName.trim()}
                            onClick={() => submitAdd(def.key)}
                            className="inline-flex items-center gap-1 px-3 h-8 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 disabled:opacity-50"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            Ajouter
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center">
                        <button
                          type="button"
                          onClick={() => openAddForm(def.key)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-charcoal-500 hover:text-rose-600 hover:bg-rose-50/60 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Ajouter un plat
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

