'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Clock, ArrowRight } from 'lucide-react';
import type { Article } from '@/lib/articles';

const ALL_CATS = ['Tous', 'Real Wedding', 'Tendances', 'Conseils', 'Décoration', 'Mode'];

export default function InspirationPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('Tous');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/public/articles', { cache: 'no-store' });
        const data = await res.json();
        if (res.ok && data?.ok && Array.isArray(data.articles)) {
          setArticles(data.articles as Article[]);
        }
      } catch { /* ignore */ }
      finally { setLoading(false); }
    })();
  }, []);

  const featured = articles.find((a) => a.featured) ?? articles[0];
  const rest = articles.filter((a) => a.id !== featured?.id);
  const filtered = activeCategory === 'Tous' ? rest : rest.filter((a) => a.category === activeCategory);

  const catCounts = ALL_CATS.map((c) => ({
    name: c,
    count: c === 'Tous' ? articles.length : articles.filter((a) => a.category === c).length,
  }));

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      <section className="py-16 px-4 bg-ivory-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 p-8 sm:p-10">
            <h1 className="font-display text-display-lg text-charcoal-900 mb-4">Inspiration Mariage</h1>
            <p className="text-body-lg text-charcoal-600 max-w-2xl mx-auto">
              Idées, tendances et vrais mariages pour imaginer le vôtre
            </p>
          </div>

          {/* Category filters */}
          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {catCounts.map(({ name, count }) => (
              <button
                key={name}
                onClick={() => setActiveCategory(name)}
                className={`px-6 py-2.5 rounded-full font-medium text-body-sm transition-all duration-200 ${
                  activeCategory === name
                    ? 'bg-rose-600 text-white shadow-soft'
                    : 'bg-white text-charcoal-700 hover:bg-stone-100 border border-charcoal-200'
                }`}
              >
                {name} {count > 0 && <span className={activeCategory === name ? 'text-white/70' : 'text-charcoal-500'}>({count})</span>}
              </button>
            ))}
          </div>

          <div className="relative z-10">
          {loading ? (
            <div className="flex justify-center py-24">
              <div className="w-8 h-8 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" />
            </div>
          ) : articles.length === 0 ? (
            <div className="text-center py-20 text-charcoal-400">
              <p className="text-lg mb-2">Aucun article pour le moment</p>
              <p className="text-sm">Revenez bientôt ou contactez un administrateur pour publier des articles.</p>
            </div>
          ) : (
            <>
              {/* Featured article */}
              {featured && activeCategory === 'Tous' && (
                <Link href={`/inspiration/${featured.id}`} className="group block mb-16">
                  <article className="relative h-[480px] sm:h-[600px] rounded-3xl overflow-hidden shadow-soft-xl">
                    <img
                      src={featured.imageUrl}
                      alt={featured.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
                    <div className="absolute bottom-0 left-0 right-0 p-8 sm:p-12">
                      <div className="max-w-3xl">
                        <div className="flex flex-wrap items-center gap-3 mb-4">
                          <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white text-xs font-semibold rounded-full">
                            {featured.category}
                          </span>
                          <span className="flex items-center text-white/80 text-sm gap-1.5">
                            <Clock className="w-4 h-4" />{featured.readTime}
                          </span>
                          <span className="text-white/60 text-sm">{featured.date}</span>
                        </div>
                        <h2 className="font-display text-2xl sm:text-display-md text-white mb-3 group-hover:text-champagne-200 transition-colors">
                          {featured.title}
                        </h2>
                        <p className="text-white/80 text-sm sm:text-body-lg mb-5 max-w-2xl line-clamp-2">
                          {featured.excerpt}
                        </p>
                        <span className="text-white font-medium flex items-center gap-2 text-sm">
                          Lire l&apos;article <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              )}

              {/* Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {filtered.map((article) => (
                  <Link key={article.id} href={`/inspiration/${article.id}`} className="group block">
                    <article className="card-elevated">
                      <div className="relative aspect-[4/3] overflow-hidden">
                        <img
                          src={article.imageUrl}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="px-3 py-1 bg-champagne-100 text-champagne-800 text-xs font-semibold rounded-full">
                            {article.category}
                          </span>
                          <span className="flex items-center text-charcoal-500 text-sm gap-1">
                            <Clock className="w-3.5 h-3.5" />{article.readTime}
                          </span>
                        </div>
                        <h3 className="font-serif text-heading-md text-charcoal-900 mb-2 group-hover:text-rose-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-body-md text-charcoal-600 mb-4 line-clamp-2">{article.excerpt}</p>
                        <div className="flex items-center justify-between">
                          <span className="text-body-sm text-charcoal-500">{article.date}</span>
                          <span className="text-rose-600 font-medium flex items-center gap-1 text-sm">
                            Lire <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                          </span>
                        </div>
                      </div>
                    </article>
                  </Link>
                ))}
              </div>

              {filtered.length === 0 && activeCategory !== 'Tous' && (
                <div className="text-center py-16 text-charcoal-400">
                  Aucun article dans cette catégorie pour le moment.
                </div>
              )}
            </>
          )}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gradient-rose">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-display-md text-charcoal-900 mb-6">Restez inspiré</h2>
          <p className="text-body-lg text-charcoal-700 mb-8">
            Recevez nos derniers articles et conseils directement dans votre boîte mail
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input type="email" placeholder="Votre adresse email" className="flex-1 input-field" />
            <button type="submit" className="btn-primary whitespace-nowrap">S&apos;abonner</button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
