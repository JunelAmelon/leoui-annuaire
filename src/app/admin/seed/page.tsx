'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { CheckCircle, Loader2, AlertCircle, Zap } from 'lucide-react';

const VENDORS = [
  {
    id: 'vendor-001',
    name: 'Atelier Lumière',
    tagline: 'Photographes de mariage passionnés · Paris & Île-de-France',
    category: 'Photographe',
    location: 'Paris, Île-de-France',
    description: 'Bienvenue chez Atelier Lumière, votre photographe de mariage basé à Paris. Anthony et Camille privilegient une collaboration approfondie avec les futurs mariés, s\'assurant de comprendre pleinement vos attentes pour ce jour si spécial.\n\nNotre style mêle photojournalisme délicat et portraits artistiques, capturant chaque émotion authentique de votre journée.',
    experience: '12 ans',
    weddingsCompleted: 320,
    startingPrice: '2 500 €',
    responseTime: '24h',
    rating: 4.9,
    tags: ['Photojournalisme', 'Portraits artistiques', 'Reportage', 'Destination mariage'],
    website: 'https://atelier-lumiere.fr',
    instagram: '@atelierlumiere',
    images: [
      'https://images.pexels.com/photos/2959192/pexels-photo-2959192.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1444442/pexels-photo-1444442.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/2253870/pexels-photo-2253870.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/265722/pexels-photo-265722.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/2253842/pexels-photo-2253842.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Formule Essentielle', price: '2 500 €', items: ['Reportage cérémonie (4h)', '300 photos retouchées', 'Galerie privée en ligne', 'Livraison sous 4 semaines'], popular: false },
      { name: 'Formule Premium', price: '3 800 €', items: ['Reportage journée complète (10h)', '600 photos retouchées', 'Album photo 30×30 cm', 'Séance engagement offerte', 'Galerie privée en ligne', 'Livraison sous 6 semaines'], popular: true },
    ],
    faqs: [
      { q: 'Combien de temps à l\'avance dois-je réserver ?', a: 'Nous recommandons de réserver au moins 12 à 18 mois à l\'avance, surtout pour les mariages en haute saison (mai–septembre).' },
      { q: 'Livrez-vous les photos en RAW ?', a: 'Non, nous livrons uniquement les photos retouchées en haute résolution. Les fichiers RAW font partie de notre processus créatif interne.' },
      { q: 'Êtes-vous disponibles pour les mariages à l\'étranger ?', a: 'Absolument ! Nous adorons les mariages destination. Des frais de déplacement s\'appliquent selon la destination.' },
    ],
    team: [
      { name: 'Anthony Moreau', role: 'Photographe principal', bio: 'Photographe depuis 12 ans, spécialisé dans les portraits et l\'émotion.', photo: 'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=200' },
      { name: 'Camille Petit', role: 'Photographe & post-production', bio: 'Artiste au regard unique, Camille apporte sensibilité et esthétisme à chaque image.', photo: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=200' },
    ],
    reportages: [
      { title: 'Mariage au Château de Vaux-le-Vicomte', date: 'Juin 2024', imageUrl: 'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=600' },
      { title: 'Cérémonie laïque en Provence', date: 'Septembre 2024', imageUrl: 'https://images.pexels.com/photos/1128782/pexels-photo-1128782.jpeg?auto=compress&cs=tinysrgb&w=600' },
    ],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-002',
    name: 'Fleurs & Merveilles',
    tagline: 'Fleuriste événementiel haut de gamme · Lyon',
    category: 'Fleuriste',
    location: 'Lyon, Auvergne-Rhône-Alpes',
    description: 'Fleurs & Merveilles crée des compositions florales sur mesure pour vos mariages et événements. Notre approche botanique et naturelle met en valeur les fleurs de saison pour des décors intemporels et élégants.\n\nDe la boutonnière du marié aux arches florales monumentales, chaque création est pensée comme une œuvre d\'art éphémère.',
    experience: '8 ans',
    weddingsCompleted: 180,
    startingPrice: '1 200 €',
    responseTime: '48h',
    rating: 4.8,
    tags: ['Fleurs de saison', 'Bohème chic', 'Romantique', 'Arche florale', 'Compositions sur mesure'],
    website: 'https://fleurs-merveilles.fr',
    instagram: '@fleursmerveilles',
    images: [
      'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/931162/pexels-photo-931162.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/931148/pexels-photo-931148.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/931139/pexels-photo-931139.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/931131/pexels-photo-931131.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Formule Essentielle', price: '1 200 €', items: ['Bouquet de mariée', 'Boutonnière marié', '6 bouquets demoiselles', 'Livraison sur site'], popular: false },
      { name: 'Formule Prestige', price: '3 500 €', items: ['Bouquet de mariée sur mesure', 'Arche florale', 'Déco tables invités', 'Boutonnières et cors', 'Pétales de cérémonie', 'Installation et démontage'], popular: true },
    ],
    faqs: [
      { q: 'Travaillez-vous uniquement avec des fleurs fraîches ?', a: 'Oui, nous utilisons exclusivement des fleurs fraîches. Pour les décorations longue durée, nous proposons aussi des fleurs séchées.' },
      { q: 'Puis-je apporter mes propres idées ?', a: 'Bien sûr ! Nous aimons co-créer avec nos clients. Un mood board est une excellente façon de partager votre vision.' },
    ],
    team: [
      { name: 'Isabelle Renard', role: 'Fleuriste principale & fondatrice', bio: 'Passionnée de botanique depuis l\'enfance, Isabelle transforme chaque pétale en poésie.', photo: '' },
    ],
    reportages: [
      { title: 'Mariage champêtre dans le Beaujolais', date: 'Juillet 2024', imageUrl: 'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=600' },
    ],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-003',
    name: 'Harmonie Traiteur',
    tagline: 'Gastronomie française pour vos mariages · Bordeaux',
    category: 'Traiteur',
    location: 'Bordeaux, Nouvelle-Aquitaine',
    description: 'Harmonie Traiteur propose une cuisine française raffinée pour vos mariages et événements privés. Nos chefs étoilés composent des menus sur mesure à partir de produits locaux et de saison.\n\nDu cocktail de bienvenue au dîner assis, chaque plat est une déclaration de saveurs et d\'élégance.',
    experience: '15 ans',
    weddingsCompleted: 250,
    startingPrice: '85 €/pers.',
    responseTime: '24h',
    rating: 4.9,
    tags: ['Cuisine française', 'Produits locaux', 'Menu sur mesure', 'Service à table', 'Cocktail'],
    website: 'https://harmonie-traiteur.fr',
    instagram: '@harmonietraiteur',
    images: [
      'https://images.pexels.com/photos/1640777/pexels-photo-1640777.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1410236/pexels-photo-1410236.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/958545/pexels-photo-958545.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1279330/pexels-photo-1279330.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/376464/pexels-photo-376464.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Menu Classique', price: '85 €/pers.', items: ['Cocktail dinatoire (8 pièces)', 'Entrée + plat + dessert', 'Vin et boissons inclus', 'Service 4h'], popular: false },
      { name: 'Menu Prestige', price: '145 €/pers.', items: ['Cocktail premium (12 pièces)', '4 plats + fromages', 'Pièce montée sur mesure', 'Champagne à discrétion', 'Maître d\'hôtel dédié', 'Service 8h'], popular: true },
    ],
    faqs: [
      { q: 'Proposez-vous des options végétariennes ou véganes ?', a: 'Oui, nous adaptons nos menus à toutes les préférences alimentaires. Merci de nous en informer lors de votre devis.' },
      { q: 'Quel est le minimum de convives ?', a: 'Nous intervenons à partir de 30 personnes pour les mariages.' },
    ],
    team: [],
    reportages: [],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-004',
    name: 'DJ Maxime Events',
    tagline: 'Animation musicale & DJ mariage · Marseille',
    category: 'DJ & Animation',
    location: 'Marseille, Provence-Alpes-Côte d\'Azur',
    description: 'DJ Maxime Events fait danser vos invités depuis plus de 10 ans. Spécialisé dans les mariages, Maxime propose une animation musicale sur mesure, de la cérémonie à la soirée.\n\nRépertoire varié (pop, house, R&B, latino, classics), sono professionnelle et éclairage scénique inclus.',
    experience: '10 ans',
    weddingsCompleted: 400,
    startingPrice: '1 800 €',
    responseTime: '12h',
    rating: 4.7,
    tags: ['DJ mariage', 'Sono professionnelle', 'Éclairage', 'Animation', 'Soirée dansante'],
    website: '',
    instagram: '@djmaximeevents',
    images: [
      'https://images.pexels.com/photos/1763067/pexels-photo-1763067.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1190297/pexels-photo-1190297.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1540406/pexels-photo-1540406.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/2747449/pexels-photo-2747449.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/2608517/pexels-photo-2608517.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Soirée Standard', price: '1 800 €', items: ['DJ 5h', 'Sono professionnelle', 'Éclairage de base', 'Playlist personnalisée'], popular: false },
      { name: 'Soirée Premium', price: '2 800 €', items: ['DJ journée complète (8h)', 'Sono haute puissance', 'Show LED & effets spéciaux', 'Micro HF pour discours', 'Playlist partagée en ligne', 'Machine à fumée'], popular: true },
    ],
    faqs: [
      { q: 'Puis-je choisir les musiques ?', a: 'Oui, une playlist collaborative est partagée avant le mariage. Je m\'adapte aussi aux demandes en live.' },
      { q: 'Apportez-vous votre matériel ?', a: 'Tout le matériel sono et lumière est fourni. J\'arrive 2h avant pour l\'installation.' },
    ],
    team: [],
    reportages: [],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-005',
    name: 'Château des Roses',
    tagline: 'Domaine viticole & salle de réception · Bordeaux',
    category: 'Salle & Domaine',
    location: 'Saint-Émilion, Gironde',
    description: 'Le Château des Roses est un domaine viticole exceptionnel au cœur de Saint-Émilion. Ses 15 hectares de vignes, son chai du XVIIIe siècle et son parc arboré offrent un cadre de rêve pour votre mariage.\n\nCapacité de 200 personnes en intérieur, 400 en extérieur. Hébergement sur place disponible.',
    experience: '20 ans',
    weddingsCompleted: 150,
    startingPrice: '8 000 €',
    responseTime: '48h',
    rating: 5.0,
    tags: ['Domaine viticole', 'Châtelain', 'Parc', 'Hébergement', 'Exclusivité'],
    website: 'https://chateau-des-roses.fr',
    instagram: '@chateaudesroses',
    images: [
      'https://images.pexels.com/photos/1488313/pexels-photo-1488313.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1454360/pexels-photo-1454360.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/587741/pexels-photo-587741.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1269046/pexels-photo-1269046.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/169211/pexels-photo-169211.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Journée Simple', price: '8 000 €', items: ['Location salle principale (jusqu\'à 200 pers.)', 'Parc privatisé', 'Tables et chaises incluses', 'Accès cuisine professionnelle', 'Parking 100 places'], popular: false },
      { name: 'Week-end Exclusif', price: '18 000 €', items: ['Privatisation totale 48h', 'Hébergement 15 chambres', 'Visite du domaine viticole', 'Dégustation vins incluse', 'Décoration de base incluse', 'Coordinateur sur place'], popular: true },
    ],
    faqs: [
      { q: 'Peut-on apporter son propre traiteur ?', a: 'Oui, nous travaillons avec des traiteurs agréés. Une liste vous sera fournie après confirmation.' },
      { q: 'Y a-t-il un hébergement sur place ?', a: 'Oui, le domaine dispose de 15 chambres pouvant accueillir jusqu\'à 30 personnes.' },
    ],
    team: [],
    reportages: [
      { title: 'Mariage princier aux vignes', date: 'Août 2024', imageUrl: 'https://images.pexels.com/photos/1488313/pexels-photo-1488313.jpeg?auto=compress&cs=tinysrgb&w=600' },
    ],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-006',
    name: 'Sublime Wedding Planner',
    tagline: 'Organisation & coordination de mariages · Paris',
    category: 'Wedding Planner',
    location: 'Paris & Toute la France',
    description: 'Sublime Wedding Planner accompagne les futurs mariés de la première idée au dernier sourire. Notre équipe de 5 coordinatrices expérimentées gère chaque détail logistique pour que vous profitiez pleinement de votre journée.\n\nCoordination le jour J, gestion des prestataires, création de rétroplanning sur mesure.',
    experience: '9 ans',
    weddingsCompleted: 210,
    startingPrice: '2 000 €',
    responseTime: '24h',
    rating: 4.9,
    tags: ['Organisation complète', 'Coordination jour J', 'Budget', 'Logistique', 'Prestataires'],
    website: 'https://sublime-wp.fr',
    instagram: '@sublimeweddingplanner',
    images: [
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1128782/pexels-photo-1128782.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1616113/pexels-photo-1616113.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/931177/pexels-photo-931177.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1024993/pexels-photo-1024993.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Coordination Jour J', price: '2 000 €', items: ['Réunion préparatoire (3h)', 'Coordination le jour du mariage', 'Gestion prestataires', 'Rétroplanning complet', 'Assistance 12h'], popular: false },
      { name: 'Organisation Complète', price: '5 500 €', items: ['Accompagnement 12 mois', 'Sélection prestataires', 'Suivi budget en temps réel', 'Coordination complète jour J', 'Gestion invitations', 'Seating plan'], popular: true },
    ],
    faqs: [
      { q: 'Intervenez-vous dans toute la France ?', a: 'Oui, nous nous déplaçons partout en France. Des frais de déplacement peuvent s\'appliquer.' },
      { q: 'Comment se passe la première rencontre ?', a: 'Un appel découverte gratuit de 30 minutes est proposé avant tout engagement.' },
    ],
    team: [
      { name: 'Sophie Martin', role: 'Wedding Planner principale', bio: 'Coordinatrice passionnée avec 9 ans d\'expérience dans l\'événementiel haut de gamme.', photo: '' },
      { name: 'Clara Dumont', role: 'Assistante coordinatrice', bio: 'Spécialiste de la logistique et des relations prestataires.', photo: '' },
    ],
    reportages: [],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-007',
    name: 'Sweet Dreams Pâtisserie',
    tagline: 'Pièces montées & gâteaux de mariage · Nantes',
    category: 'Pâtissier',
    location: 'Nantes, Pays de la Loire',
    description: 'Sweet Dreams Pâtisserie crée des pièces montées et wedding cakes d\'exception. Chaque gâteau est une œuvre unique, confectionné artisanalement avec des ingrédients premium.\n\nDesigns sur mesure, dégustation incluse dans chaque devis, livraison et installation sur site.',
    experience: '7 ans',
    weddingsCompleted: 280,
    startingPrice: '450 €',
    responseTime: '48h',
    rating: 4.8,
    tags: ['Wedding cake', 'Pièce montée', 'Naked cake', 'Sans gluten', 'Dégustation'],
    website: 'https://sweetdreams-patisserie.fr',
    instagram: '@sweetdreamspatisserie',
    images: [
      'https://images.pexels.com/photos/1055272/pexels-photo-1055272.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/291528/pexels-photo-291528.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1702373/pexels-photo-1702373.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1291712/pexels-photo-1291712.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1028714/pexels-photo-1028714.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Wedding Cake Classic', price: '450 €', items: ['Gâteau 3 étages (50 pers.)', '2 saveurs au choix', 'Décoration fleurs fraîches', 'Livraison incluse'], popular: false },
      { name: 'Wedding Cake Prestige', price: '850 €', items: ['Pièce montée 5 étages (100 pers.)', '3 saveurs sur mesure', 'Décoration personnalisée', 'Dégustation préalable incluse', 'Livraison + installation'], popular: true },
    ],
    faqs: [
      { q: 'Proposez-vous des options sans gluten ou vegan ?', a: 'Oui, nous proposons des alternatives pour toutes les intolérances. Le goût reste identique !' },
      { q: 'Quand doit-on commander ?', a: 'Minimum 3 mois avant le mariage. Pour les formules sur mesure, 6 mois sont recommandés.' },
    ],
    team: [],
    reportages: [],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-008',
    name: 'Voix d\'Or',
    tagline: 'Chanteuse & groupe de musique live · Toulouse',
    category: 'Musicien',
    location: 'Toulouse, Occitanie',
    description: 'Voix d\'Or propose des prestations musicales live pour vos mariages et cérémonies. Laëtitia et son quartet acoustique créent une atmosphère inoubliable du vin d\'honneur à la soirée.\n\nRépertoire : jazz, variété française, pop internationale, musique classique.',
    experience: '11 ans',
    weddingsCompleted: 160,
    startingPrice: '1 500 €',
    responseTime: '24h',
    rating: 4.9,
    tags: ['Live music', 'Jazz', 'Variété', 'Quartet', 'Cérémonie', 'Cocktail'],
    website: 'https://voixdor-music.fr',
    instagram: '@voixdormusic',
    images: [
      'https://images.pexels.com/photos/1105666/pexels-photo-1105666.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1656684/pexels-photo-1656684.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/1174732/pexels-photo-1174732.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/210764/pexels-photo-210764.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/164693/pexels-photo-164693.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Duo Acoustique', price: '1 500 €', items: ['2 musiciens (3h)', 'Répertoire personnalisé', 'Sono légère incluse', 'Vin d\'honneur ou cérémonie'], popular: false },
      { name: 'Quartet Complet', price: '3 200 €', items: ['4 musiciens (6h)', 'Cérémonie + cocktail + dîner', 'Répertoire sur mesure', 'Sono professionnelle', 'Chanteuse soliste incluse'], popular: true },
    ],
    faqs: [
      { q: 'Pouvez-vous apprendre une chanson spéciale ?', a: 'Oui, nous préparons la chanson de votre choix pour la cérémonie ou le premier dance moyennant un supplément.' },
    ],
    team: [
      { name: 'Laëtitia Vidal', role: 'Chanteuse & directrice artistique', bio: 'Chanteuse professionnelle diplômée du Conservatoire de Toulouse.', photo: '' },
    ],
    reportages: [],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-009',
    name: 'Élégance Coiffure & Beauté',
    tagline: 'Coiffure & maquillage mariage à domicile · Lille',
    category: 'Coiffure & Beauté',
    location: 'Lille, Hauts-de-France',
    description: 'Élégance Coiffure & Beauté se déplace directement chez vous le jour J pour des prestations coiffure et maquillage haut de gamme. Notre équipe de 4 artistes beauté prend en charge la mariée et tout son cortège.\n\nEssai obligatoire inclus dans chaque formule. Produits professionnels longue tenue garantis.',
    experience: '6 ans',
    weddingsCompleted: 320,
    startingPrice: '350 €',
    responseTime: '24h',
    rating: 4.8,
    tags: ['Maquillage', 'Coiffure', 'À domicile', 'Essai inclus', 'Cortège'],
    website: '',
    instagram: '@elegancecoiffurebeaute',
    images: [
      'https://images.pexels.com/photos/3738379/pexels-photo-3738379.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/3764119/pexels-photo-3764119.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/3373736/pexels-photo-3373736.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/3985329/pexels-photo-3985329.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/3993449/pexels-photo-3993449.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Mariée Seule', price: '350 €', items: ['Essai coiffure + maquillage', 'Jour J : coiffure + maquillage', 'Retouches en cours de journée', 'Déplacement inclus (50km)'], popular: false },
      { name: 'Mariée + Cortège', price: '750 €', items: ['Essai mariée inclus', 'Coiffure + maquillage mariée', 'Coiffure + maquillage 3 demoiselles', '2 artistes présentes', 'Produits fixants fournis'], popular: true },
    ],
    faqs: [
      { q: 'Combien de temps dure la prestation le jour J ?', a: 'Comptez 1h30 pour la mariée et 45min par personne du cortège.' },
    ],
    team: [],
    reportages: [],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'vendor-010',
    name: 'Ciné Mariage Films',
    tagline: 'Vidéaste & films de mariage cinématiques · Nice',
    category: 'Vidéaste',
    location: 'Nice, Côte d\'Azur',
    description: 'Ciné Mariage Films capture votre mariage comme un véritable film. Style cinématique, drone, ralentis, ambiance sonore soignée : chaque film est une histoire unique que vous pourrez revivre toute votre vie.\n\nLivraison en 4K. Bande annonce courte (2min) et film complet (20-30min) inclus.',
    experience: '8 ans',
    weddingsCompleted: 190,
    startingPrice: '2 200 €',
    responseTime: '48h',
    rating: 4.9,
    tags: ['Cinématique', 'Drone', '4K', 'Ralentis', 'Bande annonce', 'Film complet'],
    website: 'https://cinemariage.fr',
    instagram: '@cinemariage',
    images: [
      'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=1200',
      'https://images.pexels.com/photos/1779487/pexels-photo-1779487.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/2531546/pexels-photo-2531546.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/3379926/pexels-photo-3379926.jpeg?auto=compress&cs=tinysrgb&w=600',
      'https://images.pexels.com/photos/3379936/pexels-photo-3379936.jpeg?auto=compress&cs=tinysrgb&w=600',
    ],
    packages: [
      { name: 'Film Essentiel', price: '2 200 €', items: ['Tournage journée complète', 'Bande annonce 2min', 'Film complet 20min', 'Livraison en 4K', 'Galerie en ligne'], popular: false },
      { name: 'Film Cinéma', price: '3 900 €', items: ['2 vidéastes', 'Drone aérien', 'Bande annonce 3min', 'Film complet 30min', 'Highlights Instagram', 'Livraison en 4K + clé USB'], popular: true },
    ],
    faqs: [
      { q: 'En combien de temps livrez-vous le film ?', a: 'La bande annonce est livrée sous 4 semaines, le film complet sous 3 mois.' },
      { q: 'Utilisez-vous un drone ?', a: 'Oui, nous sommes certifiés télépilotes. Le drone est inclus dans la formule Cinéma.' },
    ],
    team: [
      { name: 'Thomas Laurent', role: 'Vidéaste & réalisateur', bio: 'Passionné de cinéma depuis toujours, Thomas met son œil de réalisateur au service de votre histoire.', photo: '' },
    ],
    reportages: [
      { title: 'Mariage sur la Côte d\'Azur', date: 'Juillet 2024', imageUrl: 'https://images.pexels.com/photos/3379934/pexels-photo-3379934.jpeg?auto=compress&cs=tinysrgb&w=600' },
    ],
    status: 'active',
    updatedAt: new Date().toISOString(),
  },
];

