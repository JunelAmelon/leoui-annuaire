import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-ivory-50">
      <Header />
      <section className="bg-charcoal-900 py-16 text-center px-6">
        <h1 className="font-display text-display-md text-white mb-3">Politique de confidentialité</h1>
        <p className="text-body-md text-white/60">Dernière mise à jour : janvier 2026</p>
      </section>
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto prose prose-charcoal space-y-8">
          {[
            {
              title: '1. Collecte des données',
              text: 'LeOui collecte des informations personnelles lorsque vous créez un compte, contactez un prestataire ou utilisez nos services. Ces informations incluent votre nom, adresse e-mail, numéro de téléphone et préférences de mariage.',
            },
            {
              title: '2. Utilisation des données',
              text: 'Vos données sont utilisées pour vous mettre en relation avec des prestataires, améliorer notre service, vous envoyer des communications pertinentes (avec votre consentement) et assurer la sécurité de votre compte.',
            },
            {
              title: '3. Partage des données',
              text: 'Nous ne vendons jamais vos données personnelles. Nous partageons uniquement les informations nécessaires avec les prestataires que vous contactez et avec nos sous-traitants techniques (hébergement, analyse) dans le cadre strict de nos services.',
            },
            {
              title: '4. Sécurité',
              text: 'Nous utilisons des mesures de sécurité techniques et organisationnelles pour protéger vos données contre tout accès non autorisé, perte ou divulgation, notamment le chiffrement SSL et l\'authentification Firebase.',
            },
            {
              title: '5. Cookies',
              text: 'Notre site utilise des cookies pour améliorer votre expérience de navigation, mémoriser vos préférences et analyser l\'utilisation du site. Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.',
            },
            {
              title: '6. Vos droits',
              text: 'Conformément au RGPD, vous disposez d\'un droit d\'accès, de rectification, de suppression et de portabilité de vos données. Pour exercer ces droits, contactez-nous à privacy@leoui.fr.',
            },
            {
              title: '7. Conservation',
              text: 'Vos données sont conservées pendant la durée de votre relation avec LeOui et jusqu\'à 3 ans après la clôture de votre compte, sauf obligation légale contraire.',
            },
            {
              title: '8. Contact',
              text: 'Pour toute question relative à notre politique de confidentialité, contactez notre délégué à la protection des données à privacy@leoui.fr ou par courrier à LeOui, 15 rue de la Paix, 75001 Paris.',
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
