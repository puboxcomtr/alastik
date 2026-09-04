# ALastik XML Ürün Denetim Görevleri

Bu dosyadaki görevler `alastik-xml-denetci` agent'ı tarafından okunur ve sırayla kontrol edilir.
Kapsam: yalnız XML kaynaklı ürünler (`syncInfo.syncSource='xml_integration'`, sites: alastik).
Haftalık otomatik denetim raporunun XML bölümleri de bu görevlere göre üretilir.

## Görevler

### 1. Görselsiz XML ürünler
Satışta olup hiç görseli olmayan XML ürünleri raporla (customImages + featuredImage + m_resimler boş).

### 2. Açıklamasız XML ürünler
Satışta olup açıklaması olmayan XML ürünleri raporla (customDescription ve siteDescriptions.alastik boş).

### 3. Fiyatı olmayan XML ürünler
Satışta görünüp fiyat4 > 0 olmayan XML ürünleri raporla; kural fiyatının (platform alastik) uygulanmadığı ürünleri işaretle.

### 4. Kargo dahil fiyat eksikleri
shippingIncludedPrice/shippingPerUnit sıfır ya da eksik olan satıştaki XML ürünleri raporla (desi bilgisi olmayanları ayrıca işaretle).

### 5. Kaynak ve eşleşme sağlığı
Aktif XML kaynaklarının son sync zamanı/durumu; diaKey'siz veya hata durumundaki xmlproducts oranı; uzun süredir senkron olmayan kaynak varsa bildir.

### 6. Eşleştirme istatistikleri
Kaynak başına ve genel toplamda: eşleştirilen ürün adedi (gerçek DIA kartına bağlı / otomatik -XML kartına bağlı ayrımıyla) ve eşleştirilmeyen (diaKey'siz) ürün adedi. Haftalık raporda tablo olarak paylaşılır.
