# Alastik B2C - Merkezi Sunucu Konfigürasyonu

## 📍 Sunucu Bilgileri

**Merkezi Sunucu:** `217.195.202.170`

### Veritabanları
- **MongoDB:** `mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db`
- **PostgreSQL:** `postgresql://alastik:34gm4191M.@217.195.202.170:5432/alastik_admin`  
- **Redis:** `redis://:34gm4191M.@217.195.202.170:6379`

### Kullanıcı Bilgileri
- **Kullanıcı Adı:** `alastik`
- **Şifre:** `34gm4191M.`

## 🚀 İlk Kurulum

### 1. Veritabanlarını İlk Kez Kurma

```bash
# Scripts dizinine git
cd scripts

# Bağımlılıkları yükle
npm install

# Veritabanlarını kur
npm run init

# Bağlantıları test et
npm run test-connections
```

### 2. Environment Dosyalarını Ayarlama

Ana dizinde `.env` dosyası oluştur:
```bash
cp env.example .env
```

Admin panel için:
```bash
cd apps/web/admin
cp env.example .env.local
```

### 3. Projeyi Başlatma

```bash
# Ana dizinde
docker-compose up -d

# Veya development için
npm run dev
```

## 📊 Veritabanı Yapıları

### MongoDB (alastik_db)
- `products` - Ürün bilgileri
- `categories` - Kategori bilgileri  
- `inventory` - Stok bilgileri
- `diastocks` - DIA ERP entegrasyonu
- `adminusers` - Admin kullanıcıları
- `users` - Müşteri bilgileri
- `orders` - Sipariş bilgileri
- `carts` - Sepet bilgileri

### PostgreSQL (alastik_admin)
- `User` - Admin panel kullanıcıları
- `Account` - OAuth hesapları
- `Session` - Oturum bilgileri
- `VerificationToken` - Doğrulama token'ları

### Redis
- Cache için kullanılır
- Session storage
- Rate limiting

## 🔧 Bağlantı Testleri

### Tek tek test etme:
```bash
cd scripts

# MongoDB test
node -e "require('./test-connections').testMongoDB()"

# PostgreSQL test  
node -e "require('./test-connections').testPostgreSQL()"

# Redis test
node -e "require('./test-connections').testRedis()"
```

### Hepsini birden test etme:
```bash
cd scripts
npm run test-connections
```

## 🛠️ Sorun Giderme

### Bağlantı Sorunları
1. Sunucu erişimini kontrol et: `ping 217.195.202.170`
2. Port erişimini kontrol et: `telnet 217.195.202.170 27017`
3. Kullanıcı adı/şifre kontrolü
4. Firewall ayarları

### Veritabanı Sorunları
1. Veritabanının var olup olmadığını kontrol et
2. Kullanıcı yetkilerini kontrol et
3. Bağlantı limitleri
4. Disk alanı kontrolü

### Cache Sorunları
1. Redis servisinin çalışıp çalışmadığını kontrol et
2. Memory kullanımı
3. Bağlantı havuzu ayarları

## 📋 Bakım İşlemleri

### Backup
```bash
# MongoDB backup
docker-compose exec mongo-backup /backup.sh

# PostgreSQL backup
pg_dump -h 217.195.202.170 -U alastik alastik_admin > backup.sql
```

### Monitoring
```bash
# Bağlantı durumu
npm run test-connections

# Sistem durumu
docker-compose ps

# Logları görüntüleme
docker-compose logs -f api
```

## 🔐 Güvenlik

- Tüm bağlantılar şifreli
- Rate limiting aktif
- Firewall kuralları uygulanmış
- Regular backup'lar alınıyor

## 📞 Destek

Herhangi bir sorun durumunda:
1. İlk olarak `npm run test-connections` çalıştır
2. Log dosyalarını kontrol et
3. Sistem kaynaklarını kontrol et
4. Gerekirse teknik ekiple iletişime geç

---

**Not:** Bu konfigürasyon production ortamı için hazırlanmıştır. Development ortamında local veritabanları kullanmak istiyorsanız, environment değişkenlerini local değerlerle değiştirin.