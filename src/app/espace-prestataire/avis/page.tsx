'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import PrestataireDashboardLayout from '../PrestataireDashboardLayout';
import { Star, MessageCircle, ThumbsUp, X, Send, TrendingUp, Mail, ChevronLeft, ChevronRight } from 'lucide-react';
import { getDocument, getDocuments, setDocument, updateDocument } from '@/lib/db';
import { createNotification, resolveClientRecipientId } from '@/lib/notifications';
import { renderReviewInvitationEmail, renderReviewReplyEmail } from '@/lib/email-template';
import { sendEmail } from '@/lib/email';
import { toast } from 'sonner';

interface Review {
  id: string; vendor_id: string; client_id?: string; client_name: string; client_email: string;
  client_photo?: string;
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
  const [inviteModal, setInviteModal] = useState(false);
  const [inviteEmails, setInviteEmails] = useState('');
  const [sendingInvites, setSendingInvites] = useState(false);
  const [vendorInfo, setVendorInfo] = useState<any>(null);
  const [clientPhotos, setClientPhotos] = useState<Record<string, string>>({});
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 6;

  const load = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [data, vendorDoc] = await Promise.all([
        getDocuments('reviews', [{ field: 'vendor_id', operator: '==', value: user.uid }]),
        getDocument('vendors', user.uid),
      ]);
      setVendorInfo(vendorDoc);
      setReviews((data as any[]).map(d => ({
        id: d.id, vendor_id: d.vendor_id, client_id: d.client_id || '', client_name: d.client_name || 'Anonyme',
        client_email: d.client_email || '', client_photo: d.client_photo || '', rating: d.rating || 5, comment: d.comment || '',
        date: d.date || d.created_at || new Date().toISOString(),
        status: d.status === 'pending' ? 'pending' : 'published', vendor_reply: d.vendor_reply || '',
      })));
    } catch { setReviews([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [user]);

  // Récupère les photos de profil des clients ayant laissé un avis
  useEffect(() => {
    const ids = Array.from(new Set(reviews.map(r => r.client_id).filter(Boolean))) as string[];
    const missing = ids.filter(id => !(id in clientPhotos));
    if (missing.length === 0) return;
    let cancelled = false;
    (async () => {
      const entries = await Promise.all(missing.map(async (id) => {
        try {
          const c = await getDocument('clients', id);
          if (c?.photo || c?.photoURL) return [id, (c.photo || c.photoURL) as string] as const;
          const p = await getDocument('profiles', id);
          return [id, (p?.photo || p?.photoURL || '') as string] as const;
        } catch {
          return [id, ''] as const;
        }
      }));
      if (!cancelled) setClientPhotos(prev => ({ ...prev, ...Object.fromEntries(entries) }));
    })();
    return () => { cancelled = true; };
  }, [reviews]);

  const published = reviews.filter(r => r.status === 'published');
  const avgRating = published.length > 0 ? published.reduce((s, r) => s + r.rating, 0) / published.length : 0;
  const ratingCounts = [5,4,3,2,1].map(n => ({ n, count: published.filter(r => r.rating === n).length }));

  const openReply = (r: Review) => { setReplyModal(r); setReplyText(r.vendor_reply || ''); };

  const handleReply = async () => {
    if (!replyModal) return;
    setReplySaving(true);
    try {
      await updateDocument('reviews', replyModal.id, { vendor_reply: replyText });
      if (replyModal.client_id) {
        resolveClientRecipientId(replyModal.client_id)
          .then((recipientId) => createNotification({
            recipientId,
            type: 'review',
            title: 'Réponse à votre avis',
            message: `${user?.displayName || 'Le prestataire'} a répondu à votre avis.`,
            link: `/vendors/${replyModal.vendor_id}`,
          }))
          .catch(() => {});
        // Email au client
        const vendorName = user?.displayName || 'Le prestataire';
        const sendReplyEmail = (to: string, clientName: string) => sendEmail({
          to,
          subject: `${vendorName} a répondu à votre avis`,
          html: renderReviewReplyEmail({ clientName, vendorName, reply: replyText }),
        });
        if (replyModal.client_email) {
          sendReplyEmail(replyModal.client_email, replyModal.client_name || '');
        } else {
          getDocument('clients', replyModal.client_id)
            .then((c: any) => { if (c?.email) sendReplyEmail(c.email, c.name || replyModal.client_name || ''); })
            .catch(() => {});
        }
      }
      toast.success('Réponse publiée');
      setReplyModal(null);
      load();
    } catch { toast.error('Erreur'); } finally { setReplySaving(false); }
  };

  const handlePublish = async (r: Review) => {
    try {
      await updateDocument('reviews', r.id, { status: 'published' });
      const vendorReviews = await getDocuments('reviews', [{ field: 'vendor_id', operator: '==', value: r.vendor_id }]);
      const published = (vendorReviews as any[]).filter((x: any) => x.status === 'published' || x.status === 'verified');
      const count = published.length;
      const avg = count > 0 ? Math.round(published.reduce((s: number, x: any) => s + (x.rating || 5), 0) / count * 10) / 10 : 0;
      await updateDocument('vendors', r.vendor_id, { rating: avg, reviewCount: count });
      toast.success('Avis publié');
      load();
    } catch { toast.error('Erreur'); }
  };

  const filtered = reviews.filter(r => filterRating === 0 || r.rating === filterRating);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const reviewPhoto = (r: Review) => r.client_photo || (r.client_id ? clientPhotos[r.client_id] : '') || '';

  const generateToken = () => {
    if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
      return (crypto as any).randomUUID();
    }
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  };

  const handleSendInvites = async () => {
    if (!user || !vendorInfo) return;
    const emails = inviteEmails
      .split(/[\n,;]+/)
      .map(e => e.trim())
      .filter(e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
    if (emails.length === 0) {
      toast.error('Veuillez saisir au moins un email valide');
      return;
    }
    setSendingInvites(true);
    let sent = 0;
    let failed = 0;
    const now = new Date().toISOString();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const vendorName = vendorInfo.name || 'votre prestataire';
    for (const email of emails) {
      try {
        const token = generateToken();
        await setDocument('review_invitations', token, {
          vendor_id: user.uid,
          email,
          token,
          used: false,
          created_at: now,
          expires_at: expiresAt,
          review_id: null,
        });
        const link = `${window.location.origin}/avis/${user.uid}?token=${encodeURIComponent(token)}`;
        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: email,
            subject: `${vendorName} vous invite à laisser votre avis`,
            html: renderReviewInvitationEmail({ vendorName, link }),
            text: `Bonjour, ${vendorName} vous invite à laisser un avis sur LeOui : ${link}`,
          }),
        });
        sent++;
      } catch {
        failed++;
      }
    }
    setSendingInvites(false);
    setInviteEmails('');
    if (failed) toast.warning(`${sent} invitation(s) envoyée(s), ${failed} échec(s)`);
    else toast.success(`${sent} invitation(s) envoyée(s)`);
    setInviteModal(false);
  };

  return (
    <PrestataireDashboardLayout>
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Espace prestataire</p>
            <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem, 2.5vw, 1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>Avis clients</h1>
            <p className="text-sm text-charcoal-500 mt-0.5">Consultez vos avis et répondez à vos clients.</p>
          </div>
          <button
            onClick={() => setInviteModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-full text-sm font-medium hover:bg-rose-700 transition-colors"
          >
            <Mail className="w-4 h-4" />
            Inviter par email
          </button>
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
            <button key={n} onClick={() => { setFilterRating(n); setPage(1); }}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterRating === n ? 'bg-rose-600 text-white' : 'bg-white text-charcoal-600 border border-stone-200 hover:bg-stone-50'}`}>
              {n === 0 ? 'Tous' : <><Star className="w-3 h-3 fill-current" /> {n}</>}
            </button>
          ))}
        </div>

        {/* Reviews list */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">{[1,2,3,4].map(i => <div key={i} className="h-56 bg-white rounded-2xl animate-pulse shadow-sm" />)}</div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
            <Star className="w-10 h-10 text-charcoal-200 mx-auto mb-3" />
            <p className="font-serif text-charcoal-700 text-lg mb-1">{filterRating > 0 ? 'Aucun avis pour cette note' : 'Aucun avis pour le moment'}</p>
            <p className="text-sm text-charcoal-400">Les avis de vos clients apparaîtront ici après leur réservation</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {paginated.map(r => {
                const photo = reviewPhoto(r);
                return (
                  <div key={r.id} className="bg-white rounded-2xl shadow-sm p-5 flex flex-col">
                    <div className="flex items-center gap-3 mb-3">
                      {photo ? (
                        <img src={photo} alt={r.client_name} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-champagne-200 to-rose-200 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-charcoal-700">{r.client_name.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-medium text-charcoal-900 text-sm truncate">{r.client_name}</p>
                        <p className="text-xs text-charcoal-400">{new Date(r.date).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <StarRow rating={r.rating} />
                      {r.status === 'pending' && (
                        <div className="flex items-center gap-1.5 ml-auto">
                          <span className="text-[10px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">En attente</span>
                          <button onClick={() => handlePublish(r)} className="text-[10px] text-green-700 bg-green-50 px-2 py-0.5 rounded-full hover:bg-green-100 transition-colors">Publier</button>
                        </div>
                      )}
                    </div>

                    {r.comment && (
                      <p className="text-sm text-charcoal-600 mb-3 leading-relaxed line-clamp-4 flex-1">&ldquo;{r.comment}&rdquo;</p>
                    )}

                    {/* Vendor reply */}
                    {r.vendor_reply ? (
                      <div className="bg-rose-50 rounded-xl p-3 border-l-2 border-rose-300 mt-auto">
                        <p className="text-xs font-semibold text-rose-700 mb-1">Votre réponse</p>
                        <p className="text-xs text-charcoal-600 line-clamp-3">{r.vendor_reply}</p>
                        <button onClick={() => openReply(r)} className="text-xs text-rose-600 hover:text-rose-700 mt-1.5 underline">Modifier</button>
                      </div>
                    ) : (
                      <button onClick={() => openReply(r)} className="flex items-center gap-1.5 text-xs text-rose-600 hover:text-rose-700 transition-colors mt-auto pt-1">
                        <MessageCircle className="w-3.5 h-3.5" /> Répondre à cet avis
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-charcoal-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Page précédente"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
                  <button
                    key={n}
                    onClick={() => setPage(n)}
                    className={`w-9 h-9 rounded-full text-sm font-medium transition-colors ${n === currentPage ? 'bg-rose-600 text-white' : 'bg-white border border-stone-200 text-charcoal-500 hover:border-rose-300 hover:text-rose-600'}`}
                  >
                    {n}
                  </button>
                ))}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="w-9 h-9 rounded-full bg-white border border-stone-200 flex items-center justify-center text-charcoal-500 hover:border-rose-300 hover:text-rose-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  aria-label="Page suivante"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite modal */}
      {inviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-stone-100">
              <h2 className="font-serif text-charcoal-900 text-lg" style={{ fontWeight: 400 }}>Inviter à laisser un avis</h2>
              <button onClick={() => setInviteModal(false)} className="p-1.5 rounded-lg hover:bg-stone-100 text-charcoal-400"><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6">
              <p className="text-sm text-charcoal-500 mb-3">Saisissez une ou plusieurs adresses email (séparées par des virgules, points-virgules ou retours à la ligne).</p>
              <textarea
                value={inviteEmails}
                onChange={(e) => setInviteEmails(e.target.value)}
                rows={5}
                placeholder="client1@email.com, client2@email.com"
                className="w-full px-4 py-3 bg-stone-50 border border-charcoal-200 rounded-xl text-sm resize-none focus:outline-none focus:border-rose-400 transition-colors"
              />
              <p className="text-xs text-charcoal-400 mt-2">Chaque invité recevra un lien unique valable 30 jours.</p>
            </div>
            <div className="flex gap-3 p-6 border-t border-stone-100">
              <button onClick={() => setInviteModal(false)} className="flex-1 px-4 py-2.5 border border-charcoal-200 text-charcoal-600 rounded-xl text-sm hover:bg-stone-50 transition-colors">Annuler</button>
              <button onClick={handleSendInvites} disabled={sendingInvites} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 disabled:opacity-50 transition-colors">
                <Send className="w-4 h-4" />{sendingInvites ? 'Envoi…' : 'Envoyer'}
              </button>
            </div>
          </div>
        </div>
      )}

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
