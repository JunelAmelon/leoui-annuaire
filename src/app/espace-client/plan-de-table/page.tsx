'use client';

/**
 * Plan de table — canvas 2D interactif.
 * Wizard de génération, tables + éléments draggables, rotation, couleurs,
 * types de chaises (enfant/PMR/VIP), fond de salle personnalisé,
 * placement d'invités par clic ou glisser-déposer, undo/redo, zoom.
 * Aucun accès Firestore direct — tout passe par le service (DIP).
 */

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import {
  Loader2, Trash2, Users, Undo2, Redo2, ZoomIn, ZoomOut,
  Wand2, RefreshCw, Search, GripVertical, Baby, Accessibility, Crown, X,
  Heart, RotateCw, RotateCcw,
  Box,
} from 'lucide-react';
import { toast } from 'sonner';
import { FirestoreSeatingRepository, fetchConfirmedGuests, type SeatingGuest } from '@/features/seating/repositories/seating.repository';
import { createSeatingService, ROOM_ITEM_DEFS } from '@/features/seating/services/seating.service';
import type { SeatingPlan, SeatingTable, RoomItem, RoomItemType, TableShape, SeatAssignments, SeatType } from '@/features/seating/domain/types';
import { TABLE_SHAPES, seatKey } from '@/features/seating/domain/types';
import { SetupWizard } from '@/features/seating/ui/SetupWizard';
import { ITEM_ICONS, ITEM_ICON_SMALL } from '@/features/seating/ui/item-icons';
import dynamic from 'next/dynamic';

const Scene3D = dynamic(() => import('@/features/seating/ui/Scene3D'), { ssr: false });

const repo = new FirestoreSeatingRepository();
const service = createSeatingService(repo);

/** Canvas virtuel 1000×700 — positions en unités du plan, responsive via viewBox. */
const W = 1000;
const H = 700;
const TABLE_W = 150;
const TABLE_H = 60;
const ROUND_R = 42;

/** Dimensions d'une chaise (style plan d'architecte) */
const CHAIR_W = 15;
const CHAIR_H = 10;

/** Palette nappes — tons LeOui. */
const TABLE_COLORS = ['#FFFFFF', '#FAF6F2', '#F3E4DC', '#FBE8ED', '#E9EFE6', '#E4E9F1'];

const SEAT_TYPES: { value: SeatType; label: string; icon: React.ReactNode; fill: string; stroke: string }[] = [
  { value: 'enfant', label: 'Enfant', icon: <Baby className="w-3.5 h-3.5" />, fill: '#FBD3E0', stroke: '#E5A0B7' },
  { value: 'pmr', label: 'PMR', icon: <Accessibility className="w-3.5 h-3.5" />, fill: '#D7E4F4', stroke: '#8FB3DB' },
  { value: 'vip', label: 'VIP', icon: <Crown className="w-3.5 h-3.5" />, fill: '#F3E4C0', stroke: '#CBA75B' },
];
const seatStyle = (t?: SeatType) => SEAT_TYPES.find((s) => s.value === t);

interface Snapshot { tables: SeatingTable[]; room_items: RoomItem[]; assignments: SeatAssignments }
const snap = (p: SeatingPlan): Snapshot => ({ tables: p.tables, room_items: p.room_items, assignments: p.assignments });

