'use client';

/**
 * Vue 3D du plan de table — React Three Fiber.
 * Rendu procédural (pas de modèles 3D externes) : tables, chaises, éléments de salle.
 * OrbitControls pour naviguer. Couleurs dynamiques depuis le plan 2D.
 */

import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, Html } from '@react-three/drei';
import * as THREE from 'three';
import type { SeatingPlan, SeatingTable, RoomItem, SeatAssignments } from '../domain/types';

/* ─── Types ─── */
interface Scene3DProps {
  plan: SeatingPlan;
  onClose: () => void;
}

/* ─── Palette ─── */
const SEAT_COLORS: Record<string, string> = {
  enfant: '#FBD3E0',
  pmr: '#D7E4F4',
  vip: '#F3E4C0',
  occupied: '#BE123C',
  free: '#D6CFC9',
};

const FLOOR_COLOR = '#F0EDE8';
const WALL_COLOR = '#E8E4DE';

/* ─── Helpers géométrie ─── */
function seatPositions3D(t: SeatingTable): { x: number; z: number; angle: number }[] {
  const c = tableCenter(t);
  const pts: { x: number; z: number; angle: number }[] = [];
  const gap = 16;

  if (t.shape === 'round') {
    const r = 42 + gap;
    for (let i = 0; i < t.seats; i++) {
      const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: c.x + Math.cos(a) * r, z: c.y + Math.sin(a) * r, angle: (a * 180) / Math.PI + 90 });
    }
  } else if (t.shape === 'oval') {
    const rx = 75 + gap;
    const ry = 30 + gap;
    for (let i = 0; i < t.seats; i++) {
      const a = (i / t.seats) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: c.x + Math.cos(a) * rx, z: c.y + Math.sin(a) * ry, angle: (a * 180) / Math.PI + 90 });
    }
  } else {
    const w = t.shape === 'rect' ? 150 : 260;
    const h = t.shape === 'rect' ? 60 : 40;
    const top = Math.ceil(t.seats / 2);
    const bottom = t.seats - top;
    for (let i = 0; i < top; i++) pts.push({ x: t.x + (w * (i + 0.5)) / top, z: t.y - gap, angle: 180 });
    for (let i = 0; i < bottom; i++) pts.push({ x: t.x + (w * (i + 0.5)) / bottom, z: t.y + h + gap, angle: 0 });
  }
  return pts;
}

function tableCenter(t: SeatingTable) {
  if (t.shape === 'round') return { x: t.x + 42, y: t.y + 42 };
  const w = t.shape === 'rect' ? 150 : 260;
  const h = t.shape === 'rect' ? 60 : 40;
  return { x: t.x + w / 2, y: t.y + h / 2 };
}

/* ─── Composants 3D ─── */

/** Sol de la salle */
function Floor() {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[500, 0, 350]} receiveShadow>
      <planeGeometry args={[1200, 900]} />
      <meshStandardMaterial color={FLOOR_COLOR} roughness={0.8} metalness={0} />
    </mesh>
  );
}

/** Table ronde */
function RoundTable({ t, assignments }: { t: SeatingTable; assignments: SeatAssignments }) {
  const c = tableCenter(t);
  const color = t.color || '#EDE8E3';
  const seats = seatPositions3D(t);
  const rot = (t.rotation || 0) * (Math.PI / 180);

  return (
    <group position={[c.x, 0, c.y]} rotation={[0, -rot, 0]}>
      {/* Plateau */}
      <mesh position={[0, 30, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[42, 42, 3, 48]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Pied central */}
      <mesh position={[0, 15, 0]} castShadow>
        <cylinderGeometry args={[4, 4, 30, 12]} />
        <meshStandardMaterial color="#C0B8B0" roughness={0.5} />
      </mesh>
      {/* Chaises */}
      {seats.map((s, i) => (
        <Chair key={i} pos={s} seatType={t.seat_types?.[i]} occupant={assignments[`${t.id}_${i}`]} />
      ))}
      {/* Label */}
      <HtmlLabel text={t.label} y={34} />
      <HtmlLabel text={`${Object.keys(assignments).filter(k => k.startsWith(`${t.id}_`)).length}/${t.seats}`} y={31} size={0.6} color="#888" />
    </group>
  );
}

/** Table rectangulaire / ovale / honneur */
function RectTable({ t, assignments }: { t: SeatingTable; assignments: SeatAssignments }) {
  const c = tableCenter(t);
  const w = t.shape === 'rect' ? 150 : 260;
  const h = t.shape === 'rect' ? 60 : 40;
  const color = t.color || '#EDE8E3';
  const seats = seatPositions3D(t);
  const rot = (t.rotation || 0) * (Math.PI / 180);
  const rx = t.shape === 'oval' ? 1 : 0;

  return (
    <group position={[c.x, 0, c.y]} rotation={[0, -rot, 0]}>
      {/* Plateau */}
      <mesh position={[0, 30, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 3, h]} />
        <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
      </mesh>
      {/* Pieds */}
      {[
        [-w / 2 + 8, 15, -h / 2 + 8],
        [w / 2 - 8, 15, -h / 2 + 8],
        [-w / 2 + 8, 15, h / 2 - 8],
        [w / 2 - 8, 15, h / 2 - 8],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <cylinderGeometry args={[3, 3, 30, 12]} />
          <meshStandardMaterial color="#C0B8B0" roughness={0.5} />
        </mesh>
      ))}
      {/* Chaises */}
      {seats.map((s, i) => (
        <Chair key={i} pos={s} seatType={t.seat_types?.[i]} occupant={assignments[`${t.id}_${i}`]} />
      ))}
      <HtmlLabel text={t.label} y={34} />
      <HtmlLabel text={`${Object.keys(assignments).filter(k => k.startsWith(`${t.id}_`)).length}/${t.seats}`} y={31} size={0.6} color="#888" />
    </group>
  );
}

