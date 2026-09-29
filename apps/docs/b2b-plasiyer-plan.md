# B2B Plasiyer Paneli — Yol Haritası

> Durum: FRONTEND İSKELETİ CANLIDA (demo veri). Plasiyer girişi + bayi seçim akışı
> çalışıyor; anasayfa bileşenleri demo verilerle duruyor, canlı bağlama sonraki faz.
> Site: demo.lastikjantavm.com (`b2b` slug). Plasiyerler sahada çalışır — panel
> saha satışını destekleyecek şekilde tasarlanır.

## Akış (mevcut, çalışıyor)

- Plasiyer girişi → normal panele düşer → **Bayi Seçin** modalı açılır.
  - **Plasiyer olarak devam et** → plasiyer anasayfası (aşağıdaki bileşenler).
  - **Cari ile giriş yap** → seçilen bayi adına oturum (bayinin bakiyesi/paneli görünür).
- Kimlik: bayi `authToken` (JWT `member`, `impersonatedBy` claim'i olabilir),
  plasiyer `plasiyerToken` (JWT `salesperson`). İlk girişte şifre `12345` → zorunlu
  şifre değiştirme modalı.

## Anasayfa — mevcut durum

Bileşenler `apps/web/src/components/b2b-theme/`:

- `plasiyer-overview.tsx` — anasayfa kabuğu.
- Üstte **3 özet kartı**: Erişilebilen Bayi (CANLI, cari sayısı) · Bu Ay Ciro (demo) ·
  Bu Ay Sipariş (demo).
- İki sütun:
  - SOL: `plasiyer-bayi-table.tsx` — **Atanan Bayiler** tablosu (Bayi Adı · Satın
    Aldığı Ürün Adeti · Toplam Ciro), 10/sayfa sayfalama. Demo.
  - SAĞ: profil kartı (ad, kod, telefon, e-posta, bölge — çoğu demo) +
    `plasiyer-sales-chart.tsx` (Bugün / Bu Ay / Bu Yıl sekmeli bar grafik, demo).
- En altta: `plasiyer-mini-crm.tsx` — **Bayi Takip** (görüşme notu + hatırlatma +
  durum rozeti, Bugün/Bu Hafta/Tümü filtresi). Demo, local state.

## Anasayfa — yapılacaklar (öncelik sırasıyla)

### Faz 1 — canlı veriye bağlama (mevcut demo'ları gerçeğe çevir)
1. **Özet kartları canlı**: Bu Ay Ciro + Bu Ay Sipariş → atanan bayilerin bu ayki
   sipariş toplamları (WebOrder).
2. **Atanan Bayiler tablosu canlı**: gerçek cari listesi + her cari için sipariş
   adedi ve ciro toplamı. Sayfalama sunucu taraflı.
3. **Satış grafiği canlı**: Bugün/Bu Ay/Bu Yıl için gerçek sipariş serileri.

### Faz 2 — yeni anasayfa bileşenleri (önce demo, sonra canlı)
4. **Son Siparişler tablosu** — atanan bayilerin son siparişleri (Tarih · Bayi ·
   Tutar · Durum). WebOrder'dan direkt gelir; en hızlı canlılaşacak alan.
5. **Tahsilat / Vade takibi** — vadesi geçmiş ve yaklaşan bakiyeler (kırmızı/sarı
   rozet). Kaynak: b2b cari finansal veri (cari bakiye + FIFO).
6. **Toplam alacak özeti** — atanan bayilerin toplam cari bakiyesi (tek kart).
7. **Pasif bayiler uyarısı** — "X gündür sipariş vermeyen bayiler" → aksiyon listesi.
8. **Hedef / Prim çubuğu** — aylık ciro hedefi vs gerçekleşen (progress) + tahmini prim.
9. **Bu ay vs geçen ay** — özet kartlarına küçük trend göstergesi (▲%12 / ▼%8).

### Faz 3 — mini CRM'i kalıcılaştır
10. **Mini CRM canlı** — model (ör. `PlasiyerCariNot`: bayi, durum, sonGorusme,
    hatirlatma, not) + plasiyer token'ıyla oku/yaz ucu. Hatırlatma bildirimleri.

## İç sayfalar — yapılacaklar (anasayfadan sonra)

> Anasayfa bitince ele alınacak. Sıralama netleşecek.

- **Bayi listesi / arama sayfası** — tüm atanan cariler, arama + filtre; satırdan
  "Cari ile giriş yap" veya "Not ekle".
- **Bayi detay sayfası** — tek carinin özeti: bakiye, vade, sipariş geçmişi, CRM
  notları, iletişim; buradan adına sipariş oluştur.
- **Ürün arama + maliyet görünümü** — plasiyer ürünün maliyet/satış marjını görsün;
  bayi adına sepete ekleme.
- **Cari ekstre / hesap özeti** — indirilebilir ekstre (mevcut rapor altyapısıyla).
- **Prim / hedef raporu** — dönemsel prim hesabı ve geçmiş.

## Notlar

- **Kural**: hardcode yasak; canlı bağlamada tüm değerler API'den/panelden gelmeli.
- Şu an tüm plasiyer verileri demo — canlı bağlanana kadar arayüzde "(demo)" ibaresi
  bırakıldı.
- Uyarı/etiket metinlerinde Türkçe karakter (ş ğ ü ç) kullanılır; kod değişkenleri
  İngilizce.
