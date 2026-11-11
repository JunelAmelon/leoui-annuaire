'use client';

/**
 * Éléments de salle en 3D — chaque type du CDC a une silhouette reconnaissable
 * (et non un cube gris) : piste en damier + boule à facettes, platines DJ + enceintes,
 * comptoir de bar à bouteilles, buffet à cloches, estrade + arche fleurie, borne photo, arche d'entrée.
 * Dimensions au sol = `item.w / UNITS_PER_M` × `item.h / UNITS_PER_M` → coïncide avec le plan 2D.
 */

import { useMemo } from 'react';
import type { RoomItemType } from '../../domain/types';
import { danceTexture } from './materials';

export function RoomItemVisual({ type, w, d, clothColor, flowerColor }: {
  type: RoomItemType;
  w: number;
  d: number;
  clothColor: string;
  flowerColor: string;
}) {
  const checker = useMemo(() => danceTexture('#3b3340', '#efeae2'), []);

  switch (type) {
    case 'dancefloor':
      return (
        <group>
          <mesh position={[0, 0.018, 0]} receiveShadow>
            <boxGeometry args={[w, 0.036, d]} />
            <meshPhysicalMaterial map={checker} roughness={0.18} clearcoat={0.8} />
          </mesh>
          {/* Baguette laiton périphérique */}
          <mesh position={[0, 0.02, 0]}>
            <boxGeometry args={[w + 0.05, 0.018, d + 0.05]} />
            <meshStandardMaterial color="#c9a96e" metalness={0.75} roughness={0.28} />
          </mesh>
          {/* Boule à facettes suspendue */}
          <mesh position={[0, 3.3, 0]} castShadow>
            <icosahedronGeometry args={[0.24, 2]} />
            <meshStandardMaterial color="#eef2f6" metalness={0.95} roughness={0.08} flatShading />
          </mesh>
        </group>
      );

    case 'dj':
      return (
        <group>
          {/* Régie nappée noire */}
          <mesh position={[0, 0.48, 0]} castShadow receiveShadow>
            <boxGeometry args={[w * 0.72, 0.96, d]} />
            <meshStandardMaterial color="#232028" roughness={0.75} />
          </mesh>
          {/* Deux platines + table de mixage */}
          {[-0.28, 0.28].map((px, i) => (
            <group key={i} position={[px, 0.98, 0]}>
              <mesh><boxGeometry args={[0.36, 0.03, 0.32]} /><meshStandardMaterial color="#3a3642" metalness={0.4} roughness={0.4} /></mesh>
              <mesh position={[0, 0.022, 0]}><cylinderGeometry args={[0.12, 0.12, 0.012, 24]} /><meshStandardMaterial color="#151419" metalness={0.6} roughness={0.25} /></mesh>
            </group>
          ))}
          {/* Enceintes sur pieds */}
          {[-w / 2 + 0.18, w / 2 - 0.18].map((sx, i) => (
            <group key={i} position={[sx, 0, 0]}>
              <mesh position={[0, 0.65, 0]}><cylinderGeometry args={[0.02, 0.03, 1.3, 10]} /><meshStandardMaterial color="#2c2a30" metalness={0.5} /></mesh>
              <mesh position={[0, 1.45, 0]} castShadow><boxGeometry args={[0.32, 0.52, 0.3]} /><meshStandardMaterial color="#1d1b21" roughness={0.6} /></mesh>
            </group>
          ))}
        </group>
      );

    case 'bar':
      return (
        <group>
          <mesh position={[0, 0.54, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 1.08, d]} />
            <meshStandardMaterial color="#4a3d33" roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.1, 0.03]} castShadow>
            <boxGeometry args={[w + 0.08, 0.05, d + 0.1]} />
            <meshPhysicalMaterial color="#f4f2ee" roughness={0.15} clearcoat={0.7} />
          </mesh>
          {/* Bouteilles & verres alignés */}
          {[-0.35, -0.18, 0, 0.2, 0.38].map((fx, i) => (
            <mesh key={i} position={[fx * w * 0.8, 1.24, -d * 0.2]} castShadow>
              <cylinderGeometry args={[0.028, 0.034, 0.24, 12]} />
              <meshPhysicalMaterial color={i % 2 ? '#2f5d3e' : '#7a3040'} roughness={0.1} transmission={0.5} transparent opacity={0.85} />
            </mesh>
          ))}
        </group>
      );

    case 'buffet':
      return (
        <group>
          <mesh position={[0, 0.44, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.88, d]} />
            <meshStandardMaterial color={clothColor} roughness={0.85} />
          </mesh>
          {/* Trois cloches traiteur argentées */}
          {[-0.32, 0, 0.32].map((fx, i) => (
            <group key={i} position={[fx * w, 0.9, 0]}>
              <mesh><cylinderGeometry args={[0.22, 0.24, 0.03, 20]} /><meshStandardMaterial color="#dcdfe4" metalness={0.85} roughness={0.2} /></mesh>
              <mesh position={[0, 0.02, 0]} castShadow><sphereGeometry args={[0.19, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshStandardMaterial color="#e6e9ee" metalness={0.9} roughness={0.16} /></mesh>
            </group>
          ))}
        </group>
      );

    case 'stage':
      return (
        <group>
          {/* Estrade basse tapissée + arche fleurie derrière les mariés */}
          <mesh position={[0, 0.14, 0]} castShadow receiveShadow>
            <boxGeometry args={[w, 0.28, Math.max(d, 1.1)]} />
            <meshStandardMaterial color="#e9e2d8" roughness={0.75} />
          </mesh>
          <mesh position={[0, 1.35, -d / 2]} castShadow>
            <torusGeometry args={[1.05, 0.045, 12, 36, Math.PI]} />
            <meshStandardMaterial color="#d4b26a" metalness={0.75} roughness={0.25} />
          </mesh>
          {[-0.85, -0.45, 0, 0.45, 0.85].map((ax, i) => (
            <mesh key={i} position={[ax, 1.35 + Math.sqrt(Math.max(0, 1.1 - ax * ax)) * 0.95, -d / 2]}>
              <sphereGeometry args={[0.13, 10, 10]} />
              <meshStandardMaterial color={i % 2 ? flowerColor : '#fff8f2'} roughness={0.8} />
            </mesh>
          ))}
        </group>
      );

    case 'photobooth':
      return (
        <group>
          {/* Tapis rouge + borne sur pied avec anneau lumineux */}
          <mesh position={[0, 0.012, 0.15]} receiveShadow>
            <boxGeometry args={[w * 0.7, 0.02, d * 0.85]} />
            <meshStandardMaterial color="#9e2a47" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0.75, -d * 0.25]} castShadow>
            <cylinderGeometry args={[0.04, 0.16, 1.5, 14]} />
            <meshStandardMaterial color="#2a2730" metalness={0.4} roughness={0.4} />
          </mesh>
          <mesh position={[0, 1.55, -d * 0.25]} castShadow>
            <boxGeometry args={[0.38, 0.46, 0.14]} />
            <meshStandardMaterial color="#f5f2ed" roughness={0.35} />
          </mesh>
          <mesh position={[0, 1.58, -d * 0.25 + 0.09]}>
            <torusGeometry args={[0.13, 0.02, 10, 24]} />
            <meshStandardMaterial color="#ffffff" emissive="#fff6e5" emissiveIntensity={1.6} />
          </mesh>
        </group>
      );

    case 'entrance':
      return (
        <group>
          {/* Tapis d'accueil + deux piliers fleuris */}
          <mesh position={[0, 0.01, 0]} receiveShadow>
            <boxGeometry args={[w, 0.02, Math.max(d, 0.8)]} />
            <meshStandardMaterial color="#efe6da" roughness={0.9} />
          </mesh>
          {[-w / 2 + 0.12, w / 2 - 0.12].map((px, i) => (
            <group key={i} position={[px, 0, 0]}>
              <mesh position={[0, 1.05, 0]} castShadow><cylinderGeometry args={[0.05, 0.065, 2.1, 12]} /><meshStandardMaterial color="#f3efe8" roughness={0.6} /></mesh>
              <mesh position={[0, 2.18, 0]} castShadow><sphereGeometry args={[0.17, 12, 10]} /><meshStandardMaterial color={flowerColor} roughness={0.8} /></mesh>
            </group>
          ))}
        </group>
      );
  }
}
