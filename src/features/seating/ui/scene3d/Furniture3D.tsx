'use client';

/**
 * Mobilier d'une table en 3D : chaises (6 styles + enfant/PMR/VIP), couverts
 * (assiette en porcelaine tournée + verre à pied + serviette), centres de table (5 styles),
 * plateau avec nappe plissée ou bois/marbre.
 * Géométries lourdes mises en cache au niveau module → pas de recalcul entre les tables.
 */

import { useMemo } from 'react';
import * as THREE from 'three';
import type { CenterpieceStyle, ChairStyle, DecorConfig, SeatType, TableShape, TableSurfaceStyle } from '../../domain/types';
import { ROUND_R, TABLE_H, TABLE_W, UNITS_PER_M } from '../../domain/room-geometry';
import { pleatTexture, woodTexture } from './materials';

const TABLE_TOP_Y = 0.76;

export const CHAIR_STYLES: { value: ChairStyle; label: string; swatch: string }[] = [
  { value: 'chiavari_bois', label: 'Chiavari bois', swatch: '#BE8A47' },
  { value: 'chiavari_or',   label: 'Chiavari dorée', swatch: '#D4B26A' },
  { value: 'chiavari_noire', label: 'Chiavari noire', swatch: '#26232A' },
  { value: 'napoleon',      label: 'Napoléon ivoire', swatch: '#F0ECE4' },
  { value: 'medaillon',     label: 'Médaillon Louis XVI', swatch: '#B99B72' },
  { value: 'ghost',         label: 'Cristal transparente', swatch: '#DCEAF2' },
];

export const TABLE_SURFACES: { value: TableSurfaceStyle; label: string }[] = [
  { value: 'nappe',      label: 'Nappe drapée' },
  { value: 'bois_chene', label: 'Bois chêne clair' },
  { value: 'bois_verni', label: 'Bois merisier verni' },
  { value: 'marbre_or',  label: 'Marbre & pieds dorés' },
];

export const CENTERPIECES: { value: CenterpieceStyle; label: string }[] = [
  { value: 'boule_blanche',  label: 'Bouquet haut' },
  { value: 'candelabre',     label: 'Candélabre & fleurs' },
  { value: 'couronne_basse', label: 'Couronne & bougie' },
  { value: 'eucalyptus',     label: 'Eucalyptus champêtre' },
  { value: 'bougeoirs',      label: 'Trio de bougies' },
  { value: 'aucun',          label: 'Sans centre' },
];

/* ── Géométries tournées mises en cache ── */
let _plate: THREE.LatheGeometry | null = null;
const plateGeom = () => (_plate ||= new THREE.LatheGeometry(
  [[0, 0.002], [0.09, 0.002], [0.11, 0.01], [0.145, 0.024], [0.15, 0.027], [0.105, 0.011], [0, 0.006]].map(([x, y]) => new THREE.Vector2(x, y)), 28
));

let _glass: THREE.LatheGeometry | null = null;
const glassGeom = () => (_glass ||= new THREE.LatheGeometry(
  [[0, 0], [0.032, 0], [0.005, 0.008], [0.004, 0.09], [0.034, 0.13], [0.038, 0.175], [0.034, 0.2], [0.032, 0.2], [0.035, 0.175], [0.03, 0.132], [0, 0.1]].map(([x, y]) => new THREE.Vector2(x, y)), 22
));

/* ── Couvert individuel : assiette + serviette pliée + verre à pied + couverts ── */
export function PlaceSetting3D({ x, z, angle, napkinColor }: { x: number; z: number; angle: number; napkinColor: string }) {
  return (
    <group position={[x, TABLE_TOP_Y + 0.012, z]} rotation={[0, angle, 0]}>
      <mesh geometry={plateGeom()} castShadow>
        <meshPhysicalMaterial color="#fbfaf7" roughness={0.18} clearcoat={0.7} />
      </mesh>
      <mesh position={[0, 0.016, 0]} rotation={[0, 0.25, 0]}>
        <boxGeometry args={[0.14, 0.012, 0.07]} />
        <meshStandardMaterial color={napkinColor} roughness={0.85} />
      </mesh>
      <mesh geometry={glassGeom()} position={[0.11, 0, -0.11]}>
        <meshPhysicalMaterial color="#eef6fb" roughness={0.05} transmission={0.85} transparent opacity={0.65} />
      </mesh>
      <mesh position={[-0.18, 0.004, 0]}>
        <boxGeometry args={[0.014, 0.004, 0.17]} />
        <meshStandardMaterial color="#d8dce2" metalness={0.85} roughness={0.2} />
      </mesh>
      <mesh position={[0.18, 0.004, 0]}>
        <boxGeometry args={[0.014, 0.004, 0.18]} />
        <meshStandardMaterial color="#d8dce2" metalness={0.85} roughness={0.2} />
      </mesh>
    </group>
  );
}

