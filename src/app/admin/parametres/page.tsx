'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Lock, LogOut } from 'lucide-react';
import { toast } from 'sonner';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';

export default function AdminParametresPage() {
  const { user, signOut } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changing, setChanging] = useState(false);

  const handleChangePassword = async () => {
    if (!user?.email || !currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 6) { toast.error('Mot de passe trop court (6 caractères minimum)'); return; }
    setChanging(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Mot de passe modifié avec succès');
    } catch (e: any) {
      if (e?.code === 'auth/wrong-password') toast.error('Mot de passe actuel incorrect');
      else toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setChanging(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Paramètres du compte</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Account info */}
        <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft">
          <h2 className="font-semibold text-charcoal-900 text-sm mb-5">Informations du compte</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Email</label>
              <input value={user?.email || ''} readOnly className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 text-charcoal-500 cursor-not-allowed" />
            </div>
            <div>
              <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">Rôle</label>
              <input value={user?.role || 'planner'} readOnly className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-charcoal-50 text-charcoal-500 cursor-not-allowed" />
            </div>
          </div>
        </div>

        {/* Password */}
        <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft">
          <h2 className="font-semibold text-charcoal-900 text-sm mb-5 flex items-center gap-2">
            <Lock className="w-4 h-4 text-rose-500" /> Changer le mot de passe
          </h2>
          <div className="space-y-4">
            {[{label:'Mot de passe actuel', val:currentPassword, set:setCurrentPassword},
              {label:'Nouveau mot de passe', val:newPassword, set:setNewPassword},
              {label:'Confirmer le nouveau', val:confirmPassword, set:setConfirmPassword}].map(f => (
              <div key={f.label}>
                <label className="block text-xs text-charcoal-500 mb-1.5 font-medium">{f.label}</label>
                <input type="password" value={f.val} onChange={e => f.set(e.target.value)}
                  className="w-full px-3 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all" />
              </div>
            ))}
            <button onClick={handleChangePassword}
              disabled={changing || !currentPassword || !newPassword || !confirmPassword}
              className="w-full py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-all">
              {changing ? 'Mise à jour…' : 'Changer le mot de passe'}
            </button>
          </div>
        </div>

        {/* Logout */}
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-rose-800 mb-1 flex items-center gap-2"><LogOut className="w-4 h-4" />Déconnexion</h3>
          <p className="text-xs text-rose-600 mb-3">Vous serez redirigé vers la page de connexion.</p>
          <button onClick={() => signOut()}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-300 text-rose-700 rounded-xl text-sm font-medium hover:bg-rose-50 transition-colors">
            <LogOut className="w-4 h-4" />Se déconnecter
          </button>
        </div>
      </div>
    </div>
  );
}
