import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />
      <section className="bg-charcoal-900 py-16 text-center px-6">
        <h1 className="font-display text-display-md text-white mb-3">Conditions générales d'utilisation</h1>
        <p className="text-body-md text-white/60">Dernière mise à jour : janvier 2026</p>
      </section>
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto space-y-8">
          {[
            {
              title: '1. Objet',
              text: 'Les présentes conditions générales d\'utilisation régissent l\'accès et l\'utilisation de la plateforme LeOui (leoui.fr), qui met en relation des couples souhaitant organiser leur mariage avec des prestataires professionnels.',
            },
            {
              title: '2. Inscription et compte',
              text: 'L\'accès à certaines fonctionnalités nécessite la création d\'un compte. Vous vous engagez à fournir des informations exactes et à maintenir la confidentialité de vos identifiants. Vous êtes responsable de toute activité effectuée depuis votre compte.',
            },
            {
              title: '3. Utilisation du service',
              text: 'LeOui est une plateforme de mise en relation. Nous ne sommes pas partie aux contrats conclus entre les couples et les prestataires. Les transactions, devis et engagements sont établis directement entre les parties.',
            },
            {
              title: '4. Prestataires',
              text: 'Les prestataires inscrits sur LeOui sont des professionnels indépendants. LeOui procède à une vérification de leurs profils mais ne garantit pas la qualité finale des prestations. Les avis publiés reflètent l\'expérience des couples.',
            },
            {
              title: '5. Propriété intellectuelle',
              text: 'Le contenu de la plateforme (textes, images, marques, logos) est protégé par les droits de propriété intellectuelle. Toute reproduction sans autorisation expresse est interdite.',
            },
            {
              title: '6. Responsabilité',
              text: 'LeOui ne peut être tenu responsable des dommages résultant de l\'utilisation de la plateforme, d\'une interruption de service ou de la conduite des prestataires référencés.',
            },
            {
              title: '7. Modification des CGU',
              text: 'LeOui se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés de tout changement substantiel par e-mail ou notification sur la plateforme.',
            },
            {
              title: '8. Droit applicable',
              text: 'Les présentes CGU sont soumises au droit français. Tout litige sera soumis à la compétence des tribunaux français.',
            },
          ].map(({ title, text }) => (
            <div key={title}>
              <h2 className="font-serif text-heading-xl text-charcoal-900 mb-3" style={{ fontWeight: 500 }}>{title}</h2>
              <p className="text-body-md text-charcoal-600 leading-relaxed">{text}</p>
            </div>
          ))}
        </div>
      </section>
      <Footer />
    </div>
  );
}
