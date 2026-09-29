export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  price: number;
  old_price: number | null;
  image_url: string | null;
  category: string;
  platform: string | null;
  stock: number;
  featured: boolean;
  active: boolean;
  created_at?: string;
};

export type GameEvent = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  starts_at: string;
  location: string | null;
  prize: string | null;
  capacity: number | null;
  register_url: string | null;
  active: boolean;
};

export type Campaign = {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  badge: string | null;
  code: string | null;
  ends_at: string | null;
  featured: boolean;
  active: boolean;
};

export type Ad = {
  id: string;
  title: string;
  subtitle: string | null;
  image_url: string | null;
  link_url: string | null;
  placement: string;
  sort: number;
  active: boolean;
};

export type OrderItem = { id: string; name: string; price: number; qty: number; image_url?: string | null };

export type Order = {
  id: string;
  order_no: number;
  customer_name: string;
  phone: string;
  email: string | null;
  address: string | null;
  note: string | null;
  delivery: string;
  payment: string;
  items: OrderItem[];
  coupon: string | null;
  shipping: number;
  total: number;
  status: string;
  created_at: string;
};

export type Offer = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  kind: string;
  message: string;
  budget: number | null;
  status: string;
  created_at: string;
};

export type Subscriber = { id: string; email: string; name: string | null; active: boolean; created_at: string };

export type Score = { id: string; game: string; player: string; score: number; created_at: string };

export type Settings = {
  store_name: string;
  tagline: string;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  address: string | null;
  map_url: string | null;
  instagram: string | null;
  facebook: string | null;
  tiktok: string | null;
  youtube: string | null;
  x: string | null;
  announcement: string | null;
  social_webhook_url: string | null;
  reward_code: string | null;
  reward_score: number | null;
};
