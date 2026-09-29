# 🎮 Game Lover — game-lover.com

Çorum'un oyun mağazası için Next.js 15 + Supabase + Vercel ile yapılmış site.

## Neler var?

| Bölüm | Özellikler |
|---|---|
| **Vitrin** | Parçacık animasyonlu hero, 3B eğimli ürün kartları, kaydırınca beliren bölümler, reklam slaytı, kayan şerit, imleç ışığı |
| **Mağaza** | Arama, kategori/platform filtresi, sıralama, ürün detayı, sepet, sipariş (kapıda ödeme / havale / mağazada) |
| **Kampanyalar** | Geri sayım, tek tıkla kupon kopyalama, paylaşım butonları |
| **Etkinlikler** | Turnuva kartları, geri sayım, kayıt formu |
| **Oyun Salonu** | 6 HTML5 oyun: Uzay Savaşı, Neon Yılan, 2048, Tuğla Kırıcı, Neon Kuş, Hafıza. Liderlik tablosu, yüksek skora indirim kodu |
| **Takas & Teklif** | Takas, 2. el satış, toplu alım, etkinlik kaydı talepleri → e-posta ile sana gelir |
| **E-posta** (Nodemailer) | Yeni sipariş/teklif bildirimi, müşteriye sipariş onayı ve durum güncellemesi, fırsat bülteni, her pazartesi otomatik bülten + haftalık rapor |
| **Yönetim paneli** (`/admin`) | Ürün/kampanya/etkinlik/reklam ekle-düzenle (fotoğraf yükleme), sipariş yönetimi (durum, WhatsApp, CSV), teklifler, aboneler, bülten gönderme, ayarlar |
| **Sosyal medya** | Profil linkleri, her içerikte paylaşım menüsü, Make/Zapier webhook ile Instagram/Facebook/X'e **otomatik gönderi** |

Supabase anahtarları olmadan da site **demo verilerle** çalışır.

---

## 1) Bilgisayarda çalıştırma

```bash
npm install
npm run dev
```

→ http://localhost:3000

## 2) Supabase kurulumu (ücretsiz)

1. https://supabase.com → **New project** (bölge: Frankfurt).
2. **SQL Editor** → `supabase/schema.sql` içeriğini yapıştır → **Run**.
3. **Authentication → Users → Add user**: kendi e-postan ve bir şifre ile yönetici kullanıcısını oluştur (Auto confirm işaretli).
4. **Project Settings → API**'den şu değerleri al:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (gizli tut!)
5. `.env.example` dosyasını `.env.local` olarak kopyala ve değerleri doldur.

## 3) E-posta (Nodemailer + Gmail)

1. Google Hesabı → **Güvenlik** → 2 Adımlı Doğrulama'yı aç.
2. **Uygulama şifreleri** → yeni şifre oluştur (16 karakter).
3. `SMTP_USER=gmail adresin`, `SMTP_PASS=uygulama şifresi`, `ADMIN_NOTIFY_EMAIL=bildirimlerin gideceği adres`.

> Gmail günde ~500 alıcı sınırı uygular. Abone sayısı büyürse SMTP ayarlarını
> Brevo / Amazon SES gibi bir servise çevirmen yeterli (kod değişmez).

## 4) Vercel'e yayınlama

1. Projeyi GitHub'a yükle.
2. https://vercel.com → **Add New Project** → repoyu seç.
3. **Environment Variables** bölümüne `.env.example`'daki tüm değişkenleri gir
   (`NEXT_PUBLIC_SITE_URL=https://game-lover.com`, `CRON_SECRET` için uzun rastgele bir değer).
4. **Deploy**.
5. **Settings → Domains** → `game-lover.com` ekle, verdiği DNS kayıtlarını alan adı sağlayıcına gir.
6. Supabase → **Authentication → URL Configuration** → Site URL: `https://game-lover.com`,
   Redirect URLs: `https://game-lover.com/admin/auth/callback`.

Haftalık bülten `vercel.json` içindeki cron ile her pazartesi 10:00'da (TR) otomatik gider.

## 5) Sosyal medya hesaplarını bağlama

Panel → **Ayarlar & Sosyal Medya**:
- Profil linklerini gir (Instagram, Facebook, TikTok, YouTube, X, WhatsApp).
- **Otomatik paylaşım**: Make.com'da *Webhooks → Custom webhook* ile senaryo kur, ardına Instagram/Facebook/X modüllerini ekle,
  `image_url` ve `caption` alanlarını eşle. Webhook adresini panele yapıştır → *Test gönder*.
  Artık ürün/kampanya/etkinlik eklerken "Sosyal medyada otomatik paylaş" işaretliyse gönderi otomatik atılır.

> Instagram ve Facebook'un resmi API'si doğrudan site üzerinden gönderi atmak için Meta uygulama onayı ister;
> Make/Zapier bu onayı zaten almış olduğundan en hızlı ve güvenli yol budur.

## Klasör yapısı

```
app/(site)/        Ziyaretçi sayfaları (ana sayfa, mağaza, kampanyalar, etkinlikler, oyunlar, sepet, teklif)
app/admin/         Yönetim paneli + server actions
app/api/           Sipariş, bülten, teklif, skor ve cron uçları
components/        Arayüz bileşenleri (animasyonlar, kartlar, formlar)
games/             HTML5 oyunlar + oyun kabuğu (skor, liderlik, ödül)
lib/               Supabase istemcileri, veri katmanı, e-posta, sosyal medya
supabase/schema.sql
```

## Sonraki adımlar için fikirler

- Online kartla ödeme: iyzico veya PayTR entegrasyonu
- Kupon kodlarının sepette otomatik indirim uygulaması
- Ürün başına çoklu fotoğraf galerisi
