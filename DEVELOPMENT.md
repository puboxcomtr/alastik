# Alastik B2C - Development Guide

## 🚀 Hızlı Başlangıç

### Gereksinimler
- Node.js 18+ ve npm 9+
- MongoDB 7.0+
- Redis 7+ (opsiyonel, cache için)

### Kurulum

1. **Proje klonlama ve bağımlılıkları yükleme**
   ```bash
   git clone https://github.com/MelihDreal/alastik-b2c.git
   cd alastik-b2c
   npm run install:all
   ```

2. **Environment dosyalarını oluşturma**
   ```bash
   # Ana environment dosyası
   cp env.example .env
   
   # Admin panel environment dosyası
   cp apps/web/admin/env.example apps/web/admin/.env.local
   ```

3. **Environment dosyalarını düzenleme**
   ```bash
   # .env dosyasını düzenle
   nano .env
   
   # Admin .env.local dosyasını düzenle
   nano apps/web/admin/.env.local
   ```

## 🏗️ Proje Yapısı

```
ALastikB2C/
├── 🔧 API Server (Port: 5000)
│   ├── apps/api/
│   │   ├── src/
│   │   │   ├── controllers/     # API kontrolcüleri
│   │   │   ├── models/          # MongoDB modelleri
│   │   │   ├── routes/          # API rotaları
│   │   │   ├── middleware/      # Middleware'ler
│   │   │   ├── services/        # Business logic
│   │   │   └── server.js        # Ana server dosyası
│   │   └── package.json
│   
├── 🛍️ E-ticaret Sitesi (Port: 3000)
│   ├── apps/web/
│   │   ├── src/
│   │   │   ├── app/             # Next.js App Router
│   │   │   └── lib/             # Utility functions
│   │   ├── components/          # React bileşenleri
│   │   ├── public/              # Static dosyalar
│   │   └── package.json
│   
└── 🎛️ Admin Panel (Port: 3001)
    ├── apps/web/admin/
    │   ├── src/
    │   │   ├── app/             # Admin sayfaları
    │   │   ├── components/      # Admin bileşenleri
    │   │   ├── @layouts/        # Layout bileşenleri
    │   │   └── libs/            # NextAuth config
    │   └── package.json
```

## 🚀 Servisleri Çalıştırma

### Tek Komutla Tüm Servisleri Başlatma
```bash
npm run dev
```

### Ayrı Ayrı Servis Başlatma

#### 1. API Server
```bash
cd apps/api
npm run dev
```
- Port: 5000
- Health Check: http://localhost:3082/health
- MongoDB bağlantısı kontrol edilir
- Default admin kullanıcısı oluşturulur

#### 2. E-ticaret Sitesi
```bash
cd apps/web
npm run dev
```
- Port: 3080
- URL: http://localhost:3080
- Müşteri arayüzü

#### 3. Admin Panel
```bash
cd apps/web/admin
npm run dev
```
- Port: 3001
- URL: http://localhost:3001
- Yönetim paneli

## 🔐 Admin Panel Giriş Bilgileri

**Default Admin Hesabı:**
- Email: `admin@alastik.com`
- Password: `admin123`

> ⚠️ **Güvenlik Uyarısı**: Production ortamında bu bilgileri mutlaka değiştirin!

## 📊 Servis Durumları

### API Server Kontrolleri
```bash
# Health check
curl http://localhost:3082/health

# Admin login test
curl -X POST http://localhost:3082/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@alastik.com","password":"admin123"}'
```

### Web Sitesi Kontrolleri
```bash
# Ana sayfa
curl http://localhost:3000

# API proxy test
curl http://localhost:3000/api/health
```

### Admin Panel Kontrolleri
```bash
# Admin login sayfası
curl http://localhost:3001/tr/login

# Admin API test
curl http://localhost:3001/api/auth/session
```

## 🔧 Development Scriptleri

### Ana Proje Scriptleri
```bash
npm run dev              # Tüm servisleri başlat
npm run dev:api          # Sadece API server
npm run dev:web          # Sadece web sitesi
npm run dev:admin        # Sadece admin panel
npm run build            # Tüm projeleri build et
npm run start            # Production mode'da başlat
npm run install:all      # Tüm bağımlılıkları yükle
npm run clean            # node_modules temizle
```

### API Server Scriptleri
```bash
cd apps/api
npm run dev              # Development mode
npm run start            # Production mode
npm run lint             # Code linting
npm run test             # Test çalıştır
```

