export const VENDOR_CATEGORIES = [
  'Photographe',
  'Vidéaste',
  'Traiteur',
  'Fleuriste',
  'DJ & Musicien',
  'Décorateur',
  'Wedding Planner',
  'Lieu de réception',
  'Coiffeur & Maquilleur',
  'Autre',
] as const;

export type VendorCategory = typeof VENDOR_CATEGORIES[number];

export interface ServicePrestation {
  description: string;
  unit_price: number;
  unit?: string;
}

export const DEFAULT_SERVICES: Record<string, ServicePrestation[]> = {
  'Photographe': [
    { description: 'Couverture complète du mariage (préparatifs à soirée)', unit_price: 2500, unit: 'forfait' },
    { description: 'Séance engagement (2h)', unit_price: 350, unit: 'séance' },
    { description: 'Album photo premium 30x30cm (40 pages)', unit_price: 450, unit: 'unité' },
    { description: 'Tirages haute résolution (toutes photos retouchées)', unit_price: 200, unit: 'forfait' },
    { description: 'Séance Day After (2h)', unit_price: 400, unit: 'séance' },
  ],
  'Vidéaste': [
    { description: 'Film de mariage complet (8-12 min)', unit_price: 2200, unit: 'forfait' },
    { description: 'Teaser réseaux sociaux (1-2 min)', unit_price: 300, unit: 'vidéo' },
    { description: 'Captation cérémonie laïque intégrale', unit_price: 400, unit: 'prestation' },
    { description: 'Drone (séquences aériennes)', unit_price: 350, unit: 'forfait' },
    { description: 'Livraison clé USB personnalisée', unit_price: 80, unit: 'unité' },
  ],
  'Traiteur': [
    { description: 'Menu complet (entrée, plat, dessert)', unit_price: 85, unit: 'personne' },
    { description: 'Cocktail de bienvenue (4 pièces salées + 2 sucrées)', unit_price: 18, unit: 'personne' },
    { description: 'Vin d\'honneur (buffet chaud et froid)', unit_price: 35, unit: 'personne' },
    { description: 'Pièce montée ou wedding cake (3 étages)', unit_price: 450, unit: 'pièce' },
    { description: 'Service et personnel (serveurs, chef)', unit_price: 25, unit: 'personne' },
  ],
  'Fleuriste': [
    { description: 'Bouquet de mariée (roses et pivoines)', unit_price: 180, unit: 'bouquet' },
    { description: 'Boutonnière marié et témoins', unit_price: 15, unit: 'pièce' },
    { description: 'Décoration florale cérémonie (arche + allée)', unit_price: 800, unit: 'ensemble' },
    { description: 'Centres de table (composition florale)', unit_price: 45, unit: 'table' },
    { description: 'Décoration voiture des mariés', unit_price: 120, unit: 'véhicule' },
  ],
  'DJ & Musicien': [
    { description: 'Animation DJ soirée complète (6h)', unit_price: 1200, unit: 'soirée' },
    { description: 'Sonorisation cérémonie laïque', unit_price: 300, unit: 'prestation' },
    { description: 'Éclairage scénique (jeux de lumières)', unit_price: 400, unit: 'forfait' },
    { description: 'Groupe live (cocktail ou vin d\'honneur, 2h)', unit_price: 800, unit: 'prestation' },
    { description: 'Matériel supplémentaire (enceintes, micros)', unit_price: 150, unit: 'forfait' },
  ],
  'Décorateur': [
    { description: 'Décoration complète salle de réception', unit_price: 1800, unit: 'forfait' },
    { description: 'Arche cérémonie (structure + décoration)', unit_price: 450, unit: 'pièce' },
    { description: 'Chemin de table et nappage premium', unit_price: 12, unit: 'table' },
    { description: 'Photobooth personnalisé (accessoires + fond)', unit_price: 350, unit: 'forfait' },
    { description: 'Signalétique personnalisée (panneaux, plan de table)', unit_price: 200, unit: 'ensemble' },
  ],
  'Wedding Planner': [
    { description: 'Coordination jour J (présence 12h)', unit_price: 1500, unit: 'journée' },
    { description: 'Accompagnement complet (de A à Z)', unit_price: 3500, unit: 'forfait' },
    { description: 'Recherche et sélection prestataires', unit_price: 800, unit: 'forfait' },
    { description: 'Gestion planning et rétro-planning', unit_price: 400, unit: 'prestation' },
    { description: 'Conseil décoration et scénographie', unit_price: 350, unit: 'séance' },
  ],
  'Lieu de réception': [
    { description: 'Location salle de réception (journée complète)', unit_price: 2500, unit: 'journée' },
    { description: 'Hébergement invités (chambre double)', unit_price: 120, unit: 'nuit' },
    { description: 'Salle cérémonie laïque (extérieur)', unit_price: 500, unit: 'forfait' },
    { description: 'Mise à disposition cuisine professionnelle', unit_price: 300, unit: 'journée' },
    { description: 'Ménage et remise en état', unit_price: 250, unit: 'forfait' },
  ],
  'Coiffeur & Maquilleur': [
    { description: 'Coiffure mariée (essai + jour J)', unit_price: 180, unit: 'prestation' },
    { description: 'Maquillage mariée (essai + jour J)', unit_price: 150, unit: 'prestation' },
    { description: 'Coiffure demoiselles d\'honneur', unit_price: 60, unit: 'personne' },
    { description: 'Maquillage invitées', unit_price: 45, unit: 'personne' },
    { description: 'Déplacement à domicile', unit_price: 80, unit: 'forfait' },
  ],
  'Autre': [
    { description: 'Prestation personnalisée', unit_price: 0, unit: 'forfait' },
  ],
};

