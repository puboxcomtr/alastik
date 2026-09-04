# LastikJantAVM Denetçileri

LJA tarafında denetim yapan agent'ların listesi. Tümü SALT OKUNUR çalışır: hiçbir şeyi
değiştirmez, yalnız kontrol eder ve bulgu raporlar; düzeltmeyi geliştirici/operatör yapar.

| Denetçi | Kapsam | Görev dosyası |
|---|---|---|
| `lastikjantavm-denetci` | Kendi stok (DIA) ürünleri: görsel/açıklama/fiyat eksikleri, B2C fiyat doğrulaması, feed, iki sitenin karışmaması | `docs/lastikjantavm/denetim-gorevleri.md` |
| `lastikjantavm-xml-denetci` | XML kaynaklı ürünler: görsel/açıklama/fiyat eksikleri, b2c kural fiyat tutarlılığı, Artvin kargo dahil fiyat, kaynak sağlığı, eşleştirme istatistikleri | `docs/lastikjantavm/denetim-gorevleri-xml.md` |
| `lastikjantavm-frontend-denetci` | Vitrin kodu (apps/web): frontend standartlarına uyum, tasarım tutarlılığı, hardcode, vitrin bugları | `docs/lastikjantavm/denetim-gorevleri-frontend.md` |
| `lastikjantavm-backend-denetci` | Backend kodu (apps/api + apps/admin): hardcode, req.site eksikleri, ortak ürün kuralı, auth/güvenlik, buglar, panel-yönetilebilirlik | `docs/lastikjantavm/denetim-gorevleri-backend.md` |

## Görev dağılımı
- Ürün `syncInfo.syncSource = 'dia_api'` (kendi stok) ise → **lastikjantavm-denetci**
- Ürün `syncInfo.syncSource = 'xml_integration'` (XML tedarikçi) ise → **lastikjantavm-xml-denetci**
- Vitrin kodu (apps/web) → **lastikjantavm-frontend-denetci**
- Backend kodu (apps/api + apps/admin) → **lastikjantavm-backend-denetci**

## Haftalık otomatik denetim
- Zamanlama: her **Pazartesi 11:00** (sunucu cron'u; ALastik denetimi 10:00'da çalışır, çakışmasın diye 1 saat sonra), kullanıcı müdahalesi gerekmez.
- Boru hattı: `apps/api/scripts/denetim/lastikjantavm-haftalik.sh`
  1. Sipariş özeti (son 7 gün: adet, ciro, durum/ödeme kırılımı, günlük dağılım, en çok satanlar)
  2. Ürün kalitesi kontrolleri — Stok/XML ayrımlı (görselsiz, açıklamasız, fiyatsız)
  3. Kargo dahil fiyatı eksik XML ürünler (`siteData.lastikjantavm.shippingIncludedPrice`)
  4. XML eşleştirme istatistikleri (kaynak başına eşleşen/eşleşmeyen adetler)
  5. Kod taraması (son 1 haftanın değişiklikleri: frontend + backend görev listeleriyle hardcode/bug)
- Rapor: `docs/lastikjantavm/raporlar/lastikjantavm-denetim-<tarih>.md`
- E-posta alıcıları: emir.bahcecioglu@artlastik.com, yagiz.yenen@artlastik.com
- Log: `/var/log/lastikjantavm-denetim.log`

## Elle çalıştırma
- Tek denetçi: "LJA denetçisi görevlerini çalıştırsın" / "LJA XML denetçisi kontrol etsin" demek yeterli.
- Tam haftalık rapor + mail: `/var/www/alastik/apps/api/scripts/denetim/lastikjantavm-haftalik.sh`