/* ── Centres de table ── */
function Bouquet({ y, r, color }: { y: number; r: number; color: string }) {
  const buds: [number, number, number, string][] = [
    [0, r * 0.55, 0, '#fffaf5'],
    ...Array.from({ length: 8 }, (_, i): [number, number, number, string] => {
      const a = (i / 8) * Math.PI * 2;
      return [Math.cos(a) * r * 0.65, r * 0.2, Math.sin(a) * r * 0.65, i % 2 ? color : '#fff8f2'];
    }),
  ];
  return (
    <group position={[0, y, 0]}>
      <mesh castShadow>
        <sphereGeometry args={[r * 0.78, 14, 12]} />
        <meshStandardMaterial color="#5e7a58" roughness={0.85} />
      </mesh>
      {buds.map(([bx, by, bz, c], i) => (
        <mesh key={i} position={[bx, by, bz]} castShadow>
          <sphereGeometry args={[r * 0.36, 10, 10]} />
          <meshStandardMaterial color={c} roughness={0.75} />
        </mesh>
      ))}
    </group>
  );
}

const Candle = ({ x, z, h }: { x: number; z: number; h: number }) => (
  <group position={[x, 0, z]}>
    <mesh position={[0, h / 2, 0]} castShadow>
      <cylinderGeometry args={[0.022, 0.024, h, 12]} />
      <meshStandardMaterial color="#fbf6ec" roughness={0.6} />
    </mesh>
    <mesh position={[0, h + 0.022, 0]}>
      <sphereGeometry args={[0.014, 8, 8]} />
      <meshStandardMaterial color="#ffd27d" emissive="#ff9c2a" emissiveIntensity={2.2} />
    </mesh>
  </group>
);

export function Centerpiece3D({ style, flowerColor }: { style: CenterpieceStyle; flowerColor: string }) {
  if (style === 'aucun') return null;
  return (
    <group position={[0, TABLE_TOP_Y + 0.012, 0]}>
      {style === 'boule_blanche' && (
        <>
          <mesh position={[0, 0.22, 0]} castShadow>
            <cylinderGeometry args={[0.055, 0.09, 0.44, 16]} />
            <meshPhysicalMaterial color="#f6f4ef" roughness={0.2} clearcoat={0.6} />
          </mesh>
          <Bouquet y={0.5} r={0.2} color={flowerColor} />
        </>
      )}
      {style === 'candelabre' && (
        <>
          <mesh position={[0, 0.02, 0]}><cylinderGeometry args={[0.1, 0.12, 0.04, 18]} /><meshStandardMaterial color="#d4b26a" metalness={0.8} roughness={0.25} /></mesh>
          <mesh position={[0, 0.26, 0]} castShadow><cylinderGeometry args={[0.016, 0.022, 0.48, 12]} /><meshStandardMaterial color="#d4b26a" metalness={0.8} roughness={0.25} /></mesh>
          <Bouquet y={0.26} r={0.16} color={flowerColor} />
          {[[-0.14, 0], [0.14, 0], [0, 0]].map(([cx, cz], i) => (
            <group key={i} position={[cx, 0.48, cz]}><Candle x={0} z={0} h={0.14} /></group>
          ))}
        </>
      )}
      {style === 'couronne_basse' && (
        <>
          <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.05, 0]} castShadow>
            <torusGeometry args={[0.19, 0.055, 10, 24]} />
            <meshStandardMaterial color="#6b8562" roughness={0.85} />
          </mesh>
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const a = (i / 6) * Math.PI * 2;
            return (
              <mesh key={i} position={[Math.cos(a) * 0.19, 0.09, Math.sin(a) * 0.19]}>
                <sphereGeometry args={[0.042, 10, 10]} />
                <meshStandardMaterial color={i % 2 ? flowerColor : '#fff8f2'} roughness={0.75} />
              </mesh>
            );
          })}
          <Candle x={0} z={0} h={0.18} />
        </>
      )}
      {style === 'eucalyptus' && (
        <>
          <mesh position={[0, 0.035, 0]} rotation={[0, 0.2, 0]} castShadow>
            <boxGeometry args={[0.55, 0.07, 0.16]} />
            <meshStandardMaterial color="#6e8668" roughness={0.9} />
          </mesh>
          {[-0.18, 0, 0.18].map((bx, i) => (
            <mesh key={i} position={[bx, 0.09, (i - 1) * 0.02]}>
              <sphereGeometry args={[0.05, 10, 10]} />
              <meshStandardMaterial color={i === 1 ? flowerColor : '#fffaf3'} roughness={0.75} />
            </mesh>
          ))}
        </>
      )}
      {style === 'bougeoirs' && (
        <>
          <Candle x={-0.1} z={0.04} h={0.22} />
          <Candle x={0.09} z={0.05} h={0.15} />
          <Candle x={0} z={-0.08} h={0.28} />
        </>
      )}
    </group>
  );
}