/** Chaise 3D */
function Chair({ pos, seatType, occupant }: { pos: { x: number; z: number; angle: number }; seatType?: string; occupant?: string }) {
  const color = occupant ? SEAT_COLORS.occupied : seatType ? SEAT_COLORS[seatType] || SEAT_COLORS.free : SEAT_COLORS.free;
  const rot = pos.angle * (Math.PI / 180);

  return (
    <group position={[pos.x, 0, pos.z]} rotation={[0, -rot, 0]}>
      {/* Assise */}
      <mesh position={[0, 16, 0]} castShadow receiveShadow>
        <boxGeometry args={[14, 2, 10]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Dossier */}
      <mesh position={[0, 22, -5]} castShadow>
        <boxGeometry args={[14, 12, 1.5]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>
      {/* Pieds */}
      {[
        [-5, 8, -3],
        [5, 8, -3],
        [-5, 8, 3],
        [5, 8, 3],
      ].map((p, i) => (
        <mesh key={i} position={p as [number, number, number]} castShadow>
          <cylinderGeometry args={[0.8, 0.8, 16, 6]} />
          <meshStandardMaterial color="#999" roughness={0.7} />
        </mesh>
      ))}
      {/* Nom occupant */}
      {occupant && <HtmlLabel text={occupant.slice(0, 2).toUpperCase()} y={28} size={0.5} color="#fff" />}
    </group>
  );
}

/** Label HTML flottant au-dessus des objets 3D */
function HtmlLabel({ text, y, size = 0.8, color = '#444' }: { text: string; y: number; size?: number; color?: string }) {
  return (
    <Html position={[0, y, 0]} center distanceFactor={size} style={{ pointerEvents: 'none' }}>
      <span style={{ fontSize: 12, color, fontWeight: 700, fontFamily: 'serif', whiteSpace: 'nowrap', textShadow: '0 1px 3px rgba(255,255,255,0.8)' }}>
        {text}
      </span>
    </Html>
  );
}

/** Élément de salle 3D */
function RoomItem3D({ item }: { item: RoomItem }) {
  const c = { x: item.x + item.w / 2, y: item.y + item.h / 2 };
  const rot = (item.rotation || 0) * (Math.PI / 180);

  return (
    <group position={[c.x, 0, c.y]} rotation={[0, -rot, 0]}>
      <mesh position={[0, item.h / 2 + 5, 0]} castShadow receiveShadow>
        <boxGeometry args={[item.w, item.h + 10, item.h + 10]} />
        <meshStandardMaterial color="#FAFAF9" roughness={0.5} transparent opacity={0.95} />
      </mesh>
      <HtmlLabel text={item.label || ''} y={item.h + 18} size={0.7} />
    </group>
  );
}

/** Mur discret (limites de la salle) */
function Walls() {
  return (
    <group>
      {/* Sol légèrement plus grand pour l'effet mur */}
      <mesh position={[500, -1, 350]} receiveShadow>
        <boxGeometry args={[1004, 2, 704]} />
        <meshStandardMaterial color={WALL_COLOR} roughness={0.9} />
      </mesh>
    </group>
  );
}

/* ─── Scène principale ─── */
export default function Scene3D({ plan, onClose }: Scene3DProps) {
  const tables = plan.tables;
  const items = plan.room_items;

  return (
    <div className="fixed inset-0 z-50 bg-[#1a1816]">
      {/* Barre de titre */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-5 h-12 bg-white/90 backdrop-blur border-b border-stone-200">
        <span className="text-sm font-semibold text-charcoal-800">Vue 3D de la salle</span>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-charcoal-400">Tournez · Zoomez · Cliquez pour explorer</span>
          <button
            onClick={onClose}
            className="px-3 h-7 rounded-md bg-charcoal-800 text-white text-xs font-semibold hover:bg-charcoal-900 transition-colors"
          >
            Retour au plan 2D
          </button>
        </div>
      </div>

      <Canvas
        shadows
        camera={{ position: [500, 350, 650], fov: 45, near: 1, far: 2000 }}
        style={{ width: '100%', height: '100%', marginTop: 48 }}
      >
        <Suspense fallback={null}>
          {/* Lumières */}
          <ambientLight intensity={0.6} color="#FFF5EE" />
          <directionalLight
            position={[400, 400, 300]}
            intensity={1.2}
            color="#FFF8F0"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={1500}
            shadow-camera-left={-600}
            shadow-camera-right={600}
            shadow-camera-top={600}
            shadow-camera-bottom={-600}
          />
          <pointLight position={[500, 80, 350]} intensity={0.3} color="#FFE4E1" distance={400} />

          {/* Environnement subtil */}
          <Environment preset="apartment" environmentIntensity={0.15} />

          {/* Sol + murs */}
          <Floor />
          <Walls />
          <ContactShadows position={[500, 0.1, 350]} opacity={0.3} scale={1200} blur={2} far={100} />

          {/* Tables */}
          {tables.map((t) =>
            t.shape === 'round' ? (
              <RoundTable key={t.id} t={t} assignments={plan.assignments} />
            ) : (
              <RectTable key={t.id} t={t} assignments={plan.assignments} />
            )
          )}

          {/* Éléments de salle */}
          {items.map((it) => (
            <RoomItem3D key={it.id} item={it} />
          ))}

          {/* Contrôles caméra */}
          <OrbitControls
            target={[500, 0, 350]}
            maxPolarAngle={Math.PI / 2.1}
            minDistance={100}
            maxDistance={900}
            enablePan={true}
            panSpeed={0.8}
            rotateSpeed={0.6}
          />
        </Suspense>
      </Canvas>
    </div>
  );
}
