'use client';

import { useState } from 'react';
import { Delete, RefreshCw } from 'lucide-react';

/* ── Types ── */
type CalcOp = '+' | '−' | '×' | '÷' | null;

const BUDGET_ITEMS = [
  { id: 'salle',       label: 'Salle & réception',   pct: 30, color: '#A68540' },
  { id: 'traiteur',    label: 'Traiteur & boissons',  pct: 35, color: '#BE6040' },
  { id: 'photo',       label: 'Photographe / vidéo',  pct: 10, color: '#2D2A26' },
  { id: 'deco',        label: 'Décoration & fleurs',  pct: 8,  color: '#8B7355' },
  { id: 'musique',     label: 'Musique & animation',  pct: 7,  color: '#C4956A' },
  { id: 'tenues',      label: 'Tenues & accessoires', pct: 6,  color: '#9B7B4F' },
  { id: 'papeterie',   label: 'Faire-part & papeterie',pct: 2, color: '#B89870' },
  { id: 'divers',      label: 'Divers & imprévus',    pct: 2,  color: '#D4B896' },
];

export default function CalculatricePage() {
  /* ── Calculator state ── */
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [op, setOp] = useState<CalcOp>(null);
  const [waitingNext, setWaitingNext] = useState(false);
  const [expression, setExpression] = useState('');

  /* ── Budget estimator state ── */
  const [budget, setBudget] = useState('20000');
  const [guests, setGuests] = useState('100');
  const [customPct, setCustomPct] = useState<Record<string, number>>({});

  /* ── Calculator logic ── */
  const inputDigit = (d: string) => {
    if (waitingNext) {
      setDisplay(d === '.' ? '0.' : d);
      setWaitingNext(false);
    } else {
      if (d === '.' && display.includes('.')) return;
      setDisplay(display === '0' && d !== '.' ? d : display + d);
    }
  };

  const inputOp = (nextOp: CalcOp) => {
    const curr = parseFloat(display);
    if (prevValue !== null && !waitingNext) {
      const result = calculate(prevValue, curr, op);
      setDisplay(String(fmtNum(result)));
      setPrevValue(result);
      setExpression(`${fmtNum(result)} ${nextOp}`);
    } else {
      setPrevValue(curr);
      setExpression(`${fmtNum(curr)} ${nextOp}`);
    }
    setOp(nextOp);
    setWaitingNext(true);
  };

  const calculate = (a: number, b: number, o: CalcOp): number => {
    switch (o) {
      case '+': return a + b;
      case '−': return a - b;
      case '×': return a * b;
      case '÷': return b !== 0 ? a / b : 0;
      default: return b;
    }
  };

  const fmtNum = (n: number) => {
    if (Number.isInteger(n) || String(n).replace(/\d+\./, '').length <= 6) return n;
    return parseFloat(n.toFixed(6));
  };

  const handleEquals = () => {
    if (op === null || prevValue === null) return;
    const curr = parseFloat(display);
    const result = calculate(prevValue, curr, op);
    setExpression(`${expression} ${fmtNum(curr)} =`);
    setDisplay(String(fmtNum(result)));
    setPrevValue(null);
    setOp(null);
    setWaitingNext(true);
  };

  const handleClear = () => {
    setDisplay('0');
    setPrevValue(null);
    setOp(null);
    setWaitingNext(false);
    setExpression('');
  };

  const handleBackspace = () => {
    if (waitingNext) return;
    const next = display.length > 1 ? display.slice(0, -1) : '0';
    setDisplay(next);
  };

  const handlePercent = () => {
    setDisplay(String(parseFloat(display) / 100));
    setWaitingNext(true);
  };

  const handleNegate = () => {
    setDisplay(String(-parseFloat(display)));
  };

  /* ── Budget logic ── */
  const totalBudget = parseFloat(budget) || 0;
  const totalGuests = parseInt(guests) || 1;
  const perGuest = totalBudget / totalGuests;

  const getPct = (id: string, defaultPct: number) => customPct[id] ?? defaultPct;

  /* ── UI helpers ── */
  const btnBase = 'flex items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-100 active:scale-95 select-none cursor-pointer h-14';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Calculatrice & budget</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">Calculatrice instantanée + estimateur de budget mariage</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ── LEFT: Real Calculator ── */}
        <div className="bg-charcoal-900 rounded-3xl shadow-xl overflow-hidden lg:sticky lg:top-6">
          {/* Display */}
          <div className="px-6 pt-8 pb-4">
            {/* Expression */}
            <p className="text-right text-charcoal-400 text-xs h-5 font-mono tracking-wider truncate">
              {expression || '\u00a0'}
            </p>
            {/* Main display */}
            <p
              className="text-right text-white font-light leading-none mt-1 font-mono transition-all"
              style={{ fontSize: display.length > 12 ? '1.8rem' : display.length > 8 ? '2.4rem' : '3rem' }}
            >
              {parseFloat(display).toLocaleString('fr-FR', { maximumFractionDigits: 8 })}
            </p>
          </div>

          {/* Buttons */}
          <div className="px-4 pb-6 grid grid-cols-4 gap-2.5">
            {/* Row 1 */}
            <button onClick={handleClear}
              className={`${btnBase} bg-white/15 text-white hover:bg-white/25 col-span-1`}>
              {op || prevValue !== null ? 'AC' : 'C'}
            </button>
            <button onClick={handleNegate}
              className={`${btnBase} bg-white/15 text-white hover:bg-white/25`}>
              +/−
            </button>
            <button onClick={handlePercent}
              className={`${btnBase} bg-white/15 text-white hover:bg-white/25`}>
              %
            </button>
            <button onClick={() => inputOp('÷')}
              className={`${btnBase} ${op === '÷' && waitingNext ? 'bg-white text-champagne-600' : 'bg-champagne-500 text-white hover:bg-champagne-400'}`}>
              ÷
            </button>

            {/* Row 2 */}
            {['7','8','9'].map(d => (
              <button key={d} onClick={() => inputDigit(d)}
                className={`${btnBase} bg-white/10 text-white hover:bg-white/20`}>{d}</button>
            ))}
            <button onClick={() => inputOp('×')}
              className={`${btnBase} ${op === '×' && waitingNext ? 'bg-white text-champagne-600' : 'bg-champagne-500 text-white hover:bg-champagne-400'}`}>
              ×
            </button>

            {/* Row 3 */}
            {['4','5','6'].map(d => (
              <button key={d} onClick={() => inputDigit(d)}
                className={`${btnBase} bg-white/10 text-white hover:bg-white/20`}>{d}</button>
            ))}
            <button onClick={() => inputOp('−')}
              className={`${btnBase} ${op === '−' && waitingNext ? 'bg-white text-champagne-600' : 'bg-champagne-500 text-white hover:bg-champagne-400'}`}>
              −
            </button>

            {/* Row 4 */}
            {['1','2','3'].map(d => (
              <button key={d} onClick={() => inputDigit(d)}
                className={`${btnBase} bg-white/10 text-white hover:bg-white/20`}>{d}</button>
            ))}
            <button onClick={() => inputOp('+')}
              className={`${btnBase} ${op === '+' && waitingNext ? 'bg-white text-champagne-600' : 'bg-champagne-500 text-white hover:bg-champagne-400'}`}>
              +
            </button>

            {/* Row 5 */}
            <button onClick={() => inputDigit('0')}
              className={`${btnBase} bg-white/10 text-white hover:bg-white/20 col-span-1`}>
              0
            </button>
            <button onClick={() => inputDigit('.')}
              className={`${btnBase} bg-white/10 text-white hover:bg-white/20`}>
              ,
            </button>
            <button onClick={handleBackspace}
              className={`${btnBase} bg-white/10 text-white hover:bg-white/20`}>
              <Delete className="w-4 h-4" />
            </button>
            <button onClick={handleEquals}
              className={`${btnBase} bg-rose-500 text-white hover:bg-rose-400 shadow-lg`}>
              =
            </button>
          </div>

          {/* Quick shortcuts */}
          <div className="px-4 pb-5 grid grid-cols-3 gap-2">
            {[
              { label: 'TVA 20%', action: () => { setDisplay(String(fmtNum(parseFloat(display) * 1.2))); setWaitingNext(true); } },
              { label: '÷ invités', action: () => { if (totalGuests > 0) { setDisplay(String(fmtNum(parseFloat(display) / totalGuests))); setWaitingNext(true); } } },
              { label: 'Copier', action: () => { navigator.clipboard?.writeText(display); } },
            ].map(s => (
              <button key={s.label} onClick={s.action}
                className="py-2 text-[0.65rem] font-semibold text-white/50 bg-white/5 hover:bg-white/10 rounded-xl transition-colors tracking-wide uppercase">
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Budget Estimator ── */}
        <div className="space-y-4">
          {/* Inputs */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-charcoal-900 text-sm">Estimateur de budget</h2>
              <button onClick={() => setCustomPct({})} className="flex items-center gap-1 text-xs text-charcoal-400 hover:text-charcoal-700 transition-colors">
                <RefreshCw className="w-3 h-3" /> Réinitialiser
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Budget total (€)</label>
                <input
                  type="number" value={budget} min="0"
                  onChange={e => setBudget(e.target.value)}
                  className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 bg-ivory-50 font-mono"
                />
              </div>
              <div>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Nombre d'invités</label>
                <input
                  type="number" value={guests} min="1"
                  onChange={e => setGuests(e.target.value)}
                  className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 bg-ivory-50 font-mono"
                />
              </div>
            </div>
            {/* Per-guest */}
            <div className="bg-charcoal-50 rounded-xl px-4 py-3 flex items-center justify-between">
              <p className="text-xs text-charcoal-500">Coût par invité</p>
              <p className="font-mono font-semibold text-charcoal-900">
                {perGuest.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} €
              </p>
            </div>
          </div>

          {/* Breakdown */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-5">
            <h3 className="font-semibold text-charcoal-900 text-sm mb-4">Répartition par poste</h3>
            <div className="space-y-3">
              {BUDGET_ITEMS.map(item => {
                const pct = getPct(item.id, item.pct);
                const amount = Math.round((totalBudget * pct) / 100);
                return (
                  <div key={item.id}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-xs text-charcoal-700">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number" min="0" max="100" value={pct}
                            onChange={e => setCustomPct(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                            className="w-10 text-right text-xs border border-charcoal-200 rounded-lg px-1 py-0.5 focus:outline-none focus:border-rose-400 bg-transparent font-mono"
                          />
                          <span className="text-xs text-charcoal-400">%</span>
                        </div>
                        <span className="font-mono text-xs font-semibold text-charcoal-900 w-20 text-right">
                          {amount.toLocaleString('fr-FR')} €
                        </span>
                      </div>
                    </div>
                    {/* Bar */}
                    <div className="w-full h-1.5 bg-charcoal-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%`, backgroundColor: item.color }} />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total check */}
            <div className="mt-4 pt-4 border-t border-charcoal-100 flex items-center justify-between">
              <span className="text-xs text-charcoal-500">Total alloué</span>
              <span className={`font-mono text-sm font-bold ${
                BUDGET_ITEMS.reduce((s, i) => s + getPct(i.id, i.pct), 0) === 100
                  ? 'text-green-600' : 'text-rose-600'
              }`}>
                {BUDGET_ITEMS.reduce((s, i) => s + getPct(i.id, i.pct), 0)}%
                {' / '}
                {BUDGET_ITEMS.reduce((s, i) => s + Math.round((totalBudget * getPct(i.id, i.pct)) / 100), 0).toLocaleString('fr-FR')} €
              </span>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-champagne-50 border border-champagne-200 rounded-2xl p-4">
            <p className="text-xs font-semibold text-champagne-800 mb-2">💡 Conseil budget</p>
            <p className="text-xs text-champagne-700 leading-relaxed">
              Réservez toujours <strong>10–15%</strong> de votre budget pour les imprévus.
              Le traiteur représente en général <strong>35–40%</strong> du budget total.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
