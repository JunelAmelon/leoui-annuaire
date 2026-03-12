'use client';

import { useEffect, useState, type MouseEvent } from 'react';
import { useClientData } from '@/contexts/ClientDataContext';
import { getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import { CheckCircle, Circle, CheckSquare, Plus, X, Trash2 } from 'lucide-react';

interface ChecklistItem {
  id: string;
  title: string;
  deadline?: string;
  completed: boolean;
  category: string;
  priority: 'high' | 'medium' | 'low';
  client_confirmed?: boolean;
}

const priorityConfig = {
  high: { label: 'Urgent', cls: 'bg-rose-100 text-rose-700' },
  medium: { cls: 'bg-champagne-100 text-champagne-700', label: 'Moyen' },
  low: { cls: 'bg-charcoal-100 text-charcoal-600', label: 'Faible' },
};

export default function ChecklistPage() {
  const { client, event, loading: dataLoading } = useClientData();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', deadline: '', priority: 'medium' as ChecklistItem['priority'] });

  useEffect(() => {
    async function fetchItems() {
      const eventId = event?.id;
      const clientId = client?.id;
      if (!eventId && !clientId) { setLoading(false); return; }
      try {
        const filter = eventId
          ? { field: 'event_id', operator: '==', value: eventId }
          : { field: 'client_id', operator: '==', value: clientId! };
        const tasks = await getDocuments('tasks', [filter as any]);
        const milestones = (tasks as any[]).filter((t) => t?.kind === 'milestone');
        setItems(milestones.map((s) => ({
          id: s.id,
          title: s.title,
          deadline: s.deadline,
          completed: Boolean(s.client_confirmed),
          category: 'Étapes',
          priority: s.priority || 'high',
          client_confirmed: s.client_confirmed,
        })));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    if (!dataLoading) fetchItems();
  }, [event?.id, client?.id, dataLoading]);

  const handleAdd = async () => {
    if (!form.title.trim()) { toast.error('Titre requis'); return; }
    const id = event?.id || client?.id;
    if (!id) { toast.error('Données client manquantes'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        deadline: form.deadline || null,
        priority: form.priority,
        kind: 'milestone',
        client_confirmed: false,
        admin_confirmed: false,
        event_id: event?.id || null,
        client_id: client?.id || null,
        created_at: new Date().toISOString(),
      };
      const ref = await addDocument('tasks', payload);
      setItems(prev => [...prev, { id: ref.id, title: payload.title, deadline: payload.deadline || undefined, completed: false, category: 'Étapes', priority: form.priority }]);
      toast.success('Tâche ajoutée');
      setShowModal(false);
      setForm({ title: '', deadline: '', priority: 'medium' });
    } catch { toast.error('Erreur lors de l\'ajout'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (item: ChecklistItem, e: MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Supprimer « ${item.title} » ?`)) return;
    try {
      await deleteDocument('tasks', item.id);
      setItems(prev => prev.filter(x => x.id !== item.id));
      toast.success('Tâche supprimée');
    } catch { toast.error('Erreur lors de la suppression'); }
  };

  const toggleItem = async (item: ChecklistItem) => {
    const next = !item.completed;
    try {
      await updateDocument('tasks', item.id, { client_confirmed: next });
      setItems((prev) => prev.map((x) => (x.id === item.id ? { ...x, completed: next } : x)));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = items.filter((i) => {
    if (filter === 'pending') return !i.completed;
    if (filter === 'done') return i.completed;
    return true;
  });

  const completedCount = items.filter((i) => i.completed).length;
  const progress = items.length > 0 ? Math.round((completedCount / items.length) * 100) : 0;

  if (dataLoading || loading) return (
    <div className="space-y-4 animate-pulse max-w-2xl">
      <div className="h-7 w-40 bg-charcoal-100" />
      <div className="h-20 bg-charcoal-100" />
      <div className="h-64 bg-charcoal-100" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Page header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Vos préparatifs</h1>
        </div>
        <span className="text-sm text-charcoal-500">{completedCount}/{items.length} étapes</span>
      </div>

      {/* Progress — flat editorial bar */}
      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-end justify-between mb-4">
          <p className="font-serif text-charcoal-900 text-sm font-light">Avancement global</p>
          <p
            className="font-serif text-charcoal-900"
            style={{ fontSize: '1.75rem', fontWeight: 300, lineHeight: 1, letterSpacing: '-0.02em' }}
          >
            {progress}<span className="text-base text-charcoal-400 ml-0.5">%</span>
          </p>
        </div>
        <div className="w-full h-0.5 bg-charcoal-100">
          <div className="h-full bg-charcoal-900 transition-all duration-700" style={{ width: `${progress}%` }} />
        </div>
        <p className="label-xs text-charcoal-400 mt-3 tracking-[0.08em]">
          {completedCount} sur {items.length} étapes complétées
        </p>
      </div>

      {/* Add button */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 flex-wrap">
        {(['all', 'pending', 'done'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-xs font-medium tracking-[0.07em] uppercase transition-colors duration-200 ${
              filter === f
                ? 'bg-charcoal-900 text-white'
                : 'bg-white border border-charcoal-200 text-charcoal-500 hover:border-charcoal-400 hover:text-charcoal-800'
            }`}
          >
            {f === 'all' ? 'Toutes' : f === 'pending' ? 'En attente' : 'Complétées'}
          </button>
        ))}
        </div>
        <button onClick={() => setShowModal(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-charcoal-900 text-white text-xs font-medium hover:bg-charcoal-700 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Nouvelle tâche
        </button>
      </div>

      {/* Items — editorial list */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-3 text-charcoal-200" />
            <p className="font-serif text-charcoal-400 text-base font-light">
              {filter === 'done' ? 'Aucune étape complétée' : 'Aucune étape en attente'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-100">
            {filtered.map((item) => (
              <div
                key={item.id}
                className={`flex items-start gap-4 px-6 py-4 transition-colors duration-150 group ${
                  item.completed ? 'bg-ivory-50' : 'hover:bg-ivory-50'
                }`}
              >
                {/* Checkbox */}
                <div className="mt-0.5 flex-shrink-0 cursor-pointer" onClick={() => toggleItem(item)}>
                  {item.completed
                    ? <CheckCircle className="w-4.5 h-4.5 text-champagne-600" />
                    : <Circle className="w-4.5 h-4.5 text-charcoal-200 group-hover:text-charcoal-400 transition-colors" />
                  }
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-light leading-snug ${
                    item.completed ? 'text-charcoal-400 line-through' : 'text-charcoal-900'
                  }`}>{item.title}</p>
                  {item.deadline && (
                    <p className="label-xs text-charcoal-400 mt-1 tracking-[0.08em]">
                      Échéance — {new Date(item.deadline).toLocaleDateString('fr-FR')}
                    </p>
                  )}
                </div>

                {/* Priority badge — flat */}
                <span className={`flex-shrink-0 text-[0.65rem] font-semibold tracking-[0.1em] uppercase px-2 py-0.5 ${
                  (priorityConfig[item.priority] || priorityConfig.medium).cls
                }`}>
                  {(priorityConfig[item.priority] || priorityConfig.medium).label}
                </span>
                {/* Delete */}
                <button onClick={(e) => handleDelete(item, e)}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-charcoal-300 hover:text-rose-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── ADD TASK MODAL ── */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-charcoal-900/50 p-0 sm:p-4">
          <div className="w-full sm:max-w-md bg-white shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-charcoal-100">
              <h2 className="font-serif text-charcoal-900 text-base font-light">Nouvelle tâche</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 text-charcoal-400 hover:text-charcoal-700 transition-colors"><X className="w-4 h-4" /></button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Titre *</label>
                <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors"
                  placeholder="Ex: Choisir le photographe" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Échéance</label>
                  <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors" />
                </div>
                <div>
                  <label className="label-xs text-charcoal-500 mb-1.5 block tracking-[0.08em]">Priorité</label>
                  <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value as ChecklistItem['priority'] }))}
                    className="w-full px-3 py-2.5 border border-charcoal-200 text-sm focus:outline-none focus:border-charcoal-400 transition-colors cursor-pointer">
                    <option value="high">Urgent</option>
                    <option value="medium">Moyen</option>
                    <option value="low">Faible</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-charcoal-100 flex gap-3">
              <button onClick={() => setShowModal(false)} className="flex-1 py-2.5 border border-charcoal-200 text-charcoal-700 text-sm font-light hover:bg-charcoal-50 transition-colors">Annuler</button>
              <button onClick={handleAdd} disabled={saving}
                className="flex-1 py-2.5 bg-charcoal-900 text-white text-sm font-medium hover:bg-charcoal-700 disabled:opacity-50 transition-colors">
                {saving ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
