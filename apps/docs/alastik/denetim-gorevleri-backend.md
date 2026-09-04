# ALastik Backend Denetim Görevleri

Bu dosyadaki görevler `alastik-backend-denetci` agent'ı tarafından okunur ve sırayla kontrol edilir.
Kapsam: `apps/api` + `apps/admin` arka plan kodu (ALastik).

## Görevler

### 1. Hardcode ihlalleri
Koda gömülü fiyat/oran/eşik/e-posta/domain/ID/liste; "şimdilik sabit" yazılmış her değer bulgudur.
Doğrusu: DB'de ayar + panelden yönetim.

### 2. Site filtresi eksikleri
`req.site` kullanmayan sorgular, `site` alanı olmayan site kapsamlı modeller,
sitesiz filtreyle yazılmış toplu update'ler.

### 3. Ortak ürün kuralı ihlalleri
ALastik dışı site verisinin global alanlara (fiyat4, webPrice, shippingIncludedPrice) yazıldığı yerler.

### 4. Auth/güvenlik
`/api/admin` altına auth'suz uç, gereksiz public istisna, sır loglama.

### 5. Backend bugları
Son değişen dosyalarda: null/undefined, unhandled promise, strict şema tuzağı,
MongoDB dizi yolu + `$in:[null]` tuzağı, yanlış filtre/index.
