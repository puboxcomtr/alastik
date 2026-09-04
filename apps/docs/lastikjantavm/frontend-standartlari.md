# LastikJantAVM Frontend Standartları

Bu dosya LJA vitrininin (lastikjantavm.com) MEVCUT teknoloji ve tasarım standardıdır.
`lastikjantavm-frontend` agent'ı her işte bu standarda uyar; burada yazmayan yeni bir tasarım dili,
renk, yazı tipi veya bileşen deseni İCAT ETMEZ. Standart değişecekse önce bu dosya güncellenir.

## Teknoloji yığını
- Next.js 15 (App Router) + React 19 + TypeScript — `apps/web`
- Route slug'ları Türkçedir: `urun`, `sepet`, `odeme`, `kategori`, `montaj-noktalari`, `siparis-basarili` …
- CSS: **Bootstrap 5.3 + Cartzilla teması** (`public/lastikjantavm/assets/css/theme.min.css`, `--cz-*` değişkenleri) + `react-bootstrap`. Tailwind 4 pakette kurulu ama ana tema Cartzilla'dır — yeni bileşenlerde Cartzilla/Bootstrap sınıfları kullanılır, Tailwind'e geçilmez.
- Slider/karusel: **Swiper** (`swiper/react`; Navigation, Pagination, EffectFade, Autoplay modülleri)
- İkonlar: **Cartzilla ikon fontu** (`ci-*` sınıfları: ci-chevron-right, ci-star, ci-info …) — başka ikon seti eklenmez.
- Bildirimler: `react-toastify` / `react-hot-toast`; onay pencereleri SweetAlert2 (CDN, layout'ta yüklü).
- Formlar: `react-hook-form`.

## Tema ve renkler
- Tek doğruluk kaynağı: `src/config/siteConfig.ts` → `SITES.lastikjantavm.theme`
  - primary: `#e4cc15` (LJA sarısı), secondary: `#313131` (koyu gri)
  - logo: `/logo-lastikjantavm.png`, assets: `/lastikjantavm/assets`, tema: `/lastikjantavm/assets/css/theme.min.css`, favicon: `/lastikjantavm/favicon.ico`
- Renkler koda hex olarak gömülmez; Cartzilla değişkenleri (`--cz-primary` vb.) ve Bootstrap yardımcı sınıfları kullanılır. Yeni renk gerekiyorsa önce bu dosyaya ve siteConfig'e eklenir.
- Sarı zemin üzerinde okunabilirlik: primary arka planda metin rengi koyu (secondary) olur; primary'yi metin rengi olarak açık zeminde kullanma.

## Tipografi
- Yazı tipi: **Inter** (`next/font/google`, `--font-inter` değişkeni); Cartzilla gövde fontu da Inter'dir. Arial/Helvetica yalnız fallback.
- Yeni font eklenmez. Başlık/gövde boyutları Cartzilla'nın h1–h6 ve `fs-*` ölçeğinden gelir; özel font-size yazılmaz.

## Bileşen yapısı
- LJA'ya özel bileşenler: `src/components/lastikjantavm/` — Header (Topbar, Middle, Navbar/MegaItem, MobileMenu, MontageMarquee), Footer (Top/Bottom), homepage (Slider, TireSearch, CallbackForm, Brand, Showcase, Blog, Testimonials), category (Top, Header, Sidebar, Filter, Pagination), product (top/left/middle/right/bottom), shop (Product/Showcase, Slide, DraggableBanner), montage (MontageDetail, MontageMap, MontageStickyBar, montageShared), Contact.
- Sayfa görünümleri: `src/views/lastikjantavm/` (HomePage, Header, Footer). Sayfalar site'a göre dallanır (`x-site` header → `site === 'lastikjantavm'` ayrımı); ALastik varsayılan daldır, LJA açıkça kontrol edilir.
- Ortak sarmalayıcılar (`src/app/homepage/*`, `src/components/` kökü, hooks, config) site bağımsızdır ve LJA davranışını **`site="lastikjantavm"` prop'uyla** alır — dosyanın içine site gömülmez. Ortak parçayı değiştirirken ALastik görünümünü bozmamak zorunludur.
- Global stiller: `src/app/globals.css` (yalnız küçük, yorumlanmış istisnalar) — sayfa bazlı inline `<style>` yazılmaz.

## Sayfa desenleri (değiştirilmez, genişletilir)
- **Vitrin (anasayfa)**: TireSearch (lastik arama) → CallbackForm → Slider → Brand şeridi → DraggableBanner → vitrin blokları (`ProductShowCase`/`SingleShowCase` + her birinin altında `ShowcaseBanner`, showcaseKey: second/third/fourth/fifth) → Testimonials → Blog sırası korunur. Vitrin içerikleri panelden (showcase/banner ayarları) yönetilir, koda gömülmez.
- **Kategori görünümü**: üstte kategori menüsü/slider ve kategori başlığı (Top/Header), solda Sidebar filtreleri (Kategori, Marka, Fiyat, Mevsim, Hız endeksi, Yakıt, Hacim, Üretim yılı, OEM, Özellikler), mobilde offcanvas filtre/sıralama (MobileFilterOffcanvas / MobileSortOffcanvas), ürünler Bootstrap grid kartlarıyla, altta Pagination; SEO içeriği sayfa altında.
- **Ürün kartı**: `shop/Product/Showcase/Card` deseni; fiyat gösterimi `productHelpers.getProductPrice` üzerinden (LJA'da kargo dahil fiyat > site fiyatı) — kartta fiyat mantığı elle yazılmaz.
- **Ürün detayı**: top (Breadcrumb, Garage) → left (Gallery) / middle (Title, Middle) / right (AddCart) → bottom (Description) blok düzeni korunur.
- **Montaj noktaları**: liste + detay (MontageDetail, MontageMap, MontageStickyBar) deseni; header'daki MontageMarquee şeridi panelden yönetilen içerikle beslenir.

## Veri ve fiyat kuralları
- API erişimi `src/config/api.ts` (`fetchAPI` + `API_ENDPOINTS`) ile; eski `src/lib/api.ts` (ApiClient) yeni kodda kullanılmaz.
- Fiyat/görsel yardımcıları `src/hooks/Products/productHelpers.ts` — getProductPrice, getProductImage, getProductUrl. Bu yardımcılar dururken bileşen içinde aynı mantık tekrar yazılmaz.
- LJA fiyatı API'den `customData.siteData.lastikjantavm` altında gelir (XML üründe `xmlPrice`, kargo dahil `shippingIncludedPrice`). B2C oranı veya Artvin kargo tablosu vitrin kodunda HESAPLANMAZ.
- Kargo fiyata gömülüdür; sepette ayrı kargo satırı gösterilmez.
- Görsel URL'leri `getImageUrl` ile mutlaklaştırılır; medya kökü env'den gelir.
- İzleme: GTM `GTM-MWVF56WW`, Ads `AW-666191332` — `src/config/tracking.ts` site haritasından okunur, bileşene gömülmez.

## Çalışma ilkeleri
1. ÖNCE mevcut benzer bileşeni bul ve onun desenini kopyala; sıfırdan tasarım üretme.
2. Hardcode yasak: site adı/domain/renk/ID `siteConfig.ts` / `tracking.ts`'ten okunur.
3. UI metinleri Türkçe (ş ğ ü ç düzgün), değişken adları İngilizce.
4. Responsive: Bootstrap grid/breakpoint'leri (`col-*`, `d-*-none` …); özel media query son çare.
5. Deploy: `cd apps/web && npm run build && pm2 restart alastik-web` (CANLI port 3080).