### Web Sitesi Scriptleri
```bash
cd apps/web
npm run dev              # Development mode
npm run build            # Production build
npm run start            # Production server
npm run lint             # Code linting
npm run analyze          # Bundle analizi
npm run type-check       # TypeScript kontrolü
```

### Admin Panel Scriptleri
```bash
cd apps/web/admin
npm run dev              # Development mode
npm run build            # Production build
npm run start            # Production server
npm run lint             # Code linting
npm run format           # Code formatting
npm run build:icons      # Icon build
```

## 🐛 Debugging

### Log Dosyaları
```bash
# API server logları
tail -f apps/api/logs/combined.log
tail -f apps/api/logs/error.log

# PM2 logları (production)
pm2 logs
pm2 monit
```

### Yaygın Sorunlar ve Çözümleri

#### 1. MongoDB Bağlantı Hatası
```bash
# MongoDB servisini kontrol et
mongosh --eval "db.runCommand({connectionStatus:1})"

# Environment değişkenlerini kontrol et
echo $MONGODB_URI
```

#### 2. Port Çakışması
```bash
# Kullanılan portları kontrol et
lsof -i :3000
lsof -i :3001
lsof -i :5000

# Process'leri öldür
kill -9 <PID>
```

#### 3. NextAuth Hatası
```bash
# Admin panel environment kontrol et
cat apps/web/admin/.env.local

# NextAuth URL'ini kontrol et
echo $NEXTAUTH_URL
```

#### 4. Build Hataları
```bash
# Node modules temizle ve yeniden yükle
npm run clean
npm run install:all

# Type check
npm run type-check
```

## 🔄 Hot Reload

Tüm servislerde hot reload aktif:
- **API**: nodemon ile otomatik restart
- **Web**: Next.js Fast Refresh
- **Admin**: Next.js Fast Refresh + Turbopack

## 🌐 Environment Değişkenleri

### Ana .env Dosyası
```env
# Database
MONGODB_URI=mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db

# JWT
JWT_SECRET=your-secret-key
NEXTAUTH_SECRET=your-nextauth-secret

# API URLs
NEXT_PUBLIC_API_URL=http://localhost:3082/api
NEXT_PUBLIC_ADMIN_URL=http://localhost:3001
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Admin .env.local Dosyası
```env
# NextAuth
NEXTAUTH_URL=http://localhost:3001
NEXTAUTH_SECRET=your-nextauth-secret

# MongoDB
MONGODB_URI=mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db

# API
NEXT_PUBLIC_API_URL=http://localhost:3082/api
```

## 📱 Responsive Testing

### Browser DevTools
- Chrome: F12 → Device Toolbar
- Firefox: F12 → Responsive Design Mode
- Safari: Develop → Enter Responsive Design Mode

### Mobile Testing
```bash
# Local network'te test için
npm run dev -- --host 0.0.0.0

# Telefondan erişim
# http://YOUR_IP:3000 (web)
# http://YOUR_IP:3001 (admin)
```

## 🚀 Production Deployment

### PM2 ile Deployment
```bash
# PM2 ile başlat
npm run pm2:start

# Status kontrol
pm2 status

# Logları görüntüle
pm2 logs

# Restart
npm run pm2:restart

# Stop
npm run pm2:stop
```

### Docker ile Deployment
```bash
# Docker compose ile başlat
npm run docker:up

# Logları görüntüle
docker-compose logs -f

# Stop
npm run docker:down
```

## 📚 Ek Kaynaklar

- [Next.js Documentation](https://nextjs.org/docs)
- [MongoDB Documentation](https://docs.mongodb.com/)
- [NextAuth.js Documentation](https://next-auth.js.org/)
- [Material-UI Documentation](https://mui.com/)
- [PM2 Documentation](https://pm2.keymetrics.io/)

## 🤝 Geliştirme Workflow'u

1. **Feature Branch Oluştur**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Development Mode'da Çalıştır**
   ```bash
   npm run dev
   ```

3. **Test Et**
   ```bash
   npm run test
   npm run lint
   ```

4. **Build Test Et**
   ```bash
   npm run build
   ```

5. **Commit ve Push**
   ```bash
   git add .
   git commit -m "feat: add new feature"
   git push origin feature/new-feature
   ```

## 🔒 Güvenlik Notları

- `.env` dosyalarını asla commit etmeyin
- Production'da güçlü şifreler kullanın
- JWT secret'larını güvenli tutun
- Admin hesaplarını düzenli olarak güncelleyin
- HTTPS kullanın (production)

---

**Yardım için:** [GitHub Issues](https://github.com/MelihDreal/alastik-b2c/issues) veya [Discord](https://discord.gg/alastik) 