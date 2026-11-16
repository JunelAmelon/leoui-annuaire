/** Déroulé type proposé au couple quand le planning est vide : une base à ajuster, pas une contrainte. */

import type { DayKey, TimelineItemInput } from './types';

type TemplateItem = Pick<TimelineItemInput, 'title' | 'time' | 'duration_min' | 'category'> & { location_name?: string; travel_min?: number };

export const DAY_TEMPLATE: Record<DayKey, TemplateItem[]> = {
  eve: [
    { title: 'Installation de la salle', time: '15:00', duration_min: 120, category: 'logistics', location_name: 'Lieu de réception' },
    { title: 'Répétition de la cérémonie', time: '17:30', duration_min: 45, category: 'ceremony', location_name: 'Lieu de cérémonie', travel_min: 15 },
    { title: 'Dîner avec les proches', time: '20:00', duration_min: 120, category: 'meal' },
  ],
  day: [
    { title: 'Coiffure et maquillage', time: '09:00', duration_min: 150, category: 'preparation' },
    { title: 'Habillage', time: '12:00', duration_min: 45, category: 'preparation' },
    { title: 'Découverte des mariés et photos de couple', time: '13:00', duration_min: 60, category: 'photo' },
    { title: 'Départ pour la cérémonie', time: '14:10', duration_min: 20, category: 'transport' },
    { title: 'Cérémonie', time: '14:30', duration_min: 60, category: 'ceremony', location_name: 'Lieu de cérémonie', travel_min: 20 },
    { title: 'Photos de groupe', time: '15:45', duration_min: 30, category: 'photo', location_name: 'Lieu de cérémonie' },
    { title: 'Vin d’honneur', time: '16:45', duration_min: 135, category: 'cocktail', location_name: 'Lieu de réception', travel_min: 25 },
    { title: 'Entrée des mariés et dîner', time: '19:30', duration_min: 150, category: 'meal', location_name: 'Lieu de réception' },
    { title: 'Gâteau', time: '22:15', duration_min: 20, category: 'meal', location_name: 'Lieu de réception' },
    { title: 'Ouverture de bal', time: '22:45', duration_min: 15, category: 'party', location_name: 'Lieu de réception' },
    { title: 'Soirée dansante', time: '23:00', duration_min: 180, category: 'party', location_name: 'Lieu de réception' },
    { title: 'Fin de soirée', time: '03:00', duration_min: 30, category: 'logistics', location_name: 'Lieu de réception' },
  ],
  after: [
    { title: 'Brunch', time: '11:30', duration_min: 150, category: 'meal', location_name: 'Lieu de réception' },
    { title: 'Rangement et restitution du lieu', time: '15:00', duration_min: 90, category: 'logistics', location_name: 'Lieu de réception' },
  ],
};

export function templateInputs(key: DayKey): TimelineItemInput[] {
  return DAY_TEMPLATE[key].map((t) => ({
    title: t.title,
    time: t.time,
    duration_min: t.duration_min,
    category: t.category,
    location_name: t.location_name ?? '',
    location_address: '',
    travel_min: t.travel_min ?? 0,
    people: [],
    notes: '',
    vendor_ids: [],
  }));
}
