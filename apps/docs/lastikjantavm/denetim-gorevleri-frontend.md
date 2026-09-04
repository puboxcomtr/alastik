# LastikJantAVM Frontend Denetim Görevleri

Bu dosyadaki görevler `lastikjantavm-frontend-denetci` agent'ı tarafından okunur ve sırayla kontrol edilir.
Kapsam: `apps/web` vitrin kodu (LJA). Referans standart: `docs/lastikjantavm/frontend-standartlari.md`.

## Görevler

### 1. Standart uyumu
Son değişikliklerde frontend standartlarına aykırılık: Cartzilla/Bootstrap dışı stil, yeni font/ikon,
hex gömülü renk, bozulan sayfa deseni (anasayfa blok sırası, kategori düzeni, ürün kartı, montaj sayfaları).

### 2. Hardcode ihlalleri
Vitrin kodunda gömülü site adı/domain/renk/izleme ID'si/metin; doğrusu siteConfig/tracking/ayarlardan okumak.

### 3. Vitrin bugları
Son değişen dosyalarda: null/undefined riski, eksik hata/yükleme durumu, iki sitenin karışması
(ortak sarmalayıcılara `site="lastikjantavm"` prop'unun geçilmemesi dahil), unutulmuş console.log/debug, kırık import.

### 4. Fiyat/görsel yardımcı kullanımı
Bileşen içinde elle yazılmış fiyat mantığı (B2C oranı, Artvin kargo payı) veya görsel mantığı
(productHelpers dururken) raporlanır.
