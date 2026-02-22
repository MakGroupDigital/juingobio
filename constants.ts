
import { Producer } from './types';

export const PRODUCERS: Producer[] = [
  {
    id: 'prod1',
    farm_name: 'Le Domaine de l’Aubrac',
    location: { lat: 44.6, lng: 3.0 },
    bio_certification: 'Ecocert FR-BIO-01',
    bio_score: 98,
    story: 'Producteurs de légumes racines depuis 4 générations sur les terres volcaniques.',
    profile_pic: 'https://picsum.photos/seed/farm1/400/400'
  },
  {
    id: 'prod2',
    farm_name: 'Vergers du Delta',
    location: { lat: 43.5, lng: 4.6 },
    bio_certification: 'Agriculture Biologique',
    bio_score: 95,
    story: 'Spécialistes des agrumes rares et fruits de saison gorgés de soleil.',
    profile_pic: 'https://picsum.photos/seed/farm2/400/400'
  }
];
