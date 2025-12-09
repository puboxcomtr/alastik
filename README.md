# 🚗 ALastik B2C Platform

Modern, full-stack lastik e-ticaret platformu. Müşterilerin araçlarına uygun lastikleri kolayca bulmalarını ve satın almalarını sağlayan kapsamlı bir çözüm.

## 🏗️ **Proje Yapısı**

```
ALastikB2C/
├── apps/
│   ├── api/                 # Backend API (Node.js + Express + MongoDB)
│   └── web/
│       ├── admin/          # Admin Panel (Next.js 14 + TypeScript)
│       └── src/            # Frontend Web App (Next.js 14 + TypeScript)
├── packages/
│   └── cache/              # Shared Cache Manager
├── docker/                 # Docker configurations
├── nginx/                  # Nginx configuration
└── scripts/               # Database initialization scripts
```

## ✨ **Özellikler**

### 🛒 **E-ticaret Özellikleri**
- **Akıllı Lastik Arama**: Araç markası/modeli veya lastik ölçüsüne göre arama
- **Gerçek Zamanlı Stok Takibi**: API entegrasyonu ile güncel stok bilgileri
- **Responsive Tasarım**: Tüm cihazlarda mükemmel deneyim
- **Sepet Yönetimi**: Gelişmiş sepet ve checkout sistemi

### 🔧 **Admin Panel**
- **Dashboard Analytics**: Satış, stok ve müşteri analitiği
- **Ürün Yönetimi**: CRUD işlemleri ile ürün yönetimi
- **Stok Yönetimi**: Gerçek zamanlı stok takibi ve uyarıları
- **Kategori Yönetimi**: Dinamik kategori yapısı

### 🚀 **Teknik Özellikler**
- **Full-Stack TypeScript**: Type-safe development
- **Modern React**: Next.js 14 ile SSR/SSG desteği
- **RESTful API**: Express.js tabanlı güvenli API
- **MongoDB**: NoSQL veritabanı
- **JWT Authentication**: Güvenli kimlik doğrulama
- **Docker Support**: Containerized deployment

## 🛠️ **Teknoloji Stack'i**

### **Frontend**
- **Next.js 14**: React framework with App Router
- **TypeScript**: Type-safe JavaScript
- **Tailwind CSS**: Utility-first CSS framework
- **Bootstrap 5**: UI components
- **Material-UI**: Admin panel components

### **Backend**
- **Node.js**: JavaScript runtime
- **Express.js**: Web framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB ODM
- **JWT**: Authentication tokens
- **bcrypt**: Password hashing

### **DevOps**
- **Docker**: Containerization
- **Nginx**: Reverse proxy
- **PM2**: Process manager

## 🚀 **Kurulum**

### **Gereksinimler**
- Node.js 18+
- MongoDB 5.0+
- npm veya yarn

### **1. Repository'yi Klonlayın**
```bash
git clone https://github.com/[username]/ALastikB2C.git
cd ALastikB2C
```

### **2. Dependencies Yükleyin**
```bash
# Root dependencies
npm install

# API dependencies
cd apps/api
npm install

# Admin panel dependencies
cd ../web/admin
npm install

# Frontend dependencies
cd ../src
npm install
```

### **3. Environment Variables**
```bash
# apps/api/.env
MONGODB_URI=mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db
JWT_SECRET=your-secret-key
NODE_ENV=development
PORT=5000

# apps/web/admin/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3082/api
NEXTAUTH_URL=http://localhost:3081
NEXTAUTH_SECRET=your-nextauth-secret

# apps/web/.env.local
NEXT_PUBLIC_API_URL=http://localhost:3082/api
```

### **4. Uygulamaları Başlatın**

```bash
# Backend API
cd apps/api
npm run dev

# Admin Panel
cd apps/web/admin
npm run dev

# Frontend
cd apps/web
npm run dev
```

## 🐳 **Docker ile Çalıştırma**

```bash
# Tüm servisleri başlat
docker-compose up -d

# Logları görüntüle
docker-compose logs -f

# Servisleri durdur
docker-compose down
```

## 📚 **API Endpoints**

### **Authentication**
```
POST   /api/admin/login          # Admin girişi
GET    /api/admin/profile        # Admin profili
PUT    /api/admin/profile        # Profil güncelleme
```

### **Product Management**
```
GET    /api/products             # Ürün listesi
POST   /api/products             # Yeni ürün
GET    /api/products/:id         # Ürün detayı
PUT    /api/products/:id         # Ürün güncelleme
DELETE /api/products/:id         # Ürün silme
```

### **Inventory Management**
```
GET    /api/inventory/stock      # Stok durumu
PUT    /api/inventory/stock/:id  # Stok güncelleme
GET    /api/inventory/low-stock  # Düşük stok uyarıları
```

### **Dashboard**
```
GET    /api/dashboard/stats      # Dashboard istatistikleri
GET    /api/dashboard/sales      # Satış verileri
```

## 🔒 **Güvenlik**

- **JWT Authentication**: Token tabanlı kimlik doğrulama
- **Password Hashing**: bcrypt ile şifre hashleme
- **Input Validation**: express-validator ile giriş doğrulama
- **Rate Limiting**: API rate limiting
- **CORS Protection**: Cross-origin resource sharing koruması
- **Helmet.js**: HTTP header güvenliği

## 📊 **Performans**

- **Caching**: Redis ile caching stratejisi
- **Image Optimization**: Next.js Image component
- **Code Splitting**: Automatic code splitting
- **Lazy Loading**: Component lazy loading
- **Database Indexing**: MongoDB indexing

## 🧪 **Test**

```bash
# API testleri
cd apps/api
npm test

# Frontend testleri
cd apps/web
npm test

# Admin panel testleri
cd apps/web/admin
npm test
```

## 📦 **Deployment**

### **Production Build**
```bash
# API production build
cd apps/api
npm run build

# Frontend production build
cd apps/web
npm run build

# Admin panel production build
cd apps/web/admin
npm run build
```

### **PM2 ile Deployment**
```bash
# PM2 ecosystem ile başlat
pm2 start ecosystem.config.js

# Status kontrol
pm2 status

# Logları görüntüle
pm2 logs
```

## 🤝 **Katkıda Bulunma**

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## 📄 **Lisans**

Bu proje MIT lisansı altında lisanslanmıştır. Detaylar için [LICENSE](LICENSE) dosyasına bakın.

## 📞 **İletişim**

- **Proje Sahibi**: [Your Name]
- **Email**: [your.email@example.com]
- **LinkedIn**: [Your LinkedIn Profile]

## 🙏 **Teşekkürler**

Bu projeyi mümkün kılan tüm açık kaynak kütüphanelere ve katkıda bulunanlara teşekkürler.

---

⭐ **Bu projeyi beğendiyseniz yıldız vermeyi unutmayın!**
