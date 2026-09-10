# Takımlama (Ön/Arka Lastik Ebat Uyumu)

> Kapsam: **ALastik ve LastikJantAVM — iki site, tüm lastik ürünleri** (7 Eyl 2026 kararı).
> Durum: KONSEPT AŞAMASI — önce frontend tasarımı yapılacak, backend sonra. Kod yazılmadı.

## Konsept

Bir lastik ebatı seçildiğinde, aynı araçta **karşı aksa uyan ebatlar** vardır:

- Ön ebat seçildi (ör. **205/55R16**) → arkaya uyan (genellikle daha geniş) ebatlar listelenir.
- Arka ebat seçildi → öne uyan ebatlar listelenir.

Bu iki yönlü ebat uyum ilişkisine **takımlama** diyoruz. Müşteri ön ve arka için
farklı ama birbirine uyumlu ebatları **takım halinde** (2 ön + 2 arka) satın alabilir.

## İki kullanım senaryosu

1. **Staggered (farklı ön/arka) satış:** Aracı gereği ön/arka farklı ebat kullanan
   müşteriye uyumlu kombinasyonu tek yerden sunmak.
2. **Stok tamamlama (kritik fayda):** Müşteri 205/55R16'dan 4 adet istiyor ama
   stokta 2 adet kaldı → kalan 2 teker, bu ebatın **arkaya uyan** ebatlarından
   tamamlanır. Böylece 2 adetlik küsurat stoklar da tam takım satışına dönüşür.

## Alınan kararlar (7 Eyl 2026)

- Kapsam: iki site, tüm lastikler (sıfır dahil; yalnız 2.El değil).
- Eşleştirme: **otomatik öneri + panelden manuel düzeltme** (onay/ret/elle ekleme).
- Satın alma: **ürün sayfasında takım kutusu** — uyumlu ürün gösterilir, birlikte
  sepete eklenir (ayrı "takım ilanı" ürünü YOK).

## KEŞİF (7 Eyl): Wheel-Size API ön/arka çiftlerini VERİYOR

`WheelSizeService.getVehicleDetails` (`/search/by_model/`) her araç modifikasyonunun
donanımlarını ön/arka ayrımıyla döner; staggered donanımda gerçek çift gelir
(BMW testi: 225/45R18 ön ↔ 255/40R18 arka, 225/40R19 ↔ 255/35R19,
225/35R20 ↔ 255/30R20; tek tip donanımda arka boş). `searchByTire`
(`/by_tire/search/`) ile ebattan araca gidilebilir. ÖNERİ: ebat eşleme tablosu
formülle değil bu gerçek donanım verisinden türetilip DB'de önbelleklenir
(dış API canlıda çağrılmaz), panelden düzeltilir.

## Açık sorular (kullanıcı anlatımı devam ediyor — kod yazmadan önce netleşecek)

- Ebat uyumu kaynağı: Wheel-Size donanım çiftleri (yukarıdaki keşif) esas alınsın mı?
- Takım kutusunda marka/model/mevsim aynı olmak zorunda mı, yoksa yalnız ebat
  uyumu mu esas?
- Takım adedi varsayılanı (2 ön + 2 arka?) ve adet değiştirme davranışı.
- Takım fiyatı: iki ürünün toplamı mı, takıma özel indirim tanımlanabilir mi?
- Stok tamamlama senaryosunda kutunun tetiklenme koşulu (stok < istenen adet?).

## Sıra

1. **Frontend tasarımı** (önce bu — kullanıcı anlatımıyla şekillenecek)
2. Backend (model + öneri servisi + panel yönetimi + public uç)

## İlgili veri alanları (keşif notu)

- Ebat: `diaData.ozelkod3kodu` (ör. `205/55R16`), jant çapı: `diaData.ozelkod4kodu`
- Marka: `diaData.marka`, desen/model: `diaData.ozelkod5kodu`, mevsim: `diaData.ozelkod1kodu`
- 2.El tespiti: `m_kategoriler.kategori_aciklama_1` "İkinci El" ile başlar
