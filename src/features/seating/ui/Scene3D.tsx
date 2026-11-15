'use client';

/**
 * Vue 3D interactive de la salle — React Three Fiber.
 * - Échelle métrique réelle : 1 unité Three = 1 mètre = UNITS_PER_M unités du plan 2D.
 * - La salle suit la forme et les dimensions choisies ; les murs côté caméra disparaissent tout seuls.
 * - Sélection, déplacement au sol (bloquant l'orbite), clic droit / appui long / barre d'actions
 *   pour tourner, dupliquer ou supprimer sans repasser en 2D.
 */

import { Suspense, useMemo, useRef, useState } from 'react';
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { OrbitControls, ContactShadows, Environment, Html } from '@react-three/drei';
import * as THREE from 'three';
import { ArrowLeft, Copy, Moon, Palette, RotateCcw, RotateCw, Sun, Trash2 } from 'lucide-react';
import type { DecorConfig, RoomConfig, RoomItem, SeatingPlan, SeatingTable } from '../domain/types';
import { DEFAULT_DECOR, seatKey } from '../domain/types';
import {
  ROUND_R, UNITS_PER_M, isInsideWithMargin, normalizeRoom, roomPolygon, tableSizeUnits,
} from '../domain/room-geometry';
import { seatLayout, tableCenterUnits } from '../domain/table-geometry';
import type { SeatingGuest } from '../repositories/seating.repository';
import { ContextMenu } from './ContextMenu';
import { Room3D } from './scene3d/Room3D';
import { Centerpiece3D, Chair3D, PlaceSetting3D, TableBody3D } from './scene3d/Furniture3D';
import { RoomItemVisual } from './scene3d/RoomItems3D';
import { DecorDrawer } from './scene3d/DecorDrawer';

export interface Scene3DProps {
  plan: SeatingPlan;
  guests: SeatingGuest[];
  onClose: () => void;
  onMoveTable: (id: string, x: number, y: number, commit: boolean) => void;
  onMoveItem: (id: string, x: number, y: number, commit: boolean) => void;
  onRotate: (id: string, delta: number) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onDecorChange: (patch: Partial<DecorConfig>) => void;
  onRoomChange: (room: RoomConfig) => void;
}

const LONG_PRESS_MS = 550;

/**
 * Déplacement au sol (plan y = 0) : projette le rayon caméra→curseur, conserve le décalage
 * initial, désactive OrbitControls tant que le pointeur est enfoncé.
 * Seuil de 5 px avant de considérer que c'est un vrai glissement (préserve clic & appui long).
 */
function useFloorDrag(
  originM: { x: number; z: number },
  onDrag: (xm: number, zm: number, commit: boolean) => void,
  onSelect: () => void,
  onContext: (clientX: number, clientY: number) => void,
  setOrbit: (v: boolean) => void,
) {
  const { gl, camera } = useThree();
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const plane = useMemo(() => new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), []);

  return (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const ne = e.nativeEvent;
    if (ne.button === 2) return;
    onSelect();

    const pid = ne.pointerId;
    const sx = ne.clientX, sy = ne.clientY;
    let moved = false;
    let last = { x: originM.x, z: originM.z };

    const hit = (cx: number, cy: number) => {
      const r = gl.domElement.getBoundingClientRect();
      const ndc = new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const out = new THREE.Vector3();
      return raycaster.ray.intersectPlane(plane, out);
    };
    const p0 = hit(sx, sy);
    const ox = p0 ? originM.x - p0.x : 0;
    const oz = p0 ? originM.z - p0.z : 0;

    let timer: ReturnType<typeof setTimeout> | null = null;
    if (ne.pointerType !== 'mouse') {
      timer = setTimeout(() => { timer = null; cleanup(false); onContext(sx, sy); }, LONG_PRESS_MS);
    }
    setOrbit(false);

    const move = (ev: PointerEvent) => {
      if (ev.pointerId !== pid) return;
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
      moved = true;
      if (timer) { clearTimeout(timer); timer = null; }
      const p = hit(ev.clientX, ev.clientY);
      if (!p) return;
      last = { x: p.x + ox, z: p.z + oz };
      onDrag(last.x, last.z, false);
    };
    const cleanup = (commit: boolean) => {
      if (timer) clearTimeout(timer);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', cancel);
      setOrbit(true);
      if (commit && moved) onDrag(last.x, last.z, true);
    };
    const up = (ev: PointerEvent) => { if (ev.pointerId === pid) cleanup(true); };
    const cancel = (ev: PointerEvent) => { if (ev.pointerId === pid) cleanup(false); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', cancel);
  };
}