/* ── Chaises : dossier à -Z (orienté par le parent à l'opposé de la table) ── */
const LEGS_4: [number, number][] = [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]];

export function Chair3D({ style, seatType, occupied }: { style: ChairStyle; seatType?: SeatType; occupied: boolean }) {
  // Coussin : teinte douce rose poudré si la place est attribuée (repère immédiat sans dénaturer la chaise)
  const cushion = occupied ? '#F3CFD9' : '#FBFAF7';

  if (seatType === 'enfant') {
    return (
      <group>
        <mesh position={[0, 0.54, 0]} castShadow><boxGeometry args={[0.34, 0.04, 0.32]} /><meshStandardMaterial color="#FBD3E0" roughness={0.6} /></mesh>
        <mesh position={[0, 0.73, -0.15]} castShadow><boxGeometry args={[0.34, 0.34, 0.035]} /><meshStandardMaterial color="#E5A0B7" roughness={0.55} /></mesh>
        <mesh position={[0, 0.62, 0.14]}><boxGeometry args={[0.34, 0.03, 0.1]} /><meshStandardMaterial color="#f5efe6" roughness={0.5} /></mesh>
        {[[-0.14, -0.14], [0.14, -0.14], [-0.14, 0.14], [0.14, 0.14]].map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.27, lz]} castShadow><cylinderGeometry args={[0.018, 0.022, 0.54, 8]} /><meshStandardMaterial color="#bfa586" roughness={0.5} /></mesh>
        ))}
      </group>
    );
  }
  if (seatType === 'pmr') {
    return (
      <group>
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.26, 0.33, 28]} />
          <meshBasicMaterial color="#6EA0D6" />
        </mesh>
        <mesh position={[0, 0.44, 0]} castShadow><boxGeometry args={[0.46, 0.05, 0.44]} /><meshStandardMaterial color="#D7E4F4" roughness={0.6} /></mesh>
        <mesh position={[0, 0.72, -0.2]} castShadow><boxGeometry args={[0.46, 0.5, 0.05]} /><meshStandardMaterial color="#8FB3DB" roughness={0.55} /></mesh>
      </group>
    );
  }

  if (style === 'ghost') {
    return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.21, 0.2, 0.035, 22]} /><meshPhysicalMaterial color={occupied ? '#f5dce4' : '#eaf4fa'} roughness={0.05} transmission={0.82} transparent opacity={0.6} /></mesh>
        <mesh position={[0, 0.75, -0.18]} scale={[1, 1.3, 0.2]} castShadow><sphereGeometry args={[0.19, 18, 14]} /><meshPhysicalMaterial color="#eaf4fa" roughness={0.05} transmission={0.82} transparent opacity={0.6} /></mesh>
        {LEGS_4.map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.22, lz]}><cylinderGeometry args={[0.017, 0.013, 0.44, 8]} /><meshPhysicalMaterial color="#eaf4fa" roughness={0.08} transmission={0.8} transparent opacity={0.65} /></mesh>
        ))}
      </group>
    );
  }

  if (style === 'medaillon') {
    const wood = seatType === 'vip' ? '#d4af37' : '#b99b72';
    return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow><cylinderGeometry args={[0.22, 0.21, 0.06, 22]} /><meshStandardMaterial color={cushion} roughness={0.7} /></mesh>
        <mesh position={[0, 0.77, -0.18]} scale={[1, 1.25, 0.28]} castShadow><torusGeometry args={[0.165, 0.022, 10, 24]} /><meshStandardMaterial color={wood} roughness={0.42} metalness={seatType === 'vip' ? 0.6 : 0.08} /></mesh>
        <mesh position={[0, 0.77, -0.18]} scale={[0.9, 1.15, 0.16]}><sphereGeometry args={[0.155, 16, 12]} /><meshStandardMaterial color={cushion} roughness={0.78} /></mesh>
        {LEGS_4.map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.22, lz]} castShadow><cylinderGeometry args={[0.019, 0.013, 0.44, 9]} /><meshStandardMaterial color={wood} roughness={0.42} /></mesh>
        ))}
      </group>
    );
  }

  if (style === 'napoleon') {
    const frame = seatType === 'vip' ? '#d4af37' : '#f0ece4';
    return (
      <group>
        <mesh position={[0, 0.45, 0]} castShadow><boxGeometry args={[0.41, 0.05, 0.4]} /><meshStandardMaterial color={cushion} roughness={0.7} /></mesh>
        <mesh position={[0, 0.92, -0.18]} castShadow><boxGeometry args={[0.41, 0.045, 0.04]} /><meshStandardMaterial color={frame} roughness={0.45} metalness={seatType === 'vip' ? 0.6 : 0.05} /></mesh>
        {[-0.15, -0.05, 0.05, 0.15].map((bx, i) => (
          <mesh key={i} position={[bx, 0.68, -0.18]} castShadow><cylinderGeometry args={[0.014, 0.014, 0.46, 8]} /><meshStandardMaterial color={frame} roughness={0.45} /></mesh>
        ))}
        {LEGS_4.map(([lx, lz], i) => (
          <mesh key={i} position={[lx, 0.22, lz]} castShadow><cylinderGeometry args={[0.02, 0.016, 0.44, 8]} /><meshStandardMaterial color={frame} roughness={0.45} /></mesh>
        ))}
      </group>
    );
  }

  // Chiavari (bois, or, noire) — barreaux fins + coussin
  const frame = seatType === 'vip' ? '#d4af37' : style === 'chiavari_or' ? '#d4b26a' : style === 'chiavari_noire' ? '#242129' : '#be8a47';
  const metal = style === 'chiavari_or' || seatType === 'vip' ? 0.65 : 0.08;
  const rough = style === 'chiavari_or' || seatType === 'vip' ? 0.24 : 0.34;
  return (
    <group>
      <mesh position={[0, 0.43, 0]} castShadow><boxGeometry args={[0.41, 0.03, 0.4]} /><meshStandardMaterial color={frame} roughness={rough} metalness={metal} /></mesh>
      <mesh position={[0, 0.465, 0.005]} castShadow><boxGeometry args={[0.38, 0.038, 0.37]} /><meshStandardMaterial color={cushion} roughness={0.7} /></mesh>
      {LEGS_4.map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.215, lz]} castShadow><cylinderGeometry args={[0.017, 0.013, 0.43, 10]} /><meshStandardMaterial color={frame} roughness={rough} metalness={metal} /></mesh>
      ))}
      {[-0.18, 0.18].map((bx, i) => (
        <mesh key={`p${i}`} position={[bx, 0.72, -0.175]} castShadow><cylinderGeometry args={[0.017, 0.017, 0.56, 10]} /><meshStandardMaterial color={frame} roughness={rough} metalness={metal} /></mesh>
      ))}
      {[0.95, 0.86, 0.5].map((ry, i) => (
        <mesh key={`b${i}`} position={[0, ry, -0.175]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.013, 0.013, 0.36, 9]} /><meshStandardMaterial color={frame} roughness={rough} metalness={metal} /></mesh>
      ))}
      {[-0.11, -0.037, 0.037, 0.11].map((sx, i) => (
        <mesh key={`s${i}`} position={[sx, 0.68, -0.175]}><cylinderGeometry args={[0.009, 0.009, 0.35, 8]} /><meshStandardMaterial color={frame} roughness={rough} metalness={metal} /></mesh>
      ))}
    </group>
  );
}

