'use client';

import { useEffect, useState } from 'react';
import { getDocuments, setDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';
import { MapPin, Plus, Trash2, RefreshCw, Search } from 'lucide-react';

interface City {
  id: string;
  name: string;
  region?: string;
  vendorCount?: number;
  active: boolean;
  createdAt?: string;
}

const DEFAULT_CITIES: Omit<City, 'id'>[] = [
  { name: 'Paris', region: 'Île-de-France', active: true },
  { name: 'Lyon', region: 'Auvergne-Rhône-Alpes', active: true },
  { name: 'Marseille', region: 'Provence-Alpes-Côte d\'Azur', active: true },
  { name: 'Bordeaux', region: 'Nouvelle-Aquitaine', active: true },
  { name: 'Toulouse', region: 'Occitanie', active: true },
  { name: 'Nice', region: 'Côte d\'Azur', active: true },
  { name: 'Nantes', region: 'Pays de la Loire', active: true },
  { name: 'Strasbourg', region: 'Grand Est', active: true },
  { name: 'Lille', region: 'Hauts-de-France', active: true },
  { name: 'Montpellier', region: 'Occitanie', active: true },
  { name: 'Saint-Émilion', region: 'Gironde', active: true },
  { name: 'Provence', region: 'PACA', active: true },
];

export default function AdminCitiesPage() {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newCity, setNewCity] = useState({ name: '', region: '' });
  const [adding, setAdding] = useState(false);
  const [vendorCities, setVendorCities] = useState<Record<string, number>>({});

  const fetchData = async () => {
    setLoading(true);
    try {
      const [cityDocs, vendorDocs] = await Promise.all([
        getDocuments('cities', []),
        getDocuments('vendors', []),
      ]);

      // Count vendors per city
      const counts: Record<string, number> = {};
      (vendorDocs as any[]).forEach(v => {
        const loc = (v.location || '').split(',')[0].trim();
        if (loc) counts[loc] = (counts[loc] || 0) + 1;
      });
      setVendorCities(counts);

      if (cityDocs.length > 0) {
        setCities(cityDocs as City[]);
      } else {
        // Seed default cities
        const seeded: City[] = [];
        for (const city of DEFAULT_CITIES) {
          const id = city.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
          await setDocument('cities', id, { ...city, id, createdAt: new Date().toISOString() });
          seeded.push({ ...city, id });
        }
        setCities(seeded);
        toast.success('Villes par défaut initialisées');
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const addCity = async () => {
    if (!newCity.name.trim()) return;
    setAdding(true);
    try {
      const id = newCity.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const city: City = { id, name: newCity.name.trim(), region: newCity.region.trim(), active: true, createdAt: new Date().toISOString() };
      await setDocument('cities', id, city);
      setCities(p => [...p.filter(c => c.id !== id), city].sort((a, b) => a.name.localeCompare(b.name)));
      setNewCity({ name: '', region: '' });
      toast.success('Ville ajoutée');
    } catch { toast.error('Erreur'); }
    finally { setAdding(false); }
  };

  const toggleActive = async (city: City) => {
    try {
      await setDocument('cities', city.id, { ...city, active: !city.active });
      setCities(p => p.map(c => c.id === city.id ? { ...c, active: !c.active } : c));
    } catch { toast.error('Erreur'); }
  };

  const removeCity = async (id: string) => {
    if (!confirm('Supprimer cette ville ?')) return;
    try {
      await deleteDocument('cities', id);
      setCities(p => p.filter(c => c.id !== id));
      toast.success('Ville supprimée');
    } catch { toast.error('Erreur'); }
  };

  const filtered = cities.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || (c.region || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-7 w-48 bg-white rounded-xl" />
      <div className="h-64 bg-white rounded-2xl" />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
            Gestion des villes
          </h1>
          <p className="text-sm text-charcoal-500 mt-0.5">
            {cities.filter(c => c.active).length} ville{cities.filter(c => c.active).length !== 1 ? 's' : ''} actives sur {cities.length}
          </p>
        </div>
        <button onClick={fetchData} className="flex items-center gap-2 px-4 py-2.5 border border-charcoal-200 text-charcoal-600 text-sm rounded-xl hover:bg-white transition-colors">
          <RefreshCw className="w-4 h-4" /> Actualiser
        </button>
      </div>

      {/* Add city form */}
      <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft p-5">
        <p className="text-sm font-medium text-charcoal-700 mb-3">Ajouter une ville</p>
        <div className="flex gap-3 flex-wrap">
          <input
            placeholder="Nom de la ville"
            value={newCity.name}
            onChange={e => setNewCity(p => ({ ...p, name: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addCity()}
            className="flex-1 min-w-[140px] px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-colors"
          />
          <input
            placeholder="Région (optionnel)"
            value={newCity.region}
            onChange={e => setNewCity(p => ({ ...p, region: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && addCity()}
            className="flex-1 min-w-[160px] px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-colors"
          />
          <button
            onClick={addCity}
            disabled={adding || !newCity.name.trim()}
            className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-xs">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
        <input
          placeholder="Rechercher une ville…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-white focus:outline-none focus:border-rose-400 transition-colors"
        />
      </div>

      {/* Cities list */}
      <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto] gap-px bg-charcoal-100 border-b border-charcoal-100 px-5 py-2.5">
          <span className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider">Ville</span>
          <span className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider text-center">Prestataires</span>
          <span className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider text-center">Statut</span>
          <span className="text-[10px] font-semibold text-charcoal-400 uppercase tracking-wider text-right">Action</span>
        </div>
        {filtered.length === 0 ? (
          <div className="p-12 text-center">
            <MapPin className="w-8 h-8 text-charcoal-200 mx-auto mb-2" />
            <p className="text-sm text-charcoal-400">Aucune ville trouvée</p>
          </div>
        ) : (
          <div className="divide-y divide-charcoal-50">
            {filtered.map(city => {
              const count = vendorCities[city.name] || 0;
              return (
                <div key={city.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-4 px-5 py-3 hover:bg-stone-50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-rose-500 flex-shrink-0" />
                      <p className="text-sm font-medium text-charcoal-900">{city.name}</p>
                    </div>
                    {city.region && <p className="text-xs text-charcoal-400 ml-5.5 mt-0.5">{city.region}</p>}
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-full text-center ${count > 0 ? 'bg-green-50 text-green-700' : 'bg-stone-100 text-charcoal-400'}`}>
                    {count}
                  </span>
                  <button
                    onClick={() => toggleActive(city)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                      city.active ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-stone-100 text-charcoal-500 hover:bg-stone-200'
                    }`}
                  >
                    {city.active ? 'Active' : 'Inactive'}
                  </button>
                  <button onClick={() => removeCity(city.id)}
                    className="p-1.5 text-charcoal-300 hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
