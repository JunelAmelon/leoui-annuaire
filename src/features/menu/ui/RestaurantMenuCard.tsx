'use client';

import { useState } from 'react';
import { Check, Eye, Pencil, Plus, Trash2, X } from 'lucide-react';
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
  ) => Promise<boolean>;
  onUpdateDish: (
    courseKey: CourseKey,
    dishId: string,
    patch: { name?: string; note?: string; status?: DishStatus }
  ) => Promise<boolean>;
  onRemoveDish: (courseKey: CourseKey, dishId: string) => Promise<void>;
}

const kicker = 'text-[10px] font-semibold tracking-[0.24em] uppercase';

const STATUS_DOT: Record<DishStatus, string> = {
  retenu: 'bg-emerald-600',
  a_valider: 'bg-amber-500',
  envisage: 'bg-stone-400',
};

const STATUS_TEXT: Record<DishStatus, string> = {
  retenu: 'text-emerald-700',
  a_valider: 'text-amber-700',
  envisage: 'text-charcoal-500',
};

const field =
  'w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2 text-[14px] text-charcoal-900 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none';
const fieldNote =
  'w-full bg-transparent border-0 border-b border-stone-300 px-0 py-2 text-[12.5px] italic text-charcoal-600 placeholder:text-charcoal-300 focus:outline-none focus:ring-0 focus:border-rose-500 transition-colors rounded-none';

