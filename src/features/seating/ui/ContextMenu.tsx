'use client';

/**
 * Menu contextuel d'un élément du plan (clic droit sur PC, appui long sur mobile).
 * PC : petit menu flottant collé au curseur. Mobile : feuille en bas d'écran (cibles tactiles larges).
 * Composant de présentation pur — les actions sont fournies par l'appelant.
 */

import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react';

export interface ContextMenuItem {
  key: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  danger?: boolean;
}

export function ContextMenu({
  x, y, title, items, onClose,
}: {
  x: number;
  y: number;
  title?: string;
  items: ContextMenuItem[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setMobile(window.matchMedia('(max-width: 639px)').matches);
    const away = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('pointerdown', away, true);
    window.addEventListener('keydown', key);
    window.addEventListener('resize', onClose);
    return () => {
      window.removeEventListener('pointerdown', away, true);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', onClose);
    };
  }, [onClose]);

  // Garde le menu dans la fenêtre (bord droit / bas)
  useLayoutEffect(() => {
    if (!ref.current || mobile) return;
    const r = ref.current.getBoundingClientRect();
    setPos({
      left: Math.max(8, Math.min(x, window.innerWidth - r.width - 8)),
      top: Math.max(8, Math.min(y, window.innerHeight - r.height - 8)),
    });
  }, [x, y, mobile, items.length]);

  const run = (it: ContextMenuItem) => { it.onClick(); onClose(); };

  const list = (
    <>
      {title && <p className="px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.1em] uppercase text-charcoal-400 truncate">{title}</p>}
      {items.map((it) => (
        <button key={it.key} type="button" onClick={() => run(it)}
          className={`w-full flex items-center gap-2.5 px-3 text-left transition-colors ${mobile ? 'h-12 text-sm' : 'h-9 text-[13px]'} ${
            it.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-charcoal-700 hover:bg-stone-50'
          }`}>
          <span className="w-4 h-4 flex items-center justify-center shrink-0">{it.icon}</span>
          {it.label}
        </button>
      ))}
    </>
  );

  if (mobile)
    return (
      <div className="fixed inset-0 z-[120] bg-charcoal-950/30" role="presentation">
        <div ref={ref} role="menu" className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="w-10 h-1 rounded-full bg-stone-200 mx-auto mb-1" />
          {list}
        </div>
      </div>
    );

  return (
    <div ref={ref} role="menu" style={{ left: pos.left, top: pos.top }}
      className="fixed z-[120] min-w-[180px] py-1 bg-white rounded-lg shadow-xl border border-stone-200">
      {list}
    </div>
  );
}
