'use client';

import { useState, useEffect } from 'react';
import { Delete, RefreshCw, Plus, Trash2 } from 'lucide-react';
import { useClientData } from '@/contexts/ClientDataContext';
import { updateDocument } from '@/lib/db';
import { toast } from 'sonner';

/* ── Types ── */
type CalcOp = '+' | '−' | '×' | '÷' | null;

const BUDGET_ITEMS = [
  { id: 'salle',       label: 'Salle & réception',   pct: 25, color: '#DD6B8D' },
  { id: 'traiteur',    label: 'Traiteur & boissons',  pct: 30, color: '#E11D48' },
  { id: 'photo',       label: 'Photographe / vidéo',  pct: 8,  color: '#2D2A26' },
  { id: 'deco',        label: 'Décoration & fleurs',  pct: 7,  color: '#8B7355' },
  { id: 'musique',     label: 'Musique & animation',  pct: 6,  color: '#C4956A' },
  { id: 'tenues',      label: 'Tenues & accessoires', pct: 5,  color: '#9B7B4F' },
  { id: 'papeterie',   label: 'Faire-part & papeterie',pct: 2, color: '#B89870' },
  { id: 'wedding-cake',label: 'Wedding cake',         pct: 2,  color: '#D4A5A5' },
  { id: 'makeup',      label: 'Maquillage & coiffure',pct: 2,  color: '#E2B6B6' },
  { id: 'transport',   label: 'Transport & voiture',  pct: 1,  color: '#9E9E9E' },
  { id: 'cadeaux',     label: 'Cadeaux invités',      pct: 1,  color: '#C2A77D' },
  { id: 'lune',        label: 'Lune de miel',         pct: 1,  color: '#88A0B5' },
  { id: 'divers',      label: 'Divers & imprévus',    pct: 10, color: '#D4B896' },
];

type BudgetItem = {
  id: string;
  label: string;
  pct: number;
  color: string;
  isCustom?: boolean;
};

