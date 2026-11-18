'use client';

import { useEffect, useState } from 'react';
import { FileDown, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { countMenuDishes } from '@/features/menu/domain/menu-rules';
import type {
  CourseKey,
  DietarySummary,
  DishStatus,
  MenuDecision,
  WeddingMenu,
} from '@/features/menu/domain/types';
import { FirestoreMenuRepository } from '@/features/menu/repositories/firestore-menu.repository';
import { MenuPdfService } from '@/features/menu/services/menu-pdf.service';
import { MenuService } from '@/features/menu/services/menu.service';
import { DecisionHistoryPanel } from '@/features/menu/ui/DecisionHistoryPanel';
import { DietarySummaryPanel } from '@/features/menu/ui/DietarySummaryPanel';
import { RestaurantMenuCard } from '@/features/menu/ui/RestaurantMenuCard';

const repository = new FirestoreMenuRepository();
const menuService = new MenuService({
  reader: repository,
  writer: repository,
  decisions: repository,
  guests: repository,
});

const EMPTY_DIETARY: DietarySummary = {
  total_confirmed: 0,
  total_pending: 0,
  categories: [],
  special_requests: [],
};

export default function CoupleMenuPage() {
  const { user } = useAuth();
  const { event, client, loading: clientLoading } = useClientData();

  const [menu, setMenu] = useState<WeddingMenu | null>(null);
  const [dietary, setDietary] = useState<DietarySummary>(EMPTY_DIETARY);
  const [decisions, setDecisions] = useState<MenuDecision[]>([]);
  const [decisionsCursor, setDecisionsCursor] = useState<string | null>(null);
  const [hasMoreDecisions, setHasMoreDecisions] = useState(false);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [refreshingDietary, setRefreshingDietary] = useState(false);
  const [savingNotes, setSavingNotes] = useState(false);
  const [loadingMoreDecisions, setLoadingMoreDecisions] = useState(false);
  const [addingDecision, setAddingDecision] = useState(false);

  const eventId = event?.id || client?.id;
  const fallbackClientId = client?.id;
  const eventDate = event?.event_date || client?.event_date;
  const ownerId = user?.uid || (event as any)?.owner_id || client?.id || '';

  const coupleNames =
    event?.couple_names ||
    (client ? `${client.name}${client.partner ? ` & ${client.partner}` : ''}` : 'Notre Mariage');

  useEffect(() => {
    if (clientLoading) return;
    if (!eventId || !ownerId) {
      setLoading(false);
      return;
    }

    let active = true;
    const loadAll = async () => {
      try {
        setLoading(true);
        const [loadedMenu, loadedDietary, decisionPage] = await Promise.all([
          menuService.getOrInitMenu(eventId, ownerId),
          menuService.getDietarySummary(eventId, fallbackClientId),
          menuService.listDecisions(eventId, { limitCount: 15 }),
        ]);

        if (!active) return;
        setMenu(loadedMenu);
        setDietary(loadedDietary);
        setDecisions(decisionPage.items);
        setDecisionsCursor(decisionPage.nextCursor);
        setHasMoreDecisions(decisionPage.hasMore);
      } catch (err) {
        console.error('Erreur chargement menu:', err);
        if (active) toast.error('Impossible de charger le menu du mariage.');
      } finally {
        if (active) setLoading(false);
      }
    };

    loadAll();
    return () => {
      active = false;
    };
  }, [clientLoading, eventId, ownerId]);

  const handleAddDish = async (
    courseKey: CourseKey,
    input: { name: string; note: string; status: DishStatus }
  ): Promise<boolean> => {
    if (!eventId || !menu) return false;
    try {
      setBusy(true);
      const { courses, decision } = await menuService.addDish(
        eventId,
        courseKey,
        input,
        coupleNames
      );
      setMenu((prev) => (prev ? { ...prev, courses } : prev));
      if (decision) setDecisions((prev) => [decision, ...prev]);
      toast.success('Plat ajouté à la carte.');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’ajout du plat.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleUpdateDish = async (
    courseKey: CourseKey,
    dishId: string,
    patch: { name?: string; note?: string; status?: DishStatus }
  ): Promise<boolean> => {
    if (!eventId || !menu) return false;
    try {
      setBusy(true);
      const { courses, decision } = await menuService.updateDish(
        eventId,
        courseKey,
        dishId,
        patch,
        coupleNames
      );
      setMenu((prev) => (prev ? { ...prev, courses } : prev));
      if (decision) setDecisions((prev) => [decision, ...prev]);
      toast.success('Plat mis à jour.');
      return true;
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la mise à jour.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const handleRemoveDish = async (courseKey: CourseKey, dishId: string) => {
    if (!eventId || !menu) return;
    try {
      setBusy(true);
      const { courses, decision } = await menuService.removeDish(
        eventId,
        courseKey,
        dishId,
        coupleNames
      );
      setMenu((prev) => (prev ? { ...prev, courses } : prev));
      if (decision) setDecisions((prev) => [decision, ...prev]);
      toast.success('Plat retiré de la carte.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de la suppression.');
    } finally {
      setBusy(false);
    }
  };

  const handleRefreshDietary = async () => {
    if (!eventId) return;
    try {
      setRefreshingDietary(true);
      const next = await menuService.getDietarySummary(eventId, fallbackClientId);
      setDietary(next);
      toast.success('Compteurs régimes actualisés.');
    } catch {
      toast.error('Impossible d’actualiser les régimes.');
    } finally {
      setRefreshingDietary(false);
    }
  };

  const handleSaveNotes = async (notes: string) => {
    if (!eventId || !menu) return;
    try {
      setSavingNotes(true);
      const { dietary_notes, decision } = await menuService.updateDietaryNotes(
        eventId,
        notes,
        coupleNames
      );
      setMenu((prev) => (prev ? { ...prev, dietary_notes } : prev));
      if (decision) setDecisions((prev) => [decision, ...prev]);
      toast.success('Consignes traiteur enregistrées.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’enregistrement.');
    } finally {
      setSavingNotes(false);
    }
  };

  const handleAddDecision = async (change: string) => {
    if (!eventId) return;
    try {
      setAddingDecision(true);
      const created = await menuService.addManualDecision(eventId, coupleNames, change);
      setDecisions((prev) => [created, ...prev]);
      toast.success('Décision enregistrée.');
    } catch (err: any) {
      toast.error(err?.message || 'Erreur lors de l’ajout.');
    } finally {
      setAddingDecision(false);
    }
  };

  const handleLoadMoreDecisions = async () => {
    if (!eventId || !decisionsCursor) return;
    try {
      setLoadingMoreDecisions(true);
      const page = await menuService.listDecisions(eventId, {
        limitCount: 15,
        cursor: decisionsCursor,
      });
      setDecisions((prev) => [...prev, ...page.items]);
      setDecisionsCursor(page.nextCursor);
      setHasMoreDecisions(page.hasMore);
    } catch {
      toast.error('Impossible de charger la suite de l’historique.');
    } finally {
      setLoadingMoreDecisions(false);
    }
  };

  const handleExportMenuPdf = async () => {
    if (!menu) return;
    try {
      await MenuPdfService.generateMenuCard({
        menu,
        coupleNames,
        eventDate,
        includePending: counts.retenu === 0,
        includeDrafts: counts.retenu === 0 && counts.a_valider === 0,
      });
      toast.success('Carte du menu PDF générée.');
    } catch (err) {
      console.error('Erreur export PDF menu:', err);
      toast.error('Impossible de générer le PDF.');
    }
  };

  const handleExportCatererPdf = async () => {
    if (!menu) return;
    try {
      await MenuPdfService.generateCatererBrief({
        menu,
        dietary,
        coupleNames,
        eventDate,
        includePending: counts.retenu === 0,
        includeDrafts: counts.retenu === 0 && counts.a_valider === 0,
      });
      toast.success('Fiche traiteur PDF générée.');
    } catch (err) {
      console.error('Erreur export PDF traiteur:', err);
      toast.error('Impossible de générer le PDF.');
    }
  };

  const outline = 'inline-flex items-center justify-center gap-2 h-11 px-5 border border-stone-300 text-charcoal-800 text-[13px] font-medium hover:border-charcoal-900 transition-colors rounded-sm';
  const kicker = 'text-[10px] font-semibold tracking-[0.2em] uppercase';

  if (loading || clientLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-72 bg-stone-200" />
        <div className="h-96 bg-white border border-stone-200" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="bg-white border border-stone-200 px-8 py-16 text-center">
        <p className={`${kicker} text-rose-600`}>Réception</p>
        <p className="font-serif text-2xl text-charcoal-900 mt-3">Aucun événement associé</p>
        <p className="text-[13px] text-charcoal-500 mt-2 max-w-md mx-auto">
          Créez ou sélectionnez votre mariage pour composer votre carte de réception.
        </p>
      </div>
    );
  }

  const counts = countMenuDishes(menu.courses);
  const specialCount = dietary.categories
    .filter((c) => c.category !== 'Standard')
    .reduce((acc, c) => acc + c.confirmed, 0);

  return (
    <div className="w-full pb-10 space-y-5">
      {/* ── En-tête ── */}
      <header className="relative bg-white border border-stone-200 overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_24rem]">
          <div className="px-5 sm:px-9 lg:px-12 pt-8 sm:pt-11 pb-7">
            <p className={`${kicker} text-rose-600`}>Réception</p>
            <h1 className="font-serif text-charcoal-900 mt-3 leading-none" style={{ fontSize: 'clamp(2.1rem, 4.4vw, 3.2rem)', fontWeight: 400, letterSpacing: '-0.02em' }}>La Carte</h1>
            <p className="text-[15px] text-charcoal-500 mt-3">
              Dégustation &amp; réception{eventDate ? ` — ${new Date(eventDate).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}` : ''}
            </p>

            <div className="flex flex-wrap gap-3 mt-8">
              <button type="button" onClick={handleExportMenuPdf} disabled={counts.total === 0}
                className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-rose-600 text-white text-[13px] font-medium hover:bg-rose-700 transition-colors rounded-sm disabled:opacity-40">
                <FileDown className="w-4 h-4" /> Exporter la carte
              </button>
              <button type="button" onClick={handleExportCatererPdf} className={outline}>
                <FileDown className="w-4 h-4" /> Fiche traiteur
              </button>
              <button type="button" disabled={refreshingDietary} onClick={handleRefreshDietary} className={`${outline} disabled:opacity-40`}>
                <RefreshCw className={`w-4 h-4 ${refreshingDietary ? 'animate-spin' : ''}`} /> Régimes
              </button>
            </div>
          </div>

          <div className="relative order-first lg:order-none h-48 sm:h-60 lg:h-auto lg:min-h-[17rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/menu-cover.jpg" alt="" className="absolute inset-0 w-full h-full object-cover object-center" />
            <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-white to-transparent hidden lg:block" />
            <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#1A1013]/85 to-transparent" />
            <p className="absolute bottom-4 sm:bottom-5 right-5 sm:right-6 left-5 lg:left-10 text-right font-serif italic text-white text-base sm:text-lg leading-snug" style={{ textShadow: '0 1px 8px rgba(0,0,0,0.4)' }}>
              « Une grande table, c’est le cœur d’une belle soirée. »
            </p>
          </div>
        </div>

        {/* Compteurs */}
        <nav className="flex gap-x-8 px-5 sm:px-9 lg:px-12 border-t border-stone-200 overflow-x-auto scrollbar-none" aria-label="Compteurs">
          {[
            { n: counts.retenu, l: 'Plats retenus' },
            { n: counts.a_valider, l: 'À valider' },
            { n: counts.envisage, l: 'Envisagés' },
            { n: specialCount, l: 'Régimes spéciaux' },
          ].map((s, i) => (
            <div key={i} className="py-4 whitespace-nowrap">
              <span className="flex items-center gap-2 text-[14px] text-charcoal-900 font-medium">
                {s.l}
                <span className="text-charcoal-300 tabular-nums font-normal">{s.n}</span>
              </span>
            </div>
          ))}
        </nav>
      </header>

      {/* ── Carte façon menu de restaurant ── */}
      <RestaurantMenuCard
        courses={menu.courses}
        coupleNames={coupleNames}
        eventDate={eventDate}
        busy={busy}
        onAddDish={handleAddDish}
        onUpdateDish={handleUpdateDish}
        onRemoveDish={handleRemoveDish}
      />

      {/* ── Régimes & journal ── */}
      <DietarySummaryPanel
        summary={dietary}
        dietaryNotes={menu.dietary_notes}
        refreshing={refreshingDietary}
        savingNotes={savingNotes}
        onRefreshDietary={handleRefreshDietary}
        onSaveNotes={handleSaveNotes}
        onExportCatererPdf={handleExportCatererPdf}
      />

      <DecisionHistoryPanel
        decisions={decisions}
        hasMore={hasMoreDecisions}
        loadingMore={loadingMoreDecisions}
        addingDecision={addingDecision}
        onAddDecision={handleAddDecision}
        onLoadMore={handleLoadMoreDecisions}
      />
    </div>
  );
}

