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

  const handleExportMenuPdf = () => {
    if (!menu) return;
    try {
      MenuPdfService.generateMenuCard({
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

  const handleExportCatererPdf = () => {
    if (!menu) return;
    try {
      MenuPdfService.generateCatererBrief({
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

  if (loading || clientLoading) {
    return (
      <div className="space-y-6 animate-pulse max-w-4xl mx-auto">
        <div className="h-8 w-64 bg-stone-200 rounded-xl" />
        <div className="h-14 bg-charcoal-900/10 rounded-xl" />
        <div className="h-96 bg-white rounded-2xl border border-stone-200" />
      </div>
    );
  }

  if (!menu) {
    return (
      <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-stone-200 p-8 text-center">
        <p className="font-serif text-lg text-charcoal-900">Aucun événement associé</p>
        <p className="text-xs text-charcoal-500 mt-1">
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
    <div className="space-y-10 max-w-4xl mx-auto pb-16">
      {/* En-tête éditorial aligné sur l'espace client */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <p className="label-xs text-rose-600 mb-2 tracking-[0.1em]">Réception</p>
          <h1
            className="font-serif text-charcoal-900"
            style={{
              fontSize: 'clamp(1.5rem, 2.5vw, 2rem)',
              fontWeight: 400,
              letterSpacing: '-0.01em',
            }}
          >
            Menu &amp; Dégustation Traiteur
          </h1>
          <p className="text-sm text-charcoal-500 mt-2 max-w-xl leading-relaxed">
            Composez votre carte service par service, suivez vos validations de dégustation et
            préparez la fiche complète pour votre traiteur.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleExportMenuPdf}
            disabled={counts.total === 0}
            className="inline-flex items-center gap-2 px-4 h-9 rounded-lg bg-rose-600 text-white text-xs font-semibold hover:bg-rose-700 transition-colors disabled:opacity-50"
          >
            <FileDown className="w-3.5 h-3.5" />
            Exporter le Menu PDF
          </button>
          <button
            type="button"
            disabled={refreshingDietary}
            onClick={handleRefreshDietary}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg border border-charcoal-200 text-xs font-semibold text-charcoal-700 hover:border-charcoal-400 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshingDietary ? 'animate-spin' : ''}`} />
            Actualiser régimes
          </button>
        </div>
      </div>

      {/* Bandeau stats sombre */}
      <div className="flex items-center gap-x-5 gap-y-2 flex-wrap bg-charcoal-900 rounded-xl px-5 py-3.5 overflow-x-auto scrollbar-none">
        {[
          { n: counts.retenu, l: 'retenus', accent: true },
          { n: counts.a_valider, l: 'à valider' },
          { n: counts.envisage, l: 'envisagés' },
          { n: specialCount, l: 'régimes spéciaux confirmés', accent: true },
        ].map((s, i) => (
          <span key={i} className="flex items-baseline gap-1.5 whitespace-nowrap">
            <span className={`font-serif text-lg ${s.accent ? 'text-rose-300' : 'text-white'}`}>
              {s.n}
            </span>
            <span className="text-[11px] text-white/50">{s.l}</span>
            {i < 3 && <span className="text-white/15 ml-3">·</span>}
          </span>
        ))}
      </div>

      {/* Carte du menu façon restaurant gastronomique */}
      <RestaurantMenuCard
        courses={menu.courses}
        coupleNames={coupleNames}
        eventDate={eventDate}
        busy={busy}
        onAddDish={handleAddDish}
        onUpdateDish={handleUpdateDish}
        onRemoveDish={handleRemoveDish}
      />

      {/* Régimes alimentaires & consignes traiteur */}
      <DietarySummaryPanel
        summary={dietary}
        dietaryNotes={menu.dietary_notes}
        refreshing={refreshingDietary}
        savingNotes={savingNotes}
        onRefreshDietary={handleRefreshDietary}
        onSaveNotes={handleSaveNotes}
        onExportCatererPdf={handleExportCatererPdf}
      />

      {/* Journal des décisions */}
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

