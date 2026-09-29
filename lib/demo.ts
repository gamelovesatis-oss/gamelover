import type { Ad, Campaign, GameEvent, Product, Settings } from "@/lib/types";

const u = (id: string, w = 1200) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${w}&q=80`;

const inDays = (d: number, h = 20) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  t.setHours(h, 0, 0, 0);
  return t.toISOString();
};

export const demoSettings: Settings = {
  store_name: "Game Lover",
  tagline: "Çorum'un oyun dünyası",
  phone: "0 (364) 000 00 00",
  whatsapp: "905000000000",
  email: "info@game-lover.com",
  address: "Çorum Merkez",
  map_url: "https://maps.google.com/?q=Çorum",
  instagram: "https://instagram.com/",
  facebook: "https://facebook.com/",
  tiktok: "https://tiktok.com/",
  youtube: "https://youtube.com/",
  x: null,
  announcement: "🎮 Çorum içi aynı gün kurye! 1.500₺ üzeri siparişlerde teslimat ücretsiz.",
  social_webhook_url: null,
  reward_code: "OYUNCU10",
  reward_score: 500,
};

export const demoProducts: Product[] = [
  { id: "p1", slug: "playstation-5-slim", name: "PlayStation 5 Slim", description: "1TB SSD, DualSense kol ile. Işın izleme, 4K 120Hz ve ultra hızlı yükleme süreleri.", price: 24999, old_price: 27999, image_url: u("photo-1606144042614-b2417e99c4e3"), category: "Konsol", platform: "PS5", stock: 6, featured: true, active: true },
  { id: "p2", slug: "xbox-series-x", name: "Xbox Series X", description: "12 teraflop güç, Quick Resume ve Game Pass uyumluluğu ile nesil ötesi performans.", price: 22499, old_price: null, image_url: u("photo-1621259182978-fbf93132d53d"), category: "Konsol", platform: "Xbox", stock: 3, featured: true, active: true },
  { id: "p3", slug: "dualsense-kablosuz-kol", name: "DualSense Kablosuz Kol", description: "Haptik geri bildirim ve adaptif tetikler ile oyunun her anını hisset.", price: 2899, old_price: 3299, image_url: u("photo-1592840496694-26d035b52b48"), category: "Aksesuar", platform: "PS5", stock: 24, featured: true, active: true },
  { id: "p4", slug: "rgb-mekanik-klavye", name: "RGB Mekanik Klavye", description: "Hot-swap switch, per-key RGB, alüminyum kasa. Rekabetçi oyuncular için.", price: 1899, old_price: 2399, image_url: u("photo-1595225476474-87563907a212"), category: "Aksesuar", platform: "PC", stock: 12, featured: true, active: true },
  { id: "p5", slug: "7-1-oyuncu-kulakligi", name: "7.1 Oyuncu Kulaklığı", description: "Surround ses, çıkarılabilir mikrofon ve memory-foam kulak yastıkları.", price: 1499, old_price: null, image_url: u("photo-1599669454699-248893623440"), category: "Aksesuar", platform: "PC", stock: 18, featured: false, active: true },
  { id: "p6", slug: "nintendo-switch-oled", name: "Nintendo Switch OLED", description: "7 inç OLED ekran, geliştirilmiş hoparlörler ve 64GB depolama.", price: 13999, old_price: 15499, image_url: u("photo-1578303512597-81e6cc155b3e"), category: "Konsol", platform: "Switch", stock: 5, featured: true, active: true },
  { id: "p7", slug: "retro-arcade-kolu", name: "Retro Arcade Kolu", description: "Klasik atari hissi: 8 buton, dayanıklı joystick, PC & konsol uyumlu.", price: 999, old_price: 1299, image_url: u("photo-1550745165-9bc0b252726f"), category: "Aksesuar", platform: "PC", stock: 9, featured: false, active: true },
  { id: "p8", slug: "oyuncu-mouse-pro", name: "Oyuncu Mouse Pro", description: "26K DPI sensör, 58g ultra hafif gövde, kablosuz 2.4GHz.", price: 1299, old_price: null, image_url: u("photo-1527814050087-3793815479db"), category: "Aksesuar", platform: "PC", stock: 30, featured: false, active: true },
];

export const demoEvents: GameEvent[] = [
  { id: "e1", title: "EA FC Çorum Kupası", description: "Çorum'un en iyi FC oyuncusu kim? 32 kişilik eleme usulü turnuva. Canlı yayın ve sürpriz ödüller!", image_url: u("photo-1542751371-adc38448a05e"), starts_at: inDays(4), location: "Game Lover Çorum", prize: "5.000₺ + DualSense", capacity: 32, register_url: null, active: true },
  { id: "e2", title: "Retro Gece: Arcade Maratonu", description: "Pac-Man, Street Fighter, Tekken… Gece boyu retro oyunlar, en yüksek skora ödül.", image_url: u("photo-1511512578047-dfb367046420"), starts_at: inDays(11, 21), location: "Game Lover Çorum", prize: "Retro Arcade Kolu", capacity: 50, register_url: null, active: true },
  { id: "e3", title: "Valorant 5v5 Takım Turnuvası", description: "Takımını kur, Çorum'u temsil et. Bracket sistemli, BO3 final.", image_url: u("photo-1538481199705-c710c4e965fc"), starts_at: inDays(18, 14), location: "Game Lover Çorum", prize: "10.000₺", capacity: 16, register_url: null, active: true },
];

export const demoCampaigns: Campaign[] = [
  { id: "c1", title: "Konsol Festivali", description: "Tüm konsollarda Çorum'un en düşük fiyat garantisi + 2. kolda %40 indirim.", image_url: u("photo-1486401899868-0e435ed85128"), badge: "%40 İNDİRİM", code: "KONSOL40", ends_at: inDays(6, 23), featured: true, active: true },
  { id: "c2", title: "Öğrenciye Özel", description: "Öğrenci belgeni göster, tüm aksesuarlarda ekstra %15 indirim kazan.", image_url: u("photo-1593305841991-05c297ba4575"), badge: "%15 EKSTRA", code: "OGRENCI15", ends_at: inDays(20, 23), featured: true, active: true },
  { id: "c3", title: "Eskiyi Getir, Yeniyi Götür", description: "Eski konsolunu getir, değerinde takas et. Anında değerleme!", image_url: u("photo-1612287230202-1ff1d85d1bdf"), badge: "TAKAS", code: null, ends_at: null, featured: true, active: true },
];

export const demoAds: Ad[] = [
  { id: "a1", title: "Yeni Nesil Oyun Deneyimi", subtitle: "PS5 Slim şimdi stokta — Çorum içi aynı gün teslim.", image_url: u("photo-1606144042614-b2417e99c4e3", 1600), link_url: "/urunler/playstation-5-slim", placement: "home", sort: 0, active: true },
  { id: "a2", title: "Oyna, Kazan!", subtitle: "Mini oyunlarda rekor kır, indirim kodunu kap.", image_url: u("photo-1552820728-8b83bb6b773f", 1600), link_url: "/oyunlar", placement: "products", sort: 0, active: true },
];
