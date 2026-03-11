'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { toast } from 'sonner';
import { User, Lock, LogOut, ShieldCheck, Save } from 'lucide-react';

export default function ParametresPage() {
  const { user, signOut } = useAuth();
  const [tab, setTab] = useState<'profil' | 'securite'>('profil');
  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const handlePasswordChange = async () => {
    if (!auth.currentUser || !user?.email) return;
    if (pwForm.next !== pwForm.confirm) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (pwForm.next.length < 6) { toast.error('Le mot de passe doit contenir au moins 6 caractères'); return; }
    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, pwForm.current);
      await reauthenticateWithCredential(auth.currentUser, cred);
      await updatePassword(auth.currentUser, pwForm.next);
      setPwForm({ current: '', next: '', confirm: '' });
      toast.success('Mot de passe mis à jour');
    } catch (e: any) {
      if (e.code === 'auth/wrong-password') toast.error('Mot de passe actuel incorrect');
      else toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'profil', label: 'Mon profil', icon: User },
    { id: 'securite', label: 'Sécurité', icon: ShieldCheck },
  ] as const;

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-2xl">
        <div className="mb-6">
          <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
          <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Paramètres</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-charcoal-100 rounded-2xl mb-6 w-fit">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                tab === t.id ? 'bg-white text-charcoal-900 shadow-soft' : 'text-charcoal-500 hover:text-charcoal-700'
              }`}
            >
              <t.icon className="w-4 h-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'profil' && (
          <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft space-y-5">
            <h2 className="font-display text-heading-sm text-charcoal-900">Informations du compte</h2>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Email</label>
              <input
                type="email"
                value={user?.email || ''}
                readOnly
                className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 text-charcoal-500 cursor-not-allowed"
              />
              <p className="text-xs text-charcoal-400 mt-1">L'email ne peut pas être modifié.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Nom affiché</label>
              <input
                type="text"
                defaultValue={user?.displayName || ''}
                className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all"
                placeholder="Nom de votre entreprise"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Type de prestataire</label>
              <input
                type="text"
                value={user?.vendorType || 'Prestataire'}
                readOnly
                className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 text-charcoal-500 cursor-not-allowed"
              />
            </div>
            <div className="pt-2 border-t border-charcoal-100">
              <p className="text-xs text-charcoal-400">
                Pour modifier les informations de votre annonce publique (photos, description, tarifs), rendez-vous dans{' '}
                <a href="/espace-prestataire/mon-annonce" className="text-rose-600 hover:underline">Mon annonce</a>.
              </p>
            </div>
          </div>
        )}

        {tab === 'securite' && (
          <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft space-y-5">
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-charcoal-400" />
              <h2 className="font-display text-heading-sm text-charcoal-900">Changer le mot de passe</h2>
            </div>
            {[
              { key: 'current', label: 'Mot de passe actuel', placeholder: '••••••••' },
              { key: 'next', label: 'Nouveau mot de passe', placeholder: '8 caractères minimum' },
              { key: 'confirm', label: 'Confirmer le nouveau mot de passe', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{f.label}</label>
                <input
                  type="password"
                  value={pwForm[f.key as keyof typeof pwForm]}
                  onChange={e => setPwForm(p => ({ ...p, [f.key]: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all"
                  placeholder={f.placeholder}
                />
              </div>
            ))}
            <button
              onClick={handlePasswordChange}
              disabled={saving || !pwForm.current || !pwForm.next || !pwForm.confirm}
              className="flex items-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Mise à jour…' : 'Mettre à jour'}
            </button>
          </div>
        )}

        {/* Danger zone */}
        <div className="mt-6 bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-rose-800 mb-1">Zone de déconnexion</h3>
          <p className="text-xs text-rose-600 mb-3">Vous serez redirigé vers la page de connexion.</p>
          <button
            onClick={signOut}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-50 transition-colors"
          >
            <LogOut className="w-4 h-4" /> Se déconnecter
          </button>
        </div>
      </div>
    </PrestataireDashboardLayout>
  );
}
