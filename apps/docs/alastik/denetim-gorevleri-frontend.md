# ALastik Frontend Denetim Görevleri

Bu dosyadaki görevler `alastik-frontend-denetci` agent'ı tarafından okunur ve sırayla kontrol edilir.
Kapsam: `apps/web` vitrin kodu (ALastik). Referans standart: `docs/alastik/frontend-standartlari.md`.

## Görevler

### 1. Standart uyumu
Son değişikliklerde frontend standartlarına aykırılık: Cartzilla/Bootstrap dışı stil, yeni font/ikon,
hex gömülü renk, bozulan sayfa deseni (vitrin sırası, kategori düzeni, ürün kartı).

### 2. Hardcode ihlalleri
Vitrin kodunda gömülü site adı/domain/renk/izleme ID'si/metin; doğrusu siteConfig/ayarlardan okumak.

### 3. Vitrin bugları
Son değişen dosyalarda: null/undefined riski, eksik hata/yükleme durumu, iki sitenin karışması,
unutulmuş console.log/debug, kırık import.

### 4. Fiyat/görsel yardımcı kullanımı
Bileşen içinde elle yazılmış fiyat/görsel mantığı (productHelpers dururken) raporlanır.
