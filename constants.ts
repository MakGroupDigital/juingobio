
import { Producer, Product } from './types';

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

export const PRODUCTS: Product[] = [
  {
    id: 'p1',
    name: 'Pommes Gala Bio',
    description: 'Croquantes et naturellement sucrées, récoltées à pleine maturité.',
    category: 'Fruits',
    price_b2c: 4.50,
    price_b2b_tier: { "10kg": 3.20, "50kg": 2.80 },
    unit: 'kg',
    images: ['https://picsum.photos/seed/apple/800/800'],
    producer_id: 'prod2',
    stock: 250,
    is_active: true
  },
  {
    id: 'p2',
    name: 'Carottes Sables d’Or',
    description: 'Une saveur terreuse et douce, parfaite pour les jus ou la rôtisserie.',
    category: 'Légumes',
    price_b2c: 3.20,
    price_b2b_tier: { "10kg": 2.10, "50kg": 1.70 },
    unit: 'kg',
    images: ['https://picsum.photos/seed/carrot/800/800'],
    producer_id: 'prod1',
    stock: 500,
    is_active: true
  },
  {
    id: 'p3',
    name: 'Miel de Lavande AOP',
    description: 'Un miel onctueux aux notes florales puissantes.',
    category: 'Épicerie',
    price_b2c: 12.90,
    price_b2b_tier: { "10kg": 9.50, "50kg": 8.50 },
    unit: 'unit',
    images: ['https://picsum.photos/seed/honey/800/800'],
    producer_id: 'prod2',
    stock: 45,
    is_active: true
  }
];
