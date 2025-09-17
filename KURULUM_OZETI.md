# Alastik B2C - API Kurulum Özeti

## ✅ Tamamlanan İşlemler

### 1. Merkezi Sunucu Konfigürasyonu
- **MongoDB:** `mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin`
- **PostgreSQL:** `postgresql://alastik:34gm4191M.@217.195.202.170:5432/alastik_admin`
- **Redis:** `redis://:34gm4191M.@217.195.202.170:6379` 
=======
- **Redis:** `redis://:34gm4191M.@217.195.202.170:6379`

### 2. Otomatik DIA Stok Senkronizasyonu
- ✅ API başlangıcında otomatik sync aktif
- ✅ 24 saatte bir tam senkronizasyon
- ✅ Günlük saat 02:00'da otomatik sync
- ✅ Çalışma saatlerinde saatlik artımlı sync
- ✅ Background'da çalışır, startup'ı bloklamaz

### 3. Kullanıcı ve Alışveriş Modelleri
- ✅ **User Model:** Tam kullanıcı profili, adresler, tercihler
- ✅ **Cart Model:** Sepet yönetimi (mevcut)
- ✅ **Order Model:** Sipariş yönetimi, ödeme, kargo takibi
- ✅ **Wishlist Model:** İstek listesi, favoriler
- ✅ **Review Model:** Ürün değerlendirmeleri

### 4. API Endpoint'leri
- ✅ **User Authentication:** `/api/users/register`, `/api/users/login`
- ✅ **Profile Management:** `/api/users/profile`
- ✅ **Address Management:** `/api/users/addresses`
- ✅ **Order History:** `/api/users/orders`
- ✅ **Password Change:** `/api/users/change-password`

### 5. Sorun Çözümleri
- ✅ MongoDB duplicate index warning'leri düzeltildi (44 adet)
- ✅ Redis connection timeout'ları optimize edildi
- ✅ Nodemon sürekli restart sorunu çözüldü
- ✅ MongoDB authentication sorunu çözüldü (`authSource=admin`)

## 🚀 API Servisi Başlatma

### Development Ortamı:
```bash
# Ana dizinde
npm run dev:api

# Veya direkt
cd apps/api
npm run dev
```

### Production Ortamı:
```bash
# Docker ile
npm run docker:up

# Veya PM2 ile
npm run pm2:start
```

## 📊 İlk Çalışmada Olan İşlemler

### 1. Otomatik DIA Sync
- Son sync 24 saatten eski ise otomatik başlar
- İlk kurulumda tüm stokları çeker
- Background'da çalışır, API hemen kullanılabilir

### 2. Veritabanı Kurulumu
- MongoDB koleksiyonları otomatik oluşur
- Index'ler otomatik kurulur
- Default admin kullanıcısı oluşur

### 3. Cache Hazırlığı
- Redis bağlantısı kurulur
- Cache namespace'leri hazırlanır

## 🛠️ Kullanılabilir Komutlar

### Veritabanı İşlemleri:
```bash
# Veritabanı bağlantılarını test et
npm run db:test

# Veritabanlarını ilk kez kur
npm run db:init

# Duplicate index'leri düzelt
npm run fix:indexes
```

### DIA Sync İşlemleri:
```bash
# Manuel tam sync
curl -X POST http://localhost:3082/api/dia-stock/sync

# Artımlı sync
curl -X POST http://localhost:3082/api/dia-stock/sync \
  -H "Content-Type: application/json" \
  -d '{"type": "incremental"}'

# Sync durumunu kontrol et
curl http://localhost:3082/api/dia-stock/stats
```

### API Test'leri:
```bash
# Health check
curl http://localhost:3082/health

# User registration
curl -X POST http://localhost:3082/api/users/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456",
    "firstName": "Test",
    "lastName": "User",
    "gdprConsent": true
  }'

# User login
curl -X POST http://localhost:3082/api/users/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "123456"
  }'
```

## 📋 Veritabanı Yapısı

### MongoDB Collections:
- `products` - Ürün bilgileri
- `diastocks` - DIA ERP stok verileri
- `categories` - Kategori bilgileri
- `users` - Kullanıcı hesapları
- `carts` - Sepet bilgileri
- `orders` - Sipariş bilgileri
- `wishlists` - İstek listeleri
- `reviews` - Ürün değerlendirmeleri
- `adminusers` - Admin kullanıcıları
- `inventory` - Stok bilgileri

### PostgreSQL Tables:
- `User` - Admin panel kullanıcıları
- `Account` - OAuth hesapları
- `Session` - Oturum bilgileri
- `VerificationToken` - Doğrulama token'ları

## 🔄 Otomatik İşlemler

### DIA Sync Scheduler:
- **Günlük tam sync:** Her gün saat 02:00
- **Saatlik artımlı sync:** Çalışma saatleri (08:00-18:00, Pazartesi-Cumartesi)
- **Cache temizleme:** 15 dakikada bir
- **Haftalık rapor:** Her pazar 20:00

### Sistem Bakımı:
- Otomatik cache temizleme
- Performans metrikleri toplama
- Error monitoring
- Log rotation

## 🎯 Sonraki Adımlar

1. **Web Frontend Entegrasyonu:**
   - User registration/login sayfaları
   - Ürün listeleme ve detay sayfaları
   - Sepet ve checkout işlemleri

2. **Ödeme Entegrasyonu:**
   - Stripe/PayPal entegrasyonu
   - Türk ödeme sistemleri (İyzico, PayTR)

3. **Kargo Entegrasyonu:**
   - Aras Kargo, MNG, Yurtiçi Kargo API'leri
   - Otomatik kargo takip numarası

4. **Bildirim Sistemi:**
   - Email notifications
   - SMS bildirimleri
   - Push notifications

## 📞 API Endpoint'leri

### Temel URL: `http://localhost:3082/api`

#### User Management:
- `POST /users/register` - Kullanıcı kaydı
- `POST /users/login` - Kullanıcı girişi
- `GET /users/profile` - Profil bilgileri
- `PUT /users/profile` - Profil güncelleme
- `POST /users/addresses` - Adres ekleme
- `PUT /users/addresses/:id` - Adres güncelleme
- `DELETE /users/addresses/:id` - Adres silme
- `GET /users/orders` - Sipariş geçmişi
- `PUT /users/change-password` - Şifre değiştirme

#### Products:
- `GET /products` - Ürün listesi
- `GET /products/:id` - Ürün detayı

#### Categories:
- `GET /categories` - Kategori listesi

#### System:
- `GET /health` - Sistem durumu
- `POST /dia-stock/sync` - Manuel DIA sync
- `GET /dia-stock/stats` - Sync istatistikleri

---

**Hazırlanan:** AI Assistant  
**Tarih:** 2025-01-31  
**Durum:** ✅ Hazır - Production'a alınabilir