export const CONTRACT_LEGAL_TEMPLATES: Record<string, string> = {
  'Photographe': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat a pour objet la prestation photographique lors du mariage des clients, incluant la couverture de l'événement, le traitement et la livraison des photographies selon les modalités définies ci-après.

ARTICLE 2 - OBLIGATIONS DU PRESTATAIRE
Le prestataire s'engage à :
- Assurer une couverture photographique professionnelle de l'événement
- Livrer les photographies retouchées dans un délai maximum de 8 semaines suivant l'événement
- Fournir l'ensemble des fichiers numériques haute résolution
- Respecter la confidentialité et l'image des clients

ARTICLE 3 - OBLIGATIONS DU CLIENT
Le client s'engage à :
- Verser un acompte de 30% à la signature du contrat
- Régler le solde au plus tard 15 jours avant l'événement
- Informer le prestataire de tout changement de planning ou de lieu
- Faciliter l'accès aux différents lieux de prise de vue

ARTICLE 4 - DROITS D'AUTEUR
Le prestataire conserve l'entière propriété intellectuelle des photographies. Les clients disposent d'un droit d'usage privé et non commercial. Toute utilisation commerciale ou publication nécessite l'accord écrit préalable du prestataire.

ARTICLE 5 - ANNULATION ET REPORT
En cas d'annulation par le client :
- Plus de 6 mois avant : remboursement de l'acompte moins 20% de frais de dossier
- Entre 3 et 6 mois : conservation de 50% de l'acompte
- Moins de 3 mois : conservation totale de l'acompte

En cas de report, une seule modification de date est autorisée sans frais supplémentaires, sous réserve de disponibilité.

ARTICLE 6 - FORCE MAJEURE
En cas de force majeure (maladie, accident, catastrophe naturelle), le prestataire s'engage à proposer un photographe remplaçant de qualité équivalente ou le remboursement intégral des sommes versées.

ARTICLE 7 - ASSURANCE
Le prestataire est couvert par une assurance responsabilité civile professionnelle.

ARTICLE 8 - RÈGLEMENT DES LITIGES
En cas de litige, les parties s'engagent à rechercher une solution amiable. À défaut, le tribunal compétent sera celui du lieu d'exécution de la prestation.`,

  'Vidéaste': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit les conditions de réalisation d'un film de mariage, incluant la captation vidéo, le montage, la post-production et la livraison du film final.

ARTICLE 2 - PRESTATIONS INCLUSES
Le prestataire s'engage à fournir :
- La captation vidéo complète de l'événement
- Le montage professionnel avec étalonnage colorimétrique
- La sonorisation et mixage audio
- La livraison sur support numérique (clé USB et/ou lien de téléchargement)
- Un teaser pour les réseaux sociaux (si prévu au contrat)

ARTICLE 3 - DÉLAIS DE LIVRAISON
Le film final sera livré dans un délai maximum de 12 semaines suivant la date de l'événement. Un teaser pourra être fourni sous 2 semaines pour publication immédiate.

ARTICLE 4 - MODALITÉS DE PAIEMENT
- Acompte de 40% à la signature du contrat (non remboursable)
- Solde de 60% à régler 7 jours avant l'événement
- Aucune livraison ne sera effectuée avant règlement complet

ARTICLE 5 - DROITS D'UTILISATION
Le prestataire conserve les droits d'auteur sur l'œuvre audiovisuelle. Les clients disposent d'un droit d'usage privé illimité. Le prestataire se réserve le droit d'utiliser des extraits à des fins promotionnelles, sauf opposition écrite du client.

ARTICLE 6 - MATÉRIEL ET SÉCURITÉ
Le prestataire utilise du matériel professionnel et effectue des sauvegardes multiples. En cas de défaillance technique majeure, le prestataire s'engage à proposer une solution de compensation équitable.

ARTICLE 7 - ANNULATION
Toute annulation doit être notifiée par écrit. Les conditions d'annulation sont :
- Plus de 6 mois : remboursement de 70% de l'acompte
- Entre 3 et 6 mois : remboursement de 40% de l'acompte
- Moins de 3 mois : aucun remboursement

ARTICLE 8 - CLAUSE DE CONFIDENTIALITÉ
Le prestataire s'engage à respecter la confidentialité des informations personnelles communiquées et à ne pas divulguer d'images sans autorisation préalable.`,

  'Traiteur': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit les prestations de restauration et de service pour l'événement de mariage, incluant la fourniture des repas, boissons, et le personnel de service.

ARTICLE 2 - PRESTATIONS FOURNIES
Le prestataire s'engage à fournir :
- Les menus et prestations détaillés en annexe
- Le personnel de service nécessaire (serveurs, chef, plongeurs)
- La vaisselle, verrerie et matériel de service
- L'installation et le nettoyage des espaces de restauration

ARTICLE 3 - NOMBRE DE CONVIVES
Le nombre définitif de convives doit être communiqué au plus tard 15 jours avant l'événement. Toute modification ultérieure pourra entraîner un surcoût de 15% par personne supplémentaire.

ARTICLE 4 - NORMES SANITAIRES
Le prestataire garantit le respect strict des normes HACCP et dispose de toutes les autorisations sanitaires nécessaires. Les denrées utilisées sont fraîches et de première qualité.

ARTICLE 5 - ALLERGIES ET RÉGIMES SPÉCIAUX
Le client s'engage à communiquer au prestataire toute information concernant les allergies alimentaires ou régimes spéciaux (végétarien, végétalien, sans gluten) au moins 21 jours avant l'événement.

ARTICLE 6 - CONDITIONS DE PAIEMENT
- Acompte de 30% à la signature du contrat
- 40% à J-30 de l'événement
- Solde de 30% le jour de l'événement avant le service

ARTICLE 7 - ANNULATION
En cas d'annulation :
- Plus de 3 mois : remboursement de 80% des sommes versées
- Entre 1 et 3 mois : remboursement de 50%
- Moins d'1 mois : aucun remboursement (denrées commandées)

ARTICLE 8 - RESPONSABILITÉ
Le prestataire est couvert par une assurance responsabilité civile professionnelle et une assurance décennale. Il décline toute responsabilité en cas d'intoxication alimentaire liée à des denrées non fournies par ses soins.

ARTICLE 9 - CLAUSE ALCOOL
Le service d'alcool est soumis à la législation en vigueur. Le prestataire se réserve le droit de refuser de servir toute personne manifestement ivre.`,

  'Fleuriste': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit les prestations de décoration florale pour le mariage, incluant la fourniture, la création, l'installation et le retrait des compositions florales.

ARTICLE 2 - PRESTATIONS DÉTAILLÉES
Le prestataire s'engage à fournir :
- Les compositions florales selon le devis détaillé
- L'installation sur les lieux le jour J
- Le retrait des compositions après l'événement (si prévu)
- Le conseil et l'accompagnement dans le choix des variétés

ARTICLE 3 - CHOIX DES FLEURS
Les variétés de fleurs sont choisies en fonction de la saison et de la disponibilité. Le prestataire se réserve le droit de substituer certaines variétés par des équivalents de qualité similaire en cas d'indisponibilité.

ARTICLE 4 - ESSAI ET VALIDATION
Un essai du bouquet de mariée peut être réalisé moyennant un supplément de 80€. Les photographies des compositions seront envoyées pour validation 2 semaines avant l'événement.

ARTICLE 5 - LIVRAISON ET INSTALLATION
Le prestataire assure la livraison et l'installation des compositions florales aux horaires convenus. Tout retard imputable au client pourra entraîner des frais supplémentaires.

ARTICLE 6 - CONDITIONS DE PAIEMENT
- Acompte de 40% à la signature du contrat
- Solde de 60% à régler 7 jours avant l'événement
- Paiement par virement bancaire, chèque ou espèces

ARTICLE 7 - ANNULATION ET MODIFICATION
Toute modification de commande doit intervenir au minimum 21 jours avant l'événement. En cas d'annulation :
- Plus de 30 jours : remboursement de 70% de l'acompte
- Moins de 30 jours : conservation totale de l'acompte

ARTICLE 8 - CONSERVATION DES FLEURS
Le prestataire ne peut garantir la fraîcheur des fleurs au-delà de 48h après la livraison. Il est recommandé de conserver les compositions dans un endroit frais et à l'abri du soleil.

ARTICLE 9 - RESPONSABILITÉ
Le prestataire décline toute responsabilité en cas de réaction allergique aux fleurs ou de détérioration des compositions due à des conditions de conservation inadéquates.`,

  'DJ & Musicien': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit les prestations d'animation musicale et de sonorisation pour l'événement de mariage.

ARTICLE 2 - PRESTATIONS INCLUSES
Le prestataire s'engage à fournir :
- L'animation DJ pour la durée convenue
- Le matériel de sonorisation professionnel (enceintes, table de mixage, micros)
- L'éclairage scénique (si prévu au contrat)
- La playlist personnalisée selon les souhaits des clients
- Les déplacements et l'installation du matériel

ARTICLE 3 - PRÉPARATION ET PLAYLIST
Une réunion préparatoire (physique ou visioconférence) sera organisée pour définir l'ambiance musicale souhaitée, les morceaux incontournables et ceux à éviter. Une playlist personnalisée sera établie en concertation avec les clients.

ARTICLE 4 - DURÉE DE PRESTATION
La prestation débute et se termine aux horaires convenus. Toute heure supplémentaire sera facturée 150€/heure. Le prestataire s'engage à respecter les horaires de fin imposés par le lieu de réception.

ARTICLE 5 - MATÉRIEL ET INSTALLATION
Le prestataire arrive 2h avant le début de la prestation pour l'installation. Le client s'engage à fournir un accès électrique suffisant (220V, 16A minimum) et un espace dédié de 3m x 2m minimum.

ARTICLE 6 - CONDITIONS DE PAIEMENT
- Acompte de 30% à la signature du contrat
- Solde de 70% à régler le jour de l'événement avant le début de la prestation
- Paiement par virement, chèque ou espèces

ARTICLE 7 - ANNULATION
En cas d'annulation par le client :
- Plus de 6 mois : remboursement de 80% de l'acompte
- Entre 3 et 6 mois : remboursement de 50%
- Moins de 3 mois : aucun remboursement

ARTICLE 8 - ASSURANCE ET RESPONSABILITÉ
Le prestataire est couvert par une assurance responsabilité civile professionnelle. Il décline toute responsabilité en cas de dommages causés par des tiers au matériel ou en cas de coupure électrique.

ARTICLE 9 - DROIT À L'IMAGE
Le prestataire se réserve le droit de photographier ou filmer son installation à des fins promotionnelles, sauf opposition écrite du client.`,

  'Décorateur': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit les prestations de décoration et de scénographie pour l'événement de mariage, incluant la conception, la fourniture du matériel, l'installation et le démontage.

ARTICLE 2 - PRESTATIONS FOURNIES
Le prestataire s'engage à :
- Concevoir la décoration selon le thème et les couleurs choisis
- Fournir l'ensemble du matériel décoratif (mobilier, textile, accessoires)
- Installer la décoration le jour J
- Démonter et récupérer le matériel après l'événement

ARTICLE 3 - CONCEPTION ET VALIDATION
Un dossier de présentation avec planches d'ambiance et visuels 3D sera fourni pour validation. Deux séries de modifications sont incluses. Toute modification supplémentaire sera facturée 80€.

ARTICLE 4 - MATÉRIEL ET LOCATION
Le matériel reste la propriété du prestataire. Le client s'engage à en prendre soin et à signaler tout dommage. Une caution de 500€ pourra être demandée et restituée après vérification du matériel.

ARTICLE 5 - INSTALLATION ET DÉMONTAGE
L'installation débute 24h avant l'événement (sauf accord contraire). Le démontage intervient le lendemain de l'événement. Le client s'engage à garantir l'accès aux lieux aux horaires convenus.

ARTICLE 6 - CONDITIONS DE PAIEMENT
- Acompte de 40% à la signature du contrat
- 30% à J-30 de l'événement
- Solde de 30% le jour de l'installation

ARTICLE 7 - ANNULATION
En cas d'annulation :
- Plus de 3 mois : remboursement de 60% des sommes versées
- Entre 1 et 3 mois : remboursement de 30%
- Moins d'1 mois : aucun remboursement (matériel réservé)

ARTICLE 8 - RESPONSABILITÉ
Le prestataire est assuré en responsabilité civile professionnelle. Il décline toute responsabilité en cas de dommages causés par des tiers au matériel ou en cas de vol.

ARTICLE 9 - DROIT À L'IMAGE
Le prestataire se réserve le droit de photographier ses créations à des fins promotionnelles et de publication dans son portfolio.`,

  'Wedding Planner': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit la mission d'organisation et de coordination du mariage, incluant l'accompagnement, le conseil, la recherche de prestataires et la coordination le jour J.

ARTICLE 2 - ÉTENDUE DE LA MISSION
Le prestataire s'engage à :
- Accompagner les clients dans toutes les étapes de l'organisation
- Rechercher et sélectionner les prestataires selon le budget et les souhaits
- Négocier les contrats et coordonner les prestataires
- Établir le rétro-planning et veiller à son respect
- Assurer la coordination complète le jour J

ARTICLE 3 - DISPONIBILITÉ
Le prestataire est disponible par téléphone, email et visioconférence. Des rendez-vous physiques sont organisés selon les besoins (minimum 4 réunions incluses dans le forfait).

ARTICLE 4 - BUDGET ET PRESTATAIRES
Le prestataire s'engage à respecter le budget défini par les clients. Il ne perçoit aucune commission des prestataires recommandés. Les clients restent libres de leurs choix finaux.

ARTICLE 5 - JOUR J
Le prestataire assure une présence de 12h le jour de l'événement pour coordonner l'ensemble des prestataires, gérer les imprévus et garantir le bon déroulement de la journée.

ARTICLE 6 - CONDITIONS DE PAIEMENT
- Acompte de 30% à la signature du contrat
- 40% à mi-parcours de l'organisation (environ J-90)
- Solde de 30% à J-15 de l'événement

ARTICLE 7 - ANNULATION
En cas d'annulation par les clients :
- Plus de 6 mois : remboursement de 50% des sommes versées
- Entre 3 et 6 mois : remboursement de 30%
- Moins de 3 mois : aucun remboursement (travail déjà effectué)

ARTICLE 8 - CONFIDENTIALITÉ
Le prestataire s'engage à la plus stricte confidentialité concernant toutes les informations personnelles et financières communiquées par les clients.

ARTICLE 9 - RESPONSABILITÉ
Le prestataire met tout en œuvre pour garantir le bon déroulement de l'événement mais ne peut être tenu responsable des défaillances des prestataires tiers. Il est couvert par une assurance responsabilité civile professionnelle.

ARTICLE 10 - FORCE MAJEURE
En cas de force majeure rendant impossible la tenue de l'événement, le prestataire s'engage à accompagner les clients dans le report et la réorganisation sans frais supplémentaires.`,

  'Lieu de réception': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit les conditions de location du lieu de réception pour l'événement de mariage, incluant les espaces, équipements et services associés.

ARTICLE 2 - ESPACES LOUÉS
La location comprend :
- La salle de réception principale (capacité : XX personnes)
- Les espaces extérieurs (jardin, terrasse)
- Les sanitaires et vestiaires
- Le parking (XX places)
- L'accès à la cuisine professionnelle (si prévu)

ARTICLE 3 - DURÉE DE LOCATION
La location débute le [date] à [heure] et se termine le [date] à [heure]. Tout dépassement d'horaire devra être autorisé préalablement et pourra entraîner une facturation supplémentaire de 200€/heure.

ARTICLE 4 - CAPACITÉ ET RÉGLEMENTATION
Le nombre maximum de personnes autorisées est de XX. Le client s'engage à respecter les normes de sécurité, les règles de voisinage et les horaires de fin de soirée imposés par la municipalité.

ARTICLE 5 - ÉQUIPEMENTS INCLUS
La location comprend :
- Tables et chaises (selon capacité)
- Nappage et vaisselle de base
- Système de sonorisation
- Éclairage de base
- Chauffage/climatisation

ARTICLE 6 - PRESTATAIRES EXTÉRIEURS
Le client est libre de choisir ses prestataires (traiteur, décorateur, etc.) sous réserve qu'ils disposent des assurances nécessaires. Une liste de prestataires agréés peut être fournie sur demande.

ARTICLE 7 - CAUTION ET ASSURANCE
Une caution de 1500€ est demandée et sera restituée sous 15 jours après vérification de l'état des lieux. Le client doit souscrire une assurance responsabilité civile pour l'événement.

ARTICLE 8 - CONDITIONS DE PAIEMENT
- Acompte de 30% à la signature du contrat
- 40% à J-60 de l'événement
- Solde de 30% + caution à J-15

ARTICLE 9 - ANNULATION
En cas d'annulation :
- Plus de 6 mois : remboursement de 70% des sommes versées
- Entre 3 et 6 mois : remboursement de 40%
- Moins de 3 mois : aucun remboursement

ARTICLE 10 - ÉTAT DES LIEUX
Un état des lieux contradictoire sera réalisé avant et après l'événement. Tout dommage constaté sera déduit de la caution ou facturé en sus si le montant excède la caution.

ARTICLE 11 - RESPONSABILITÉ
Le propriétaire décline toute responsabilité en cas d'accident, vol ou dommage survenant pendant la location. Le client est responsable de ses invités et prestataires.`,

  'Coiffeur & Maquilleur': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit les prestations de coiffure et maquillage pour le mariage, incluant les essais préalables et les prestations le jour J.

ARTICLE 2 - PRESTATIONS INCLUSES
Le prestataire s'engage à fournir :
- Un essai coiffure et/ou maquillage (1 à 2 mois avant l'événement)
- La prestation le jour J aux horaires convenus
- Les produits professionnels nécessaires
- Le déplacement (si prévu au contrat)

ARTICLE 3 - ESSAIS
L'essai permet de définir le style souhaité et de tester les produits. Il est fortement recommandé de réaliser l'essai avec la même coiffure que le jour J (cheveux propres, longueur identique). Des photographies seront prises pour référence.

ARTICLE 4 - JOUR J
Le prestataire arrive aux horaires convenus pour la préparation. Un espace calme, bien éclairé et avec accès à une prise électrique doit être mis à disposition. La durée estimée est de :
- Mariée : 1h30 à 2h
- Demoiselle d'honneur : 45min par personne

ARTICLE 5 - PRODUITS ET ALLERGIES
Le prestataire utilise des produits professionnels de qualité. Toute allergie ou sensibilité cutanée doit être signalée lors de la prise de rendez-vous. Un test d'allergie peut être réalisé sur demande.

ARTICLE 6 - CONDITIONS DE PAIEMENT
- Acompte de 30% à la signature du contrat
- Solde de 70% à régler le jour de l'essai
- Aucune prestation ne sera effectuée le jour J sans règlement complet

ARTICLE 7 - ANNULATION
En cas d'annulation :
- Plus de 2 mois : remboursement de 70% de l'acompte
- Entre 1 et 2 mois : remboursement de 40%
- Moins d'1 mois : aucun remboursement

ARTICLE 8 - RETARD
Tout retard le jour J pourra compromettre la qualité de la prestation. Si le retard excède 30 minutes, le prestataire se réserve le droit d'adapter la prestation ou de facturer le temps d'attente (50€/30min).

ARTICLE 9 - DROIT À L'IMAGE
Le prestataire se réserve le droit de photographier son travail à des fins promotionnelles, sauf opposition écrite du client.`,

  'Autre': `ARTICLE 1 - OBJET DU CONTRAT
Le présent contrat définit les prestations de service pour l'événement de mariage selon les modalités convenues entre les parties.

ARTICLE 2 - DESCRIPTION DES PRESTATIONS
Le prestataire s'engage à fournir les services détaillés dans le devis annexé au présent contrat, dans les conditions et délais convenus.

ARTICLE 3 - OBLIGATIONS DU PRESTATAIRE
Le prestataire s'engage à :
- Exécuter la prestation avec professionnalisme et dans les règles de l'art
- Respecter les délais convenus
- Informer le client de toute difficulté pouvant affecter la bonne exécution du contrat
- Disposer des assurances et autorisations nécessaires à l'exercice de son activité

ARTICLE 4 - OBLIGATIONS DU CLIENT
Le client s'engage à :
- Fournir toutes les informations nécessaires à la bonne exécution de la prestation
- Respecter les échéances de paiement
- Faciliter l'accès aux lieux et moyens nécessaires à la prestation
- Informer le prestataire de tout changement pouvant affecter la prestation

ARTICLE 5 - CONDITIONS DE PAIEMENT
- Acompte de 30% à la signature du contrat
- Solde à régler selon les modalités convenues (avant, pendant ou après la prestation)
- Tout retard de paiement pourra entraîner des pénalités de 10% du montant dû

ARTICLE 6 - ANNULATION ET MODIFICATION
Toute annulation ou modification substantielle doit être notifiée par écrit. Les conditions d'annulation sont :
- Plus de 3 mois avant l'événement : remboursement de 70% des sommes versées
- Entre 1 et 3 mois : remboursement de 40%
- Moins d'1 mois : aucun remboursement

ARTICLE 7 - RESPONSABILITÉ
Le prestataire est couvert par une assurance responsabilité civile professionnelle. Sa responsabilité ne pourra être engagée qu'en cas de faute prouvée dans l'exécution de ses obligations contractuelles.

ARTICLE 8 - FORCE MAJEURE
Aucune des parties ne sera tenue responsable de l'inexécution de ses obligations en cas de force majeure. Les parties s'engagent à rechercher une solution amiable (report, remboursement, etc.).

ARTICLE 9 - RÈGLEMENT DES LITIGES
En cas de litige, les parties s'engagent à rechercher une solution amiable avant toute action judiciaire. À défaut d'accord, le tribunal compétent sera celui du lieu d'exécution de la prestation.

ARTICLE 10 - DONNÉES PERSONNELLES
Le prestataire s'engage à respecter la réglementation en vigueur concernant la protection des données personnelles (RGPD) et à ne pas divulguer les informations du client à des tiers sans autorisation.`,
};

export const DEVIS_CONDITIONS_TEMPLATES: Record<string, string> = {
  'Photographe': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : Ce devis est valable 30 jours à compter de sa date d'émission.

Acompte : Un acompte de 30% est requis pour confirmer la réservation de la date.

Paiement : Le solde doit être réglé au plus tard 15 jours avant l'événement.

Livraison : Les photographies retouchées seront livrées dans un délai de 8 semaines maximum après l'événement.

Droits d'auteur : Le photographe conserve les droits d'auteur. Usage privé uniquement.

Annulation : Voir conditions détaillées dans le contrat de prestation.`,

  'Vidéaste': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : Ce devis est valable 30 jours.

Réservation : Acompte de 40% requis pour bloquer la date.

Solde : À régler 7 jours avant l'événement.

Livraison : Film final sous 12 semaines, teaser sous 2 semaines.

Droits : Usage privé uniquement. Le vidéaste conserve les droits d'auteur.

Modifications : Deux séries de modifications incluses dans le montage.`,

  'Traiteur': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : 21 jours à compter de l'émission.

Nombre définitif : À communiquer 15 jours avant l'événement.

Paiement : 30% à la signature, 40% à J-30, solde le jour J avant service.

Allergies : À signaler impérativement 21 jours avant.

Normes : Respect strict des normes HACCP.

Annulation : Voir conditions au contrat.`,

  'Fleuriste': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : 30 jours.

Acompte : 40% à la signature.

Solde : 7 jours avant l'événement.

Fleurs : Variétés selon saison et disponibilité. Substitution possible par équivalent.

Livraison : Installation le jour J aux horaires convenus.

Conservation : Fraîcheur garantie 48h après livraison.`,

  'DJ & Musicien': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : 30 jours.

Réservation : Acompte de 30% pour bloquer la date.

Solde : À régler le jour J avant le début de la prestation.

Durée : Heures supplémentaires facturées 150€/h.

Matériel : Installation 2h avant. Accès électrique requis (220V, 16A).

Playlist : Établie en concertation avec les clients.`,

  'Décorateur': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : 30 jours.

Paiement : 40% à la signature, 30% à J-30, solde le jour de l'installation.

Installation : 24h avant l'événement (sauf accord contraire).

Démontage : Lendemain de l'événement.

Caution : 500€ restituée après vérification du matériel.

Modifications : 2 séries incluses, puis 80€ par modification.`,

  'Wedding Planner': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : 45 jours.

Paiement : 30% à la signature, 40% à mi-parcours, solde à J-15.

Disponibilité : Par téléphone, email et visioconférence.

Réunions : Minimum 4 réunions physiques incluses.

Jour J : Présence de 12h pour coordination complète.

Indépendance : Aucune commission perçue sur les prestataires recommandés.`,

  'Lieu de réception': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : 60 jours.

Paiement : 30% à la signature, 40% à J-60, solde + caution à J-15.

Caution : 1500€ restituée sous 15 jours après état des lieux.

Capacité : Maximum XX personnes.

Horaires : Respect strict des horaires de fin de soirée.

Assurance : Responsabilité civile obligatoire pour l'événement.`,

  'Coiffeur & Maquilleur': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : 30 jours.

Essai : Fortement recommandé 1 à 2 mois avant.

Paiement : 30% à la signature, solde le jour de l'essai.

Jour J : Espace calme et bien éclairé requis.

Allergies : À signaler impérativement lors de la réservation.

Retard : Au-delà de 30min, facturation possible (50€/30min).`,

  'Autre': `CONDITIONS GÉNÉRALES DU DEVIS

Validité : Ce devis est valable 30 jours à compter de sa date d'émission.

Acompte : Un acompte de 30% est requis pour confirmer la prestation.

Paiement : Le solde est à régler selon les modalités convenues.

Modifications : Toute modification doit être notifiée par écrit.

Annulation : Voir conditions détaillées au contrat.

Assurance : Le prestataire est couvert par une assurance responsabilité civile professionnelle.`,
};

export function getDefaultServicesForCategory(category: string): ServicePrestation[] {
  return DEFAULT_SERVICES[category] || DEFAULT_SERVICES['Autre'];
}

export function getContractTemplateForCategory(category: string): string {
  return CONTRACT_LEGAL_TEMPLATES[category] || CONTRACT_LEGAL_TEMPLATES['Autre'];
}

export function getDevisConditionsForCategory(category: string): string {
  return DEVIS_CONDITIONS_TEMPLATES[category] || DEVIS_CONDITIONS_TEMPLATES['Autre'];
}