/** Barre d'actions compacte ancrée au-dessus de l'élément sélectionné. */
function FloatingActions({ label, height, onRotate, onDuplicate, onDelete }: {
  label: string;
  height: number;
  onRotate: (d: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const b = 'w-8 h-8 flex items-center justify-center rounded-md text-charcoal-700 hover:bg-stone-100';
  return (
    <Html position={[0, height, 0]} center zIndexRange={[30, 0]}>
      <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
        className="flex items-center gap-0.5 px-1.5 py-1 bg-white/95 backdrop-blur rounded-lg shadow-lg border border-stone-200 whitespace-nowrap">
        <span className="text-[11px] font-semibold text-charcoal-800 px-1.5 max-w-[120px] truncate">{label}</span>
        <button type="button" className={b} title="Pivoter −45°" onClick={() => onRotate(-45)}><RotateCcw className="w-3.5 h-3.5" /></button>
        <button type="button" className={b} title="Pivoter +45°" onClick={() => onRotate(45)}><RotateCw className="w-3.5 h-3.5" /></button>
        <button type="button" className={b} title="Dupliquer" onClick={onDuplicate}><Copy className="w-3.5 h-3.5" /></button>
        <button type="button" className={`${b} text-rose-600 hover:bg-rose-50`} title="Supprimer" onClick={onDelete}><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </Html>
  );
}

function TableGroup({
  table, decor, assignments, guestName, selected, onSelect, onDragM, onContext, setOrbit, onRotate, onDuplicate, onDelete,
}: {
  table: SeatingTable;
  decor: DecorConfig;
  assignments: SeatingPlan['assignments'];
  guestName: (id?: string) => string | undefined;
  selected: boolean;
  onSelect: () => void;
  onDragM: (xm: number, zm: number, commit: boolean) => void;
  onContext: (x: number, y: number) => void;
  setOrbit: (v: boolean) => void;
  onRotate: (d: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const c = tableCenterUnits(table);
  const cm = { x: c.x / UNITS_PER_M, z: c.y / UNITS_PER_M };
  const seats = seatLayout(table);
  const down = useFloorDrag(cm, onDragM, onSelect, onContext, setOrbit);
  const occupiedCount = seats.filter((_, i) => assignments[seatKey(table.id, i)]).length;
  const ringR = (table.shape === 'round' ? ROUND_R + 24 : 95) / UNITS_PER_M;

  return (
    // Sens horaire en 2D = rotation Y négative en 3D (axe Y vers le haut)
    <group position={[cm.x, 0, cm.z]} rotation={[0, -(table.rotation * Math.PI) / 180, 0]}
      onPointerDown={down}
      onContextMenu={(e) => { e.stopPropagation(); e.nativeEvent.preventDefault(); onSelect(); onContext(e.nativeEvent.clientX, e.nativeEvent.clientY); }}>
      <TableBody3D shape={table.shape} tableColor={table.color} decor={decor} />
      <Centerpiece3D style={decor.centerpiece} flowerColor={decor.flower_color} />

      {seats.map((s, i) => {
        const lx = (s.x - c.x) / UNITS_PER_M;
        const lz = (s.y - c.y) / UNITS_PER_M;
        const gid = assignments[seatKey(table.id, i)];
        const name = guestName(gid);
        // Couvert posé sur le bord du plateau, dans l'axe chaise → table
        const dist = Math.hypot(lx, lz) || 1;
        const inset = 0.42;
        const px = lx - (lx / dist) * inset;
        const pz = lz - (lz / dist) * inset;
        return (
          <group key={i}>
            <PlaceSetting3D x={px} z={pz} angle={-(s.angle * Math.PI) / 180} napkinColor={decor.flower_color} />
            <group position={[lx, 0, lz]} rotation={[0, -(s.angle * Math.PI) / 180, 0]}>
              <Chair3D style={decor.chair_style} seatType={table.seat_types?.[i]} occupied={!!gid} />
              {selected && name && (
                <Html position={[0, 1.12, 0]} center className="pointer-events-none select-none">
                  <span className="px-1.5 py-0.5 rounded bg-charcoal-900/85 text-white text-[10px] font-medium whitespace-nowrap">{name}</span>
                </Html>
              )}
            </group>
          </group>
        );
      })}

      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.015, 0]}>
          <ringGeometry args={[ringR, ringR + 0.06, 48]} />
          <meshBasicMaterial color="#E11D48" />
        </mesh>
      )}

      {selected ? (
        <FloatingActions label={`${table.label} · ${occupiedCount}/${table.seats}`} height={1.85}
          onRotate={onRotate} onDuplicate={onDuplicate} onDelete={onDelete} />
      ) : (
        <Html position={[0, 1.45, 0]} center distanceFactor={14} className="pointer-events-none select-none">
          <span className="px-2 py-0.5 rounded-md bg-white/90 text-charcoal-800 text-[11px] font-serif font-semibold shadow-sm border border-stone-200/80 whitespace-nowrap">
            {table.label} <span className="font-sans text-[10px] font-normal text-charcoal-400">{occupiedCount}/{table.seats}</span>
          </span>
        </Html>
      )}
    </group>
  );
}

