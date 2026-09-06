'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Star, Send, Check, Store, LogIn, Chrome, Pencil, Trash2 } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { useAuth } from '@/contexts/AuthContext';
import { getDocument, getDocuments, addDocument, updateDocument, deleteDocument } from '@/lib/db';
import { toast } from 'sonner';

export default function AvisPublicPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const vendorParamId = (params?.vendorId as string) || '';
  const token = searchParams?.get('token') || '';

  const { user, loading: authLoading, signInWithGoogle } = useAuth();

  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');

  const [existingReview, setExistingReview] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);

  const redirectTo = typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : `/avis/${vendorParamId}`;

  const loadPageData = useCallback(async () => {
    if (!vendorParamId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/public/vendors/${encodeURIComponent(vendorParamId)}`);
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed');
      setVendor(json.vendor || null);

      let inv = null;
      if (token) {
        try {
          const invite = await getDocument('review_invitations', token);
          if (invite && !invite.used && new Date(invite.expires_at || 0) > new Date()) {
            inv = invite;
          }
        } catch {
          inv = null;
        }
      }
      setInvitation(inv);

      if (user && json.vendor) {
        const reviews = await getDocuments('reviews', [
          { field: 'vendor_id', operator: '==', value: json.vendor.id },
          { field: 'client_id', operator: '==', value: user.uid },
        ]);
        if (reviews.length) {
          const r = reviews[0] as any;
          setExistingReview(r);
          setName(r.client_name || '');
          setEmail(r.client_email || '');
          setRating(r.rating || 5);
          setComment(r.comment || '');
        } else {
          setExistingReview(null);
          if (inv) {
            setName(inv.name || user.displayName || '');
            setEmail(inv.email || user.email || '');
          } else {
            try {
              const profile = await getDocument('profiles', user.uid);
              setName(
                profile?.name
                  ? `${profile.name}${profile.partner ? ' & ' + profile.partner : ''}`.trim()
                  : user.displayName || user.email || ''
              );
            } catch {
              setName(user.displayName || user.email || '');
            }
            setEmail(user.email || '');
          }
        }
      } else {
        setExistingReview(null);
      }
    } catch {
      setVendor(null);
    } finally {
      setLoading(false);
    }
  }, [vendorParamId, token, user]);

  useEffect(() => {
    loadPageData();
  }, [loadPageData]);

  const recalcVendorRating = async (vendorId: string) => {
    try {
      const all = await getDocuments('reviews', [{ field: 'vendor_id', operator: '==', value: vendorId }]);
      const valid = (all as any[]).filter((r: any) => r.status !== 'archived');
      const count = valid.length;
      const avg = count > 0 ? Math.round(valid.reduce((s: number, r: any) => s + (r.rating || 5), 0) / count * 10) / 10 : 0;
      await updateDocument('vendors', vendorId, { rating: avg, reviewCount: count });
    } catch {
      // silent
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !vendor?.id || !name.trim() || !comment.trim() || !rating) return;
    setSubmitting(true);
    try {
      const now = new Date().toISOString();
      if (existingReview && isEditing) {
        await updateDocument('reviews', existingReview.id, {
          rating,
          comment: comment.trim(),
          client_name: name.trim(),
          client_email: email.trim(),
          updated_at: now,
        });
        toast.success('Votre avis a été mis à jour');
      } else {
        const existing = await getDocuments('reviews', [
          { field: 'vendor_id', operator: '==', value: vendor.id },
          { field: 'client_id', operator: '==', value: user.uid },
        ]);
        if (existing.length > 0) {
          setExistingReview(existing[0]);
          setIsEditing(false);
          toast.error('Vous avez déjà laissé un avis pour ce prestataire');
          await loadPageData();
          setSubmitting(false);
          return;
        }
        const newReview = {
          vendor_id: vendor.id,
          client_id: user.uid,
          client_name: name.trim(),
          client_email: email.trim(),
          client_photo: user.photoURL || '',
          rating,
          comment: comment.trim(),
          status: 'published',
          source: token ? 'invitation' : 'public_link',
          invitation_token: token || null,
          created_at: now,
          updated_at: now,
          vendor_reply: '',
        };
        const { id } = await addDocument('reviews', newReview);
        if (token && invitation) {
          await updateDocument('review_invitations', token, { used: true, review_id: id, used_at: now });
        }
        toast.success('Votre avis a été publié');
      }
      await recalcVendorRating(vendor.id);
      setIsEditing(false);
      await loadPageData();
    } catch (err: any) {
      toast.error(err?.message || 'Impossible de publier votre avis. Veuillez réessayer.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!existingReview || !vendor?.id) return;
    if (!window.confirm('Supprimer votre avis ? Cette action est irréversible.')) return;
    setIsDeleting(true);
    try {
      await deleteDocument('reviews', existingReview.id);
      if (token) {
        await updateDocument('review_invitations', token, { used: false, review_id: null }).catch(() => {});
      }
      await recalcVendorRating(vendor.id);
      setExistingReview(null);
      setName(user?.displayName || user?.email || '');
      setEmail(user?.email || '');
      setRating(5);
      setComment('');
      setIsEditing(false);
      toast.success('Avis supprimé');
    } catch {
      toast.error('Impossible de supprimer votre avis');
    } finally {
      setIsDeleting(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20">
          <div className="h-40 bg-stone-100 rounded-2xl animate-pulse mb-8" />
          <div className="h-64 bg-stone-50 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <div className="max-w-2xl mx-auto px-4 py-20 text-center">
          <p className="font-serif text-2xl text-charcoal-600">Prestataire introuvable</p>
          <Link href="/vendors" className="mt-4 inline-block text-rose-600 hover:underline">Voir les prestataires</Link>
        </div>
      </div>
    );
  }

  const loginUrl = `/login?next=${encodeURIComponent(redirectTo)}`;
  const signupUrl = `/signup?next=${encodeURIComponent(redirectTo)}`;

  if (!user) {
    return (
      <div className="min-h-screen bg-white">
        <Header />
        <main className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
          <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 overflow-hidden">
            <div className="relative h-40 bg-gradient-to-br from-rose-50 to-champagne-100 flex items-center justify-center">
              {vendor.imageUrl ? (
                <img src={vendor.imageUrl} alt={vendor.name} className="w-20 h-20 object-cover rounded-full border-4 border-white shadow-md" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center shadow-md">
                  <Store className="w-8 h-8 text-rose-400" />
                </div>
              )}
            </div>
            <div className="px-6 pb-6 text-center -mt-10">
              <h1 className="font-serif text-2xl text-charcoal-900 mt-10 mb-1">{vendor.name || 'Prestataire'}</h1>
              <p className="text-sm text-charcoal-500">{vendor.category || ''}</p>
            </div>
            <div className="px-6 pb-8 text-center space-y-4">
              <p className="text-charcoal-700 font-medium">Connectez-vous pour laisser un avis</p>
              <p className="text-sm text-charcoal-500">Comme sur Google, un compte est nécessaire pour garantir l’authenticité des avis.</p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href={loginUrl} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
                  <LogIn className="w-4 h-4" /> Se connecter
                </Link>
                <Link href={signupUrl} className="flex items-center justify-center gap-2 px-5 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors">
                  Créer un compte
                </Link>
              </div>
              <button
                onClick={() => signInWithGoogle(redirectTo)}
                className="w-full flex items-center justify-center gap-2 px-5 py-2.5 border border-charcoal-200 text-charcoal-700 rounded-xl text-sm font-medium hover:bg-stone-50 transition-colors"
              >
                <Chrome className="w-4 h-4" /> Continuer avec Google
              </button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <Header />
      <main className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
        <div className="bg-white rounded-2xl shadow-sm border border-charcoal-100 overflow-hidden">
          <div className="relative h-40 bg-gradient-to-br from-rose-50 to-champagne-100 flex items-center justify-center">
            {vendor.imageUrl ? (
              <img src={vendor.imageUrl} alt={vendor.name} className="w-20 h-20 object-cover rounded-full border-4 border-white shadow-md" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-white/80 flex items-center justify-center shadow-md">
                <Store className="w-8 h-8 text-rose-400" />
              </div>
            )}
          </div>
          <div className="px-6 pb-6 text-center -mt-10">
            <h1 className="font-serif text-2xl text-charcoal-900 mt-10 mb-1">{vendor.name || 'Prestataire'}</h1>
            <p className="text-sm text-charcoal-500">{vendor.category || ''}</p>
          </div>

          <div className="px-6 pb-8">
            {existingReview && !isEditing ? (
              <div className="space-y-5">
                <div className="bg-green-50 border border-green-100 rounded-2xl p-4 flex items-center gap-3">
                  <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                  <p className="text-sm font-semibold text-green-800">Votre avis est publié</p>
                </div>

                <div className="bg-stone-50 rounded-2xl p-5 border border-charcoal-100">
                  <div className="flex items-center gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <Star key={n} className={`w-5 h-5 ${n <= existingReview.rating ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`} />
                    ))}
                  </div>
                  <p className="text-sm text-charcoal-700 leading-relaxed mb-3">&ldquo;{existingReview.comment}&rdquo;</p>
                  <p className="text-xs text-charcoal-400">
                    Publié le {new Date(existingReview.created_at || existingReview.date).toLocaleDateString('fr-FR')}
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 transition-colors"
                  >
                    <Pencil className="w-4 h-4" /> Modifier
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={isDeleting}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 border border-red-200 text-red-600 rounded-xl text-sm font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" /> Supprimer
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Votre nom</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Votre email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-stone-50 border border-charcoal-200 rounded-xl text-sm focus:outline-none focus:border-rose-400 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Votre note</label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className="p-1"
                      >
                        <Star className={`w-8 h-8 transition-colors ${n <= rating ? 'text-amber-400 fill-amber-400' : 'text-charcoal-200'}`} />
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Votre avis</label>
                  <textarea
                    required
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Partagez votre expérience avec ce prestataire…"
                    rows={5}
                    className="w-full px-4 py-3 bg-stone-50 border border-charcoal-200 rounded-xl text-sm resize-none focus:outline-none focus:border-rose-400 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !comment.trim()}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors"
                >
                  {submitting ? 'Envoi…' : <><Send className="w-4 h-4" /> {existingReview ? 'Mettre à jour mon avis' : 'Publier mon avis'}</>}
                </button>

                {existingReview && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="w-full px-4 py-2.5 text-charcoal-600 text-sm hover:text-charcoal-900 transition-colors"
                  >
                    Annuler
                  </button>
                )}
              </form>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
