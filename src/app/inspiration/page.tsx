import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Clock, ArrowRight, Bookmark } from 'lucide-react';

export default function InspirationPage() {
  const featured = {
    title: 'Mariage Romantique au Château de Provence',
    excerpt: 'Découvrez ce mariage élégant et intime célébré dans un château provençal, entre lavande et oliviers',
    imageUrl: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1200',
    category: 'Real Wedding',
    readTime: '8 min',
    date: 'Mars 2026',
  };

  const articles = [
    {
      title: 'Les tendances mariage 2026',
      excerpt: 'Découvrez les couleurs, styles et idées qui marqueront les mariages cette année',
      imageUrl: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800',
      category: 'Tendances',
      readTime: '5 min',
      date: 'Février 2026',
    },
    {
      title: 'Comment choisir son photographe',
      excerpt: 'Nos conseils pour trouver le photographe parfait qui saura immortaliser votre journée',
      imageUrl: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800',
      category: 'Conseils',
      readTime: '6 min',
      date: 'Février 2026',
    },
    {
      title: 'Mariage champêtre en Normandie',
      excerpt: 'Une célébration bucolique et authentique dans une ferme rénovée',
      imageUrl: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=800',
      category: 'Real Wedding',
      readTime: '7 min',
      date: 'Janvier 2026',
    },
    {
      title: 'Budget mariage : le guide complet',
      excerpt: 'Tout ce qu\'il faut savoir pour planifier et gérer le budget de votre mariage',
      imageUrl: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=800',
      category: 'Conseils',
      readTime: '10 min',
      date: 'Janvier 2026',
    },
    {
      title: 'Élégance parisienne : un mariage au Pavillon',
      excerpt: 'Un mariage sophistiqué dans un lieu d\'exception au cœur de Paris',
      imageUrl: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
      category: 'Real Wedding',
      readTime: '8 min',
      date: 'Décembre 2025',
    },
    {
      title: 'La checklist ultime du mariage',
      excerpt: 'Organisez votre mariage mois par mois avec notre guide complet',
      imageUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800',
      category: 'Conseils',
      readTime: '12 min',
      date: 'Décembre 2025',
    },
  ];

  const categories = [
    { name: 'Tous', count: 156 },
    { name: 'Real Weddings', count: 67 },
    { name: 'Tendances', count: 34 },
    { name: 'Conseils', count: 42 },
    { name: 'Décoration', count: 28 },
    { name: 'Mode', count: 21 },
  ];

  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="font-display text-display-lg text-charcoal-900 mb-4">
              Inspiration Mariage
            </h1>
            <p className="text-body-lg text-charcoal-600 max-w-2xl mx-auto">
              Idées, tendances et vrais mariages pour imaginer le vôtre
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-3 mb-12">
            {categories.map((cat, index) => (
              <button
                key={index}
                className={`px-6 py-2.5 rounded-full font-medium text-body-sm transition-all duration-200 ${
                  index === 0
                    ? 'bg-rose-600 text-white shadow-soft'
                    : 'bg-white text-charcoal-700 hover:bg-charcoal-50 border border-charcoal-200'
                }`}
              >
                {cat.name} <span className="text-charcoal-500">({cat.count})</span>
              </button>
            ))}
          </div>

          <Link href="/inspiration/article" className="group block mb-16">
            <article className="relative h-[600px] rounded-3xl overflow-hidden shadow-soft-xl hover:shadow-soft-xl transition-all duration-300">
              <img
                src={featured.imageUrl}
                alt={featured.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-12">
                <div className="max-w-3xl">
                  <div className="flex items-center space-x-4 mb-6">
                    <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white text-caption font-semibold rounded-full">
                      {featured.category}
                    </span>
                    <div className="flex items-center text-white/90 text-body-sm">
                      <Clock className="w-4 h-4 mr-2" />
                      {featured.readTime}
                    </div>
                    <span className="text-white/80 text-body-sm">{featured.date}</span>
                  </div>

                  <h2 className="font-display text-display-md text-white mb-4 group-hover:text-champagne-200 transition-colors">
                    {featured.title}
                  </h2>
                  <p className="text-body-lg text-white/95 mb-6 max-w-2xl">
                    {featured.excerpt}
                  </p>

                  <div className="flex items-center space-x-4">
                    <span className="text-white font-medium flex items-center space-x-2">
                      <span>Lire l'article</span>
                      <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </div>
            </article>
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {articles.map((article, index) => (
              <Link key={index} href="/inspiration/article" className="group block">
                <article className="card-elevated">
                  <div className="relative aspect-[4/3] overflow-hidden">
                    <img
                      src={article.imageUrl}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <button className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors opacity-0 group-hover:opacity-100">
                      <Bookmark className="w-5 h-5 text-charcoal-700" />
                    </button>
                  </div>

                  <div className="p-6">
                    <div className="flex items-center space-x-3 mb-3">
                      <span className="px-3 py-1 bg-champagne-100 text-champagne-800 text-caption font-semibold rounded-full">
                        {article.category}
                      </span>
                      <div className="flex items-center text-charcoal-500 text-body-sm">
                        <Clock className="w-4 h-4 mr-1" />
                        {article.readTime}
                      </div>
                    </div>

                    <h3 className="font-serif text-heading-md text-charcoal-900 mb-2 group-hover:text-rose-600 transition-colors">
                      {article.title}
                    </h3>
                    <p className="text-body-md text-charcoal-600 mb-4 line-clamp-2">
                      {article.excerpt}
                    </p>

                    <div className="flex items-center justify-between">
                      <span className="text-body-sm text-charcoal-500">{article.date}</span>
                      <span className="text-rose-600 font-medium flex items-center space-x-1 text-body-sm">
                        <span>Lire</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </span>
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <button className="btn-primary">
              Voir plus d'articles
            </button>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gradient-rose">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-display-md text-charcoal-900 mb-6">
            Restez inspiré
          </h2>
          <p className="text-body-lg text-charcoal-700 mb-8">
            Recevez nos derniers articles et conseils directement dans votre boîte mail
          </p>
          <form className="flex flex-col sm:flex-row gap-4 max-w-xl mx-auto">
            <input
              type="email"
              placeholder="Votre adresse email"
              className="flex-1 input-field"
            />
            <button type="submit" className="btn-primary whitespace-nowrap">
              S'abonner
            </button>
          </form>
        </div>
      </section>

      <Footer />
    </div>
  );
}
