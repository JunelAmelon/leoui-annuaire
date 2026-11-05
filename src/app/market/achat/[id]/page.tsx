'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';
import { MarketListing } from '@/lib/market/types';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import {
  ShieldCheck, Truck, Handshake, ArrowLeft, Loader2,
  CheckCircle2, CreditCard, Lock,
} from 'lucide-react';
import { toast } from 'sonner';

export default function CheckoutPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const listingId = params?.id as string;
  const initialQty = parseInt(searchParams.get('qty') || '1', 10);
  const initialMode = (searchParams.get('mode') === 'pickup' ? 'pickup' : 'shipping') as 'shipping' | 'pickup';

  const [listing, setListing] = useState<MarketListing | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Formulaire acheteur
  const [deliveryMode, setDeliveryMode] = useState<'shipping' | 'pickup'>(initialMode);
  const [quantity, setQuantity] = useState(initialQty);

  // Adresse de livraison
  const [fullName, setFullName] = useState(user?.displayName || '');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => {
    if (!authLoading && !user) {
      router.push(`/market/connexion?next=${encodeURIComponent(`/market/achat/${listingId}?qty=${initialQty}&mode=${initialMode}`)}`);
      return;
    }
  }, [user, authLoading, listingId, router]);

  useEffect(() => {
    if (!listingId) return;

    fetch(`/api/market/listings/${listingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && data.listing) {
          setListing(data.listing);
        } else {
          setListing(null);
        }
      })
      .catch(() => setListing(null))
      .finally(() => setLoading(false));
  }, [listingId]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-ivory-50 flex flex-col justify-between">
        <Header />
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 text-rose-600 animate-spin" />
        </div>
        <Footer />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="min-h-screen bg-ivory-50 flex flex-col justify-between">
        <Header />
        <div className="max-w-xl mx-auto px-4 py-32 text-center">
          <h1 className="font-serif text-3xl text-charcoal-900 mb-3">Article indisponible</h1>
          <Link href="/market/annonces" className="text-sm text-rose-600 font-semibold hover:underline">
            Retourner au catalogue
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  const eur = (n: number) => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const itemsTotal = listing.price * quantity;
  const shippingCost = deliveryMode === 'shipping' ? (listing.delivery.shipping_cost || 0) : 0;
  const serviceFee = Math.round(itemsTotal * 0.05 * 100) / 100;
  const grandTotal = Math.round((itemsTotal + shippingCost + serviceFee) * 100) / 100;

  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (deliveryMode === 'shipping') {
      if (!fullName.trim() || !street.trim() || !city.trim() || !postalCode.trim()) {
        toast.error('Veuillez renseigner votre adresse de livraison complète');
        return;
      }
    }

    setSubmitting(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      // Crée la Stripe Checkout Session : la commande est enregistrée
      // par le webhook après paiement confirmé (séquestre réel).
      const res = await fetch('/api/market/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          listing_id: listing.id,
          quantity,
          delivery_mode: deliveryMode,
          shipping_address: deliveryMode === 'shipping' ? {
            full_name: fullName.trim(),
            street: street.trim(),
            city: city.trim(),
            postal_code: postalCode.trim(),
            country: 'France',
            phone: phone.trim() || undefined,
          } : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Erreur lors de la commande');
      }

      // Redirection vers la page de paiement hébergée Stripe
      window.location.href = data.url;
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || 'Impossible de finaliser la commande');
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-ivory-50 flex flex-col justify-between">
      <Header />

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        <Link
          href={`/market/produit/${listing.slug || listing.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-charcoal-500 hover:text-rose-600 transition-colors mb-6 font-medium"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Revenir à l'annonce
        </Link>

        <h1 className="font-serif text-3xl text-charcoal-900 mb-8">
          Finaliser votre commande
        </h1>

        <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* GAUCHE (7 cols) : OPTIONS DE LIVRAISON ET PAIEMENT */}
          <div className="lg:col-span-7 space-y-6">
            {/* Mode de réception */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-charcoal-200 space-y-4">
              <h2 className="font-semibold text-base text-charcoal-900">1. Mode de réception</h2>

              <div className="space-y-3">
                {listing.delivery.shipping && (
                  <label
                    className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                      deliveryMode === 'shipping'
                        ? 'border-charcoal-900 text-charcoal-900'
                        : 'border-charcoal-200 text-charcoal-600 hover:border-charcoal-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="mode"
                        checked={deliveryMode === 'shipping'}
                        onChange={() => setDeliveryMode('shipping')}
                        className="mt-1 text-rose-600 accent-rose-600"
                      />
                      <div>
                        <span className="font-semibold text-sm flex items-center gap-1.5">
                          <Truck className="w-4 h-4" /> Livraison suivie par colis
                        </span>
                        <p className="text-xs text-charcoal-500 mt-0.5">
                          Expédié avec numéro de suivi. Fonds libérés à réception.
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      +{eur(listing.delivery.shipping_cost || 0)} €
                    </span>
                  </label>
                )}

                {listing.delivery.pickup && (
                  <label
                    className={`flex items-start justify-between p-4 rounded-xl border cursor-pointer transition-colors ${
                      deliveryMode === 'pickup'
                        ? 'border-charcoal-900 text-charcoal-900'
                        : 'border-charcoal-200 text-charcoal-600 hover:border-charcoal-400'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="mode"
                        checked={deliveryMode === 'pickup'}
                        onChange={() => setDeliveryMode('pickup')}
                        className="mt-1 text-rose-600 accent-rose-600"
                      />
                      <div>
                        <span className="font-semibold text-sm flex items-center gap-1.5">
                          <Handshake className="w-4 h-4" /> Remise en main propre
                        </span>
                        <p className="text-xs text-charcoal-500 mt-0.5">
                          À récupérer sur place à {listing.location.city}. Validation par code unique.
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-semibold text-charcoal-900">Gratuit</span>
                  </label>
                )}
              </div>
            </div>

            {/* Adresse si livraison */}
            {deliveryMode === 'shipping' && (
              <div className="bg-white rounded-2xl p-6 sm:p-8 border border-charcoal-200 space-y-4">
                <h2 className="font-semibold text-base text-charcoal-900">2. Adresse de livraison</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wide mb-1.5">
                      Nom et prénom du destinataire *
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Ex : Julie Dupont"
                      className="w-full px-4 py-2.5 bg-white border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wide mb-1.5">
                      Adresse (numéro et rue) *
                    </label>
                    <input
                      type="text"
                      required
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Ex : 12 rue de la Paix"
                      className="w-full px-4 py-2.5 bg-white border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wide mb-1.5">
                        Ville *
                      </label>
                      <CityAutocompleteInput
                        value={city}
                        onChange={setCity}
                        onSelectLocation={(loc: LocationSuggestion) => setCity(loc.name)}
                        placeholder="Ville"
                        showPostalCode={false}
                        icon
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wide mb-1.5">
                        Code postal *
                      </label>
                      <input
                        type="text"
                        required
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="75001"
                        className="w-full px-4 py-2.5 bg-white border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-charcoal-700 uppercase tracking-wide mb-1.5">
                      Numéro de téléphone (pour le livreur)
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="06 12 34 56 78"
                      className="w-full px-4 py-2.5 bg-white border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Moyen de paiement simulé escrow */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-charcoal-200 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-semibold text-base text-charcoal-900">
                  {deliveryMode === 'shipping' ? '3.' : '2.'} Paiement sécurisé sous séquestre
                </h2>
                <span className="flex items-center gap-1.5 text-xs text-charcoal-400">
                  <Lock className="w-3.5 h-3.5" /> Connexion chiffrée
                </span>
              </div>

              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-rose-600 flex-shrink-0" />
                <div>
                  <span className="text-sm font-semibold text-charcoal-900 block">Carte bancaire</span>
                  <span className="text-xs text-charcoal-500">Montant bloqué et sécurisé jusqu’à confirmation</span>
                </div>
              </div>

              <div className="border-t border-charcoal-100 pt-4 flex items-start gap-2.5 text-xs text-charcoal-600 leading-relaxed">
                <ShieldCheck className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />
                <span>
                  Votre argent n'est pas versé au vendeur immédiatement. LeOui Market conserve les fonds
                  jusqu'à ce que vous validiez la bonne réception du colis ou de la remise.
                </span>
              </div>
            </div>
          </div>

          {/* DROITE (5 cols) : RÉCAPITULATIF DE LA COMMANDE CDC §4.2 */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-charcoal-200 space-y-6">
              <h2 className="font-serif text-xl text-charcoal-900">Récapitulatif</h2>

              {/* Produit */}
              <div className="flex items-center gap-3.5 pb-4 border-b border-charcoal-100">
                <img
                  src={listing.images[0]}
                  alt={listing.title}
                  className="w-16 h-16 rounded-xl object-cover bg-charcoal-100 flex-shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <h3 className="font-serif text-sm text-charcoal-900 truncate">{listing.title}</h3>
                  <p className="text-xs text-charcoal-500 mt-0.5">Quantité : {quantity}</p>
                  <p className="text-xs font-semibold text-charcoal-900 mt-1 tabular-nums">{eur(listing.price)} € / u</p>
                </div>
              </div>

              {/* Lignes de détail */}
              <div className="space-y-2 text-sm tabular-nums">
                <div className="flex justify-between text-charcoal-600">
                  <span>Prix des articles</span>
                  <span>{eur(itemsTotal)} €</span>
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Frais de livraison</span>
                  <span>{shippingCost > 0 ? `${eur(shippingCost)} €` : 'Gratuit'}</span>
                </div>
                <div className="flex justify-between text-charcoal-600">
                  <span>Protection acheteur LeOui (5&nbsp;%)</span>
                  <span>{eur(serviceFee)} €</span>
                </div>
                <div className="border-t border-charcoal-100 pt-3 flex justify-between font-bold text-base text-charcoal-900">
                  <span>Total à payer</span>
                  <span className="text-rose-600">{eur(grandTotal)} €</span>
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white font-semibold h-12 rounded-xl text-sm transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sécurisation du paiement…
                  </>
                ) : (
                  `Payer en toute sécurité · ${eur(grandTotal)} €`
                )}
              </button>

              <p className="text-[11px] text-charcoal-400 text-center leading-relaxed">
                En confirmant, vous serez redirigé vers le paiement sécurisé Stripe.
                Vos fonds sont conservés en séquestre jusqu'à validation de la commande.
              </p>
            </div>
          </div>
        </form>
      </main>

      <Footer />
    </div>
  );
}
