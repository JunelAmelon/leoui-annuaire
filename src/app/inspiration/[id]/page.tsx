'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Clock, Calendar, ArrowLeft, Share2, Check } from 'lucide-react';
import type { Article } from '@/lib/articles';

export default function ArticleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [article, setArticle] = useState<Article | null>(null);
  const [related, setRelated] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/public/articles/${id}`, { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data?.ok && data?.article) {
          setArticle(data.article as Article);

          const res2 = await fetch('/api/public/articles', { cache: 'no-store' });
          const data2 = await res2.json();
          if (res2.ok && data2?.ok && Array.isArray(data2.articles)) {
            setRelated(
              (data2.articles as Article[])
                .filter((a) => a.id !== id)
                .sort(() => Math.random() - 0.5)
                .slice(0, 3)
            );
          }
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, [id]);

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: article?.title || 'Article LeOui', url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex justify-center items-center min-h-[50vh]">
        <div className="w-8 h-8 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
      </div>
    </div>
  );

  if (!article) return (
    <div className="min-h-screen bg-white">
      <Header />
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-charcoal-500">Article introuvable.</p>
        <Link href="/inspiration" className="text-rose-600 hover:underline font-medium">
          ← Retour aux articles
        </Link>
      </div>
      <Footer />
    </div>
  );

  const paragraphs = article.content.split('\n\n').filter(Boolean);

  return (
    <div className="min-h-screen bg-white">
      <Header />

      <article className="py-12 px-4">
        <div className="max-w-4xl mx-auto">

          {/* Back */}
          <Link href="/inspiration" className="inline-flex items-center gap-2 text-charcoal-600 hover:text-rose-600 transition-colors mb-8">
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux articles</span>
          </Link>

          {/* Meta */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-4 mb-5">
              <span className="px-4 py-1.5 bg-champagne-100 text-champagne-800 text-xs font-semibold rounded-full">
                {article.category}
              </span>
              <span className="flex items-center text-charcoal-600 text-sm gap-1.5">
                <Clock className="w-4 h-4" />{article.readTime} de lecture
              </span>
              <span className="flex items-center text-charcoal-600 text-sm gap-1.5">
                <Calendar className="w-4 h-4" />{article.date}
              </span>
            </div>

            <h1 className="font-display text-display-lg text-charcoal-900 mb-5">{article.title}</h1>
            <p className="text-heading-sm text-charcoal-700 mb-7 leading-relaxed">{article.excerpt}</p>

            {/* Author + Share */}
            <div className="flex items-center justify-between py-5 border-y border-charcoal-200">
              <div className="flex items-center gap-3">
                {article.authorPhoto ? (
                  <img src={article.authorPhoto} alt={article.author} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-champagne-100 flex items-center justify-center">
                    <span className="font-serif text-champagne-700 font-semibold">{article.author.charAt(0)}</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-charcoal-900 text-sm">{article.author}</p>
                  <p className="text-xs text-charcoal-500">{article.authorRole}</p>
                </div>
              </div>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-charcoal-200 hover:bg-charcoal-50 transition-colors text-sm font-medium text-charcoal-700"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Lien copié !' : 'Partager'}
              </button>
            </div>
          </div>

          {/* Hero image */}
          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10 shadow-soft-lg">
            <img src={article.imageUrl} alt={article.title} className="w-full h-full object-cover" />
          </div>

          {/* Content */}
          <div className="prose prose-lg max-w-none">
            {paragraphs.map((para, i) => {
              if (article.quote && i === Math.floor(paragraphs.length / 2)) {
                return (
                  <div key={`q-${i}`}>
                    <blockquote className="border-l-4 border-rose-600 pl-6 py-4 my-8 bg-rose-50 rounded-r-xl">
                      <p className="text-heading-sm text-charcoal-900 italic mb-2">&ldquo;{article.quote}&rdquo;</p>
                      {article.quoteAuthor && (
                        <footer className="text-body-md text-charcoal-600">— {article.quoteAuthor}</footer>
                      )}
                    </blockquote>
                    <p key={i} className="text-body-lg text-charcoal-700 leading-relaxed mb-6">{para}</p>
                  </div>
                );
              }
              return <p key={i} className="text-body-lg text-charcoal-700 leading-relaxed mb-6">{para}</p>;
            })}

            {/* Gallery */}
            {article.gallery && article.gallery.length >= 2 && (
              <div className="grid grid-cols-2 gap-4 my-10">
                {article.gallery.slice(0, 2).map((img, i) => (
                  <div key={i} className="relative aspect-square rounded-xl overflow-hidden shadow-soft">
                    <img src={img} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {article.gallery && article.gallery.length >= 3 && (
              <div className="relative aspect-[16/9] rounded-2xl overflow-hidden my-10 shadow-soft-lg">
                <img src={article.gallery[2]} alt="Photo" className="w-full h-full object-cover" />
              </div>
            )}

            {/* Vendors credit */}
            {article.vendorsCredit && article.vendorsCredit.length > 0 && (
              <div className="bg-champagne-50 rounded-2xl p-6 my-8">
                <h4 className="font-serif text-charcoal-900 font-semibold mb-4 text-lg">Les prestataires</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {article.vendorsCredit.map((v, i) => (
                    <div key={i}>
                      <p className="font-semibold text-charcoal-900 text-sm mb-0.5">{v.role}</p>
                      <p className="text-charcoal-600 text-sm">{v.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Share bottom */}
          <div className="border-t border-charcoal-200 pt-6 mt-10">
            <div className="flex items-center gap-4">
              <span className="text-sm text-charcoal-600">Partager cet article :</span>
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg border border-charcoal-200 hover:bg-charcoal-50 transition-colors text-sm text-charcoal-700"
              >
                {copied ? <Check className="w-4 h-4 text-green-600" /> : <Share2 className="w-4 h-4" />}
                {copied ? 'Copié !' : 'Copier le lien'}
              </button>
            </div>
          </div>
        </div>
      </article>

      {/* Related articles */}
      {related.length > 0 && (
        <section className="py-16 px-4 bg-white">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display text-display-md text-charcoal-900 mb-8">Articles similaires</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {related.map((a) => (
                <Link key={a.id} href={`/inspiration/${a.id}`} className="group block card-elevated">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img src={a.imageUrl} alt={a.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  </div>
                  <div className="p-5">
                    <span className="px-3 py-1 bg-champagne-100 text-champagne-800 text-xs font-semibold rounded-full mb-3 inline-block">
                      {a.category}
                    </span>
                    <h3 className="font-serif text-charcoal-900 group-hover:text-rose-600 transition-colors text-base font-medium">
                      {a.title}
                    </h3>
                    <p className="text-sm text-charcoal-500 mt-1">{a.date}</p>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <Footer />
    </div>
  );
}
