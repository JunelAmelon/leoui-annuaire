'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useClientData } from '@/contexts/ClientDataContext';
import { updateDocument } from '@/lib/db';
import { User, Lock, LogOut, Save, Camera } from 'lucide-react';
import { uploadFile } from '@/lib/storage';
import { toast } from 'sonner';
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth';
import { auth } from '@/lib/firebase';

const DEFAULT_PHOTO = 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=400';

export default function ParametresPage() {
  const { user, signOut } = useAuth();
  const { client, event, loading: dataLoading, refresh } = useClientData();
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState(client?.name || '');
  const [partner, setPartner] = useState(client?.partner || '');
  const [phone, setPhone] = useState(client?.phone || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPwd, setChangingPwd] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(client?.photo || DEFAULT_PHOTO);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (client?.photo) setPhotoPreview(client.photo);
    if (client?.name && !name) setName(client.name);
    if (client?.partner && !partner) setPartner(client.partner);
    if (client?.phone && !phone) setPhone(client.phone || '');
  }, [client?.photo, client?.name, client?.partner, client?.phone]);

  const handlePhotoUpload = async (file: File) => {
    if (!client?.id) return;
    setUploadingPhoto(true);
    try {
      const url = await uploadFile(file, 'profiles');
      await updateDocument('clients', client.id, { photo: url });
      setPhotoPreview(url);
      await refresh();
      toast.success('Photo de profil mise à jour');
    } catch (err: any) {
      console.error('Photo upload error:', err);
      toast.error(err?.message || 'Erreur lors de l\'upload de la photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!client?.id) return;
    setSaving(true);
    try {
      await updateDocument('clients', client.id, { name, partner, phone });
      await refresh();
      toast.success('Profil mis à jour');
    } catch {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!user?.email || !currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) { toast.error('Les mots de passe ne correspondent pas'); return; }
    if (newPassword.length < 6) { toast.error('Mot de passe trop court (6 caractères minimum)'); return; }
    setChangingPwd(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(auth.currentUser!, credential);
      await updatePassword(auth.currentUser!, newPassword);
      setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
      toast.success('Mot de passe modifié');
    } catch (e: any) {
      const code = e?.code || '';
      if (code === 'auth/wrong-password') toast.error('Mot de passe actuel incorrect');
      else toast.error('Erreur lors du changement de mot de passe');
    } finally {
      setChangingPwd(false);
    }
  };

  if (dataLoading) return (
    <div className="space-y-4 animate-pulse"><div className="h-8 w-48 bg-charcoal-100 rounded-xl" /><div className="h-64 bg-charcoal-100 rounded-2xl" /></div>
  );

  return (
    <div className="space-y-5 max-w-3xl">
      {/* Page header */}
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace client</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Paramètres du compte</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Profile */}
        <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft">
          <h2 className="font-display text-heading-sm text-charcoal-900 mb-5 flex items-center gap-2">
            <User className="w-5 h-5 text-rose-500" />Informations personnelles
          </h2>
          {/* Photo upload */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-charcoal-100">
            <div className="relative flex-shrink-0">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-gradient-to-br from-champagne-200 to-rose-200 flex items-center justify-center">
                {photoPreview ? (
                  <img src={photoPreview} alt="Photo de profil" className="w-full h-full object-cover" />
                ) : (
                  <span className="font-serif text-charcoal-600 text-xl font-light">
                    {(name || client?.name || 'C').charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {uploadingPhoto && (
                <div className="absolute inset-0 bg-white/70 rounded-2xl flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <div>
              <p className="text-sm font-medium text-charcoal-900 mb-1">Photo du couple</p>
              <p className="text-xs text-charcoal-500 mb-2">Visible dans le menu et sur votre page mariage</p>
              <input ref={photoInputRef} type="file" accept="image/*" className="hidden"
                onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void handlePhotoUpload(f); }} />
              <button onClick={() => photoInputRef.current?.click()} disabled={uploadingPhoto}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-charcoal-200 text-charcoal-700 rounded-xl text-xs font-medium hover:bg-charcoal-50 disabled:opacity-50 transition-colors">
                <Camera className="w-3.5 h-3.5" />{uploadingPhoto ? 'Upload...' : 'Changer la photo'}
              </button>
            </div>
          </div>
          <div className="space-y-4">
            {[{id:'email',label:'Email',value:user?.email||'',readOnly:true,placeholder:''},
              {id:'name',label:'Votre prénom',value:name,onChange:(e:any)=>setName(e.target.value),placeholder:'Sophie'},
              {id:'partner',label:'Partenaire',value:partner,onChange:(e:any)=>setPartner(e.target.value),placeholder:'Thomas'},
              {id:'phone',label:'Téléphone',value:phone,onChange:(e:any)=>setPhone(e.target.value),placeholder:'+33 6 12 34 56 78'},
            ].map(f => (
              <div key={f.id}>
                <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{f.label}</label>
                <input
                  type="text" value={f.value}
                  onChange={(f as any).onChange}
                  readOnly={(f as any).readOnly}
                  placeholder={f.placeholder}
                  className={`w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-all ${
                    (f as any).readOnly ? 'bg-charcoal-50 text-charcoal-500 cursor-not-allowed' : 'bg-ivory-50'
                  }`}
                />
              </div>
            ))}
            <button onClick={handleSaveProfile} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-all">
              <Save className="w-4 h-4" />{saving ? 'Sauvegarde…' : 'Sauvegarder'}
            </button>
          </div>
        </div>

        <div className="space-y-5">
          {/* Password */}
          <div className="bg-white border border-charcoal-100 rounded-2xl p-6 shadow-soft">
            <h2 className="font-display text-heading-sm text-charcoal-900 mb-5 flex items-center gap-2">
              <Lock className="w-5 h-5 text-rose-500" />Mot de passe
            </h2>
            <div className="space-y-4">
              {[{label:'Actuel',val:currentPassword,set:setCurrentPassword},{label:'Nouveau',val:newPassword,set:setNewPassword},{label:'Confirmer',val:confirmPassword,set:setConfirmPassword}].map(f=>(
                <div key={f.label}>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">{f.label}</label>
                  <input type="password" value={f.val} onChange={e=>f.set(e.target.value)}
                    className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-ivory-50 focus:outline-none focus:border-rose-400 transition-all" />
                </div>
              ))}
              <button onClick={handleChangePassword} disabled={changingPwd||!currentPassword||!newPassword||!confirmPassword}
                className="w-full py-2.5 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 transition-all">
                {changingPwd ? 'Mise à jour…' : 'Changer le mot de passe'}
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
    </div>
  );
}
