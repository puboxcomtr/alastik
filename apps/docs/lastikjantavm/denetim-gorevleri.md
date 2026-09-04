# LastikJantAVM Denetim Görevleri (Stok Ürünleri)

Bu dosyadaki görevler `lastikjantavm-denetci` agent'ı tarafından okunur ve sırayla kontrol edilir.
Kapsam KENDİ STOK ürünleridir (`syncInfo.syncSource` = dia_api).
Diğer denetçiler: XML ürünleri → `denetim-gorevleri-xml.md` (lastikjantavm-xml-denetci);
frontend kodu → `denetim-gorevleri-frontend.md` (lastikjantavm-frontend-denetci);
backend kodu → `denetim-gorevleri-backend.md` (lastikjantavm-backend-denetci). Tam liste: `denetciler.md`.
Haftalık otomatik denetim her Pazartesi 11:00'da kendiliğinden çalışır; rapor `docs/lastikjantavm/raporlar/`
altına yazılır ve emir.bahcecioglu@artlastik.com + yagiz.yenen@artlastik.com adreslerine e-posta ile gönderilir.
Raporun başında son 7 günün sipariş özeti (adet, ciro, durum/ödeme kırılımı, günlük dağılım, en çok satanlar) yer alır.

## Görevler

### 1. Görselsiz ürünler
Satışta (webVisible, stoklu) olup hiç görseli olmayan ürünleri raporla:
`customImages` boş + `featuredImage` yok + `diaData.m_resimler` boş. Sayı + örnek liste (stok kodu, ürün adı).

### 2. Açıklamasız ürünler
Satışta olup açıklaması olmayan ürünleri raporla:
`customData.customDescription` ve `customData.siteDescriptions.lastikjantavm` ikisi de boş. Sayı + örnek liste.

### 3. Fiyatı olmayan ürünler
Satışta görünen ama satış fiyatı 0 veya eksik olan ürünleri raporla.
LJA'da stok ürünün satış fiyatı fiyat1 tabanlıdır (fiyat1 × B2C oran), bu yüzden
`diaData.m_birimler[0].fiyat1` yok/0 olanlar bulgudur. Sayı + tam liste.

Not: Hardcode ve bug denetimi bu dosyada değildir — frontend kodu için
`denetim-gorevleri-frontend.md`, backend kodu için `denetim-gorevleri-backend.md` geçerlidir.
