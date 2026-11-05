'use client';

/**
 * Paramètres admin — /admin/parametres
 *
 * Sections :
 *  1. Profil (photo Cloudinary, nom affiché)
 *  2. Sécurité (changement de mot de passe)
 *  3. Créer un compte utilisateur (Admin SDK via API)
 *  4. Gestion des rôles (attribuer un rôle à un compte existant)
 *  5. Déconnexion
 */

import { useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { auth } from '@/lib/firebase';
import { uploadFile } from '@/lib/storage';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth';
import { updateDocument } from '@/lib/db';
import { toast } from 'sonner';
import {
  Camera, Lock, LogOut, Shield, UserPlus, Loader2, Eye, EyeOff,
  Check, UserCheck,
} from 'lucide-react';

const ROLES = ['admin', 'vendor', 'planner', 'client'] as const;
type Role = (typeof ROLES)[number];

const ROLE_COLORS: Record<Role, string> = {
  admin:   'border-rose-400 bg-rose-600 text-white',
  vendor:  'border-champagne-500 bg-champagne-600 text-white',
  planner: 'border-blue-400 bg-blue-600 text-white',
  client:  'border-charcoal-400 bg-charcoal-700 text-white',
};

// ── Composant champ input réutilisable ────────────────────────────────────────
function Field({
  label, type = 'text', value, onChange, placeholder, required, end,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; end?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === 'password';
  return (
    <div>
      <label className="block text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider mb-1.5">
        {label}{required && <span className="text-rose-500 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (show ? 'text' : 'password') : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 focus:ring-1 focus:ring-rose-200 transition-all pr-10"
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-charcoal-300 hover:text-charcoal-600 transition-colors">
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
        {end && !isPassword && <div className="absolute right-3 top-1/2 -translate-y-1/2">{end}</div>}
      </div>
    </div>
  );
}

// ── Composant section card ────────────────────────────────────────────────────
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-charcoal-100 rounded-2xl shadow-soft overflow-hidden ${className}`}>
      {children}
    </div>
  );
}

function CardHeader({ title, subtitle, icon: Icon }: { title: string; subtitle?: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="px-6 py-4 border-b border-charcoal-100 bg-stone-50/60 flex items-center gap-3">
      {Icon && (
        <div className="w-8 h-8 rounded-xl bg-white border border-charcoal-100 flex items-center justify-center flex-shrink-0 shadow-sm">
          <Icon className="w-4 h-4 text-rose-500" />
        </div>
      )}
      <div>
        <p className="text-sm font-semibold text-charcoal-900">{title}</p>
        {subtitle && <p className="text-[11px] text-charcoal-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

// ── Page principale ───────────────────────────────────────────────────────────
export default function AdminParametresPage() {
  const { user, signOut } = useAuth();

  // ── 1. Profil ──────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  // Initialisation depuis Firebase Auth (source de vérité)
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [savingName, setSavingName] = useState(false);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.error('Fichier image requis'); return; }
    if (file.size > 5 * 1024 * 1024) { toast.error('Image trop lourde (max 5 Mo)'); return; }
    setPhotoUploading(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { toast.error('Session expirée'); return; }
      const url = await uploadFile(file, 'admin/avatars');
      // Mettre à jour Firebase Auth + Firestore (merge pour ne pas écraser les autres champs)
      await updateProfile(auth.currentUser!, { photoURL: url });
      await updateDocument('users', uid, { photoURL: url, updatedAt: new Date().toISOString() });
      toast.success('Photo mise à jour. Rechargez la page pour voir le résultat dans la sidebar');
    } catch { toast.error('Erreur lors de l\'upload'); }
    finally { setPhotoUploading(false); }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) return;
    setSavingName(true);
    try {
      const uid = auth.currentUser?.uid;
      if (!uid) { toast.error('Session expirée'); return; }
      // Mettre à jour Firebase Auth + Firestore
      await updateProfile(auth.currentUser!, { displayName: displayName.trim() });
      await updateDocument('users', uid, { displayName: displayName.trim(), updatedAt: new Date().toISOString() });
      toast.success('Nom mis à jour');
    } catch { toast.error('Erreur lors de l\'enregistrement'); }
    finally { setSavingName(false); }
  };

  // ── 2. Mot de passe ────────────────────────────────────────────────────────
  const [currentPwd, setCurrentPwd] = useState('');
  const [newPwd,     setNewPwd]     = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);

  const handleChangePwd = async () => {
    if (!user?.email || !currentPwd || !newPwd) return;
    if (newPwd !== confirmPwd) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPwd.length < 8) { toast.error('8 caractères minimum'); return; }
    setChangingPwd(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPwd);
      await reauthenticateWithCredential(auth.currentUser!, cred);
      await updatePassword(auth.currentUser!, newPwd);
      setCurrentPwd(''); setNewPwd(''); setConfirmPwd('');
      toast.success('Mot de passe modifié');
    } catch (e: any) {
      if (e?.code === 'auth/wrong-password') toast.error('Mot de passe actuel incorrect');
      else toast.error('Erreur lors du changement');
    } finally { setChangingPwd(false); }
  };

  // ── 3. Créer un compte ─────────────────────────────────────────────────────
  const [createEmail,       setCreateEmail]       = useState('');
  const [createPassword,    setCreatePassword]     = useState('');
  const [createName,        setCreateName]         = useState('');
  const [createRole,        setCreateRole]         = useState<Role>('client');
  const [createVendorType,  setCreateVendorType]   = useState('');
  const [creating,          setCreating]           = useState(false);

  const handleCreateUser = async () => {
    if (!createEmail.trim() || !createPassword || !createName.trim()) {
      toast.error('Nom, email et mot de passe requis');
      return;
    }
    if (createPassword.length < 8) { toast.error('8 caractères minimum pour le mot de passe'); return; }
    setCreating(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { toast.error('Session expirée'); return; }

      const res = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email:      createEmail.trim(),
          password:   createPassword,
          displayName: createName.trim(),
          role:       createRole,
          vendorType: createRole === 'vendor' ? createVendorType.trim() : undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `Erreur ${res.status}`);

      toast.success(`Compte ${createRole} créé pour ${createEmail.trim()}`);
      setCreateEmail(''); setCreatePassword(''); setCreateName(''); setCreateVendorType('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally { setCreating(false); }
  };

  // ── 4. Attribuer un rôle ───────────────────────────────────────────────────
  const [roleEmail,      setRoleEmail]      = useState('');
  const [roleTarget,     setRoleTarget]     = useState<Role>('admin');
  const [roleVendorType, setRoleVendorType] = useState('');
  const [settingRole,    setSettingRole]    = useState(false);

  const handleSetRole = async () => {
    if (!roleEmail.trim()) { toast.error('Email requis'); return; }
    setSettingRole(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { toast.error('Session expirée'); return; }
      const res = await fetch('/api/admin/set-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          email:      roleEmail.trim(),
          role:       roleTarget,
          vendorType: roleTarget === 'vendor' ? roleVendorType.trim() : undefined,
        }),
      });
      const data = await res.json() as { ok: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error || `Erreur ${res.status}`);
      toast.success(`Rôle "${roleTarget}" accordé. L'utilisateur doit se reconnecter`);
      setRoleEmail(''); setRoleVendorType('');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Erreur inconnue');
    } finally { setSettingRole(false); }
  };

  // ── Rendu ──────────────────────────────────────────────────────────────────
  const avatarUrl = (user as any)?.photoURL as string | undefined;
  const initials  = (user?.email || 'A').slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6 max-w-2xl">

      {/* En-tête */}
      <div>
        <p className="text-[11px] text-charcoal-400 uppercase tracking-widest font-medium mb-1.5">Administration</p>
        <h1 className="font-serif text-charcoal-900 text-[1.65rem] font-normal leading-tight" style={{ letterSpacing: '-0.015em' }}>
          Paramètres
        </h1>
      </div>

      {/* ── 1. Profil ── */}
      <Card>
        <CardHeader title="Mon profil" subtitle="Photo et nom affiché dans la sidebar" icon={Camera} />
        <div className="px-6 py-5 space-y-5">
          {/* Photo de profil */}
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-charcoal-100 bg-gradient-to-br from-rose-400 to-rose-600">
                {avatarUrl
                  ? <img src={avatarUrl} alt="avatar" className="w-full h-full object-cover" />
                  : <span className="w-full h-full flex items-center justify-center text-white text-xl font-bold">{initials}</span>
                }
              </div>
              {photoUploading && (
                <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-rose-600 animate-spin" />
                </div>
              )}
            </div>
            <div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={photoUploading}
                className="flex items-center gap-2 px-4 py-2 border border-charcoal-200 text-charcoal-700 text-sm font-medium rounded-xl hover:bg-rose-50 hover:border-rose-300 hover:text-rose-700 transition-all"
              >
                <Camera className="w-4 h-4" />
                {photoUploading ? 'Upload…' : 'Changer la photo'}
              </button>
              <p className="text-[11px] text-charcoal-400 mt-1.5">JPG ou PNG · max 5 Mo</p>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Nom affiché */}
          <div>
            <Field
              label="Nom affiché"
              value={displayName}
              onChange={setDisplayName}
              placeholder="Ex. Junel"
            />
            <button
              onClick={handleSaveName}
              disabled={savingName || !displayName.trim()}
              className="mt-2.5 flex items-center gap-1.5 px-3.5 py-2 bg-charcoal-900 hover:bg-charcoal-800 disabled:opacity-40 text-white text-xs font-semibold rounded-xl transition-colors"
            >
              {savingName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Enregistrer
            </button>
          </div>

          {/* Email (lecture seule) */}
          <div>
            <label className="block text-[11px] font-semibold text-charcoal-400 uppercase tracking-wider mb-1.5">Email</label>
            <div className="px-3.5 py-2.5 border border-charcoal-100 rounded-xl text-sm text-charcoal-500 bg-charcoal-50 font-mono">
              {user?.email || '—'}
            </div>
          </div>
        </div>
      </Card>

      {/* ── 2. Mot de passe ── */}
      <Card>
        <CardHeader title="Sécurité" subtitle="Changement du mot de passe du compte admin" icon={Lock} />
        <div className="px-6 py-5 space-y-4">
          <Field label="Mot de passe actuel"  type="password" value={currentPwd} onChange={setCurrentPwd} required />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nouveau"            type="password" value={newPwd}      onChange={setNewPwd}     placeholder="≥ 8 caractères" required />
            <Field label="Confirmer"          type="password" value={confirmPwd}  onChange={setConfirmPwd} required />
          </div>
          <button
            onClick={handleChangePwd}
            disabled={changingPwd || !currentPwd || !newPwd || !confirmPwd}
            className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {changingPwd && <Loader2 className="w-4 h-4 animate-spin" />}
            Changer le mot de passe
          </button>
        </div>
      </Card>

      {/* ── 3. Créer un compte ── */}
      <Card>
        <CardHeader
          title="Créer un compte"
          subtitle="Crée un compte Firebase Auth et Firestore avec un rôle"
          icon={UserPlus}
        />
        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nom complet"   value={createName}     onChange={setCreateName}     placeholder="Junel Orandi" required />
            <Field label="Email"         type="email"  value={createEmail}    onChange={setCreateEmail}    placeholder="user@leouinet.fr" required />
          </div>
          <Field label="Mot de passe"  type="password" value={createPassword} onChange={setCreatePassword} placeholder="≥ 8 caractères" required />

          {/* Sélection du rôle */}
          <div>
            <label className="block text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider mb-2">Rôle</label>
            <div className="grid grid-cols-4 gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setCreateRole(r)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border-2 transition-all capitalize ${
                    createRole === r
                      ? ROLE_COLORS[r]
                      : 'border-charcoal-200 text-charcoal-500 hover:border-charcoal-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Type prestataire */}
          {createRole === 'vendor' && (
            <Field label="Type de prestataire" value={createVendorType} onChange={setCreateVendorType} placeholder="ex: Photographe" />
          )}

          <button
            onClick={handleCreateUser}
            disabled={creating || !createEmail.trim() || !createPassword || !createName.trim()}
            className="w-full py-2.5 bg-charcoal-900 hover:bg-charcoal-800 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Créer le compte
          </button>
          <p className="text-[11px] text-charcoal-400">
            L'utilisateur reçoit son email et peut se connecter immédiatement sur /login.
          </p>
        </div>
      </Card>

      {/* ── 4. Attribuer un rôle ── */}
      <Card>
        <CardHeader
          title="Modifier un rôle"
          subtitle="Changer le rôle d'un compte existant (token actif après reconnexion)"
          icon={Shield}
        />
        <div className="px-6 py-5 space-y-4">
          <Field label="Email du compte cible" type="email" value={roleEmail} onChange={setRoleEmail} placeholder="utilisateur@exemple.fr" required />

          <div>
            <label className="block text-[11px] font-semibold text-charcoal-500 uppercase tracking-wider mb-2">Nouveau rôle</label>
            <div className="grid grid-cols-4 gap-2">
              {ROLES.map(r => (
                <button
                  key={r}
                  onClick={() => setRoleTarget(r)}
                  className={`py-2 px-3 text-xs font-semibold rounded-xl border-2 transition-all capitalize ${
                    roleTarget === r ? ROLE_COLORS[r] : 'border-charcoal-200 text-charcoal-500 hover:border-charcoal-300'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {roleTarget === 'vendor' && (
            <Field label="Type de prestataire" value={roleVendorType} onChange={setRoleVendorType} placeholder="ex: Traiteur" />
          )}

          <button
            onClick={handleSetRole}
            disabled={settingRole || !roleEmail.trim()}
            className="w-full py-2.5 bg-charcoal-900 hover:bg-charcoal-800 disabled:opacity-40 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {settingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
            Attribuer le rôle &quot;{roleTarget}&quot;
          </button>
        </div>
      </Card>

      {/* ── 5. Déconnexion ── */}
      <div className="flex items-center justify-between py-4 px-5 bg-white border border-charcoal-100 rounded-2xl shadow-soft">
        <div>
          <p className="text-sm font-semibold text-charcoal-900">Déconnexion</p>
          <p className="text-[11px] text-charcoal-400 mt-0.5">Vous serez redirigé vers /login</p>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-2 px-4 py-2 border border-rose-200 text-rose-700 text-sm font-medium rounded-xl hover:bg-rose-50 transition-colors"
        >
          <LogOut className="w-4 h-4" />Se déconnecter
        </button>
      </div>

    </div>
  );
}
