'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Handshake, Loader2, Star, Truck, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';
import AddressAutocompleteInput, { AddressSuggestion } from '@/components/AddressAutocompleteInput';
import { auth } from '@/lib/firebase';
import { uploadImage } from '@/lib/storage';
import { MARKET_CATEGORIES, CONDITION_LABELS } from '@/lib/market/categories';
import { ListingCondition, MarketListing } from '@/lib/market/types';
import { splitCityLabel } from '@/lib/market/utils';
import { Field, SectionTitle, inputCls, primaryBtn, ghostBtn } from './ui';

interface PhotoItem {
  key: string;
  url: string;
  file?: File;
}

interface Props {
  mode: 'create' | 'edit';
  initial?: MarketListing;
  defaultCity?: string;
  defaultPostalCode?: string;
}

const MAX_PHOTOS = 8;

// Formulaire partagé création / modification d'annonce.
export default function ListingForm({ mode, initial, defaultCity = '', defaultPostalCode = '' }: Props) {
  const router = useRouter();
  const keyCounter = useRef(0);
  const nextKey = () => `p${keyCounter.current++}`;

  const [photos, setPhotos] = useState<PhotoItem[]>(() =>
    (initial?.images ?? []).map((url) => ({ key: `e${url}`, url }))
  );
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [category, setCategory] = useState(initial?.category ?? MARKET_CATEGORIES[0]?.slug ?? 'decoration');
  const [subcategory, setSubcategory] = useState(initial?.subcategory ?? '');
  const [price, setPrice] = useState(initial ? String(initial.price) : '');
  const [quantity, setQuantity] = useState(initial ? String(initial.quantity) : '1');
  const [condition, setCondition] = useState<ListingCondition>(initial?.condition ?? 'bon_etat');
  const [city, setCity] = useState(initial?.location.city ?? defaultCity);
  const [postalCode, setPostalCode] = useState(initial?.location.postal_code ?? defaultPostalCode);
  const [street, setStreet] = useState('');
  const [shipping, setShipping] = useState(initial?.delivery.shipping ?? true);
  const [shippingCost, setShippingCost] = useState(String(initial?.delivery.shipping_cost ?? '5.00'));
  const [pickup, setPickup] = useState(initial?.delivery.pickup ?? true);
  const [dimensions, setDimensions] = useState(initial?.attributes?.dimensions ?? '');
  const [material, setMaterial] = useState(initial?.attributes?.material ?? '');
  const [color, setColor] = useState(initial?.attributes?.color ?? '');
  const [defects, setDefects] = useState(initial?.attributes?.defects ?? '');
  const [submitting, setSubmitting] = useState(false);
  const [stage, setStage] = useState<'upload' | 'save'>('save');

  const subcategories = useMemo(
    () => MARKET_CATEGORIES.find((c) => c.slug === category)?.subcategories ?? [],
    [category]
  );

  // Libère les URLs d'aperçu locales au démontage.
  const photosRef = useRef(photos);
  photosRef.current = photos;
  useEffect(
    () => () => photosRef.current.forEach((p) => p.file && URL.revokeObjectURL(p.url)),
    []
  );

  const addFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;
    if (photos.length + files.length > MAX_PHOTOS) {
      toast.error(`Maximum ${MAX_PHOTOS} photos par annonce`);
      return;
    }
    setPhotos((prev) => [...prev, ...files.map((file) => ({ key: nextKey(), url: URL.createObjectURL(file), file }))]);
  };

  const removePhoto = (key: string) =>
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      if (target?.file) URL.revokeObjectURL(target.url);
      return prev.filter((p) => p.key !== key);
    });

  const makeMain = (key: string) =>
    setPhotos((prev) => {
      const target = prev.find((p) => p.key === key);
      return target ? [target, ...prev.filter((p) => p.key !== key)] : prev;
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const numPrice = parseFloat(price.replace(',', '.'));
    if (photos.length === 0) return toast.error('Ajoutez au moins une photo');
    if (title.trim().length < 3) return toast.error('Le titre doit contenir au moins 3 caractères');
    if (description.trim().length < 10) return toast.error('La description doit contenir au moins 10 caractères');
    if (!numPrice || numPrice <= 0) return toast.error('Indiquez un prix supérieur à 0 €');
    if (!splitCityLabel(city).city) return toast.error('Indiquez la ville de disponibilité');
    if (!shipping && !pickup) return toast.error('Proposez la livraison et/ou la remise en main propre');

    setSubmitting(true);
    try {
      setStage('upload');
      const urls: string[] = [];
      for (const p of photos) urls.push(p.file ? await uploadImage(p.file, 'leoui_market') : p.url);

      setStage('save');
      const parsedCity = splitCityLabel(city);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(mode === 'edit' ? `/api/market/listings/${initial!.id}` : '/api/market/listings', {
        method: mode === 'edit' ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          subcategory: subcategory || undefined,
          price: numPrice,
          quantity: parseInt(quantity, 10) || 1,
          condition,
          images: urls,
          attributes: {
            dimensions: dimensions.trim() || undefined,
            material: material.trim() || undefined,
            color: color.trim() || undefined,
            defects: defects.trim() || undefined,
          },
          location: {
            city: parsedCity.city,
            postal_code: postalCode.trim() || parsedCity.postal,
          },
          delivery: {
            shipping,
            shipping_cost: shipping ? parseFloat(shippingCost.replace(',', '.')) || 0 : undefined,
            pickup,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur lors de l’enregistrement');

      toast.success(mode === 'edit' ? 'Annonce mise à jour' : 'Votre annonce est en ligne !');
      router.push(`/market/produit/${data.listing.slug || data.listing.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Impossible d’enregistrer l’annonce');
      setSubmitting(false);
    }
  };

  const tile = (active: boolean) =>
    `text-left p-4 border transition-colors ${
      active ? 'border-rose-600 bg-rose-50/40' : 'border-charcoal-200 hover:border-charcoal-400'
    }`;

  return (
    <form onSubmit={submit} className="space-y-12">
      {/* 01 — Photos */}
      <section>
        <SectionTitle
          eyebrow="01"
          title="Photos"
          aside={<span className="text-xs text-charcoal-400 tabular-nums">{photos.length} / {MAX_PHOTOS}</span>}
        />
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {photos.map((p, i) => (
            <div key={p.key} className="relative aspect-square border border-charcoal-200 bg-charcoal-50 group">
              <img src={p.url} alt="" className="absolute inset-0 w-full h-full object-cover" />
              {i === 0 ? (
                <span className="absolute bottom-0 inset-x-0 bg-charcoal-900/85 text-white text-[10px] font-semibold uppercase tracking-wider text-center py-1">
                  Principale
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => makeMain(p.key)}
                  className="absolute bottom-1.5 left-1.5 inline-flex items-center gap-1 bg-white/95 text-charcoal-800 text-[10px] font-semibold px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Star className="w-3 h-3" /> Principale
                </button>
              )}
              <button
                type="button"
                onClick={() => removePhoto(p.key)}
                aria-label="Retirer la photo"
                className="absolute top-1.5 right-1.5 w-6 h-6 bg-charcoal-900/80 hover:bg-charcoal-900 text-white flex items-center justify-center"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}

          {photos.length < MAX_PHOTOS && (
            <label className="aspect-square border border-dashed border-charcoal-300 hover:border-rose-500 flex flex-col items-center justify-center text-center p-2 cursor-pointer transition-colors group">
              <Upload className="w-5 h-5 text-charcoal-400 group-hover:text-rose-600 mb-1.5 transition-colors" />
              <span className="text-xs font-medium text-charcoal-700">Ajouter</span>
              <input type="file" accept="image/*" multiple onChange={addFiles} className="hidden" />
            </label>
          )}
        </div>
        <p className="text-xs text-charcoal-400 mt-3">La première photo est celle qui apparaît dans les résultats.</p>
      </section>

      {/* 02 — L'article */}
      <section className="space-y-5">
        <SectionTitle eyebrow="02" title="L’article" />
        <Field label="Titre de l’annonce" required>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex : Arche ronde en métal doré, 2 m"
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Catégorie" required>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory('');
              }}
              className={inputCls}
            >
              {MARKET_CATEGORIES.map((c) => (
                <option key={c.slug} value={c.slug}>{c.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Sous-catégorie">
            <select value={subcategory} onChange={(e) => setSubcategory(e.target.value)} className={inputCls}>
              <option value="">Non précisée</option>
              {subcategories.map((s) => (
                <option key={s.slug} value={s.slug}>{s.label}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Description" required hint="Dimensions, usage lors de votre mariage, défauts éventuels…">
          <textarea
            rows={6}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputCls} resize-none leading-relaxed`}
          />
        </Field>
      </section>

      {/* 03 — Prix & état */}
      <section className="space-y-5">
        <SectionTitle eyebrow="03" title="Prix et état" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          <Field label="Prix" required>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="120"
                className={`${inputCls} pr-9 font-medium`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-charcoal-400">€</span>
            </div>
          </Field>
          <Field label="Quantité" required>
            <input type="number" min="1" value={quantity} onChange={(e) => setQuantity(e.target.value)} className={inputCls} />
          </Field>
          <Field label="État" required>
            <select value={condition} onChange={(e) => setCondition(e.target.value as ListingCondition)} className={inputCls}>
              {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      {/* 04 — Remise */}
      <section className="space-y-5">
        <SectionTitle eyebrow="04" title="Remise de l’article" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button type="button" onClick={() => setPickup((v) => !v)} className={tile(pickup)} aria-pressed={pickup}>
            <span className="flex items-center gap-2 text-sm font-semibold text-charcoal-900">
              <Handshake className="w-4 h-4" /> Remise en main propre
            </span>
            <span className="block text-xs text-charcoal-500 mt-1">
              Idéal pour l’encombrant. Validée par un code unique.
            </span>
          </button>
          <button type="button" onClick={() => setShipping((v) => !v)} className={tile(shipping)} aria-pressed={shipping}>
            <span className="flex items-center gap-2 text-sm font-semibold text-charcoal-900">
              <Truck className="w-4 h-4" /> Envoi par colis
            </span>
            <span className="block text-xs text-charcoal-500 mt-1">Avec numéro de suivi renseigné par vous.</span>
          </button>
        </div>

        {shipping && (
          <Field label="Frais d’envoi" hint="0 pour offrir la livraison">
            <div className="relative max-w-[10rem]">
              <input
                type="number"
                min="0"
                step="0.01"
                value={shippingCost}
                onChange={(e) => setShippingCost(e.target.value)}
                className={`${inputCls} pr-9`}
              />
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-charcoal-400">€</span>
            </div>
          </Field>
        )}
      </section>

      {/* 05 — Localisation */}
      <section className="space-y-5">
        <SectionTitle eyebrow="05" title="Localisation" />
        <Field label="Adresse" hint="Facultatif — remplit la ville et le code postal automatiquement. Jamais affichée ni enregistrée sur l'annonce.">
          <AddressAutocompleteInput
            value={street}
            onChange={setStreet}
            onSelectAddress={(a: AddressSuggestion) => {
              setStreet(a.street);
              if (a.city) setCity(a.city);
              if (a.postcode) setPostalCode(a.postcode);
            }}
            placeholder="12 rue des Lilas"
            inputClassName="px-4 py-3 pl-10 border-charcoal-200"
          />
        </Field>
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_9rem] gap-5">
          <Field label="Ville" required>
            <CityAutocompleteInput
              value={city}
              onChange={setCity}
              onSelectLocation={(loc: LocationSuggestion) => {
                const parsed = splitCityLabel(loc.label || loc.name);
                setCity(parsed.city);
                if (parsed.postal) setPostalCode(parsed.postal);
              }}
              types="city"
              placeholder="Ex : Lyon"
              showPostalCode={false}
              icon={false}
              className="w-full"
              inputClassName="px-4 py-3 border-charcoal-200"
            />
          </Field>
          <Field label="Code postal">
            <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="69002" className={inputCls} />
          </Field>
        </div>
      </section>

      {/* 06 — Détails */}
      <section className="space-y-5">
        <SectionTitle eyebrow="06" title="Détails" aside={<span className="text-xs text-charcoal-400">Facultatif</span>} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Dimensions">
            <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="2 m × 1,5 m" className={inputCls} />
          </Field>
          <Field label="Matière">
            <input value={material} onChange={(e) => setMaterial(e.target.value)} placeholder="Bois, verre, métal…" className={inputCls} />
          </Field>
          <Field label="Couleur">
            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Blanc cassé, doré…" className={inputCls} />
          </Field>
          <Field label="Défauts ou traces d’usure" hint="Les signaler rassure et évite les litiges">
            <input value={defects} onChange={(e) => setDefects(e.target.value)} placeholder="Légère rayure sur un pied" className={inputCls} />
          </Field>
        </div>
      </section>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 pt-6 border-t border-charcoal-200">
        <Link href={mode === 'edit' ? '/app/market/mes-annonces' : '/app/market'} className={ghostBtn}>
          Annuler
        </Link>
        <button type="submit" disabled={submitting} className={`${primaryBtn} sm:min-w-[14rem]`}>
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> {stage === 'upload' ? 'Envoi des photos…' : 'Enregistrement…'}
            </>
          ) : mode === 'edit' ? (
            'Enregistrer les modifications'
          ) : (
            'Publier mon annonce'
          )}
        </button>
      </div>
    </form>
  );
}