function DishForm({
  name,
  note,
  status,
  busy,
  submitLabel,
  onChangeName,
  onChangeNote,
  onChangeStatus,
  onCancel,
  onSubmit,
}: {
  name: string;
  note: string;
  status: DishStatus;
  busy: boolean;
  submitLabel: string;
  onChangeName: (v: string) => void;
  onChangeNote: (v: string) => void;
  onChangeStatus: (v: DishStatus) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="max-w-md mx-auto border border-stone-200 bg-white px-5 sm:px-7 py-5 space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-3">
        <input
          type="text"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
          placeholder="Intitulé du plat"
          maxLength={140}
          className={field}
        />
        <select
          value={status}
          onChange={(e) => onChangeStatus(e.target.value as DishStatus)}
          className={`${field} text-[12px] uppercase tracking-[0.08em] font-medium`}
        >
          <option value="envisage">Envisagé</option>
          <option value="a_valider">À valider</option>
          <option value="retenu">Retenu</option>
        </select>
      </div>
      <input
        type="text"
        value={note}
        onChange={(e) => onChangeNote(e.target.value)}
        placeholder="Note de dégustation, accord mets-vins…"
        maxLength={400}
        className={fieldNote}
      />
      <div className="flex items-center justify-end gap-4 pt-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-charcoal-500 hover:text-charcoal-900 transition-colors"
        >
          <X className="w-3.5 h-3.5" /> Annuler
        </button>
        <button
          type="button"
          disabled={busy || !name.trim()}
          onClick={onSubmit}
          className="inline-flex items-center gap-1.5 h-9 px-5 bg-rose-600 text-white text-[12px] font-medium hover:bg-rose-700 transition-colors rounded-sm disabled:opacity-40"
        >
          <Check className="w-3.5 h-3.5" /> {submitLabel}
        </button>
      </div>
    </div>
  );
}

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
  const [activeCourse, setActiveCourse] = useState<CourseKey>(COURSE_DEFINITIONS[0].key);
  const [addingCourse, setAddingCourse] = useState<CourseKey | null>(null);
  const [newName, setNewName] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newStatus, setNewStatus] = useState<DishStatus>('envisage');

  const [editingDishId, setEditingDishId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNote, setEditNote] = useState('');
  const [editStatus, setEditStatus] = useState<DishStatus>('envisage');

  const parsedDate = eventDate ? new Date(eventDate) : null;
  const formattedDate =
    parsedDate && !Number.isNaN(parsedDate.getTime())
      ? parsedDate.toLocaleDateString('fr-FR', {
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
    const ok = await onAddDish(key, { name: newName, note: newNote, status: newStatus });
    if (ok) {
      setAddingCourse(null);
      setNewName('');
      setNewNote('');
    }
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
    const ok = await onUpdateDish(key, dishId, {
      name: editName,
      note: editNote,
      status: editStatus,
    });
    if (ok) setEditingDishId(null);
  };

  return (
    <section className="bg-ivory-50 border border-stone-200 px-3 py-3 sm:px-5 sm:py-5">
      {/* Double filet façon carte gastronomique */}
      <div className="border border-stone-300/80 bg-[#FFFEFC] px-4 py-8 sm:px-10 sm:py-12">
        {/* En-tête de carte */}
        <div className="text-center max-w-xl mx-auto">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-stone-300" />
            <span className="text-rose-600 text-[13px]">✦</span>
            <span className="h-px w-10 bg-stone-300" />
          </div>
          <h2
            className="font-serif text-charcoal-900 mt-4"
            style={{ fontFamily: "'Bodoni Moda', serif", fontSize: 'clamp(1.5rem, 3vw, 2.1rem)', letterSpacing: '0.22em', fontWeight: 400 }}
          >
            LA CARTE
          </h2>
          <p
            className="mt-2 text-rose-600 leading-snug"
            style={{ fontFamily: "'Mrs Saint Delafield', cursive", fontSize: 'clamp(1.6rem, 3vw, 2.1rem)' }}
          >
            {coupleNames}
          </p>
          {formattedDate && (
            <p className={`${kicker} text-charcoal-400 mt-2`}>{formattedDate}</p>
          )}

          {/* Basculer la vue — onglets textuels */}
          <div className="mt-6 flex items-center justify-center gap-8">
            {(
              [
                ['all', 'Toute la carte'],
                ['retenu', 'Plats retenus'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className={`pb-1.5 text-[11px] font-semibold tracking-[0.16em] uppercase border-b-2 transition-colors ${
                  viewMode === mode
                    ? 'border-rose-600 text-charcoal-900'
                    : 'border-transparent text-charcoal-400 hover:text-charcoal-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Sommaire des services + service actif */}
        {(() => {
          const activeDef = COURSE_DEFINITIONS.find((d) => d.key === activeCourse) ?? COURSE_DEFINITIONS[0];
          const course = courses.find((c) => c.key === activeDef.key);
          const allDishes = course?.dishes ?? [];
          const visibleDishes =
            viewMode === 'retenu'
              ? allDishes.filter((d) => d.status === 'retenu')
              : allDishes;

          return (
            <div className="mt-10 max-w-3xl mx-auto grid lg:grid-cols-[13.5rem_1fr] gap-8 lg:gap-10">
              {/* Sommaire — numéros Bodoni, service actif en rose */}
              <nav
                aria-label="Services du menu"
                className="flex lg:flex-col overflow-x-auto scrollbar-none lg:overflow-visible border-b lg:border-b-0 lg:border-r border-stone-200 lg:pr-7 -mx-2 px-2 lg:mx-0 lg:px-0 lg:self-start lg:sticky lg:top-6"
              >
                {COURSE_DEFINITIONS.map((def, i) => {
                  const count = (courses.find((c) => c.key === def.key)?.dishes ?? []).length;
                  const active = activeCourse === def.key;
                  return (
                    <button
                      key={def.key}
                      type="button"
                      onClick={() => { setActiveCourse(def.key); setAddingCourse(null); setEditingDishId(null); }}
                      className={`flex items-baseline gap-3 text-left whitespace-nowrap lg:whitespace-normal px-3 py-2.5 lg:px-0 lg:py-3 border-b-2 lg:border-b-0 lg:border-l-2 transition-colors ${
                        active ? 'border-rose-600 lg:pl-4' : 'border-transparent lg:pl-4 hover:border-stone-300'
                      }`}
                    >
                      <span
                        className={`text-lg leading-none tabular-nums select-none ${active ? 'text-rose-500' : 'text-[#E5D5C8]'}`}
                        style={{ fontFamily: "'Bodoni Moda', 'Didot', serif" }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <span className="min-w-0">
                        <span className={`block text-[13px] leading-tight ${active ? 'text-charcoal-900 font-medium' : 'text-charcoal-500'}`}>
                          {def.label}
                        </span>
                        <span className="hidden lg:block text-[11px] italic text-charcoal-400 mt-0.5">
                          {count ? `${count} plat${count > 1 ? 's' : ''}` : '—'}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>

              {/* Service actif */}
              <div className="min-w-0">
                <div className="mb-1.5">
                  <h3 className={`${kicker} text-rose-600`}>{activeDef.label}</h3>
                  <p className="text-[11.5px] italic text-charcoal-400 mt-1 normal-case tracking-normal">
                    {activeDef.subtitle}
                  </p>
                </div>

                {visibleDishes.length === 0 ? (
                  <p className="text-[12px] italic text-charcoal-400 py-3 pl-[52px]">
                    {viewMode === 'retenu'
                      ? 'Aucun plat retenu pour ce service.'
                      : 'Aucun plat proposé pour le moment.'}
                  </p>
                ) : (
                  <div className="divide-y divide-stone-100">
                    {visibleDishes.map((dish, idx) => {
                      const isEditing = editingDishId === dish.id;
                      const statusMeta = DISH_STATUS_META[dish.status];

                      if (isEditing) {
                        return (
                          <div key={dish.id} className="py-4">
                            <DishForm
                              name={editName}
                              note={editNote}
                              status={editStatus}
                              busy={busy}
                              submitLabel="Enregistrer"
                              onChangeName={setEditName}
                              onChangeNote={setEditNote}
                              onChangeStatus={setEditStatus}
                              onCancel={() => setEditingDishId(null)}
                              onSubmit={() => submitEdit(activeDef.key, dish.id)}
                            />
                          </div>
                        );
                      }

                      return (
                        <div key={dish.id} className="group flex items-start gap-3.5 py-3.5 px-2">
                          <span
                            className="text-[#E9B9C8] text-2xl leading-none pt-0.5 w-9 flex-shrink-0 text-right tabular-nums select-none"
                            style={{ fontFamily: "'Bodoni Moda', 'Didot', serif" }}
                          >
                            {String(idx + 1).padStart(2, '0')}
                          </span>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-3">
                              <p className="font-serif text-[17px] font-semibold text-charcoal-900 leading-snug">
                                {dish.name}
                              </p>
                              <button
                                type="button"
                                disabled={busy}
                                title="Changer le statut"
                                onClick={() =>
                                  onUpdateDish(activeDef.key, dish.id, { status: statusMeta.next })
                                }
                                className={`inline-flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.14em] uppercase flex-shrink-0 ${STATUS_TEXT[dish.status]} hover:opacity-70 transition-opacity`}
                              >
                                <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[dish.status]}`} />
                                {statusMeta.label}
                              </button>
                            </div>
                            {dish.note && (
                              <p className="text-[12.5px] italic text-charcoal-500 mt-0.5">
                                {dish.note}
                              </p>
                            )}
                          </div>

                          {/* Actions discrètes */}
                          <div className="flex items-center gap-2.5 pt-1 flex-shrink-0 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => openEditForm(dish)}
                              aria-label="Modifier le plat"
                              className="text-charcoal-400 hover:text-charcoal-900 transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={busy}
                              onClick={() => onRemoveDish(activeDef.key, dish.id)}
                              aria-label="Supprimer le plat"
                              className="text-charcoal-400 hover:text-rose-600 transition-colors"
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
                  <div className="mt-3">
                    {addingCourse === activeDef.key ? (
                      <DishForm
                        name={newName}
                        note={newNote}
                        status={newStatus}
                        busy={busy}
                        submitLabel="Ajouter"
                        onChangeName={setNewName}
                        onChangeNote={setNewNote}
                        onChangeStatus={setNewStatus}
                        onCancel={() => setAddingCourse(null)}
                        onSubmit={() => submitAdd(activeDef.key)}
                      />
                    ) : (
                      <div className="pl-[52px]">
                        <button
                          type="button"
                          onClick={() => openAddForm(activeDef.key)}
                          className="inline-flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.14em] uppercase text-charcoal-400 hover:text-rose-600 transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" /> Ajouter un plat
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Pied de carte */}
        <div className="mt-12 flex items-center justify-center gap-3">
          <span className="h-px w-10 bg-stone-300" />
          <Eye className="w-3.5 h-3.5 text-stone-300" />
          <span className="h-px w-10 bg-stone-300" />
        </div>
      </div>
    </section>
  );
}
