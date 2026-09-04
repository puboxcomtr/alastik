# ALastik Frontend Standartları

Bu dosya ALastik vitrininin (alastik.com) MEVCUT teknoloji ve tasarım standardıdır.
`alastik-frontend` agent'ı her işte bu standarda uyar; burada yazmayan yeni bir tasarım dili,
renk, yazı tipi veya bileşen deseni İCAT ETMEZ. Standart değişecekse önce bu dosya güncellenir.

## Teknoloji yığını
- Next.js 15 (App Router) + React 19 + TypeScript — `apps/web`
- Route slug'ları Türkçedir: `urun`, `sepet`, `odeme`, `kategori`, `siparis-basarili` …
- CSS: **Bootstrap 5.3 + Cartzilla teması** (`public/alastik/assets/css/theme.min.css`, `--cz-*` değişkenleri) + `react-bootstrap`. Tailwind 4 pakette kurulu ama ana tema Cartzilla'dır — yeni bileşenlerde Cartzilla/Bootstrap sınıfları kullanılır, Tailwind'e geçilmez.
- Slider/karusel: **Swiper** (`swiper/react`; Navigation, Pagination, EffectFade, Autoplay modülleri)
- İkonlar: **Cartzilla ikon fontu** (`ci-*` sınıfları: ci-chevron-right, ci-star, ci-info …) — başka ikon seti eklenmez.
- Bildirimler: `react-toastify` / `react-hot-toast`; onay pencereleri SweetAlert2 (CDN, layout'ta yüklü).
- Formlar: `react-hook-form`.

## Tema ve renkler
- Tek doğruluk kaynağı: `src/config/siteConfig.ts` → `SITES.alastik.theme`
  - primary/secondary: `#f2223b` (ALastik kırmızısı)
  - logo: `/logo-alastik.png`, assets: `/alastik/assets`, tema: `/alastik/assets/css/theme.min.css`
- Renkler koda hex olarak gömülmez; Cartzilla değişkenleri (`--cz-primary` vb.) ve Bootstrap yardımcı sınıfları kullanılır. Yeni renk gerekiyorsa önce bu dosyaya ve siteConfig'e eklenir.

## Tipografi
- Yazı tipi: **Inter** (`next/font/google`, `--font-inter` değişkeni); Cartzilla gövde fontu da Inter'dir. Arial/Helvetica yalnız fallback.
- Yeni font eklenmez. Başlık/gövde boyutları Cartzilla'nın h1–h6 ve `fs-*` ölçeğinden gelir; özel font-size yazılmaz.
- Kategori SEO içeriği istisnası: başlıklar gövde boyutunda gösterilir (`.category-seo-content`, globals.css).

## Bileşen yapısı
- ALastik'e özel bileşenler: `src/components/alastik/` — Header, Footer, homepage (Slider, Showcase, TireSearch, Brand, Blog, Testimonials), category (Top, Header, Sidebar, Filter, Pagination), product (top/left/middle/right/bottom), shop/Product.
- Sayfa görünümleri: `src/views/alastik/` (HomePage, Header, Footer). Sayfalar site'a göre dallanır (`x-site` header → `site === 'lastikjantavm'` ayrımı); ALastik varsayılan daldır.
- Ortak (site bağımsız) parçalar `src/components/` kökünde ve `src/views/` altındadır — ortak parçayı değiştirirken LJA görünümünü bozmamak zorunludur.
- Global stiller: `src/app/globals.css` (yalnız küçük, yorumlanmış istisnalar) — sayfa bazlı inline `<style>` yazılmaz.

## Sayfa desenleri (değiştirilmez, genişletilir)
- **Vitrin (anasayfa)**: Slider → TireSearch (lastik arama) → Showcase ürün vitrinleri → Brand şeridi → Blog → Testimonials sırası korunur.
- **Kategori görünümü**: üstte kategori başlığı/açıklaması (Top/Header), solda Sidebar (filtre menüleri kendi içinde dikey kaydırmalı, `.category-menu`), ürünler Bootstrap grid kartlarıyla, altta Pagination; SEO içeriği sayfa altında kaydırmalı kutuda.
- **Ürün kartı**: `shop/Product` kart deseni; fiyat gösterimi `productHelpers.getProductPrice` üzerinden (kargo dahil fiyat > webPrice > fiyat4) — kartta fiyat mantığı elle yazılmaz.
- **Ürün detayı**: product/top-left-middle-right-bottom blok düzeni korunur.

## Veri ve fiyat kuralları
- API erişimi `src/config/api.ts` (`fetchAPI` + `API_ENDPOINTS`) ile; eski `src/lib/api.ts` (ApiClient) yeni kodda kullanılmaz.
- Fiyat/görsel yardımcıları `src/hooks/Products/productHelpers.ts` — getProductPrice, getProductImage, getProductUrl. Bu yardımcılar dururken bileşen içinde aynı mantık tekrar yazılmaz.
- Görsel URL'leri `getImageUrl` ile mutlaklaştırılır; medya kökü env'den gelir.

## Çalışma ilkeleri
1. ÖNCE mevcut benzer bileşeni bul ve onun desenini kopyala; sıfırdan tasarım üretme.
2. Hardcode yasak: site adı/domain/renk/ID `siteConfig.ts`'ten okunur.
3. UI metinleri Türkçe (ş ğ ü ç düzgün), değişken adları İngilizce.
4. Responsive: Bootstrap grid/breakpoint'leri (`col-*`, `d-*-none` …); özel media query son çare.
5. Deploy: `cd apps/web && npm run build && pm2 restart alastik-web` (CANLI port 3080).
