export interface Article {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  imageUrl: string;
  category: string;
  readTime: string;
  date: string;
  published_at: string;
  author: string;
  authorRole: string;
  authorPhoto: string;
  featured: boolean;
  tags: string[];
  gallery: string[];
  quote?: string;
  quoteAuthor?: string;
  vendorsCredit?: { role: string; name: string }[];
  status: 'published' | 'draft';
  created_at: string;
  updated_at: string;
}

export const SEED_ARTICLES: Omit<Article, 'id'>[] = [
  {
    title: 'Mariage Romantique au Château de Provence',
    excerpt: 'Découvrez ce mariage élégant et intime célébré dans un château provençal, entre lavande et oliviers',
    content: `Sophie et Thomas se sont rencontrés il y a 6 ans lors d'un voyage en Provence. C'est donc tout naturellement qu'ils ont choisi de célébrer leur union dans cette région qui a marqué le début de leur histoire. Le Château de Beaumont, avec ses jardins à la française et sa vue sur les champs de lavande, était le cadre parfait pour leur mariage romantique et intime.

Le couple a souhaité créer une atmosphère à la fois élégante et décontractée, mélangeant le charme provençal avec une touche de sophistication moderne. Chaque détail a été pensé pour refléter leur personnalité et leur amour de la nature.

La décoration imaginée par la talentueuse fleuriste Marie Duval mêlait harmonieusement les teintes douces de rose poudré, de blanc crème et de vert olive. Les compositions florales, composées de roses anciennes, de pivoines et de branches d'olivier, apportaient une touche romantique et champêtre à l'ensemble.

Le repas, orchestré par le chef étoilé Laurent Beaumont, était un véritable voyage culinaire à travers la gastronomie provençale. De l'apéritif servi dans les jardins au dîner à la lueur des bougies, chaque moment était une célébration des saveurs du Sud de la France.

Ce mariage provençal restera gravé dans les mémoires comme une célébration parfaite de l'amour, de l'élégance et de l'art de vivre à la française.`,
    imageUrl: 'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=1200',
    category: 'Real Wedding',
    readTime: '8 min',
    date: 'Mars 2026',
    published_at: '2026-03-15T10:00:00.000Z',
    author: 'Emma Laurent',
    authorRole: 'Rédactrice en chef',
    authorPhoto: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=100',
    featured: true,
    tags: ['provence', 'château', 'romantique', 'fleurs'],
    gallery: [
      'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=1200',
    ],
    quote: 'Nous voulions que nos invités se sentent comme dans un rêve provençal, entourés de beauté naturelle et d\'élégance intemporelle.',
    quoteAuthor: 'Sophie & Thomas',
    vendorsCredit: [
      { role: 'Lieu', name: 'Château de Beaumont, Provence' },
      { role: 'Photographe', name: 'Atelier Lumière' },
      { role: 'Fleuriste', name: 'Maison Florale' },
      { role: 'Traiteur', name: 'Chef Laurent Beaumont' },
      { role: 'Wedding Planner', name: 'LeOui Events' },
    ],
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    title: 'Les tendances mariage 2026',
    excerpt: 'Découvrez les couleurs, styles et idées qui marqueront les mariages cette année',
    content: `L'année 2026 s'annonce riche en tendances mariage qui mêlent élégance intemporelle et modernité. Les couples recherchent plus que jamais l'authenticité et la personnalisation dans chaque détail de leur grand jour.

Du côté des couleurs, on assiste à un retour aux teintes naturelles et terreuses : beige, sage vert, terre de sienne et blanc cassé dominent les palettes de l'année. Ces nuances créent une atmosphère chaleureuse et organique qui s'harmonise parfaitement avec tous les types de lieux.

La décoration évolue vers plus de durabilité : fleurs séchées et pampa grass remplacent parfois les compositions fraîches, les éléments réutilisables prennent de l'importance, et les couples intègrent davantage la nature dans leur décoration.

Côté mode, les robes structurées à manches longues et les bustiers sculptés côtoient les créations fluides et romantiques. Les marié(e)s n'hésitent plus à se démarquer avec des tenues colorées pour la soirée.

La micro-cérémonie reste une tendance forte : moins d'invités, plus d'intimité, des budgets redistribués vers la qualité plutôt que la quantité. Cette tendance post-pandémique s'est installée durablement dans les habitudes.`,
    imageUrl: 'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Tendances',
    readTime: '5 min',
    date: 'Février 2026',
    published_at: '2026-02-10T09:00:00.000Z',
    author: 'Sophie Moreau',
    authorRole: 'Directrice artistique',
    authorPhoto: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
    featured: false,
    tags: ['tendances', '2026', 'décoration', 'mode'],
    gallery: [
      'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    title: 'Comment choisir son photographe',
    excerpt: 'Nos conseils pour trouver le photographe parfait qui saura immortaliser votre journée',
    content: `Le choix du photographe est l'une des décisions les plus importantes de votre mariage. Ces images resteront pour toujours le témoignage de votre grand jour — il vaut donc la peine d'y consacrer du temps et de la réflexion.

Commencez par définir votre style. Préférez-vous des photos reportage naturelles, des portraits artistiques, ou un mélange des deux ? Parcourez des galeries en ligne, créez un tableau Pinterest de vos photos préférées pour identifier vos envies.

La rencontre avec le photographe est indispensable. La compatibilité humaine est presque aussi importante que son portfolio. Vous passerez toute la journée ensemble — la chimie compte énormément.

Vérifiez toujours les contrats : nombre de photos livrées, délai de livraison, droits d'utilisation, politique d'annulation. Ne réservez jamais sans contrat écrit.

Anticipez votre réservation : les bons photographes se réservent 12 à 18 mois à l'avance, surtout pour les mariages en haute saison (mai à septembre).

N'oubliez pas de prévoir une timeline réaliste le jour J pour les séances photos, et communiquez vos contraintes (mobilité, invités qui n'aiment pas être photographiés) à l'avance.`,
    imageUrl: 'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Conseils',
    readTime: '6 min',
    date: 'Février 2026',
    published_at: '2026-02-05T09:00:00.000Z',
    author: 'Emma Laurent',
    authorRole: 'Rédactrice en chef',
    authorPhoto: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=100',
    featured: false,
    tags: ['photographe', 'conseils', 'choix', 'budget'],
    gallery: [],
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    title: 'Mariage champêtre en Normandie',
    excerpt: 'Une célébration bucolique et authentique dans une ferme rénovée',
    content: `Au cœur de la campagne normande, Julie et Pierre ont célébré leur union dans une ferme du XVIIIe siècle soigneusement rénovée. Entre poutres apparentes, pierres dorées et jardins fleuris, le décor était planté pour un mariage champêtre d'une beauté rare.

Le thème "garden party bohème" s'est décliné dans chaque détail : guirlandes lumineuses entre les arbres fruitiers, tables en bois brut garnies de fleurs sauvages, vaisselle dépareillée chinée, et paniers en osier pour accueillir les invités dès l'entrée.

La musique live d'un trio acoustique guitare-violon-accordéon a accompagné le cocktail, créant une atmosphère festive et poétique. Les convives ont pu se promener librement dans le verger, profiter des espaces détente aménagés dans les granges, ou s'essayer au photobooth rustique.

Le dîner a mis à l'honneur les produits du terroir normand : fromages, caramels, calvados en cocktail de bienvenue, et buffet de desserts artisanaux réalisés par une pâtissière locale.

Une journée qui a rappelé à tous les invités la beauté simple et authentique d'une France rurale et accueillante.`,
    imageUrl: 'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Real Wedding',
    readTime: '7 min',
    date: 'Janvier 2026',
    published_at: '2026-01-20T10:00:00.000Z',
    author: 'Thomas Petit',
    authorRole: 'Journaliste mariage',
    authorPhoto: '',
    featured: false,
    tags: ['champêtre', 'normandie', 'ferme', 'bohème'],
    gallery: [
      'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    title: 'Budget mariage : le guide complet',
    excerpt: 'Tout ce qu\'il faut savoir pour planifier et gérer le budget de votre mariage',
    content: `Planifier le budget de son mariage est l'une des étapes les plus redoutées des futurs mariés. Pourtant, avec une méthode claire et quelques règles de base, il est tout à fait possible de maîtriser ses dépenses sans renoncer à ses rêves.

La première étape est de définir votre enveloppe globale AVANT de commencer à planifier quoi que ce soit. Ce chiffre doit prendre en compte vos économies disponibles, la contribution éventuelle des familles et, si nécessaire, un éventuel crédit.

Répartition indicative d'un budget mariage en France :
- Lieu & traiteur : 40-50% du budget total
- Photographe & vidéaste : 10-15%
- Fleurs & décoration : 8-12%
- Musique & animation : 5-8%
- Tenues (robe, costume, accessoires) : 8-12%
- Faire-part & papeterie : 2-3%
- Transport : 2-3%
- Divers & imprévus (à prévoir absolument) : 5-10%

Quelques conseils pour optimiser votre budget : mariez-vous hors haute saison (octobre à mars) pour des tarifs 20 à 30% moins élevés. Préférez un jour de semaine si vous avez des invités flexibles. Demandez plusieurs devis et n'hésitez pas à négocier.

Utilisez un tableur ou l'outil de suivi budgétaire de votre espace couple pour tracker chaque dépense en temps réel.`,
    imageUrl: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Conseils',
    readTime: '10 min',
    date: 'Janvier 2026',
    published_at: '2026-01-10T09:00:00.000Z',
    author: 'Sophie Moreau',
    authorRole: 'Directrice artistique',
    authorPhoto: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100',
    featured: false,
    tags: ['budget', 'conseils', 'organisation', 'finances'],
    gallery: [],
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    title: 'Élégance parisienne : un mariage au Pavillon',
    excerpt: 'Un mariage sophistiqué dans un lieu d\'exception au cœur de Paris',
    content: `Paris a une fois de plus prouvé qu'elle est la capitale mondiale de l'amour, avec ce mariage d'une élégance rare célébré dans un pavillon haussmannien au cœur du 8e arrondissement.

Clara et Antoine ont voulu un mariage "black tie" dans la plus pure tradition parisienne : smokings sombres, robes du soir, champagne rosé et orchestre de jazz. La décoration s'est orientée vers un palette or, ivoire et noir, avec des compositions florales monumentales en roses blanches et feuillages dorés.

Le dîner gastronomique, servi en 7 temps, a été l'occasion de voyager à travers les saisons et les terroirs français. Chaque plat était accompagné d'une sélection de vins soigneusement choisie par le sommelier du lieu.

La soirée s'est prolongée jusqu'à l'aube, avec un DJ set progressif de la musique classique au jazz, puis à la pop internationale. Les invités se souviennent encore des feux d'artifice improvisés sur la terrasse donnant sur les toits de Paris.

Un mariage où chaque détail témoignait d'un soin et d'une exigence qui font la réputation de la haute réception parisienne.`,
    imageUrl: 'https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Real Wedding',
    readTime: '8 min',
    date: 'Décembre 2025',
    published_at: '2025-12-15T10:00:00.000Z',
    author: 'Emma Laurent',
    authorRole: 'Rédactrice en chef',
    authorPhoto: 'https://images.pexels.com/photos/1024311/pexels-photo-1024311.jpeg?auto=compress&cs=tinysrgb&w=100',
    featured: false,
    tags: ['paris', 'élégance', 'black-tie', 'pavillon'],
    gallery: [
      'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    title: 'La checklist ultime du mariage',
    excerpt: 'Organisez votre mariage mois par mois avec notre guide complet',
    content: `Organiser un mariage, c'est jongler avec des dizaines de prestataires, de délais et de décisions. Cette checklist vous guide mois par mois pour ne rien oublier.

**12 mois avant :**
Définir le budget, choisir la date, sélectionner le lieu, réserver le photographe et le traiteur. Ouvrir votre espace couple sur LeOui.

**9 mois avant :**
Choisir la robe et le costume, envoyer les save-the-dates, réserver DJ ou groupe musical, sélectionner le fleuriste.

**6 mois avant :**
Commander les faire-part, confirmer tous les prestataires, réserver les hébergements pour les invités, planifier la lune de miel.

**3 mois avant :**
Confirmation finale des menus, essayage robe, préparation des discours, organisation du transport, finaliser le plan de table.

**1 mois avant :**
Confirmer les derniers détails avec chaque prestataire, préparer les enveloppes de paiement, briefer les témoins, préparer le sac de la mariée.

**La semaine avant :**
Dernière répétition, livraison des alliances, confirmer les horaires exacts avec tous les prestataires, prendre du temps pour vous reposer.

N'oubliez pas : l'objectif est de profiter de votre journée. Faites confiance à votre équipe et lâchez prise !`,
    imageUrl: 'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=800',
    category: 'Conseils',
    readTime: '12 min',
    date: 'Décembre 2025',
    published_at: '2025-12-05T09:00:00.000Z',
    author: 'Thomas Petit',
    authorRole: 'Journaliste mariage',
    authorPhoto: '',
    featured: false,
    tags: ['checklist', 'organisation', 'planning', 'conseils'],
    gallery: [],
    status: 'published',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