interface SeedResult { id: string; name: string; email: string; password: string; ok: boolean; error?: string; }
type SeedStatus = 'idle' | 'running' | 'done' | 'error';

export default function AdminSeedPage() {
  const [status, setStatus] = useState<SeedStatus>('idle');
  const [results, setResults] = useState<SeedResult[]>([]);
  const [error, setError] = useState('');

  const runSeed = async (deleteAll: boolean) => {
    setStatus('running');
    setResults([]);
    setError('');
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) { setStatus('error'); setError('Connectez-vous en tant qu\'admin.'); return; }

      const res = await fetch('/api/admin/vendors-seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ vendors: VENDORS, deleteAll }),
      });
      const data = await res.json();
      if (!res.ok || !data?.results) { setStatus('error'); setError(data?.error || 'Erreur'); return; }

      const r = data.results as SeedResult[];
      setResults(r);
      const hasError = r.some(x => !x.ok);
      setStatus(hasError ? 'error' : 'done');
      if (hasError) setError(r.find(x => !x.ok)?.error || 'Certains comptes ont échoué');
    } catch (e: any) {
      setStatus('error');
      setError(e?.message || 'Erreur');
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <p className="text-xs text-charcoal-400 uppercase tracking-wider mb-1">Administration</p>
        <h1 className="font-serif text-charcoal-900" style={{ fontSize: 'clamp(1.4rem,2.5vw,1.8rem)', fontWeight: 400, letterSpacing: '-0.01em' }}>
          Seed Prestataires
        </h1>
        <p className="text-sm text-charcoal-500 mt-1">
          Crée {VENDORS.length} comptes Firebase Auth + profils Firestore. Mot de passe commun : <code className="px-1.5 py-0.5 bg-stone-100 rounded text-rose-700 font-mono text-xs">LeOui2024!</code>
        </p>
      </div>

      {/* Vendor preview */}
      <div className="bg-white rounded-2xl border border-charcoal-100 shadow-soft overflow-hidden">
        <div className="px-5 py-3 border-b border-charcoal-100 bg-stone-50">
          <p className="text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Prestataires à créer</p>
        </div>
        <div className="divide-y divide-charcoal-50">
          {VENDORS.map((v, i) => {
            const r = results.find(x => x.name === v.name);
            return (
              <div key={v.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                <span className="w-5 h-5 bg-stone-100 text-charcoal-500 rounded-full text-[10px] flex items-center justify-center font-mono flex-shrink-0">{i+1}</span>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-charcoal-900">{v.name}</span>
                  <span className="text-charcoal-400 ml-2">{v.category} · {v.location.split(',')[0]}</span>
                </div>
                {r ? (
                  r.ok
                    ? <span className="text-xs text-green-600 font-medium flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> OK</span>
                    : <span className="text-xs text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" /> {r.error?.slice(0,40)}</span>
                ) : status === 'running'
                  ? <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                  : null}
              </div>
            );
          })}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />{error}
        </div>
      )}

      {/* Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={() => runSeed(true)} disabled={status === 'running'}
          className="flex items-center gap-2 px-5 py-3 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors">
          {status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
          Supprimer tout + Re-seeder avec comptes
        </button>
        <button onClick={() => runSeed(false)} disabled={status === 'running'}
          className="flex items-center gap-2 px-5 py-3 border border-charcoal-200 hover:bg-stone-50 disabled:opacity-50 text-charcoal-700 text-sm font-medium rounded-xl transition-colors">
          Seed sans suppression
        </button>
      </div>

      {/* Credentials table */}
      {status === 'done' && results.length > 0 && (
        <div className="bg-white rounded-2xl border border-green-200 shadow-soft overflow-hidden">
          <div className="px-5 py-3 border-b border-green-100 bg-green-50 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <p className="text-sm font-semibold text-green-800">{results.filter(r=>r.ok).length}/{results.length} comptes créés — Identifiants de connexion</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-charcoal-100 bg-stone-50">
                  <th className="text-left px-4 py-2 text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Prestataire</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Email</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Mot de passe</th>
                  <th className="text-left px-4 py-2 text-xs font-semibold text-charcoal-500 uppercase tracking-wider">Profil public</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal-50">
                {results.filter(r => r.ok).map(r => (
                  <tr key={r.id} className="hover:bg-stone-50">
                    <td className="px-4 py-2.5 font-medium text-charcoal-900">{r.name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-charcoal-700">{r.email}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-rose-700">{r.password}</td>
                    <td className="px-4 py-2.5">
                      <a href={`/vendors/${r.id}`} target="_blank" rel="noopener noreferrer"
                        className="text-xs text-rose-600 hover:underline font-mono">/vendors/{r.id.slice(0,8)}…</a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
