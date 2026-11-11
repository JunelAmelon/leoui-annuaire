/**
 * Textures procédurales de la vue 3D (canvas 2D → THREE.CanvasTexture).
 * Aucune image à charger : sols, bois et plis de nappe sont dessinés à la volée puis mis en cache.
 * Les UV des sols sont en mètres → `tileMeters` indique la taille réelle du motif.
 */

import * as THREE from 'three';
import type { FloorStyle } from '../../domain/types';

const cache = new Map<string, THREE.CanvasTexture>();

/** Générateur pseudo-aléatoire déterministe : les textures sont identiques à chaque chargement. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function makeTexture(key: string, size: number, draw: (ctx: CanvasRenderingContext2D, size: number) => void) {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = size;
  draw(cv.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  cache.set(key, tex);
  return tex;
}

const jitter = (hex: string, amount: number, r: () => number) => {
  const n = parseInt(hex.slice(1), 16);
  const k = (v: number) => Math.max(0, Math.min(255, Math.round(v + (r() - 0.5) * amount)));
  return `rgb(${k(n >> 16)},${k((n >> 8) & 255)},${k(n & 255)})`;
};

/** Définition d'un style de sol : taille réelle du motif + paramètres du matériau. */
export const FLOOR_DEFS: Record<FloorStyle, { label: string; tileMeters: number; roughness: number; metalness: number; clearcoat: number; swatch: string }> = {
  dalles:          { label: 'Dalles blanches',  tileMeters: 2, roughness: 0.28, metalness: 0.04, clearcoat: 0.5, swatch: '#EFEDE8' },
  parquet_clair:   { label: 'Parquet chêne',    tileMeters: 2, roughness: 0.5,  metalness: 0.02, clearcoat: 0.2, swatch: '#D9BF94' },
  parquet_chevron: { label: 'Parquet chevrons', tileMeters: 2, roughness: 0.4,  metalness: 0.03, clearcoat: 0.3, swatch: '#B98D63' },
  marbre:          { label: 'Marbre veiné',     tileMeters: 3, roughness: 0.12, metalness: 0.05, clearcoat: 0.9, swatch: '#F4F3F0' },
  beton_cire:      { label: 'Béton ciré',       tileMeters: 4, roughness: 0.55, metalness: 0.08, clearcoat: 0.0, swatch: '#CFCAC2' },
  tapis_sable:     { label: 'Moquette sable',   tileMeters: 1.5, roughness: 0.95, metalness: 0,  clearcoat: 0.0, swatch: '#E2D6C2' },
};

export function floorTexture(style: FloorStyle): THREE.CanvasTexture {
  const { tileMeters } = FLOOR_DEFS[style];
  const tex = makeTexture(`floor-${style}`, 512, (ctx, S) => {
    const r = rng(style.length * 977);
    switch (style) {
      case 'parquet_clair': {
        ctx.fillStyle = '#d4b98c'; ctx.fillRect(0, 0, S, S);
        const rowH = 32;
        for (let row = 0; row < S / rowH; row++) {
          const len = 256;
          const off = (row * 97) % len;
          for (let x = -off; x < S; x += len) {
            ctx.fillStyle = jitter('#d9bf94', 26, r);
            ctx.fillRect(x + 1, row * rowH + 1, len - 2, rowH - 2);
            ctx.strokeStyle = 'rgba(120,85,45,0.10)';
            for (let g = 0; g < 4; g++) { ctx.beginPath(); const gy = row * rowH + 5 + g * 7 + r() * 3; ctx.moveTo(x + 4, gy); ctx.lineTo(x + len - 4, gy + (r() - 0.5) * 2); ctx.stroke(); }
          }
          ctx.fillStyle = 'rgba(70,45,20,0.28)'; ctx.fillRect(0, row * rowH, S, 1.2);
        }
        break;
      }
      case 'parquet_chevron': {
        ctx.fillStyle = '#a8835a'; ctx.fillRect(0, 0, S, S);
        const col = 64;
        for (let c = 0; c < S / col; c++) {
          ctx.save();
          ctx.beginPath(); ctx.rect(c * col, 0, col, S); ctx.clip();
          ctx.translate(c * col + col / 2, S / 2);
          ctx.rotate(((c % 2 ? -1 : 1) * Math.PI) / 4);
          for (let s = -30; s <= 30; s++) {
            ctx.fillStyle = jitter('#b28c63', 34, r);
            ctx.fillRect(-420, s * 22, 840, 21);
            for (let j = -420; j < 420; j += 110 + r() * 40) { ctx.fillStyle = 'rgba(60,38,18,0.35)'; ctx.fillRect(j, s * 22, 1.4, 21); }
          }
          ctx.restore();
          ctx.fillStyle = 'rgba(60,38,18,0.45)'; ctx.fillRect(c * col, 0, 1.5, S);
        }
        break;
      }
      case 'marbre': {
        ctx.fillStyle = '#f3f2ef'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 18; i++) {
          const g = ctx.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, 120 + r() * 140);
          g.addColorStop(0, 'rgba(210,210,214,0.20)'); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
        }
        for (let i = 0; i < 16; i++) {
          ctx.strokeStyle = `rgba(${95 + r() * 40},${95 + r() * 40},${105 + r() * 40},${0.12 + r() * 0.28})`;
          ctx.lineWidth = 0.6 + r() * 2.2;
          ctx.beginPath();
          let x = r() * S, y = -10;
          ctx.moveTo(x, y);
          while (y < S + 10) { x += (r() - 0.5) * 70; y += 22 + r() * 34; ctx.quadraticCurveTo(x + (r() - 0.5) * 60, y - 12, x, y); }
          ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(150,150,155,0.55)'; ctx.lineWidth = 2;
        ctx.strokeRect(0, 0, S, S);
        break;
      }
      case 'beton_cire': {
        ctx.fillStyle = '#cdc8c0'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 26; i++) {
          const g = ctx.createRadialGradient(r() * S, r() * S, 0, r() * S, r() * S, 60 + r() * 120);
          const dark = r() > 0.5;
          g.addColorStop(0, dark ? 'rgba(90,86,80,0.10)' : 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
        }
        for (let i = 0; i < 5000; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'; ctx.fillRect(r() * S, r() * S, 1 + r() * 2, 1 + r() * 2); }
        break;
      }
      case 'tapis_sable': {
        ctx.fillStyle = '#e2d6c2'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 14000; i++) { ctx.fillStyle = r() > 0.5 ? 'rgba(255,255,255,0.18)' : 'rgba(120,98,66,0.16)'; ctx.fillRect(r() * S, r() * S, 1.5, 1.5); }
        break;
      }
      default: { // dalles
        ctx.fillStyle = '#f1efea'; ctx.fillRect(0, 0, S, S);
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          const g = ctx.createLinearGradient(i * 256, j * 256, i * 256 + 256, j * 256 + 256);
          g.addColorStop(0, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(190,184,172,0.18)');
          ctx.fillStyle = g; ctx.fillRect(i * 256, j * 256, 256, 256);
        }
        ctx.fillStyle = '#d2cec6';
        ctx.fillRect(0, 0, S, 3); ctx.fillRect(0, 0, 3, S); ctx.fillRect(0, S / 2 - 1.5, S, 3); ctx.fillRect(S / 2 - 1.5, 0, 3, S);
      }
    }
  });
  tex.repeat.set(1 / tileMeters, 1 / tileMeters);
  return tex;
}