export default function CalculatricePage() {
  const { client, event, refresh } = useClientData();

  /* ── Calculator state ── */
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [op, setOp] = useState<CalcOp>(null);
  const [waitingNext, setWaitingNext] = useState(false);
  const [expression, setExpression] = useState('');

  /* ── Budget estimator state ── */
  const [budget, setBudget] = useState('20000');
  const [guests, setGuests] = useState('100');

  /* ── Pre-fill from DB when data loads ── */
  useEffect(() => {
    const dbBudget = event?.budget || (client as any)?.budget;
    const dbGuests = event?.guest_count || (client as any)?.guest_count;
    if (dbBudget && Number(dbBudget) > 0) setBudget(String(dbBudget));
    if (dbGuests && Number(dbGuests) > 0) setGuests(String(dbGuests));
  }, [event?.budget, event?.guest_count, (client as any)?.budget, (client as any)?.guest_count]);

  useEffect(() => {
    const saved = (event as any)?.budget_breakdown || (client as any)?.budget_breakdown;
    if (!saved) return;
    try {
      if (Array.isArray(saved.items) && saved.items.length > 0) {
        setBudgetItems(saved.items as BudgetItem[]);
      }
      if (saved.customPct && typeof saved.customPct === 'object') {
        setCustomPct(saved.customPct as Record<string, number>);
      }
    } catch {
      // ignore
    }
  }, [event, client]);
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>(BUDGET_ITEMS as unknown as BudgetItem[]);
  const [customPct, setCustomPct] = useState<Record<string, number>>({});
  const [newPosteLabel, setNewPosteLabel] = useState('');
  const [newPostePct, setNewPostePct] = useState('');
  const [newPosteColor, setNewPosteColor] = useState('#DD6B8D');
  const [savingBreakdown, setSavingBreakdown] = useState(false);

  /* ── Manual expenses ── */
  type BudgetExpense = { id: string; label: string; planned: string; spent: string };
  const [expenses, setExpenses] = useState<BudgetExpense[]>([]);
  const [newExpenseLabel, setNewExpenseLabel] = useState('');
  const [newExpensePlanned, setNewExpensePlanned] = useState('');
  const [newExpenseSpent, setNewExpenseSpent] = useState('');
  const [savingExpenses, setSavingExpenses] = useState(false);

  useEffect(() => {
    const saved = (event as any)?.budget_expenses || (client as any)?.budget_expenses;
    if (Array.isArray(saved) && saved.length > 0) {
      setExpenses(saved.map((e: any) => ({ id: e.id || `exp-${Date.now()}-${Math.random()}`, label: e.label || '', planned: String(e.planned ?? ''), spent: String(e.spent ?? '') })));
    } else {
      setExpenses([]);
    }
  }, [event, client]);

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

  const totalPct = budgetItems.reduce((s, i) => s + getPct(i.id, i.pct), 0);

  const normalizePct = () => {
    const currentTotal = totalPct;
    if (!currentTotal || currentTotal <= 0) return;
    const next: Record<string, number> = { ...customPct };
    budgetItems.forEach((i) => {
      const raw = getPct(i.id, i.pct);
      const scaled = (raw / currentTotal) * 100;
      next[i.id] = Math.max(0, Math.round(scaled * 10) / 10);
    });
    setCustomPct(next);
  };

  const addCustomPoste = () => {
    const label = newPosteLabel.trim();
    if (!label) return;
    const pct = Math.max(0, Math.min(100, Number(newPostePct) || 0));
    const id = `custom-${Date.now()}`;
    const item: BudgetItem = { id, label, pct, color: newPosteColor || '#DD6B8D', isCustom: true };
    setBudgetItems((prev) => [...prev, item]);
    setCustomPct((prev) => ({ ...prev, [id]: pct }));
    setNewPosteLabel('');
    setNewPostePct('');
  };

  const removeCustomPoste = (id: string) => {
    setBudgetItems((prev) => prev.filter((i) => i.id !== id));
    setCustomPct((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const saveBreakdown = async () => {
    if (!event?.id && !client?.id) return;
    setSavingBreakdown(true);
    try {
      const payload = {
        budget_breakdown: {
          items: budgetItems,
          customPct,
          updated_at: new Date().toISOString(),
        },
      };
      if (event?.id) {
        await updateDocument('events', event.id, payload);
      } else if (client?.id) {
        await updateDocument('clients', client.id, payload);
      }
      await refresh();
      toast.success('Répartition enregistrée');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSavingBreakdown(false);
    }
  };

  const addExpense = () => {
    const label = newExpenseLabel.trim();
    if (!label) return;
    const expense: BudgetExpense = {
      id: `exp-${Date.now()}`,
      label,
      planned: newExpensePlanned,
      spent: newExpenseSpent,
    };
    setExpenses((prev) => [...prev, expense]);
    setNewExpenseLabel('');
    setNewExpensePlanned('');
    setNewExpenseSpent('');
  };

  const updateExpense = (id: string, field: 'label' | 'planned' | 'spent', value: string) => {
    setExpenses((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    );
  };

  const removeExpense = (id: string) => {
    setExpenses((prev) => prev.filter((e) => e.id !== id));
  };

  const saveExpenses = async () => {
    if (!event?.id && !client?.id) return;
    setSavingExpenses(true);
    try {
      const toSave = expenses.map((e) => ({
        ...e,
        planned: e.planned === '' ? 0 : Number(e.planned) || 0,
        spent: e.spent === '' ? 0 : Number(e.spent) || 0,
      }));
      if (event?.id) {
        await updateDocument('events', event.id, { budget_expenses: toSave, budget: Number(budget) || 0 });
      } else if (client?.id) {
        await updateDocument('clients', client.id, { budget_expenses: toSave, budget: Number(budget) || 0 });
      }
      await refresh();
      toast.success('Dépenses enregistrées');
    } catch (e: any) {
      toast.error(e?.message || 'Erreur lors de l\'enregistrement');
    } finally {
      setSavingExpenses(false);
    }
  };

  const totalPlanned = expenses.reduce((s, e) => s + (Number(e.planned) || 0), 0);
  const totalSpent = expenses.reduce((s, e) => s + (Number(e.spent) || 0), 0);
  const remainingBudget = (Number(budget) || 0) - totalSpent;

  /* ── UI helpers ── */
  const btnBase = 'flex items-center justify-center rounded-2xl text-sm font-semibold transition-all duration-100 active:scale-95 select-none cursor-pointer h-14';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">

      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Budget</h1>
        <p className="text-sm text-charcoal-500 mt-0.5">Outils de calcul + estimateur de budget mariage</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

        {/* ── LEFT: Real Calculator ── */}
        <div className="order-2 lg:order-1 bg-charcoal-900 rounded-3xl shadow-xl overflow-hidden lg:sticky lg:top-6">
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
        <div className="order-1 lg:order-2 space-y-4">
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
          </div>

          {/* Manual expenses */}
          <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <h3 className="font-semibold text-charcoal-900 text-sm">Mes dépenses</h3>
              <button
                onClick={saveExpenses}
                disabled={savingExpenses}
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50 transition-colors"
              >
                {savingExpenses ? 'Enregistrement...' : 'Enregistrer'}
              </button>
            </div>

            {/* Table header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs text-charcoal-500 mb-2 px-2">
              <div className="col-span-4">Poste</div>
              <div className="col-span-3 text-right">Prévu</div>
              <div className="col-span-3 text-right">Dépensé</div>
              <div className="col-span-2 text-right">Reste</div>
            </div>

            {/* Expenses list */}
            <div className="space-y-2 mb-4">
              {expenses.length === 0 && (
                <p className="text-xs text-charcoal-400 text-center py-4">Aucune dépense renseignée.</p>
              )}
              {expenses.map((e) => (
                <div key={e.id} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-ivory-50 rounded-xl px-2 py-2">
                  <input
                    value={e.label}
                    onChange={(x) => updateExpense(e.id, 'label', x.target.value)}
                    className="sm:col-span-4 px-2 py-1.5 text-sm border border-charcoal-200 rounded-lg focus:outline-none focus:border-rose-400 bg-white"
                    placeholder="Poste"
                  />
                  <input
                    type="number"
                    min="0"
                    value={e.planned}
                    onChange={(x) => updateExpense(e.id, 'planned', x.target.value)}
                    className="sm:col-span-3 px-2 py-1.5 text-sm border border-charcoal-200 rounded-lg text-right focus:outline-none focus:border-rose-400 bg-white font-mono"
                  />
                  <input
                    type="number"
                    min="0"
                    value={e.spent}
                    onChange={(x) => updateExpense(e.id, 'spent', x.target.value)}
                    className="sm:col-span-3 px-2 py-1.5 text-sm border border-charcoal-200 rounded-lg text-right focus:outline-none focus:border-rose-400 bg-white font-mono"
                  />
                  <div className="sm:col-span-2 flex items-center justify-between gap-2">
                    <span className={`text-xs font-mono font-semibold w-full text-right ${(Number(e.planned || 0) - Number(e.spent || 0)) >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                      {(Number(e.planned || 0) - Number(e.spent || 0)).toLocaleString('fr-FR')} €
                    </span>
                    <button
                      onClick={() => removeExpense(e.id)}
                      className="p-1 text-charcoal-400 hover:text-rose-600"
                      aria-label="Supprimer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-end mb-4">
              <input
                value={newExpenseLabel}
                onChange={(e) => setNewExpenseLabel(e.target.value)}
                placeholder="Nouveau poste (ex: Traiteur)"
                className="sm:col-span-4 px-3 py-2 text-sm border border-charcoal-200 rounded-xl focus:outline-none focus:border-rose-400 bg-ivory-50"
              />
              <input
                type="number"
                min="0"
                value={newExpensePlanned}
                onChange={(e) => setNewExpensePlanned(e.target.value)}
                placeholder="Prévu"
                className="sm:col-span-3 px-3 py-2 text-sm border border-charcoal-200 rounded-xl text-right focus:outline-none focus:border-rose-400 bg-ivory-50 font-mono"
              />
              <input
                type="number"
                min="0"
                value={newExpenseSpent}
                onChange={(e) => setNewExpenseSpent(e.target.value)}
                placeholder="Dépensé"
                className="sm:col-span-3 px-3 py-2 text-sm border border-charcoal-200 rounded-xl text-right focus:outline-none focus:border-rose-400 bg-ivory-50 font-mono"
              />
              <button
                onClick={addExpense}
                className="sm:col-span-2 h-10 flex items-center justify-center bg-rose-600 text-white rounded-xl hover:bg-rose-700 transition-colors"
                aria-label="Ajouter"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            {/* Totals */}
            <div className="border-t border-charcoal-100 pt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-charcoal-500">Total prévu</span>
                <span className="font-mono font-semibold text-charcoal-900">{totalPlanned.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-charcoal-500">Total dépensé</span>
                <span className="font-mono font-semibold text-rose-600">{totalSpent.toLocaleString('fr-FR')} €</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-charcoal-500">Reste du budget</span>
                <span className={`font-mono font-semibold ${remainingBudget >= 0 ? 'text-green-600' : 'text-rose-600'}`}>
                  {remainingBudget.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div className="w-full h-2 bg-charcoal-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-600 rounded-full"
                  style={{ width: `${Math.min(100, (Number(budget) || 1) ? (totalSpent / (Number(budget) || 1)) * 100 : 0)}%` }}
                />
              </div>
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
