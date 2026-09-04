# ALastik Denetim Görevleri (Stok Ürünleri)

Bu dosyadaki görevler `alastik-denetci` agent'ı tarafından okunur ve sırayla kontrol edilir.
Kapsam KENDİ STOK ürünleridir (`syncInfo.syncSource` = dia_api).
Diğer denetçiler: XML ürünleri → `denetim-gorevleri-xml.md` (alastik-xml-denetci);
frontend kodu → `denetim-gorevleri-frontend.md` (alastik-frontend-denetci);
backend kodu → `denetim-gorevleri-backend.md` (alastik-backend-denetci). Tam liste: `denetciler.md`.
Haftalık otomatik denetim her Pazartesi 10:00'da kendiliğinden çalışır; rapor `docs/alastik/raporlar/`
altına yazılır ve emir.bahcecioglu@artlastik.com + yagiz.yenen@artlastik.com adreslerine e-posta ile gönderilir.
Raporun başında son 7 günün sipariş özeti (adet, ciro, durum/ödeme kırılımı, günlük dağılım, en çok satanlar) yer alır.

## Görevler

### 1. Görselsiz ürünler
Satışta (webVisible, stoklu) olup hiç görseli olmayan ürünleri raporla:
`customImages` boş + `featuredImage` yok + `diaData.m_resimler` boş. Sayı + örnek liste (stok kodu, ürün adı).

### 2. Açıklamasız ürünler
Satışta olup açıklaması olmayan ürünleri raporla:
`customData.customDescription` ve `customData.siteDescriptions.alastik` ikisi de boş. Sayı + örnek liste.

### 3. Fiyatı olmayan ürünler
Satışta görünen ama satış fiyatı 0 veya eksik olan ürünleri raporla:
`diaData.m_birimler[0].fiyat4` yok/0 (XML üründe kural fiyatı da kontrol edilir). Sayı + tam liste.

Not: Hardcode ve bug denetimi bu dosyadan taşındı — frontend kodu için
`denetim-gorevleri-frontend.md`, backend kodu için `denetim-gorevleri-backend.md` geçerlidir.
