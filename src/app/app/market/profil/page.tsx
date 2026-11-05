'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  sendEmailVerification,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import { BadgeCheck, Camera, Eye, EyeOff, Loader2, Mail, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import CityAutocompleteInput, { LocationSuggestion } from '@/components/CityAutocompleteInput';
import AddressAutocompleteInput, { AddressSuggestion } from '@/components/AddressAutocompleteInput';
import { Avatar, Field, SectionTitle, inputCls, primaryBtn, ghostBtn } from '@/components/market/ui';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { uploadImage } from '@/lib/storage';
import { updateDocument } from '@/lib/db';
import { MarketSellerProfile } from '@/lib/market/types';
import { splitCityLabel } from '@/lib/market/utils';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

const Block = ({ children }: { children: React.ReactNode }) => (
  <section className="bg-white border border-charcoal-200 p-6 sm:p-8">{children}</section>
);

export default function MarketProfilePage() {
  const { user, refreshUser } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<MarketSellerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Photo
  const [photoBusy, setPhotoBusy] = useState(false);

  // Identité du compte
  const [accountName, setAccountName] = useState(user?.displayName ?? '');
  const [savingName, setSavingName] = useState(false);
  const [sendingVerif, setSendingVerif] = useState(false);

  // Profil vendeur
  const [displayName, setDisplayName] = useState('');
  const [status, setStatus] = useState<'particulier' | 'professionnel'>('particulier');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [street, setStreet] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [savingSeller, setSavingSeller] = useState(false);

  // Mot de passe
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const hasPassword = !!auth.currentUser?.providerData.some((p) => p.providerId === 'password');
  const emailVerified = !!auth.currentUser?.emailVerified;

  const token = async () => auth.currentUser?.getIdToken();

  const hydrate = useCallback((p: MarketSellerProfile) => {
    setProfile(p);
    setDisplayName(p.display_name ?? '');
    setStatus(p.status ?? 'particulier');
    setBio(p.bio ?? '');
    setPhone(p.phone ?? '');
    setStreet(p.address?.street ?? '');
    setCity(p.address?.city ?? '');
    setPostalCode(p.address?.postal_code ?? '');
  }, []);

  useEffect(() => {
    if (!user) return;
    setAccountName(user.displayName ?? '');
    (async () => {
      try {
        const res = await fetch('/api/market/seller-profile', { headers: { Authorization: `Bearer ${await token()}` } });
        const data = await res.json();
        if (data.profile) hydrate(data.profile);
      } finally {
        setLoading(false);
      }
    })();
  }, [user, hydrate]);

  // ── Photo ──────────────────────────────────────────────────────────────────
  const saveSellerPhoto = async (photoUrl: string | null) => {
    if (!profile) return;
    await fetch('/api/market/seller-profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
      body: JSON.stringify({ photo_url: photoUrl }),
    });
  };

  const onPickPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !auth.currentUser) return;
    if (!file.type.startsWith('image/')) return toast.error('Choisissez un fichier image');
    if (file.size > MAX_PHOTO_BYTES) return toast.error('Image trop lourde (5 Mo maximum)');

    setPhotoBusy(true);
    try {
      const url = await uploadImage(file, 'leoui_market_avatars');
      await updateProfile(auth.currentUser, { photoURL: url });
      await saveSellerPhoto(url);
      await refreshUser();
      if (profile) setProfile({ ...profile, photo_url: url });
      toast.success('Photo de profil mise à jour');
    } catch {
      toast.error('Impossible de mettre à jour la photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  const removePhoto = async () => {
    if (!auth.currentUser) return;
    setPhotoBusy(true);
    try {
      await updateProfile(auth.currentUser, { photoURL: '' });
      await saveSellerPhoto(null);
      await refreshUser();
      if (profile) setProfile({ ...profile, photo_url: null });
      toast.success('Photo supprimée');
    } catch {
      toast.error('Impossible de supprimer la photo');
    } finally {
      setPhotoBusy(false);
    }
  };

  // ── Identité ───────────────────────────────────────────────────────────────
  const saveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || accountName.trim().length < 2) return toast.error('Indiquez votre nom');
    setSavingName(true);
    try {
      await updateProfile(auth.currentUser, { displayName: accountName.trim() });
      try {
        await updateDocument('profiles', auth.currentUser.uid, { name: accountName.trim() });
      } catch {
        /* le document profiles peut ne pas exister pour certains comptes */
      }
      await refreshUser();
      toast.success('Nom mis à jour');
    } catch {
      toast.error('Impossible de mettre à jour le nom');
    } finally {
      setSavingName(false);
    }
  };

  const resendVerification = async () => {
    if (!auth.currentUser) return;
    setSendingVerif(true);
    try {
      await sendEmailVerification(auth.currentUser);
      toast.success('Email de vérification envoyé');
    } catch (err: any) {
      toast.error(err?.code === 'auth/too-many-requests' ? 'Patientez avant de redemander un email' : 'Envoi impossible');
    } finally {
      setSendingVerif(false);
    }
  };

  // ── Profil vendeur ─────────────────────────────────────────────────────────
  const saveSeller = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = splitCityLabel(city);
    if (displayName.trim().length < 2) return toast.error('Le nom public est requis');
    if (!parsed.city) return toast.error('La ville est requise');
    setSavingSeller(true);
    try {
      const res = await fetch('/api/market/seller-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await token()}` },
        body: JSON.stringify({
          display_name: displayName,
          status,
          bio,
          phone,
          address: { street, city: parsed.city, postal_code: postalCode || parsed.postal || '' },
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Erreur');
      hydrate(data.profile);
      toast.success('Profil vendeur enregistré');
    } catch (err: any) {
      toast.error(err.message || 'Impossible d’enregistrer');
    } finally {
      setSavingSeller(false);
    }
  };

  // ── Mot de passe ───────────────────────────────────────────────────────────
  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const fu = auth.currentUser;
    if (!fu?.email) return;
    if (newPwd.length < 8) return toast.error('8 caractères minimum');
    if (newPwd !== confirmPwd) return toast.error('Les mots de passe ne correspondent pas');
    if (newPwd === currentPwd) return toast.error('Le nouveau mot de passe doit être différent');

    setSavingPwd(true);
    try {
      await reauthenticateWithCredential(fu, EmailAuthProvider.credential(fu.email, currentPwd));
      await updatePassword(fu, newPwd);
      setCurrentPwd('');
      setNewPwd('');
      setConfirmPwd('');
      toast.success('Mot de passe modifié');
    } catch (err: any) {
      const code = err?.code || '';
      if (['auth/wrong-password', 'auth/invalid-credential'].includes(code)) toast.error('Mot de passe actuel incorrect');
      else if (code === 'auth/weak-password') toast.error('Nouveau mot de passe trop faible');
      else if (code === 'auth/too-many-requests') toast.error('Trop de tentatives, réessayez plus tard');
      else toast.error('Impossible de modifier le mot de passe');
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-7 h-7 text-rose-600 animate-spin" />
      </div>
    );
  }

  const shownName = profile?.display_name || user?.displayName || user?.email || '';

  return (
    <div className="space-y-6">
      <div>
        <p className="label-xs text-rose-600 mb-2">Mon compte</p>
        <h1 className="font-serif text-4xl text-charcoal-900 leading-none">Mon profil</h1>
      </div>

      {/* Photo */}
      <Block>
        <SectionTitle eyebrow="01" title="Photo de profil" />
        <div className="flex items-center gap-6 flex-wrap">
          <Avatar name={shownName} photoUrl={user?.photoURL} size={96} />
          <div className="space-y-3">
            <div className="flex items-center gap-3 flex-wrap">
              <button type="button" onClick={() => fileRef.current?.click()} disabled={photoBusy} className={primaryBtn}>
                {photoBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                {user?.photoURL ? 'Changer la photo' : 'Ajouter une photo'}
              </button>
              {user?.photoURL && (
                <button type="button" onClick={removePhoto} disabled={photoBusy} className={ghostBtn}>
                  <Trash2 className="w-4 h-4" /> Retirer
                </button>
              )}
            </div>
            <p className="text-xs text-charcoal-500">JPG ou PNG, 5 Mo maximum. Elle apparaît sur vos annonces.</p>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickPhoto} className="hidden" />
          </div>
        </div>
      </Block>

      {/* Identité */}
      <Block>
        <SectionTitle eyebrow="02" title="Mon compte" />
        <form onSubmit={saveName} className="space-y-5">
          <Field label="Prénom et nom" required>
            <input value={accountName} onChange={(e) => setAccountName(e.target.value)} className={inputCls} />
          </Field>

          <div>
            <span className="label-xs text-charcoal-600 mb-2 block">Adresse email</span>
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[14rem]">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal-400" />
                <input value={user?.email ?? ''} readOnly className={`${inputCls} pl-10 bg-charcoal-50 text-charcoal-500`} />
              </div>
              {emailVerified ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                  <BadgeCheck className="w-4 h-4" /> Vérifié
                </span>
              ) : (
                <button type="button" onClick={resendVerification} disabled={sendingVerif} className="text-xs font-semibold text-rose-600 hover:underline disabled:opacity-60">
                  {sendingVerif ? 'Envoi…' : 'Non vérifié : renvoyer le lien'}
                </button>
              )}
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button type="submit" disabled={savingName} className={primaryBtn}>
              {savingName ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer'}
            </button>
          </div>
        </form>
      </Block>

      {/* Profil vendeur */}
      <Block>
        <SectionTitle eyebrow="03" title="Profil vendeur" />
        {profile ? (
          <form onSubmit={saveSeller} className="space-y-5">
            <Field label="Nom public" required hint="Affiché sur toutes vos annonces.">
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={inputCls} />
            </Field>

            <div>
              <span className="label-xs text-charcoal-600 mb-2 block">Statut</span>
              <div className="grid grid-cols-2 gap-3">
                {(['particulier', 'professionnel'] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStatus(s)}
                    className={`text-left p-3.5 border transition-colors ${
                      status === s ? 'border-rose-600 bg-rose-50/40' : 'border-charcoal-200 hover:border-charcoal-400'
                    }`}
                  >
                    <span className="block text-sm font-semibold text-charcoal-900 capitalize">{s}</span>
                  </button>
                ))}
              </div>
            </div>

            <Field label="Présentation" hint={`${bio.length} / 500 · Quelques mots pour rassurer les acheteurs`}>
              <textarea
                rows={3}
                maxLength={500}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className={`${inputCls} resize-none`}
              />
            </Field>

            <Field label="Téléphone" hint="Jamais affiché publiquement. Non vérifié tant que la vérification SMS n’est pas disponible.">
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={inputCls} />
            </Field>

            <Field label="Adresse" hint="Sélectionnez-la : la ville et le code postal se remplissent. Jamais affichée publiquement.">
              <AddressAutocompleteInput
                value={street}
                onChange={setStreet}
                onSelectAddress={(a: AddressSuggestion) => {
                  setStreet(a.street);
                  if (a.city) setCity(a.city);
                  if (a.postcode) setPostalCode(a.postcode);
                }}
                placeholder="12 rue de la Paix"
                inputClassName={`${inputCls} pl-10`}
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
                  showPostalCode={false}
                  icon={false}
                  className="w-full"
                  inputClassName="px-4 py-3 border-charcoal-200"
                />
              </Field>
              <Field label="Code postal">
                <input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className={inputCls} />
              </Field>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={savingSeller} className={primaryBtn}>
                {savingSeller ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enregistrer le profil vendeur'}
              </button>
            </div>
          </form>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <p className="text-sm text-charcoal-600 max-w-md">
              Vous n’avez pas encore de profil vendeur. Il est nécessaire pour publier une annonce.
            </p>
            <Link href="/market/deposer-une-annonce" className={primaryBtn}>
              Créer mon profil vendeur
            </Link>
          </div>
        )}
      </Block>

      {/* Sécurité */}
      <Block>
        <SectionTitle eyebrow="04" title="Sécurité" />
        {hasPassword ? (
          <form onSubmit={changePassword} className="space-y-5 max-w-md">
            <Field label="Mot de passe actuel" required>
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Nouveau mot de passe" required hint="8 caractères minimum">
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label="Confirmer le nouveau mot de passe" required>
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPwd}
                onChange={(e) => setConfirmPwd(e.target.value)}
                className={inputCls}
              />
            </Field>

            <div className="flex items-center justify-between gap-4 pt-2">
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                className="inline-flex items-center gap-2 text-xs text-charcoal-500 hover:text-charcoal-800"
              >
                {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {showPwd ? 'Masquer' : 'Afficher'}
              </button>
              <button type="submit" disabled={savingPwd || !currentPwd || !newPwd} className={primaryBtn}>
                {savingPwd ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Modifier le mot de passe'}
              </button>
            </div>
          </form>
        ) : (
          <p className="text-sm text-charcoal-600">
            Vous êtes connecté avec Google : votre mot de passe est géré par votre compte Google.
          </p>
        )}
      </Block>
    </div>
  );
}
