# LastikJantAVM XML Ürün Denetim Görevleri

Bu dosyadaki görevler `lastikjantavm-xml-denetci` agent'ı tarafından okunur ve sırayla kontrol edilir.
Kapsam: yalnız XML kaynaklı ürünler (`syncInfo.syncSource='xml_integration'`, sites: lastikjantavm).
Haftalık otomatik denetim raporunun XML bölümleri de bu görevlere göre üretilir.

## Görevler

### 1. Görselsiz XML ürünler
Satışta olup hiç görseli olmayan XML ürünleri raporla (customImages + featuredImage + m_resimler boş).

### 2. Açıklamasız XML ürünler
Satışta olup açıklaması olmayan XML ürünleri raporla (customDescription ve siteDescriptions.lastikjantavm boş).

### 3. Fiyatı olmayan XML ürünler
Satışta görünüp `customData.siteData.lastikjantavm.xmlPrice` > 0 olmayan XML ürünleri raporla;
b2c kural fiyatının (site lastikjantavm, platform b2c) uygulanmadığı ürünleri işaretle.
`b2b`/`alastik` platformlu kayıtlar LJA'da etkisizdir, onlara bakarak karar verme.

### 4. Kargo dahil fiyat eksikleri
`siteData.lastikjantavm.shippingIncludedPrice` / `shippingPerUnit` sıfır ya da eksik olan satıştaki XML ürünleri
raporla (desi bilgisi olmayanları ayrıca işaretle). Beklenen: xmlPrice + Artvin kargo payı.

### 5. Kaynak ve eşleşme sağlığı
Aktif XML kaynaklarının (`webxml` site=lastikjantavm, `*_lastikjantavm` kodları) son sync zamanı/durumu;
diaKey'siz veya hata durumundaki xmlproducts oranı; uzun süredir senkron olmayan kaynak varsa bildir.

### 6. Eşleştirme istatistikleri
Kaynak başına ve genel toplamda: eşleştirilen ürün adedi (gerçek DIA kartına bağlı / otomatik -XML kartına bağlı
ayrımıyla) ve eşleştirilmeyen (diaKey'siz) ürün adedi. Haftalık raporda tablo olarak paylaşılır.