export default function PlanDeTablePage() {
  const { user } = useAuth();
  const { event, client, loading: clientLoading } = useClientData();
  const eventId = event?.id || client?.id || '';

  const [plan, setPlan] = useState<SeatingPlan | null>(null);
  const [guests, setGuests] = useState<SeatingGuest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGuest, setSelectedGuest] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [zoom, setZoom] = useState(1);
  const [seatTool, setSeatTool] = useState<SeatType | null>(null);
  const [toolTab, setToolTab] = useState<'tables' | 'animations'>('tables');
  const [preview3D, setPreview3D] = useState(false);

  const past = useRef<Snapshot[]>([]);
  const future = useRef<Snapshot[]>([]);

  const svgRef = useRef<SVGSVGElement | null>(null);
  const gRef = useRef<SVGGElement | null>(null);
  const dragRef = useRef<{ kind: 'table' | 'item' | 'rotate'; id: string; dx: number; dy: number; moved: boolean } | null>(null);

  useEffect(() => {
    if (clientLoading || !eventId) return;
    (async () => {
      try {
        const [p, g] = await Promise.all([
          service.getOrCreate(eventId, user?.uid || 'owner'),
          fetchConfirmedGuests(eventId),
        ]);
        setPlan(p);
        setGuests(g);
        if (p.tables.length === 0) setWizardOpen(true);
      } catch (e) {
        console.error(e);
        toast.error('Impossible de charger le plan de table.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId, clientLoading]);

  /* ── Helpers ── */
  const guestById = (id?: string | null) => guests.find((g) => g.id === id);
  const assignedIds = new Set(plan ? Object.values(plan.assignments) : []);
  const unassigned = guests
    .filter((g) => !assignedIds.has(g.id))
    .filter((g) => !search || g.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => (a.side || '').localeCompare(b.side || '') || a.name.localeCompare(b.name));

  const checkpoint = () => {
    if (!plan) return;
    past.current.push(snap(plan));
    if (past.current.length > 40) past.current.shift();
    future.current = [];
  };
  const restore = (s: Snapshot) => {
    if (!plan) return;
    setPlan({ ...plan, ...s });
    service.save({ ...plan, ...s } as SeatingPlan);
  };
  const undo = () => { const s = past.current.pop(); if (s && plan) { future.current.push(snap(plan)); restore(s); } };
  const redo = () => { const s = future.current.pop(); if (s && plan) { past.current.push(snap(plan)); restore(s); } };

  /* ── Géométrie ── */
  const tableSize = (t: SeatingTable) =>
    t.shape === 'round' ? { w: ROUND_R * 2, h: ROUND_R * 2 } : { w: TABLE_W, h: TABLE_H };
  const tableCenter = (t: SeatingTable) => {
    const { w, h } = tableSize(t);
    return { x: t.x + w / 2, y: t.y + h / 2 };
  };
  /**
   * Positions + angle de rotation des chaises autour de la table.
   * angle=0 : chaise face vers le bas (vers l'intérieur).
   * Pour les rondes/ovales : chaque chaise pivote pour pointer vers le centre.
   */
  const seatPositions = (t: SeatingTable): { x: number; y: number; angle: number }[] => {
    const c = tableCenter(t);
    const pts: { x: number; y: number; angle: number }[] = [];

    if (t.shape === 'round') {
      /* Tables rondes — chaises en couronne, orientées vers le centre */
      const r = ROUND_R + CHAIR_H + 2;
      for (let i = 0; i < t.seats; i++) {
        const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
        pts.push({
          x: c.x + Math.cos(a) * r,
          y: c.y + Math.sin(a) * r,
          angle: (a * 180) / Math.PI + 90, // dos de la chaise face au centre
        });
      }
    } else if (t.shape === 'oval') {
      /* Tables ovales — chaises sur une ellipse légèrement plus grande */
      const { w, h } = tableSize(t);
      const rx = w / 2 + CHAIR_H + 3;
      const ry = h / 2 + CHAIR_H + 3;
      for (let i = 0; i < t.seats; i++) {
        const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
        pts.push({
          x: c.x + Math.cos(a) * rx,
          y: c.y + Math.sin(a) * ry,
          angle: (a * 180) / Math.PI + 90,
        });
      }
    } else {
      /* Tables rectangulaires / table d'honneur — chaises sur côtés haut + bas */
      const { w, h } = tableSize(t);
      const top = Math.ceil(t.seats / 2);
      const bottom = t.seats - top;
      const gap = CHAIR_H + 4; // écart bord table ↔ centre chaise
      for (let i = 0; i < top; i++)
        pts.push({ x: t.x + (w * (i + 0.5)) / top, y: t.y - gap, angle: 180 }); // chaise face vers bas
      for (let i = 0; i < bottom; i++)
        pts.push({ x: t.x + (w * (i + 0.5)) / bottom, y: t.y + h + gap, angle: 0 }); // chaise face vers haut
    }
    return pts;
  };

  const toSvgPoint = (e: React.PointerEvent | React.DragEvent | PointerEvent) => {
    const pt = (svgRef.current as SVGSVGElement).createSVGPoint();
    pt.x = e.clientX; pt.y = e.clientY;
    return pt.matrixTransform(gRef.current!.getScreenCTM()!.inverse());
  };

  /* ── Drag ── */
  const startDrag = (kind: 'table' | 'item', id: string, ox: number, oy: number, e: React.PointerEvent) => {
    e.stopPropagation();
    setSelectedId(id);
    const p = toSvgPoint(e);
    dragRef.current = { kind, id, dx: p.x - ox, dy: p.y - oy, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  /** Centre d'un élément quelconque (table ou item) en unités du plan. */
  const elementCenter = (id: string): { x: number; y: number } | null => {
    const t = plan?.tables.find((x) => x.id === id);
    if (t) return tableCenter(t);
    const i = plan?.room_items.find((x) => x.id === id);
    return i ? { x: i.x + i.w / 2, y: i.y + i.h / 2 } : null;
  };

  const startRotate = (id: string, e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    dragRef.current = { kind: 'rotate', id, dx: 0, dy: 0, moved: false };
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current || !plan) return;
    dragRef.current.moved = true;
    const p = toSvgPoint(e);
    const { kind, id, dx, dy } = dragRef.current;
    if (kind === 'rotate') {
      // Rotation libre : angle entre le centre de l'élément et le curseur
      const c = elementCenter(id);
      if (!c) return;
      const deg = Math.atan2(p.y - c.y, p.x - c.x) * (180 / Math.PI) + 90;
      const rot = Math.round(((deg % 360) + 360) % 360);
      setPlan({
        ...plan,
        tables: plan.tables.map((t) => (t.id === id ? { ...t, rotation: rot } : t)),
        room_items: plan.room_items.map((i) => (i.id === id ? { ...i, rotation: rot } : i)),
      });
      return;
    }
    if (kind === 'table') {
      const t = plan.tables.find((x) => x.id === id);
      if (!t) return;
      const { w, h } = tableSize(t);
      const nx = Math.min(Math.max(p.x - dx, -w / 2), W - w / 2);
      const ny = Math.min(Math.max(p.y - dy, -h / 2), H - h / 2);
      setPlan({ ...plan, tables: plan.tables.map((x) => (x.id === id ? { ...x, x: nx, y: ny } : x)) });
    } else {
      const it = plan.room_items.find((x) => x.id === id);
      if (!it) return;
      const nx = Math.min(Math.max(p.x - dx, -it.w / 2), W - it.w / 2);
      const ny = Math.min(Math.max(p.y - dy, -it.h / 2), H - it.h / 2);
      setPlan({ ...plan, room_items: plan.room_items.map((x) => (x.id === id ? { ...x, x: nx, y: ny } : x)) });
    }
  };
  const onPointerUp = async () => {
    const d = dragRef.current;
    if (d && plan && d.moved) {
      if (d.kind === 'table') {
        const t = plan.tables.find((x) => x.id === d.id);
        if (t) { checkpoint(); const tables = await service.moveTable(plan, t.id, t.x, t.y); setPlan((p) => p && { ...p, tables }); }
      } else if (d.kind === 'rotate') {
        const el = plan.tables.find((x) => x.id === d.id) || plan.room_items.find((x) => x.id === d.id);
        if (el) { checkpoint(); await service.rotateElement(plan, d.id, el.rotation); }
      } else {
        const it = plan.room_items.find((x) => x.id === d.id);
        if (it) { checkpoint(); const room_items = await service.moveRoomItem(plan, it.id, it.x, it.y); setPlan((p) => p && { ...p, room_items }); }
      }
    }
    dragRef.current = null;
  };

  /* ── Actions ── */
  const patchTable = async (patch: Partial<SeatingTable>) => {
    if (!plan || !selectedId) return;
    checkpoint();
    const tables = await service.updateTable(plan, selectedId, patch);
    setPlan({ ...plan, tables });
  };

  const rotateSelected = async (delta: number) => {
    if (!plan || !selectedId) return;
    checkpoint();
    const next = await service.rotateElement(plan, selectedId, delta, true);
    setPlan(next);
  };

  const addTable = async (shape: TableShape) => {
    if (!plan) return;
    checkpoint();
    const def = TABLE_SHAPES.find((s) => s.value === shape)!;
    const tables = await service.addTable(plan, shape, def.defaultSeats);
    setPlan({ ...plan, tables });
  };

  const addItem = async (type: RoomItemType) => {
    if (!plan) return;
    checkpoint();
    const room_items = await service.addRoomItem(plan, type);
    setPlan({ ...plan, room_items });
  };

  const removeSelected = async () => {
    if (!plan || !selectedId) return;
    checkpoint();
    if (plan.tables.some((t) => t.id === selectedId)) {
      const { tables, assignments } = await service.removeTable(plan, selectedId);
      setPlan({ ...plan, tables, assignments });
      toast.success('Table supprimée.');
    } else {
      const room_items = await service.removeRoomItem(plan, selectedId);
      setPlan({ ...plan, room_items });
      toast.success('Élément supprimé.');
    }
    setSelectedId(null);
  };

  const onSeatClick = async (tableId: string, seatIndex: number) => {
    if (!plan) return;
    // Outil type de chaise actif → on applique le type au lieu d'assigner
    if (seatTool) {
      checkpoint();
      const t = plan.tables.find((x) => x.id === tableId);
      const cur = t?.seat_types?.[seatIndex];
      const tables = await service.setSeatType(plan, tableId, seatIndex, cur === seatTool ? null : seatTool);
      setPlan({ ...plan, tables });
      return;
    }
    const key = seatKey(tableId, seatIndex);
    const occupant = plan.assignments[key];
    if (occupant) {
      checkpoint();
      const assignments = await service.assign(plan, tableId, seatIndex, null);
      setPlan({ ...plan, assignments });
      return;
    }
    if (!selectedGuest) return;
    checkpoint();
    const assignments = await service.assign(plan, tableId, seatIndex, selectedGuest);
    setPlan({ ...plan, assignments });
    setSelectedGuest(null);
    toast.success(`${guestById(selectedGuest)?.name} placé(e).`);
  };

  const onSeatDrop = (tableId: string, seatIndex: number, e: React.DragEvent) => {
    e.preventDefault();
    const gid = e.dataTransfer.getData('text/guest-id');
    if (!gid || !plan || plan.assignments[seatKey(tableId, seatIndex)]) return;
    (async () => {
      checkpoint();
      const assignments = await service.assign(plan, tableId, seatIndex, gid);
      setPlan({ ...plan, assignments });
      toast.success(`${guestById(gid)?.name} placé(e).`);
    })();
  };

  const autoAssign = async () => {
    if (!plan) return;
    checkpoint();
    const assignments = await service.autoAssign(plan, guests);
    setPlan({ ...plan, assignments });
    toast.success(`${Object.keys(assignments).length} invité(s) placé(s).`);
  };

  const generateHall = async (opts: { tableCount: number; shape: TableShape; seats: number; roomItems: RoomItemType[] }) => {
    if (!plan) return;
    checkpoint();
    const next = await service.generateHall(plan, opts);
    setPlan(next);
    setWizardOpen(false);
    setSelectedId(null);
    toast.success('Salle générée — ajustez les positions à la souris.');
  };

  /** Poignée de rotation — petite bulle ⟳ au-dessus de l'élément sélectionné. */
  const RotateHandle = ({ cx, topY, id }: { cx: number; topY: number; id: string }) => (
    <g className="cursor-grab" onPointerDown={(e) => startRotate(id, e)}>
      <line x1={cx} y1={topY} x2={cx} y2={topY - 26} stroke="#E11D48" strokeWidth={1.2} strokeDasharray="3 3" />
      <circle cx={cx} cy={topY - 34} r={10} fill="white" stroke="#E11D48" strokeWidth={1.5} />
      <text x={cx} y={topY - 30} textAnchor="middle" fontSize="11" fill="#E11D48" fontWeight="700" pointerEvents="none">⟳</text>
    </g>
  );

  const selectedTable = plan?.tables.find((t) => t.id === selectedId) || null;
  const selectedItem = plan?.room_items.find((i) => i.id === selectedId) || null;

  /** Carte univers mariage — rendue sous le header sur mobile, dans l'aside sur desktop. */
  const WeddingCard = ({ className = '' }: { className?: string }) => (
    <div className={`relative rounded-lg overflow-hidden h-40 ${className}`}>
      <img src="/seating-inspiration.jpg" alt="Table de mariage décorée" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#2A1A1E]/85 via-[#2A1A1E]/30 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <p className="flex items-center gap-1.5 text-rose-200 text-[10px] font-semibold tracking-[0.12em] uppercase mb-1">
          <Heart className="w-3 h-3" /> Le jour J
        </p>
        <p className="font-serif text-white text-sm leading-snug" style={{ fontStyle: 'italic' }}>
          « Chaque invité à sa place, pour un dîner inoubliable. »
        </p>
      </div>
    </div>
  );

  if (loading || clientLoading)
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-7 h-7 text-rose-600 animate-spin" />
      </div>
    );

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-10">
      {/* En-tête DA */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-rose-500 mb-1.5">Organisation · Espace couple</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem,2.5vw,1.9rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            Plan de table
          </h1>
          <p className="text-xs text-charcoal-400 mt-1">
            Glissez les tables · sélectionnez un invité puis cliquez une chaise
          </p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 bg-white border border-stone-200 rounded-lg px-1 py-1">
            <button type="button" onClick={undo} disabled={!past.current.length} title="Annuler"
              className="w-8 h-8 rounded-md flex items-center justify-center text-charcoal-500 hover:bg-stone-100 disabled:opacity-30 transition-colors">
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-5 bg-stone-200" />
            <button type="button" onClick={redo} disabled={!future.current.length} title="Rétablir"
              className="w-8 h-8 rounded-md flex items-center justify-center text-charcoal-500 hover:bg-stone-100 disabled:opacity-30 transition-colors">
              <Redo2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <button type="button" onClick={() => setWizardOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-rose-600 text-xs font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm">
            <RefreshCw className="w-3.5 h-3.5" /> Assistant salle
          </button>
        </div>
      </div>

      {/* Carte mariage — mobile : juste sous le titre */}
      <WeddingCard className="lg:hidden" />

      <div className="flex flex-col lg:flex-row gap-5">
        {/* ── Aside gauche ── */}
        <aside className="lg:w-60 flex-shrink-0 space-y-4">

          {/* Panneau invités */}
          <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
            <div className="px-4 pt-4 pb-3 border-b border-stone-100">
              <div className="flex items-center justify-between mb-3">
                <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-[0.1em] uppercase text-charcoal-400">
                  <Users className="w-3 h-3" /> À placer
                  <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-rose-50 text-rose-600 text-[9px] font-bold leading-none">{unassigned.length}</span>
                </span>
                <button type="button" onClick={autoAssign} title="Répartir automatiquement"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-600 text-[10px] font-semibold text-white hover:bg-rose-700 transition-colors shadow-sm">
                  <Wand2 className="w-3 h-3" /> Auto
                </button>
              </div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-stone-300 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher…"
                  className="w-full h-8 pl-8 pr-3 bg-stone-50 border border-stone-200 rounded-md text-xs focus:outline-none focus:border-rose-400 placeholder:text-stone-300" />
              </div>
            </div>
            <div className="max-h-[300px] overflow-y-auto">
              {unassigned.length === 0 ? (
                <p className="text-xs text-charcoal-400 py-5 px-4 text-center">
                  {guests.length === 0 ? 'Aucun invité confirmé.' : '✓ Tous les invités sont placés'}
                </p>
              ) : unassigned.map((g) => (
                <div key={g.id} draggable
                  onDragStart={(e) => { e.dataTransfer.setData('text/guest-id', g.id); setSelectedGuest(g.id); }}
                  onClick={() => setSelectedGuest(selectedGuest === g.id ? null : g.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 cursor-grab transition-all border-l-2 ${
                    selectedGuest === g.id ? 'bg-rose-50 border-rose-500' : 'border-transparent hover:bg-stone-50'
                  }`}>
                  <GripVertical className="w-3 h-3 opacity-20 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className={`block text-xs truncate ${selectedGuest === g.id ? 'text-rose-700 font-semibold' : 'text-charcoal-700'}`}>
                      {g.name}
                    </span>
                    {g.table && <span className="block text-[9px] text-charcoal-400 truncate">→ {g.table}</span>}
                  </span>
                  {g.has_children && (g.children_count || 0) > 0 && (
                    <span className="text-[9px] text-rose-400 font-semibold shrink-0">{g.children_count} enf.</span>
                  )}
                </div>
              ))}
            </div>
            <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/60 flex items-center justify-between">
              <span className="text-[9px] text-charcoal-300 uppercase tracking-wide font-semibold">Placés</span>
              <span className="text-xs font-bold text-charcoal-600">{assignedIds.size}<span className="text-charcoal-300 font-normal">/{guests.length}</span></span>
            </div>
          </div>

          {/* Panneau édition sélection */}
          {(selectedTable || selectedItem) && (
            <div className="bg-white rounded-xl border border-stone-200/80 shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
                <span className="text-[10px] font-semibold tracking-[0.1em] uppercase text-charcoal-400">
                  {selectedTable ? 'Table' : 'Élément'}
                </span>
                <button type="button" onClick={() => setSelectedId(null)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-charcoal-300 hover:text-charcoal-600 hover:bg-stone-100 transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="p-4 space-y-4">
                {selectedTable && (
                  <>
                    <input defaultValue={selectedTable.label} key={selectedTable.id}
                      onBlur={(e) => patchTable({ label: e.target.value || selectedTable.label })}
                      onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
                      className="w-full h-9 px-0 bg-transparent border-b border-stone-200 font-serif text-sm font-semibold text-charcoal-900 focus:outline-none focus:border-rose-400"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-charcoal-400">Places</span>
                      <div className="flex items-center gap-1.5">
                        <button type="button" onClick={() => patchTable({ seats: Math.max(2, selectedTable.seats - 1) })}
                          className="w-7 h-7 rounded-md bg-stone-100 text-charcoal-600 font-bold text-sm hover:bg-rose-50 hover:text-rose-600 transition-colors">−</button>
                        <span className="text-sm font-bold text-charcoal-900 w-6 text-center">{selectedTable.seats}</span>
                        <button type="button" onClick={() => patchTable({ seats: Math.min(14, selectedTable.seats + 1) })}
                          className="w-7 h-7 rounded-md bg-stone-100 text-charcoal-600 font-bold text-sm hover:bg-rose-50 hover:text-rose-600 transition-colors">+</button>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-charcoal-400 mb-2">Couleur de nappe</p>
                      <div className="flex gap-1.5 flex-wrap">
                        {TABLE_COLORS.map((c) => (
                          <button key={c} type="button" onClick={() => patchTable({ color: c === '#FFFFFF' ? undefined : c })}
                            className={`w-7 h-7 rounded-lg border-2 transition-all ${
                              (selectedTable.color || '#FFFFFF') === c ? 'border-rose-500 scale-110 shadow-sm' : 'border-transparent hover:border-stone-300'
                            }`}
                            style={{ background: c }} />
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-charcoal-400 mb-2">
                        Chaises spéciales{seatTool && <span className="text-rose-500 ml-1">· cliquez une chaise</span>}
                      </p>
                      <div className="grid grid-cols-3 gap-1.5">
                        {SEAT_TYPES.map((s) => (
                          <button key={s.value} type="button"
                            onClick={() => setSeatTool(seatTool === s.value ? null : s.value)}
                            className={`flex flex-col items-center gap-1 py-2 rounded-lg border text-[9px] font-semibold transition-all ${
                              seatTool === s.value
                                ? 'border-rose-500 bg-rose-50 text-rose-700 shadow-sm'
                                : 'border-stone-200 text-charcoal-400 hover:border-stone-300 hover:bg-stone-50'
                            }`}>
                            {s.icon} {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </>
                )}
                {!(selectedTable?.shape === 'round') && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-charcoal-400">Rotation</span>
                    <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => rotateSelected(-45)} title="-45°"
                        className="w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center text-charcoal-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                        <RotateCcw className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-charcoal-900 w-10 text-center">
                        {(selectedTable || selectedItem)?.rotation || 0}°
                      </span>
                      <button type="button" onClick={() => rotateSelected(45)} title="+45°"
                        className="w-7 h-7 rounded-md bg-stone-100 flex items-center justify-center text-charcoal-500 hover:bg-rose-50 hover:text-rose-600 transition-colors">
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}
                <button type="button" onClick={removeSelected}
                  className="w-full flex items-center justify-center gap-1.5 h-8 rounded-lg border border-rose-100 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Supprimer {selectedTable ? 'la table' : "l’élément"}
                </button>
              </div>
            </div>
          )}

          {/* Carte univers mariage (desktop) */}
          <WeddingCard className="hidden lg:block" />
        </aside>

        {/* ── Plan ── */}
        <div className="flex-1 min-w-0">
          {/* Barre d'outils — onglets Tables / Animations */}
          <div className="flex items-center gap-3 flex-wrap mb-3">
            <div className="relative flex p-1 rounded-full bg-white border border-stone-200 shadow-sm">
              {/* Pilule glissante derrière l'onglet actif */}
              <span
                className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-full bg-rose-600 shadow transition-transform duration-200 ${
                  toolTab === 'tables' ? 'translate-x-0 left-1' : 'translate-x-full left-1'
                }`}
              />
              {(['tables', 'animations'] as const).map((tab) => (
                <button key={tab} type="button" onClick={() => setToolTab(tab)}
                  className={`relative z-10 flex-1 px-4 py-1.5 rounded-full text-xs font-semibold transition-colors duration-200 ${
                    toolTab === tab ? 'text-white' : 'text-charcoal-500 hover:text-charcoal-700'
                  }`}>
                  {tab === 'tables' ? 'Tables' : 'Animations'}
                </button>
              ))}
            </div>
            {toolTab === 'tables' ? (
              <div className="flex items-center gap-2 flex-wrap">
                {TABLE_SHAPES.map((s) => (
                  <button key={s.value} type="button" onClick={() => addTable(s.value)}
                    className="px-3.5 py-2 rounded-lg bg-white border border-dashed border-stone-300 text-xs font-medium text-charcoal-500 hover:border-rose-400 hover:text-rose-600 transition-colors">
                    {s.label}
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                {(Object.keys(ROOM_ITEM_DEFS) as RoomItemType[]).map((type) => (
                  <button key={type} type="button" onClick={() => addItem(type)}
                    className="px-3.5 py-2 rounded-lg bg-white border border-dashed border-stone-300 text-xs font-medium text-charcoal-500 hover:border-rose-400 hover:text-rose-600 transition-colors">
                    {ROOM_ITEM_DEFS[type].label}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-1.5 ml-auto">
              <button type="button" onClick={() => setPreview3D(true)} title="Vue 3D"
                className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg bg-white border border-stone-200 text-xs font-semibold text-charcoal-600 hover:border-rose-400 hover:text-rose-600 transition-colors">
                <Box className="w-3.5 h-3.5" /> 3D
              </button>
              <div className="w-px h-5 bg-stone-200" />
              <button type="button" onClick={() => setZoom((z) => Math.max(0.5, z - 0.15))} title="Zoom -"
                className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-charcoal-500 hover:border-rose-400">
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <button type="button" onClick={() => setZoom((z) => Math.min(2, z + 0.15))} title="Zoom +"
                className="w-8 h-8 rounded-lg bg-white border border-stone-200 flex items-center justify-center text-charcoal-500 hover:border-rose-400">
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Canvas — sol légèrement teinté pour que les tables blanches ressortent */}
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-[#F9F8F7]">
            <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`}
              className="w-full select-none touch-none block"
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerLeave={onPointerUp}
              onClick={() => { setSelectedId(null); setSeatTool(null); }}>
              <g ref={gRef} transform={`translate(${(1 - zoom) * W / 2} ${(1 - zoom) * H / 2}) scale(${zoom})`}>
                {/* Limite de salle — filet discret */}
                <rect x={6} y={6} width={W - 12} height={H - 12} rx={14} fill="none" stroke="#E7E5E4" strokeWidth={1.5} />

                {plan!.tables.length === 0 && plan!.room_items.length === 0 && (
                  <text x={W / 2} y={H / 2} textAnchor="middle" fill="#A0978F" fontSize="20" fontFamily="serif" fontStyle="italic">
                    Lancez l’assistant pour générer votre salle en 1 minute
                  </text>
                )}

                {/* Éléments de salle — fond blanc doux, icône Flaticon-flat + label */}
                {plan!.room_items.map((it) => {
                  const sel = selectedId === it.id;
                  const cx = it.x + it.w / 2;
                  const cy = it.y + it.h / 2;
                  const isLarge = it.h >= 70;
                  return (
                    <g key={it.id} transform={`rotate(${it.rotation} ${cx} ${cy})`}>
                      <g onPointerDown={(e) => startDrag('item', it.id, it.x, it.y, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-grab active:cursor-grabbing">
                        {/* Ombre légère */}
                        <rect x={it.x + 1.5} y={it.y + 2} width={it.w} height={it.h}
                          rx={10} fill="rgba(0,0,0,0.05)" />
                        {/* Corps */}
                        <rect x={it.x} y={it.y} width={it.w} height={it.h}
                          rx={10} fill="#FAFAF9"
                          stroke={sel ? '#E11D48' : '#E2DCDA'} strokeWidth={sel ? 2 : 1}
                          strokeDasharray={it.type === 'entrance' ? '6 4' : '0'} />
                        {/* Icône + label via foreignObject */}
                        <foreignObject x={it.x} y={it.y} width={it.w} height={it.h} pointerEvents="none">
                          <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: isLarge ? 'column' : 'row', alignItems: 'center', justifyContent: 'center', gap: isLarge ? 4 : 6, padding: '4px 6px', boxSizing: 'border-box' }}>
                            <span style={{ display: 'flex', flexShrink: 0 }}>{ITEM_ICON_SMALL(it.type)}</span>
                            {it.w > 65 && (
                              <span style={{ fontSize: 9.5, fontWeight: 700, color: '#57534E', textAlign: 'center', lineHeight: 1.3, letterSpacing: '0.01em' }}>
                                {it.label}
                              </span>
                            )}
                          </div>
                        </foreignObject>
                      </g>
                      {sel && <RotateHandle cx={cx} topY={it.y - 6} id={it.id} />}
                    </g>
                  );
                })}

                {/* Tables + chaises */}
                {plan!.tables.map((t) => {
                  const { w, h } = tableSize(t);
                  const c = tableCenter(t);
                  const seats = seatPositions(t);
                  const sel = selectedId === t.id;
                  const tColor = t.color || '#EDE8E3'; // beige doux par défaut
                  const occupied = Object.keys(plan!.assignments).filter((k) => k.startsWith(`${t.id}_`)).length;
                  return (
                    <g key={t.id} transform={`rotate(${t.rotation} ${c.x} ${c.y})`}>

                      {/* Chaises — rectangles arrondis orientés (style plan architecte) */}
                      {seats.map((p, i) => {
                        const key = seatKey(t.id, i);
                        const occ = plan!.assignments[key];
                        const g = guestById(occ);
                        const st = seatStyle(t.seat_types?.[i]);
                        const awaiting = !occ && !!selectedGuest;
                        const cFill = occ ? '#C4849A' : st ? st.fill : '#D6CFC9';
                        const cStroke = (seatTool || awaiting) && !occ ? '#E11D48' : occ ? '#BE123C' : st ? st.stroke : '#B5AEA8';
                        const cW = st?.value === 'enfant' ? CHAIR_W - 3 : CHAIR_W;
                        const cH = st?.value === 'enfant' ? CHAIR_H - 2 : CHAIR_H;
                        return (
                          <g key={key}
                            transform={`rotate(${p.angle} ${p.x} ${p.y})`}
                            onClick={(e) => { e.stopPropagation(); onSeatClick(t.id, i); }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => onSeatDrop(t.id, i, e)}
                            className="cursor-pointer">
                            {g && <title>{g.name}</title>}
                            {/* Corps de la chaise */}
                            <rect x={p.x - cW / 2} y={p.y - cH / 2} width={cW} height={cH} rx={3}
                              fill={cFill} stroke={cStroke} strokeWidth={(seatTool || awaiting) && !occ ? 2 : 0.8} />
                            {/* Dossier (petite bande supérieure) */}
                            <rect x={p.x - cW / 2} y={p.y - cH / 2 - 3} width={cW} height={3} rx={1.5}
                              fill={cFill} stroke={cStroke} strokeWidth={(seatTool || awaiting) && !occ ? 2 : 0.8} />
                            {/* Initiale si occupé */}
                            {occ && g && (
                              <text x={p.x} y={p.y + 3} textAnchor="middle" fontSize="6.5" fill="white"
                                fontWeight="700" pointerEvents="none">
                                {g.name.slice(0, 1).toUpperCase()}
                              </text>
                            )}
                          </g>
                        );
                      })}

                      {/* Surface de la table */}
                      <g onPointerDown={(e) => startDrag('table', t.id, t.x, t.y, e)}
                        onClick={(e) => e.stopPropagation()}
                        className="cursor-grab active:cursor-grabbing">
                        {t.shape === 'round' ? (
                          <>
                            {/* Ombre légère */}
                            <circle cx={c.x + 1.5} cy={c.y + 2} r={ROUND_R} fill="rgba(0,0,0,0.06)" />
                            {/* Table */}
                            <circle cx={c.x} cy={c.y} r={ROUND_R} fill={tColor}
                              stroke={sel ? '#E11D48' : '#B4A79C'} strokeWidth={sel ? 2.5 : 1.5} />
                            {/* Anneau intérieur (bordure de nappe) */}
                            <circle cx={c.x} cy={c.y} r={ROUND_R - 5} fill="none"
                              stroke={sel ? '#E11D48' : '#C8BCAF'} strokeWidth={0.75} strokeDasharray="4 3" />
                          </>
                        ) : t.shape === 'oval' ? (
                          <>
                            <ellipse cx={c.x + 1.5} cy={c.y + 2} rx={w / 2} ry={h / 2} fill="rgba(0,0,0,0.06)" />
                            <ellipse cx={c.x} cy={c.y} rx={w / 2} ry={h / 2} fill={tColor}
                              stroke={sel ? '#E11D48' : '#B4A79C'} strokeWidth={sel ? 2.5 : 1.5} />
                            <ellipse cx={c.x} cy={c.y} rx={w / 2 - 5} ry={h / 2 - 5} fill="none"
                              stroke={sel ? '#E11D48' : '#C8BCAF'} strokeWidth={0.75} strokeDasharray="4 3" />
                          </>
                        ) : (
                          <>
                            <rect x={t.x + 1.5} y={t.y + 2} width={w} height={h} rx={t.shape === 'rect' ? 8 : 6}
                              fill="rgba(0,0,0,0.06)" />
                            <rect x={t.x} y={t.y} width={w} height={h} rx={t.shape === 'rect' ? 8 : 6}
                              fill={tColor} stroke={sel ? '#E11D48' : '#B4A79C'} strokeWidth={sel ? 2.5 : 1.5} />
                            <rect x={t.x + 5} y={t.y + 4} width={w - 10} height={h - 8}
                              rx={t.shape === 'rect' ? 5 : 4} fill="none"
                              stroke={sel ? '#E11D48' : '#C8BCAF'} strokeWidth={0.75} strokeDasharray="4 3" />
                          </>
                        )}
                        {/* Label + occupation */}
                        <text x={c.x} y={c.y + (t.shape === 'round' || t.shape === 'oval' ? -3 : -2)}
                          textAnchor="middle" fontSize="10.5" fill="#57534E"
                          fontWeight="600" fontFamily="serif" pointerEvents="none">
                          {t.label}
                        </text>
                        <text x={c.x} y={c.y + (t.shape === 'round' || t.shape === 'oval' ? 10 : 11)}
                          textAnchor="middle" fontSize="8" fill="#9C948D" pointerEvents="none">
                          {occupied}/{t.seats}
                        </text>
                      </g>

                      {/* Poignée de rotation — visible quand la table est sélectionnée */}
                      {sel && t.shape !== 'round' && <RotateHandle cx={c.x} topY={t.y - 18} id={t.id} />}
                    </g>
                  );
                })}
              </g>
            </svg>
          </div>

          {/* Légende */}
          <div className="flex items-center gap-4 mt-3 text-[11px] text-charcoal-400 flex-wrap">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-white border border-charcoal-300 inline-block" /> Libre</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-700 inline-block" /> Occupée</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#FBD3E0', border: '1.5px solid #E5A0B7' }} /> Enfant</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#D7E4F4', border: '1.5px solid #8FB3DB' }} /> PMR</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#F3E4C0', border: '1.5px solid #CBA75B' }} /> VIP</span>
          </div>
        </div>
      </div>

      {wizardOpen && (
        <SetupWizard
          guestCount={guests.length}
          isEdit={plan!.tables.length > 0}
          onClose={() => setWizardOpen(false)}
          onGenerate={generateHall}
        />
      )}

      {preview3D && plan && (
        <Scene3D plan={plan} onClose={() => setPreview3D(false)} />
      )}
    </div>
  );
}