function ItemGroup({
  item, decor, selected, onSelect, onDragM, onContext, setOrbit, onRotate, onDuplicate, onDelete,
}: {
  item: RoomItem;
  decor: DecorConfig;
  selected: boolean;
  onSelect: () => void;
  onDragM: (xm: number, zm: number, commit: boolean) => void;
  onContext: (x: number, y: number) => void;
  setOrbit: (v: boolean) => void;
  onRotate: (d: number) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const w = item.w / UNITS_PER_M;
  const d = item.h / UNITS_PER_M;
  const cm = { x: (item.x + item.w / 2) / UNITS_PER_M, z: (item.y + item.h / 2) / UNITS_PER_M };
  const down = useFloorDrag(cm, onDragM, onSelect, onContext, setOrbit);

  return (
    <group position={[cm.x, 0, cm.z]} rotation={[0, -(item.rotation * Math.PI) / 180, 0]}
      onPointerDown={down}
      onContextMenu={(e) => { e.stopPropagation(); e.nativeEvent.preventDefault(); onSelect(); onContext(e.nativeEvent.clientX, e.nativeEvent.clientY); }}>
      <RoomItemVisual type={item.type} w={w} d={d} clothColor={decor.cloth_color} flowerColor={decor.flower_color} />
      {selected && (
        <mesh position={[0, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.hypot(w, d) / 2 + 0.08, Math.hypot(w, d) / 2 + 0.14, 40]} />
          <meshBasicMaterial color="#E11D48" />
        </mesh>
      )}
      {selected ? (
        <FloatingActions label={item.label || ''} height={2.35} onRotate={onRotate} onDuplicate={onDuplicate} onDelete={onDelete} />
      ) : item.label ? (
        <Html position={[0, 1.9, 0]} center distanceFactor={15} className="pointer-events-none select-none">
          <span className="px-2 py-0.5 rounded bg-white/85 text-charcoal-700 text-[10px] font-semibold shadow-sm whitespace-nowrap">{item.label}</span>
        </Html>
      ) : null}
    </group>
  );
}

export default function Scene3D({
  plan, guests, onClose, onMoveTable, onMoveItem, onRotate, onDuplicate, onDelete, onDecorChange, onRoomChange,
}: Scene3DProps) {
  const room = normalizeRoom(plan.room);
  const decor: DecorConfig = { ...DEFAULT_DECOR, ...(plan.decor || {}) };
  const evening = decor.mood === 'soiree';
  const poly = useMemo(() => roomPolygon(room), [room]);

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [orbitEnabled, setOrbitEnabled] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [menu, setMenu] = useState<{ x: number; y: number; id: string } | null>(null);

  const guestMap = useMemo(() => new Map(guests.map((g) => [g.id, g.name])), [guests]);
  const guestName = (id?: string) => (id ? guestMap.get(id) : undefined);

  // Contrainte identique au plan 2D : on glisse le long des murs sans traverser
  const clampCenter = (cur: { x: number; y: number }, xm: number, zm: number, margin: number) => {
    const nx = xm * UNITS_PER_M, ny = zm * UNITS_PER_M;
    if (isInsideWithMargin({ x: nx, y: ny }, poly, margin)) return { x: nx, y: ny };
    if (isInsideWithMargin({ x: nx, y: cur.y }, poly, margin)) return { x: nx, y: cur.y };
    if (isInsideWithMargin({ x: cur.x, y: ny }, poly, margin)) return { x: cur.x, y: ny };
    return cur;
  };

  // Caméra initiale reculée proportionnellement à la salle
  const span = Math.max(room.width_m, room.length_m);
  const camInit = useRef<[number, number, number]>([room.width_m / 2 + span * 0.45, span * 0.58, room.length_m + span * 0.42]);

  return (
    <div className="fixed inset-0 z-50 select-none" onContextMenu={(e) => e.preventDefault()}>
      {/* Barre supérieure sobre */}
      <header className="absolute top-0 inset-x-0 z-20 h-12 px-3 sm:px-5 flex items-center justify-between bg-white/90 backdrop-blur-md border-b border-stone-200/80">
        <button type="button" onClick={onClose}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold text-charcoal-700 hover:bg-stone-100">
          <ArrowLeft className="w-4 h-4" /> Plan 2D
        </button>

        <span className="hidden md:inline text-xs text-charcoal-400">
          Glissez pour tourner la vue · molette pour zoomer · glissez une table pour la déplacer · clic droit pour les options
        </span>

        <div className="flex items-center gap-1.5">
          <button type="button" onClick={() => onDecorChange({ mood: evening ? 'jour' : 'soiree' })}
            title="Basculer jour / soirée"
            className="inline-flex items-center gap-1.5 px-2.5 h-8 rounded-lg border border-stone-200 bg-white text-xs font-semibold text-charcoal-700 hover:border-stone-300">
            {evening ? <Sun className="w-3.5 h-3.5 text-amber-500" /> : <Moon className="w-3.5 h-3.5 text-charcoal-500" />}
            <span className="hidden sm:inline">{evening ? 'Jour' : 'Soirée'}</span>
          </button>
          <button type="button" onClick={() => setDrawerOpen((o) => !o)} aria-expanded={drawerOpen}
            className={`inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold transition-colors ${
              drawerOpen ? 'bg-rose-600 text-white' : 'bg-charcoal-900 text-white hover:bg-charcoal-800'
            }`}>
            <Palette className="w-3.5 h-3.5" /> Personnaliser
          </button>
        </div>
      </header>

      <Canvas
        shadows
        dpr={[1, 1.8]}
        camera={{ position: camInit.current, fov: 42, near: 0.2, far: 220 }}
        gl={{ antialias: true }}
        onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; }}
        onPointerMissed={() => { setSelectedId(null); setMenu(null); }}
        style={{ width: '100%', height: '100%', touchAction: 'none' }}
      >
        <color attach="background" args={[evening ? '#221f27' : '#EAE4DC']} />
        <fog attach="fog" args={[evening ? '#221f27' : '#EAE4DC', span * 1.9, span * 3.8]} />

        <Suspense fallback={null}>
          <ambientLight intensity={evening ? 0.28 : 0.55} />
          <hemisphereLight intensity={evening ? 0.25 : 0.55} color="#fff5e6" groundColor="#b89a78" />
          <directionalLight
            position={[room.width_m * 0.85, span * 0.9, room.length_m * 0.25]}
            intensity={evening ? 0.55 : 1.45}
            color={evening ? '#c5d0ec' : '#fff3e2'}
            castShadow
            shadow-mapSize={[2048, 2048]}
            shadow-bias={-0.0004}
            shadow-camera-left={-span}
            shadow-camera-right={span}
            shadow-camera-top={span}
            shadow-camera-bottom={-span}
            shadow-camera-far={span * 3}
          />
          <Environment preset="apartment" environmentIntensity={evening ? 0.08 : 0.22} />

          <Room3D room={room} decor={decor} />

          {plan.room_items.map((it) => (
            <ItemGroup key={it.id} item={it} decor={decor} selected={selectedId === it.id}
              onSelect={() => { setSelectedId(it.id); setMenu(null); }}
              onDragM={(xm, zm, commit) => {
                const c = clampCenter({ x: it.x + it.w / 2, y: it.y + it.h / 2 }, xm, zm, Math.min(it.w, it.h) / 2);
                onMoveItem(it.id, c.x - it.w / 2, c.y - it.h / 2, commit);
              }}
              onContext={(x, y) => setMenu({ x, y, id: it.id })}
              setOrbit={setOrbitEnabled}
              onRotate={(d) => onRotate(it.id, d)}
              onDuplicate={() => onDuplicate(it.id)}
              onDelete={() => { onDelete(it.id); setSelectedId(null); }}
            />
          ))}

          {plan.tables.map((t) => {
            const sz = tableSizeUnits(t.shape);
            return (
              <TableGroup key={t.id} table={t} decor={decor} assignments={plan.assignments} guestName={guestName}
                selected={selectedId === t.id}
                onSelect={() => { setSelectedId(t.id); setMenu(null); }}
                onDragM={(xm, zm, commit) => {
                  const c = clampCenter(tableCenterUnits(t), xm, zm, t.shape === 'round' ? ROUND_R + 22 : 42);
                  onMoveTable(t.id, c.x - sz.w / 2, c.y - sz.h / 2, commit);
                }}
                onContext={(x, y) => setMenu({ x, y, id: t.id })}
                setOrbit={setOrbitEnabled}
                onRotate={(d) => onRotate(t.id, d)}
                onDuplicate={() => onDuplicate(t.id)}
                onDelete={() => { onDelete(t.id); setSelectedId(null); }}
              />
            );
          })}

          <ContactShadows
            position={[room.width_m / 2, 0.005, room.length_m / 2]}
            scale={span * 1.4} opacity={0.35} blur={2.2} far={4} frames={1}
          />

          <OrbitControls
            makeDefault
            enabled={orbitEnabled}
            target={[room.width_m / 2, 0.6, room.length_m / 2]}
            maxPolarAngle={Math.PI / 2.06}
            minDistance={2.5}
            maxDistance={span * 2.4}
            enableDamping
            dampingFactor={0.08}
          />
        </Suspense>
      </Canvas>

      {drawerOpen && (
        <DecorDrawer decor={decor} room={room}
          onDecor={onDecorChange} onRoom={onRoomChange}
          onClose={() => setDrawerOpen(false)} />
      )}

      {menu && (() => {
        const t = plan.tables.find((x) => x.id === menu.id);
        const it = plan.room_items.find((x) => x.id === menu.id);
        if (!t && !it) return null;
        return (
          <ContextMenu x={menu.x} y={menu.y} title={t ? t.label : it?.label} onClose={() => setMenu(null)}
            items={[
              { key: 'l', label: 'Pivoter à gauche', icon: <RotateCcw className="w-4 h-4" />, onClick: () => onRotate(menu.id, -45) },
              { key: 'r', label: 'Pivoter à droite', icon: <RotateCw className="w-4 h-4" />, onClick: () => onRotate(menu.id, 45) },
              { key: 'd', label: 'Dupliquer', icon: <Copy className="w-4 h-4" />, onClick: () => onDuplicate(menu.id) },
              { key: 'x', label: t ? 'Supprimer la table' : 'Supprimer l’élément', icon: <Trash2 className="w-4 h-4" />, danger: true, onClick: () => { onDelete(menu.id); setSelectedId(null); } },
            ]} />
        );
      })()}
    </div>
  );
}
