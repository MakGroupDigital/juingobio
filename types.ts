
export interface Producer {
  id: string;
  farm_name: string;
  location: { lat: number; lng: number };
  bio_certification: string;
  bio_score: number;
  story: string;
  profile_pic: string;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  price_b2c: number;
  price_b2b_tier: {
    "10kg": number;
    "50kg": number;
  };
  unit: 'kg' | 'unit' | 'box';
  images: string[];
  producer_id: string;
  stock: number;
  is_active: boolean;
}

export interface OrderItem {
  product_id: string;
  qty: number;
  price_at_purchase: number;
  name: string; // Denormalized for performance
  image: string; // Denormalized for performance
}

export type UserType = 'B2B' | 'B2C';

export interface AppPreferences {
  language: 'fr' | 'en';
  reducedMotion: boolean;
  dataSaver: boolean;
}

export interface Order {
  id: string;
  user_id: string;
  user_type: UserType;
  items: OrderItem[];
  status: 'pending' | 'processing' | 'delivering' | 'completed';
  total_ht: number;
  total_ttc: number;
  created_at: number;
  delivery_address?: string;
  delivery_lat?: number;
  delivery_lng?: number;
  driver_lat?: number;
  driver_lng?: number;
  driver_name?: string;
  estimated_delivery?: number;
}

export interface DeliveryLocation {
  lat: number;
  lng: number;
}
