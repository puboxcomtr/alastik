# Bayi Paneli — Statik Tasarım Şablonu

Lastik/jant toptan satış bayi panelinin **yalnızca arayüzüdür**. Veritabanı,
ERP entegrasyonu, oturum açma ve yönetim paneli **yoktur**; ekranlardaki tüm
veriler `apps/web/lib/ornek-veri.ts` içindeki örnek verilerden gelir.

Amaç: tasarımı olduğu gibi devralıp kendi veri kaynağınıza ve yönetim
panelinize bağlamak.

## Çalıştırma

```bash
pnpm install
pnpm dev
```

`http://localhost:3000` → giriş ekranı. "Giriş Yap" doğrulama yapmaz, doğrudan
bayi paneline götürür.

## Statik çıktı üretme

```bash
pnpm build
```

`apps/web/out/` altına saf HTML/CSS/JS çıkar. Bu klasör herhangi bir statik
sunucuya (nginx, Apache, S3, Netlify, cPanel…) kopyalanabilir; Node.js
sunucusu gerekmez.

Alt klasörde yayınlanacaksa `apps/web/next.config.ts` içindeki `basePath`
satırını açın.

## Ekranlar

| Yol | İçerik |
|---|---|
| `/login`, `/bayimiz-olun` | Giriş ve iletişim ekranı |
| `/` | Anasayfa: bakiye/limit kartları, duyuru bandı, lastik katalogu |
| `/lastik`, `/jant` | Katalog: arama, filtre pill'leri, ürün tablosu, sepete ekleme |
| `/sepet` | Sepet: adet güncelleme, KDV kırılımı, sipariş özeti |
| `/siparisler`, `/siparisler/[id]` | Sipariş listesi (adım göstergeli) ve detay |
| `/cari` | Cari hesap özeti, kredi limiti kullanımı, açık faturalar |
| `/odeme` | Ödeme kanalları |
| `/hesap`, `/hesap/ayarlar` | Hesap bilgileri ve parola formu |
| `/raporlar/*` | Cari hareketler, vade takvimi, sipariş raporu, alım adet, kasa tahsilatları, taksit seçenekleri |

## Klasör düzeni

```
apps/web/
  app/                 sayfalar (Next.js 15 App Router)
    (dealer)/          bayi paneli — ortak üst menü bu düzende
    login/, bayimiz-olun/
  components/          arayüz bileşenleri
  lib/
    ornek-veri.ts      ⇦ TÜM veri burada
    format.ts          para/tarih biçimlendirme
  app/globals.css      tasarımın tamamı (tek dosya)
  public/              logo
```

## Kendi verinize bağlarken

1. **Veri:** `lib/ornek-veri.ts` içindeki tipleri koruyup dışa aktarılan
   sabitleri kendi kaynağınızdan besleyin. Sayfalar başka hiçbir yerden veri
   okumaz, bu tek dosya değişince tüm ekranlar gerçek veriyle çalışır.
2. **Oturum:** `app/(dealer)/layout.tsx` içine kimlik kontrolü ekleyin;
   `app/login/login-form.tsx` şu an sadece `/` adresine yönlendiriyor.
3. **Sepet:** `components/sepet-durumu.tsx` sepeti `localStorage`'da tutar.
   İçini kendi sepet ucunuzla değiştirin; bileşenlerin kullandığı `useSepet`
   arayüzü aynı kalabilir.
4. **Sipariş / iptal / parola:** `sepet/page.tsx`, `components/iptal-butonu.tsx`
   ve `components/parola-formu.tsx` içinde istek gönderilmez, yalnızca uyarı
   gösterilir. Bu üç yeri kendi uçlarınıza bağlayın.
5. **Statik dışa aktarım:** sunucu tarafı kod (server action, route handler,
   middleware) eklerseniz `next.config.ts` içindeki `output: "export"`
   satırını kaldırmanız gerekir.

## Para birimi

Tutarlar tam sayı **kuruş**tur (1 TL = 100). Kayan noktalı sayı kullanılmaz;
biçimlendirme tek yerde, `lib/format.ts` içindedir. Fiyat hesabını gerçek
uygulamada **sunucuda** yapın — istemciden gelen fiyata güvenmeyin.

## Tasarım

- Koyu üst menü + açık zemin, yuvarlak beyaz kartlar
- Büyük arama çubuğu + filtre pill'leri
- Ürün tablosunda üstü çizili liste fiyatı, altında bayi fiyatı ve KDV dahil
  karşılığı
- Yeşil "20+" stok rozeti, sipariş kartlarında adım göstergesi
- Tüm stiller `app/globals.css` içinde; CSS çerçevesi kullanılmaz
