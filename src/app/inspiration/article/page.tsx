import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Clock, Calendar, User, Share2, Bookmark, ArrowLeft } from 'lucide-react';

export default function ArticlePage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />

      <article className="py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <Link
            href="/inspiration"
            className="inline-flex items-center space-x-2 text-charcoal-600 hover:text-rose-600 transition-colors mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Retour aux articles</span>
          </Link>

          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-4 mb-6">
              <span className="px-4 py-1.5 bg-champagne-100 text-champagne-800 text-caption font-semibold rounded-full">
                Real Wedding
              </span>
              <div className="flex items-center text-charcoal-600 text-body-sm">
                <Clock className="w-4 h-4 mr-2" />
                8 min de lecture
              </div>
              <div className="flex items-center text-charcoal-600 text-body-sm">
                <Calendar className="w-4 h-4 mr-2" />
                15 mars 2026
              </div>
            </div>

            <h1 className="font-display text-display-lg text-charcoal-900 mb-6">
              Mariage Romantique au Château de Provence
            </h1>

            <p className="text-heading-sm text-charcoal-700 mb-8 leading-relaxed">
              Découvrez ce mariage élégant et intime célébré dans un château provençal,
              entre lavande et oliviers. Sophie et Thomas ont créé une journée inoubliable
              qui reflète parfaitement leur histoire d'amour.
            </p>

            <div className="flex items-center justify-between py-6 border-y border-charcoal-200">
              <div className="flex items-center space-x-3">
                <img
                  src="https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=100"
                  alt="Author"
                  className="w-12 h-12 rounded-full object-cover"
                />
                <div>
                  <p className="font-semibold text-charcoal-900">Emma Laurent</p>
                  <p className="text-body-sm text-charcoal-600">Rédactrice en chef</p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <button className="w-10 h-10 bg-white rounded-lg border border-charcoal-200 hover:bg-charcoal-50 flex items-center justify-center transition-colors">
                  <Bookmark className="w-5 h-5 text-charcoal-600" />
                </button>
                <button className="w-10 h-10 bg-white rounded-lg border border-charcoal-200 hover:bg-charcoal-50 flex items-center justify-center transition-colors">
                  <Share2 className="w-5 h-5 text-charcoal-600" />
                </button>
              </div>
            </div>
          </div>

          <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-12 shadow-soft-lg">
            <img
              src="https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1200"
              alt="Featured"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="prose prose-lg max-w-none">
            <h2 className="font-display text-display-md text-charcoal-900 mb-6 mt-12">
              L'histoire de Sophie & Thomas
            </h2>

            <p className="text-body-lg text-charcoal-700 leading-relaxed mb-6">
              Sophie et Thomas se sont rencontrés il y a 6 ans lors d'un voyage en Provence.
              C'est donc tout naturellement qu'ils ont choisi de célébrer leur union dans cette
              région qui a marqué le début de leur histoire. Le Château de Beaumont, avec ses
              jardins à la française et sa vue sur les champs de lavande, était le cadre parfait
              pour leur mariage romantique et intime.
            </p>

            <p className="text-body-lg text-charcoal-700 leading-relaxed mb-8">
              Le couple a souhaité créer une atmosphère à la fois élégante et décontractée,
              mélangeant le charme provençal avec une touche de sophistication moderne. Chaque
              détail a été pensé pour refléter leur personnalité et leur amour de la nature.
            </p>

            <div className="grid grid-cols-2 gap-4 my-12">
              <div className="relative aspect-square rounded-xl overflow-hidden shadow-soft">
                <img
                  src="https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Detail 1"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="relative aspect-square rounded-xl overflow-hidden shadow-soft">
                <img
                  src="https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=600"
                  alt="Detail 2"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <h2 className="font-display text-display-md text-charcoal-900 mb-6 mt-12">
              Une décoration entre élégance et nature
            </h2>

            <p className="text-body-lg text-charcoal-700 leading-relaxed mb-6">
              La décoration imaginée par la talentueuse fleuriste Marie Duval mêlait harmonieusement
              les teintes douces de rose poudré, de blanc crème et de vert olive. Les compositions
              florales, composées de roses anciennes, de pivoines et de branches d'olivier, apportaient
              une touche romantique et champêtre à l'ensemble.
            </p>

            <blockquote className="border-l-4 border-rose-600 pl-6 py-4 my-8 bg-rose-50 rounded-r-xl">
              <p className="text-heading-sm text-charcoal-900 italic mb-2">
                "Nous voulions que nos invités se sentent comme dans un rêve provençal, entourés de
                beauté naturelle et d'élégance intemporelle."
              </p>
              <footer className="text-body-md text-charcoal-600">— Sophie & Thomas</footer>
            </blockquote>

            <h2 className="font-display text-display-md text-charcoal-900 mb-6 mt-12">
              Un dîner sous les étoiles
            </h2>

            <p className="text-body-lg text-charcoal-700 leading-relaxed mb-6">
              Le repas, orchestré par le chef étoilé Laurent Beaumont, était un véritable voyage
              culinaire à travers la gastronomie provençale. De l'apéritif servi dans les jardins
              au dîner à la lueur des bougies, chaque moment était une célébration des saveurs
              du Sud de la France.
            </p>

            <div className="relative aspect-[16/9] rounded-2xl overflow-hidden my-12 shadow-soft-lg">
              <img
                src="https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=1200"
                alt="Dinner"
                className="w-full h-full object-cover"
              />
            </div>

            <h2 className="font-display text-display-md text-charcoal-900 mb-6 mt-12">
              Les prestataires
            </h2>

            <div className="bg-champagne-50 rounded-2xl p-8 my-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-charcoal-900 mb-2">Lieu</h4>
                  <p className="text-charcoal-700">Château de Beaumont, Provence</p>
                </div>
                <div>
                  <h4 className="font-semibold text-charcoal-900 mb-2">Photographe</h4>
                  <p className="text-charcoal-700">Atelier Lumière</p>
                </div>
                <div>
                  <h4 className="font-semibold text-charcoal-900 mb-2">Fleuriste</h4>
                  <p className="text-charcoal-700">Maison Florale</p>
                </div>
                <div>
                  <h4 className="font-semibold text-charcoal-900 mb-2">Traiteur</h4>
                  <p className="text-charcoal-700">Chef Laurent Beaumont</p>
                </div>
                <div>
                  <h4 className="font-semibold text-charcoal-900 mb-2">Wedding Planner</h4>
                  <p className="text-charcoal-700">LeOui Events</p>
                </div>
                <div>
                  <h4 className="font-semibold text-charcoal-900 mb-2">Robe de mariée</h4>
                  <p className="text-charcoal-700">Atelier Blanc Paris</p>
                </div>
              </div>
            </div>

            <p className="text-body-lg text-charcoal-700 leading-relaxed mb-6">
              Ce mariage provençal restera gravé dans les mémoires comme une célébration parfaite
              de l'amour, de l'élégance et de l'art de vivre à la française. Sophie et Thomas ont
              créé une journée qui leur ressemble, entourés de leurs proches dans un cadre
              idyllique.
            </p>
          </div>

          <div className="border-t border-charcoal-200 pt-8 mt-12">
            <div className="flex items-center space-x-4">
              <span className="text-body-sm text-charcoal-600">Partager cet article :</span>
              <div className="flex space-x-3">
                <button className="w-10 h-10 bg-white rounded-lg border border-charcoal-200 hover:bg-charcoal-50 flex items-center justify-center transition-colors">
                  <Share2 className="w-5 h-5 text-charcoal-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </article>

      <section className="py-16 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <h2 className="font-display text-display-md text-charcoal-900 mb-8">
            Articles similaires
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((i) => (
              <Link key={i} href="/inspiration/article" className="group block card-elevated">
                <div className="relative aspect-[4/3] overflow-hidden">
                  <img
                    src={`https://images.pexels.com/photos/${i === 1 ? '265722' : i === 2 ? '1024311' : '2253842'}/pexels-photo-${i === 1 ? '265722' : i === 2 ? '1024311' : '2253842'}.jpeg?auto=compress&cs=tinysrgb&w=600`}
                    alt="Article"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="p-6">
                  <h3 className="font-serif text-heading-md text-charcoal-900 group-hover:text-rose-600 transition-colors">
                    Article {i}
                  </h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
