# ALastik Denetçileri

ALastik tarafında denetim yapan agent'ların listesi. Tümü SALT OKUNUR çalışır: hiçbir şeyi
değiştirmez, yalnız kontrol eder ve bulgu raporlar; düzeltmeyi geliştirici/operatör yapar.

| Denetçi | Kapsam | Görev dosyası |
|---|---|---|
| `alastik-denetci` | Kendi stok (DIA) ürünleri: görsel/açıklama/fiyat eksikleri, vitrin fiyat doğrulaması, feed, iki sitenin karışmaması | `docs/alastik/denetim-gorevleri.md` |
| `alastik-xml-denetci` | XML kaynaklı ürünler: görsel/açıklama/fiyat eksikleri, kural fiyat tutarlılığı, kargo dahil fiyat, kaynak sağlığı, eşleştirme istatistikleri | `docs/alastik/denetim-gorevleri-xml.md` |
| `alastik-frontend-denetci` | Vitrin kodu (apps/web): frontend standartlarına uyum, tasarım tutarlılığı, hardcode, vitrin bugları | `docs/alastik/denetim-gorevleri-frontend.md` |
| `alastik-backend-denetci` | Backend kodu (apps/api + apps/admin): hardcode, req.site eksikleri, ortak ürün kuralı, auth/güvenlik, buglar, panel-yönetilebilirlik | `docs/alastik/denetim-gorevleri-backend.md` |

## Görev dağılımı
- Ürün `syncInfo.syncSource = 'dia_api'` (kendi stok) ise → **alastik-denetci**
- Ürün `syncInfo.syncSource = 'xml_integration'` (XML tedarikçi) ise → **alastik-xml-denetci**
- Vitrin kodu (apps/web) → **alastik-frontend-denetci**
- Backend kodu (apps/api + apps/admin) → **alastik-backend-denetci**

## Haftalık otomatik denetim
- Zamanlama: her **Pazartesi 10:00** (sunucu cron'u), kullanıcı müdahalesi gerekmez.
- Boru hattı: `apps/api/scripts/denetim/alastik-haftalik.sh`
  1. Sipariş özeti (son 7 gün: adet, ciro, durum/ödeme kırılımı, günlük dağılım, en çok satanlar)
  2. Ürün kalitesi kontrolleri — Stok/XML ayrımlı (görselsiz, açıklamasız, fiyatsız)
  3. Kargo dahil fiyatı eksik XML ürünler
  4. XML eşleştirme istatistikleri (kaynak başına eşleşen/eşleşmeyen adetler)
  5. Kod taraması (son 1 haftanın değişiklikleri: frontend + backend görev listeleriyle hardcode/bug)
- Rapor: `docs/alastik/raporlar/alastik-denetim-<tarih>.md`
- E-posta alıcıları: emir.bahcecioglu@artlastik.com, yagiz.yenen@artlastik.com
- Log: `/var/log/alastik-denetim.log`

## Elle çalıştırma
- Tek denetçi: "ALastik denetçisi görevlerini çalıştırsın" / "XML denetçisi kontrol etsin" demek yeterli.
- Tam haftalık rapor + mail: `/var/www/alastik/apps/api/scripts/denetim/alastik-haftalik.sh`
