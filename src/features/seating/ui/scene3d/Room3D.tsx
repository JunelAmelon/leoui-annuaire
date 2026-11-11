'use client';

/**
 * Architecture de la salle 3D — construite à partir du polygone exact (carré, rectangle, L, U, T, ovale).
 * - Le sol utilise ShapeGeometry → mêmes angles rentrants que sur le plan 2D.
 * - Chaque pan de mur est tourné vers l'intérieur (`FrontSide`) : quand la caméra tourne,
 *   les murs situés entre elle et la salle deviennent invisibles tout seuls (pas besoin de les masquer à la main).
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import { Html } from '@react-three/drei';
import type { DecorConfig, RoomConfig } from '../../domain/types';
import { normalizeRoom, roomPolygonMeters, pointInPolygon } from '../../domain/room-geometry';
import { FLOOR_DEFS, floorTexture } from './materials';

const WALL_H = 4.6;

/** Lustre à pendeloques + lumière chaude ponctuelle. */
function Chandelier({ x, z, evening }: { x: number; z: number; evening: boolean }) {
  return (
    <group position={[x, WALL_H - 0.55, z]}>
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.014, 0.014, 0.6, 8]} />
        <meshStandardMaterial color="#8a857e" metalness={0.75} roughness={0.3} />
      </mesh>
      <mesh castShadow>
        <torusGeometry args={[0.42, 0.03, 12, 36]} />
        <meshStandardMaterial color="#d4b678" metalness={0.8} roughness={0.22} />
      </mesh>
      {Array.from({ length: 14 }, (_, i) => {
        const a = (i / 14) * Math.PI * 2;
        return (
          <mesh key={i} position={[Math.cos(a) * 0.4, -0.17, Math.sin(a) * 0.4]}>
            <octahedronGeometry args={[0.036, 0]} />
            <meshPhysicalMaterial color="#fffdf7" roughness={0.05} transmission={0.7} transparent opacity={0.9} />
          </mesh>
        );
      })}
      <pointLight position={[0, -0.25, 0]} intensity={evening ? 9 : 4.5} color="#ffe6bd" distance={9} decay={2} />
    </group>
  );
}

/** Guirlandes lumineuses tendues au-dessus de la salle (allumées surtout en soirée). */
function FairyLights({ pts, evening }: { pts: { x: number; y: number }[]; evening: boolean }) {
  const bulbs = useMemo(() => {
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
    const out: [number, number, number][] = [];
    const lines = 4;
    for (let l = 1; l <= lines; l++) {
      const z = minY + ((maxY - minY) * l) / (lines + 1);
      const steps = Math.max(6, Math.round((maxX - minX) / 1.4));
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        const x = minX + (maxX - minX) * t;
        if (!pointInPolygon({ x, y: z }, pts)) continue;
        // flèche de câble suspendu (chaînette approchée par une parabole)
        const sag = 4 * t * (1 - t) * 0.35;
        out.push([x, WALL_H - 0.25 - sag, z]);
      }
    }
    return out;
  }, [pts]);

  return (
    <group>
      {bulbs.map((b, i) => (
        <mesh key={i} position={b}>
          <sphereGeometry args={[0.04, 8, 8]} />
          <meshStandardMaterial color="#fff3d6" emissive="#ffd58a" emissiveIntensity={evening ? 2.4 : 0.7} />
        </mesh>
      ))}
    </group>
  );
}

