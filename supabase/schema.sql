-- =====================================================================
-- GAME LOVER — Supabase şeması
-- Supabase Dashboard > SQL Editor'e yapıştırıp "Run" deyin.
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ÜRÜNLER ----------
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text default '',
  price numeric(10,2) not null default 0,
  old_price numeric(10,2),
  image_url text,
  category text default 'Oyun',
  platform text,
  stock int not null default 0,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- ETKİNLİKLER ----------
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  image_url text,
  starts_at timestamptz not null,
  location text default 'Game Lover Çorum',
  prize text,
  capacity int,
  register_url text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- KAMPANYALAR ----------
create table if not exists campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text default '',
  image_url text,
  badge text,              -- ör. "%30 İNDİRİM"
  code text,               -- kupon kodu
  ends_at timestamptz,
  featured boolean not null default false,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- REKLAMLAR / BANNERLAR ----------
create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subtitle text,
  image_url text,
  link_url text,
  placement text not null default 'home',  -- home | games | products
  sort int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- SİPARİŞLER ----------
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  order_no bigint generated always as identity (start with 1001),
  customer_name text not null,
  phone text not null,
  email text,
  address text,
  note text,
  delivery text not null default 'magaza',  -- magaza | kargo | kurye
  payment text not null default 'kapida',   -- kapida | havale | magaza
  items jsonb not null default '[]'::jsonb,
  coupon text,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  status text not null default 'yeni',      -- yeni | hazirlaniyor | yolda | teslim | iptal
  created_at timestamptz not null default now()
);

-- ---------- BÜLTEN ABONELERİ ----------
create table if not exists subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- TEKLİFLER (takas / 2.el / toplu alım) ----------
create table if not exists offers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  kind text not null default 'takas',
  message text not null,
  budget numeric(10,2),
  status text not null default 'yeni',
  created_at timestamptz not null default now()
);

-- ---------- OYUN SKORLARI ----------
create table if not exists scores (
  id uuid primary key default gen_random_uuid(),
  game text not null,
  player text not null,
  score int not null,
  created_at timestamptz not null default now()
);
create index if not exists scores_game_score_idx on scores (game, score desc);

-- ---------- SİTE AYARLARI (tek satır) ----------
create table if not exists settings (
  id int primary key default 1 check (id = 1),
  store_name text default 'Game Lover',
  tagline text default 'Çorum''un oyun dünyası',
  phone text,
  whatsapp text,
  email text,
  address text default 'Çorum Merkez',
  map_url text,
  instagram text,
  facebook text,
  tiktok text,
  youtube text,
  x text,
  announcement text,
  social_webhook_url text,  -- Make/Zapier/n8n webhook: yeni içerik otomatik paylaşılır
  reward_code text default 'OYUNCU10',
  reward_score int default 500,
  updated_at timestamptz default now()
);
insert into settings (id) values (1) on conflict (id) do nothing;

-- =====================================================================
-- ROW LEVEL SECURITY
-- Herkes yalnızca aktif içerikleri okuyabilir. Sipariş, abone, teklif
-- ve tüm yönetim işlemleri sunucu tarafında service_role ile yapılır.
-- =====================================================================
alter table products    enable row level security;
alter table events      enable row level security;
alter table campaigns   enable row level security;
alter table ads         enable row level security;
alter table orders      enable row level security;
alter table subscribers enable row level security;
alter table offers      enable row level security;
alter table scores      enable row level security;
alter table settings    enable row level security;

drop policy if exists "public read products"  on products;
drop policy if exists "public read events"    on events;
drop policy if exists "public read campaigns" on campaigns;
drop policy if exists "public read ads"       on ads;
drop policy if exists "public read settings"  on settings;
drop policy if exists "public read scores"    on scores;

create policy "public read products"  on products  for select using (active);
create policy "public read events"    on events    for select using (active);
create policy "public read campaigns" on campaigns for select using (active);
create policy "public read ads"       on ads       for select using (active);
create policy "public read settings"  on settings  for select using (true);
create policy "public read scores"    on scores    for select using (true);

-- ---------- GÖRSEL DEPOLAMA ----------
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects
  for select using (bucket_id = 'media');
