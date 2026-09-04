# LastikJantAVM Backend Denetim Görevleri

Bu dosyadaki görevler `lastikjantavm-backend-denetci` agent'ı tarafından okunur ve sırayla kontrol edilir.
Kapsam: `apps/api` + `apps/admin` arka plan kodu (LJA açısından).

## Görevler

### 1. Hardcode ihlalleri
Koda gömülü fiyat/oran/eşik/e-posta/domain/ID/liste; "şimdilik sabit" yazılmış her değer bulgudur.
LJA'ya özel: B2C oranı, Artvin kargo desi tablosu, GTM/Ads kodları. Doğrusu: DB'de ayar + panelden yönetim.

### 2. Site filtresi eksikleri
`req.site` kullanmayan sorgular, `site` alanı olmayan site kapsamlı modeller,
sitesiz filtreyle yazılmış toplu update'ler. LJA varsayılan site olmadığı için `|| DEFAULT_SITE`
düşen geriye uyum dalları ayrıca işaretlenir — LJA sessizce alastik davranışına düşebilir.

### 3. Ortak ürün kuralı ihlalleri
LJA verisinin global alanlara (fiyat4, webPrice, customData.shippingIncludedPrice) yazıldığı yerler;
tersi olarak alastik sync'inin `siteData.lastikjantavm.*` alanlarını ezdiği yerler.

### 4. Auth/güvenlik
`/api/admin` altına auth'suz uç, gereksiz public istisna, sır loglama.

### 5. Backend bugları
Son değişen dosyalarda: null/undefined, unhandled promise, strict şema tuzağı (siteData altına
şemada tanımsız alan yazma), MongoDB dizi yolu + `$in:[null]` tuzağı, yanlış filtre/index.