export function Room3D({ room: rawRoom, decor }: { room?: RoomConfig; decor: DecorConfig }) {
  const room = useMemo(() => normalizeRoom(rawRoom), [rawRoom]);
  const pts = useMemo(() => roomPolygonMeters(room), [room]);
  const evening = decor.mood === 'soiree';

  // Sol découpé au contour exact. `rotation.x = -π/2` envoie -Y_shape sur +Z_monde → on passe (x, -z).
  const floorGeom = useMemo(() => {
    const shape = new THREE.Shape();
    pts.forEach((p, i) => (i === 0 ? shape.moveTo(p.x, -p.y) : shape.lineTo(p.x, -p.y)));
    shape.closePath();
    const g = new THREE.ShapeGeometry(shape, 1);
    g.computeVertexNormals();
    return g;
  }, [pts]);

  const floorDef = FLOOR_DEFS[decor.floor] || FLOOR_DEFS.dalles;
  const floorMap = useMemo(() => floorTexture(decor.floor), [decor.floor]);

  // Segments de murs : pour un polygone horaire en (x, z), la normale intérieure est (-dz, +dx).
  const walls = useMemo(() => pts.map((a, i) => {
    const b = pts[(i + 1) % pts.length];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const nx = -(b.y - a.y) / (len || 1);
    const nz = (b.x - a.x) / (len || 1);
    return { len, mx: (a.x + b.x) / 2, mz: (a.y + b.y) / 2, ry: Math.atan2(nx, nz), nx, nz };
  }), [pts]);

  // Lustres : 1 à 4 selon la taille, placés uniquement à l'intérieur du contour
  const chandeliers = useMemo(() => {
    const w = room.width_m, l = room.length_m;
    const grid = w * l > 360 ? [[0.3, 0.32], [0.7, 0.32], [0.3, 0.68], [0.7, 0.68]] : [[0.33, 0.5], [0.67, 0.5]];
    return grid
      .map(([fx, fz]) => ({ x: w * fx, z: l * fz }))
      .filter((p) => pointInPolygon({ x: p.x, y: p.z }, pts));
  }, [room, pts]);

  // Légère teinte plus claire que les murs pour plinthes & corniches
  const trimColor = useMemo(() => new THREE.Color(decor.wall_color).lerp(new THREE.Color('#ffffff'), 0.45).getStyle(), [decor.wall_color]);

  return (
    <group>
      {/* Sol */}
      <mesh geometry={floorGeom} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <meshPhysicalMaterial
          map={floorMap}
          roughness={floorDef.roughness}
          metalness={floorDef.metalness}
          clearcoat={floorDef.clearcoat}
          clearcoatRoughness={0.14}
        />
      </mesh>

      {/* Socle sous la dalle — donne de l'épaisseur quand on regarde de biais */}
      <mesh geometry={floorGeom} position={[0, -0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <meshStandardMaterial color="#bfb8ae" roughness={0.9} side={THREE.DoubleSide} />
      </mesh>

      {/* Murs (face intérieure seule) + plinthe + corniche */}
      {walls.map((w, i) => (
        <group key={i} position={[w.mx, 0, w.mz]} rotation={[0, w.ry, 0]}>
          <mesh position={[0, WALL_H / 2, 0]} receiveShadow>
            <planeGeometry args={[w.len + 0.01, WALL_H]} />
            <meshStandardMaterial color={decor.wall_color} roughness={0.88} />
          </mesh>
          <mesh position={[0, 0.11, 0.012]}>
            <planeGeometry args={[w.len, 0.22]} />
            <meshStandardMaterial color={trimColor} roughness={0.65} />
          </mesh>
          <mesh position={[0, WALL_H - 0.08, 0.012]}>
            <planeGeometry args={[w.len, 0.16]} />
            <meshStandardMaterial color={trimColor} roughness={0.65} />
          </mesh>
        </group>
      ))}

      {chandeliers.map((c, i) => <Chandelier key={i} x={c.x} z={c.z} evening={evening} />)}
      <FairyLights pts={pts} evening={evening} />

      {/* Cotes au sol */}
      <Html position={[room.width_m / 2, 0.03, room.length_m + 0.45]} center className="pointer-events-none select-none">
        <span className="text-[11px] font-semibold text-stone-500 bg-white/80 px-2 py-0.5 rounded">{room.width_m} m</span>
      </Html>
      <Html position={[-0.45, 0.03, room.length_m / 2]} center className="pointer-events-none select-none">
        <span className="text-[11px] font-semibold text-stone-500 bg-white/80 px-2 py-0.5 rounded">{room.length_m} m</span>
      </Html>
    </group>
  );
}
