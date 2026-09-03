'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { MoreVertical } from 'lucide-react';

export interface TableActionItem {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  hidden?: boolean;
  danger?: boolean;
}

interface TableActionsMenuProps {
  items: TableActionItem[];
}

export function TableActionsMenu({ items }: TableActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ bottom: number; left: number; maxHeight: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('resize', close);
    window.addEventListener('scroll', close, true);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('resize', close);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const visible = items.filter((i) => !i.hidden);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (open) {
      setOpen(false);
      setPos(null);
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 224;
    let left = rect.right - menuWidth - 8;
    if (left + menuWidth > window.innerWidth - 16) left = window.innerWidth - menuWidth - 16;
    if (left < 8) left = 8;
    const bottom = window.innerHeight - rect.top + 6;
    const maxHeight = Math.max(120, rect.top - 24);
    setPos({ bottom, left, maxHeight });
    setOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="p-2 rounded-lg hover:bg-charcoal-50 transition-colors"
        title="Actions"
      >
        <MoreVertical className="w-4 h-4 text-charcoal-600" />
      </button>
      {typeof document !== 'undefined' && open && pos && createPortal(
        <div
          style={{ bottom: pos.bottom, left: pos.left, maxHeight: pos.maxHeight }}
          className="fixed z-[60] w-56 bg-white border border-charcoal-100 rounded-xl shadow-soft overflow-y-auto"
        >
          <div className="py-1">
            {visible.map((item, idx) => (
              <div key={idx}>
                {idx > 0 && <div className="h-px bg-charcoal-100 my-1" />}
                <button
                  type="button"
                  onClick={() => { item.onClick(); setOpen(false); }}
                  disabled={item.disabled}
                  className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors disabled:opacity-50 ${
                    item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-charcoal-700 hover:bg-charcoal-50'
                  }`}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  <span>{item.label}</span>
                </button>
              </div>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
