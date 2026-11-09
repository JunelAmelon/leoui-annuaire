import type { Gazette, GazetteSection } from './types';

export function createDefaultGazetteSections(): GazetteSection[] {
  return [
    {
      id: 'section-story-default',
      type: 'story',
      title: 'Notre Histoire : De la Première Étincelle au Grand Oui',
      order: 1,
      content: {
        narrative:
          'Il y a des rencontres qui semblent écrites d’avance. Entre fous rires partagés, voyages impromptus et tasses de café au petit matin, chaque moment nous a menés jusqu’à ce jour inoubliable.',
        timeline: [
          {
            year_or_date: 'Chapitre 1',
            title: 'Le Premier Regard',
            text: 'Un échange de regards timide, une discussion qui s’est prolongée jusqu’au bout de la nuit.',
          },
          {
            year_or_date: 'Chapitre 2',
            title: 'Le Premier Voyage',
            text: 'Une valise perdue, des souvenirs magiques et la certitude d’avoir trouvé la bonne personne.',
          },
          {
            year_or_date: 'Chapitre 3',
            title: 'La Demande',
            text: 'Un moment suspendu hors du temps, une émotion pure et un grand « OUI ! » venu du cœur.',
          },
        ],
      },
    },
    {
      id: 'section-anecdote-default',
      type: 'anecdote',
      title: 'Les Chiffres & Confidences Insolites',
      order: 2,
      content: {
        items: [
          {
            title: '1 825 jours d’amour',
            content: 'Soit plus de 43 000 heures de complicité sans jamais se lasser.',
          },
          {
            title: 'Qui a fait le premier pas ?',
            content: 'La légende raconte que chacun est persuadé d’avoir pris l’initiative. Le débat reste ouvert !',
          },
          {
            title: 'Nombre de cafés bus ensemble',
            content: 'Environ 3 400 tasses, indispensables pour préparer ce grand mariage.',
          },
        ],
      },
    },
    {
      id: 'section-program-default',
      type: 'program',
      title: 'Le Programme Officiel des Festivités',
      order: 3,
      content: {
        items: [
          {
            time: '14:30',
            title: 'Cérémonie Civile & Échange des Vœux',
            description: 'Préparez vos mouchoirs pour les larmes de joie.',
            location: 'Mairie & Salle des Cérémonies',
          },
          {
            time: '16:30',
            title: 'Cocktail & Vin d’Honneur',
            description: 'Bulles, délices salés et photos souvenirs sous le soleil.',
            location: 'Les Jardins',
          },
          {
            time: '19:30',
            title: 'Le Dîner & Surprises des Témoins',
            description: 'Un voyage gourmand orchestré par nos chefs et nos complices.',
            location: 'Grande Salle de Réception',
          },
          {
            time: '23:00',
            title: 'Ouverture du Bal & Soirée Dansante',
            description: 'Que la fête commence jusqu’au bout de la nuit !',
            location: 'Piste de danse',
          },
        ],
      },
    },
    {
      id: 'section-quiz-default',
      type: 'quiz',
      title: 'Le Grand Quiz des Invités : Connaissez-vous bien les mariés ?',
      order: 4,
      content: {
        questions: [
          {
            question: 'Où a eu lieu leur tout premier rendez-vous ?',
            options: ['Dans un bistrot parisien', 'À un concert de rock', 'Sur un banc au bord de l’eau', 'Dans une salle d’escalade'],
            answer_index: 0,
          },
          {
            question: 'Qui met le plus de temps à se préparer le matin ?',
            options: ['La mariée sans hésitation', 'Le marié en secret', 'Exactement à égalité', 'Le chat de la famille'],
            answer_index: 1,
          },
          {
            question: 'Quelle est leur destination de lune de miel rêvée ?',
            options: ['Les îles grecques', 'Le Japon traditionnel', 'Un road-trip en Islande', 'Une cabane en forêt'],
            answer_index: 1,
          },
          {
            question: 'Quel est leur plat refuge du dimanche soir ?',
            options: ['Pizza maison', 'Pâtes fraîches à la truffe', 'Sushi party', 'Crêpes bretonnes'],
            answer_index: 0,
          },
        ],
      },
    },
    {
      id: 'section-custom-default',
      type: 'custom',
      title: 'Un Mot du Cœur & Remerciements',
      order: 5,
      content: {
        subtitle: 'Merci d’être à nos côtés',
        body:
          'Chers parents, témoins, amis et familles venues de près comme de loin : votre présence aujourd’hui illumine notre bonheur. Merci pour votre amour, vos sourires et vos précieux témoignages qui resteront gravés pour toujours dans nos mémoires.',
        signature: 'Avec tout notre amour, les mariés.',
      },
    },
  ];
}

export function createDefaultGazette(
  eventId: string,
  ownerId: string,
  title = 'La Gazette des Mariés',
  weddingDate = '',
  locationName = ''
): Gazette {
  const now = new Date().toISOString();
  return {
    event_id: eventId,
    owner_id: ownerId,
    title,
    subtitle: 'Édition Spéciale — Tirage Unique pour nos Invités',
    wedding_date: weddingDate,
    location_name: locationName,
    cover_path: null,
    cover_caption: 'Le grand OUI sous le ciel d’amour',
    editorial:
      'Bienvenue dans notre gazette exclusive ! Nous avons préparé ces quelques pages pour partager nos souvenirs, vous guider au fil de cette journée magique et tester vos connaissances. Prenez place, savourez chaque instant et célébrons ensemble !',
    weather_forecast: '32°C de bonheur absolu, 100% d’amour et fortes averses de confettis prévues.',
    sections: createDefaultGazetteSections(),
    program_source: 'plan',
    program_synced_at: null,
    layout: {
      theme: 'vintage_gazette',
      accent_color: '#be123c',
    },
    version: 1,
    updated_at: now,
    created_at: now,
  };
}
