'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { Star, MessageCircle, ThumbsUp, X, Send, TrendingUp } from 'lucide-react';
import { getDocuments, addDocument, updateDocument } from '@/lib/db';
import { toast } from 'sonner';

interface Review {
  id: string; vendor_id: string; client_name: string; client_email: string;
  rating: number; comment: string; date: string;
  status: 'published' | 'pending'; vendor_reply: string;
}

function StarRow({ rating, size = 'sm' }: { rating: number; size?: 'sm' | 'lg' }) {
  const s = size === 'lg' ? 'w-5 h-5' : 'w-3.5 h-3.5';
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`${s} ${i <= rating ? 'fill-champagne-500 text-champagne-500' : 'text-stone-200 fill-stone-200'}`} />
      ))}
    </div>
  );
}

function RatingBar({ label, count, total }: { label: string; count: number; total: number }) {
  const pct = total > 0 ? Math.round(count / total * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-charcoal-500 w-6 text-right">{label}</span>
      <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
        <div className="h-full bg-champagne-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-charcoal-400 w-5">{count}</span>
    </div>
  );
}

export default function AvisPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyModal, setReplyModal] = useState<Review | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replySaving, setReplySaving] = useState(false);
  const [filterRating, setFilterRating] = useState(0);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getDocuments('reviews', [{ field: 'vendor_id', operator: '==', value: user.uid }]);
      setReviews((data as any[]).map(d => ({
        id: d.id, vendor_id: d.vendor_id, client_name: d.client_name || 'Anonyme',
        client_email: d.client_email || '', rating: d.rating || 5, comment: d.comment || '',
        date: d.date || d.created_at || new Date().toISOString(),
        status: d.status || 'published', vendor_reply: d.vendor_reply || '',
      })));
    } catch { setReviews([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  const published = reviews.filter(r => r.status === 'published');
  const avgRating = published.length > 0 ? published.reduce((s, r) => s + r.rating, 0) / published.length : 0;
  const ratingCounts = [5,4,3,2,1].map(n => ({ n, count: published.filter(r => r.rating === n).length }));

  const openReply = (r: Review) => { setReplyModal(r); setReplyText(r.vendor_reply || ''); };

  const handleReply = async () => {
    if (!replyModal) return;
    setReplySaving(true);
    try {
      await updateDocument('reviews', replyModal.id, { vendor_reply: replyText });
      toast.success('Réponse publiée');
      setReplyModal(null);
      load();
    } catch { toast.error('Erreur'); } finally { setReplySaving(false); }
  };

  const handlePublish = async (r: Review) => {
    try { await updateDocument('reviews', r.id, { status: 'published' }); toast.success('Avis publié'); load(); } catch { toast.error('Erreur'); }
  };

  const filtered = reviews.filter(r => filterRating === 0 || r.rating === filterRating);

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Avis clients</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Consultez vos avis et répondez à vos clients.</p>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] gap-4">

          {/* Average rating card */}
          <div className="bg-white rounded-2xl shadow-sm p-6 flex flex-col items-center justify-center">
            <p className="font-serif text-charcoal-900 text-center" style={{ fontSize: '3.5rem', fontWeight: 300, lineHeight: 1 }}>
              {avgRating > 0 ? avgRating.toFixed(1) : '—'}
            </p>
            <StarRow rating={Math.round(avgRating)} size="lg" />
            <p className="text-xs text-charcoal-400 mt-2">{published.length} avis publiés</p>
            {reviews.filter(r => r.status === 'pending').length > 0 && (
              <p className="text-xs text-orange-600 mt-1">{reviews.filter(r => r.status === 'pending').length} en attente</p>
            )}
          </div>

          {/* Rating breakdown */}
          <div className="bg-white rounded-2xl shadow-sm p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <p className="text-sm font-medium text-charcoal-700">Répartition des notes</p>
            </div>
            <div className="space-y-2.5">
              {ratingCounts.map(({ n, count }) => (
                <RatingBar key={n} label={`${n}★`} count={count} total={published.length} />
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-stone-100 grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xs text-charcoal-400 mb-1">Taux de satisfaction</p>
                <p className="font-serif text-charcoal-900 text-lg" style={{ fontWeight: 300 }}>
                  {published.length > 0 ? Math.round(published.filter(r => r.rating >= 4).length / published.length * 100) : 0}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-charcoal-400 mb-1">Réponses données</p>
                <p className="font-serif text-charcoal-900 text-lg" style={{ fontWeight: 300 }}>
                  {reviews.filter(r => r.vendor_reply).length}/{reviews.length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-charcoal-500 font-medium">Filtrer :</span>
          {[0,5,4,3,2,1].map(n => (
            <button key={n} onClick={() => setFilterRating(n)}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterRating === n ? 'bg-rose-600 text-white' : 'bg-white text-charcoal-600 border border-stone-200 hover:bg-stone-50'}`}>
              {n === 0 ? 'Tous' : <><Star className="w-3 h-3 fill-current" /> {n}</>}
            </button>
          ))}
        </div>

        {/* Reviews list */}
        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-28 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Star className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
            <p className="font-serif text-charcoal-700 text-lg mb-1">{filterRating > 0 ? 'Aucun avis pour cette note' : 'Aucun avis pour le moment'}</p>
            <p className="text-sm text-charcoal-400">Les avis de vos clients apparaîtront ici après leur réservation</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(r => (
              <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-champagne-200 to-rose-200 flex items-center justify-center flex-shrink-0">
                      <span className="text-sm font-bold text-charcoal-700">{r.client_name.charAt(0).toUpperCase()}</span>
                    </div>
                    <div>
                      <p className="font-medium text-charcoal-900 text-sm">{r.client_name}</p>
                      <p className="text-xs text-charcoal-400">{new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <StarRow rating={r.rating} />
                    {r.status === 'pending' && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">En attente</span>
                        <button onClick={() => handlePublish(r)} className="text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors">Publier</button>
                      </div>
                    )}
                  </div>
                </div>

                {r.comment && (
                  <p className="text-sm text-charcoal-600 mb-3 leading-relaxed">&ldquo;{r.comment}&rdquo;</p>
                )}

                {/* Vendor reply */}
                {r.vendor_reply ? (
                  <div className="bg-rose-50 rounded-xl p-3 border-l-2 border-rose-300">
                    <p className="text-xs font-semibold text-rose-700 mb-1">Votre réponse</p>
                    <p className="text-xs text-charcoal-600">{r.vendor_reply}</p>
                    <button onClick={() => openReply(r)} className="text-xs text-rose-600 hover:text-rose-700 mt-1.5 underline">Modifier</button>
                  </div>
                ) : (
                  <button onClick={() => openReply(r)} className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 transition-colors mt-1">
                    <MessageCircle className="w-3.5 h-3.5" /> Répondre à cet avis
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reply modal */}
      {replyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <div>
                <h2 className="font-serif text-charcoal-900 text-lg" style={{ fontWeight: 400 }}>Répondre à {replyModal.client_name}</h2>
                <StarRow rating={replyModal.rating} />
              </div>
              <button onClick={() => setReplyModal(null)} className="p-1.5 rounded-lg hover:bg-stone-100 text-charcoal-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              {replyModal.comment && (
                <div className="bg-stone-50 rounded-xl p-3 mb-4">
                  <p className="text-xs text-charcoal-500 italic">&ldquo;{replyModal.comment}&rdquo;</p>
                </div>
              )}
              <label className="block text-sm font-medium text-charcoal-700 mb-1.5">Votre réponse</label>
              <textarea value={replyText} onChange={e => setReplyText(e.target.value)} rows={4}
                className="w-full px-4 py-2.5 border border-charcoal-200 rounded-xl text-sm bg-stone-50 focus:outline-none focus:border-rose-400 resize-none"
                placeholder="Merci pour votre avis ! Nous sommes ravis que…" />
              <p className="text-xs text-charcoal-400 mt-1.5">Votre réponse sera visible publiquement sur votre fiche.</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-stone-100">
              <button onClick={() => setReplyModal(null)} className="flex-1 px-4 py-2.5 border border-charcoal-200 text-charcoal-600 rounded-xl text-sm hover:bg-stone-50 transition-colors">Annuler</button>
              <button onClick={handleReply} disabled={replySaving || !replyText.trim()} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />{replySaving ? 'Publication…' : 'Publier la réponse'}
              </button>
            </div>
          </div>
        </div>
      )}
    </PrestataireDashboardLayout>
  );
}