/* ── Plateau + piètement ou jupe de nappe (aux dimensions exactes du plan 2D) ── */
export function TableBody3D({ shape, tableColor, decor }: { shape: TableShape; tableColor?: string; decor: DecorConfig }) {
  const w = TABLE_W / UNITS_PER_M; // 3.0 m
  const d = TABLE_H / UNITS_PER_M; // 1.2 m
  const r = ROUND_R / UNITS_PER_M; // 0.84 m
  // Une couleur choisie sur la table force l'habillage nappe sur cette table
  const surface: TableSurfaceStyle = tableColor ? 'nappe' : decor.table_style;
  const cloth = tableColor || decor.cloth_color;
  const pleats = useMemo(() => pleatTexture(), []);
  const wood = useMemo(() => (surface === 'bois_verni' ? woodTexture('verni') : surface === 'bois_chene' ? woodTexture('chene') : null), [surface]);

  if (surface === 'nappe') {
    if (shape === 'round' || shape === 'oval') {
      const sx = shape === 'oval' ? w / 2 / r : 1;
      const sz = shape === 'oval' ? d / 2 / r : 1;
      return (
        <group scale={[sx, 1, sz]}>
          <mesh position={[0, TABLE_TOP_Y, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[r, r, 0.025, 44]} />
            <meshStandardMaterial color={cloth} roughness={0.82} />
          </mesh>
          {/* Jupe drapée légèrement évasée jusqu'au sol */}
          <mesh position={[0, TABLE_TOP_Y / 2, 0]} castShadow receiveShadow>
            <cylinderGeometry args={[r + 0.005, r + 0.06, TABLE_TOP_Y, 56, 1, true]} />
            <meshStandardMaterial color={cloth} map={pleats} roughness={0.86} side={THREE.DoubleSide} />
          </mesh>
        </group>
      );
    }
    return (
      <group>
        <mesh position={[0, TABLE_TOP_Y, 0]} castShadow receiveShadow>
          <boxGeometry args={[w, 0.026, d]} />
          <meshStandardMaterial color={cloth} roughness={0.82} />
        </mesh>
        <mesh position={[0, TABLE_TOP_Y / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[w + 0.03, TABLE_TOP_Y, d + 0.03]} />
          <meshStandardMaterial color={cloth} map={pleats} roughness={0.86} />
        </mesh>
      </group>
    );
  }

  // Plateau apparent (bois ou marbre) + pieds
  const topProps = surface === 'marbre_or'
    ? { color: '#f6f5f2', roughness: 0.14, metalness: 0.05 }
    : { map: wood || undefined, color: '#ffffff', roughness: surface === 'bois_verni' ? 0.25 : 0.48, metalness: 0.04 };
  const legColor = surface === 'marbre_or' ? '#d4b26a' : surface === 'bois_verni' ? '#f4f0e8' : '#b49368';
  const legMetal = surface === 'marbre_or' ? 0.8 : 0.05;

  if (shape === 'round' || shape === 'oval') {
    const sx = shape === 'oval' ? w / 2 / r : 1;
    const sz = shape === 'oval' ? d / 2 / r : 1;
    return (
      <group>
        <mesh position={[0, TABLE_TOP_Y, 0]} scale={[sx, 1, sz]} castShadow receiveShadow>
          <cylinderGeometry args={[r, r, 0.038, 44]} />
          <meshStandardMaterial {...topProps} />
        </mesh>
        <mesh position={[0, TABLE_TOP_Y / 2, 0]} castShadow>
          <cylinderGeometry args={[0.09, 0.14, TABLE_TOP_Y, 18]} />
          <meshStandardMaterial color={legColor} metalness={legMetal} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.025, 0]} castShadow>
          <cylinderGeometry args={[0.38, 0.42, 0.05, 24]} />
          <meshStandardMaterial color={legColor} metalness={legMetal} roughness={0.35} />
        </mesh>
      </group>
    );
  }
  const lx = w / 2 - 0.16, lz = d / 2 - 0.14;
  return (
    <group>
      <mesh position={[0, TABLE_TOP_Y, 0]} castShadow receiveShadow>
        <boxGeometry args={[w, 0.04, d]} />
        <meshStandardMaterial {...topProps} />
      </mesh>
      {[[-lx, -lz], [lx, -lz], [-lx, lz], [lx, lz]].map(([x, z], i) => (
        <mesh key={i} position={[x, TABLE_TOP_Y / 2, z]} castShadow>
          <cylinderGeometry args={[0.035, 0.026, TABLE_TOP_Y, 12]} />
          <meshStandardMaterial color={legColor} metalness={legMetal} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}