/** Bois de plateau de table : veines longitudinales (clair = chêne, chaud = merisier verni). */
export function woodTexture(kind: 'verni' | 'chene'): THREE.CanvasTexture {
  return makeTexture(`wood-${kind}`, 512, (ctx, S) => {
    const r = rng(kind === 'verni' ? 11 : 29);
    const g = ctx.createLinearGradient(0, 0, S, S);
    if (kind === 'verni') { g.addColorStop(0, '#c5723c'); g.addColorStop(0.5, '#b86230'); g.addColorStop(1, '#c97843'); }
    else { g.addColorStop(0, '#d2b48a'); g.addColorStop(0.5, '#c4a276'); g.addColorStop(1, '#d6ba90'); }
    ctx.fillStyle = g; ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 240; i++) {
      const y = (i / 240) * S;
      ctx.strokeStyle = i % 3 === 0 ? 'rgba(90,45,16,0.16)' : i % 2 ? 'rgba(240,190,140,0.12)' : 'rgba(70,35,12,0.09)';
      ctx.lineWidth = 0.8 + r() * 1.6;
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= S; x += 32) ctx.lineTo(x, y + Math.sin(x * 0.018 + i * 0.35) * 3.5);
      ctx.stroke();
    }
  });
}

/** Plis verticaux d'une nappe : niveaux de gris multipliés par la couleur du matériau. */
export function pleatTexture(): THREE.CanvasTexture {
  const tex = makeTexture('pleats', 256, (ctx, S) => {
    const img = ctx.createImageData(S, 4);
    for (let x = 0; x < S; x++) {
      const v = 0.86 + 0.14 * Math.sin((x / S) * Math.PI * 2 * 4) ;
      const c = Math.round(255 * v);
      for (let y = 0; y < 4; y++) { const i = (y * S + x) * 4; img.data[i] = img.data[i + 1] = img.data[i + 2] = c; img.data[i + 3] = 255; }
    }
    ctx.putImageData(img, 0, 0);
    ctx.drawImage(ctx.canvas, 0, 0, S, 4, 0, 0, S, S);
  });
  return tex;
}

/** Damier de piste de danse (deux tons). */
export function danceTexture(a: string, b: string): THREE.CanvasTexture {
  return makeTexture(`dance-${a}-${b}`, 256, (ctx, S) => {
    const n = 4, c = S / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      ctx.fillStyle = (i + j) % 2 ? a : b; ctx.fillRect(i * c, j * c, c, c);
      ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 2; ctx.strokeRect(i * c + 1, j * c + 1, c - 2, c - 2);
    }
  });
}
