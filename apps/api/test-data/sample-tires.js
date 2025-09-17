const mongoose = require('mongoose');
const Product = require('../src/models/Product');

// Test lastik verileri
const sampleTires = [
  {
    name: 'Michelin Pilot Sport 4',
    sku: 'MICH-PS4-225-45-17',
    brand: 'Michelin',
    category: 'Lastik',
    price: 1250,
    originalPrice: 1400,
    stock: 15,
    specifications: {
      size: '225/45R17',
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      season: 'yaz',
      loadIndex: '94',
      speedIndex: 'W',
      vehicleType: 'otomobil',
      fuelEfficiency: 'B',
      wetGrip: 'A',
      noiseLevel: 70,
      runflat: false,
      reinforced: false
    },
    images: [{
      url: '/assets/img/tires/michelin-pilot-sport-4.jpg',
      alt: 'Michelin Pilot Sport 4',
      isPrimary: true
    }],
    description: 'Michelin Pilot Sport 4, yüksek performans araçlar için tasarlanmış yaz lastiğidir.',
    shortDescription: 'Yüksek performans yaz lastiği',
    rating: {
      average: 4.8,
      count: 156
    },
    salesCount: 89,
    viewCount: 1250,
    isFeatured: true
  },
  {
    name: 'Continental PremiumContact 6',
    sku: 'CONT-PC6-225-45-17',
    brand: 'Continental',
    category: 'Lastik',
    price: 1180,
    originalPrice: 1320,
    stock: 22,
    specifications: {
      size: '225/45R17',
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      season: 'yaz',
      loadIndex: '94',
      speedIndex: 'Y',
      vehicleType: 'otomobil',
      fuelEfficiency: 'A',
      wetGrip: 'A',
      noiseLevel: 72,
      runflat: false,
      reinforced: false
    },
    images: [{
      url: '/assets/img/tires/continental-premiumcontact-6.jpg',
      alt: 'Continental PremiumContact 6',
      isPrimary: true
    }],
    description: 'Continental PremiumContact 6, premium segment araçlar için üstün performans sunar.',
    shortDescription: 'Premium yaz lastiği',
    rating: {
      average: 4.6,
      count: 203
    },
    salesCount: 145,
    viewCount: 1890
  },
  {
    name: 'Bridgestone Turanza T005',
    sku: 'BRID-T005-225-45-17',
    brand: 'Bridgestone',
    category: 'Lastik',
    price: 1050,
    stock: 18,
    specifications: {
      size: '225/45R17',
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      season: 'yaz',
      loadIndex: '94',
      speedIndex: 'W',
      vehicleType: 'otomobil',
      fuelEfficiency: 'B',
      wetGrip: 'A',
      noiseLevel: 71,
      runflat: false,
      reinforced: false
    },
    images: [{
      url: '/assets/img/tires/bridgestone-turanza-t005.jpg',
      alt: 'Bridgestone Turanza T005',
      isPrimary: true
    }],
    description: 'Bridgestone Turanza T005, konfor ve performansı bir arada sunan yaz lastiği.',
    shortDescription: 'Konforlu yaz lastiği',
    rating: {
      average: 4.4,
      count: 128
    },
    salesCount: 67,
    viewCount: 980
  },
  {
    name: 'Pirelli Cinturato P7',
    sku: 'PIR-CP7-225-45-17',
    brand: 'Pirelli',
    category: 'Lastik',
    price: 1150,
    originalPrice: 1250,
    stock: 12,
    specifications: {
      size: '225/45R17',
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      season: 'yaz',
      loadIndex: '94',
      speedIndex: 'W',
      vehicleType: 'otomobil',
      fuelEfficiency: 'B',
      wetGrip: 'A',
      noiseLevel: 71,
      runflat: false,
      reinforced: false
    },
    images: [{
      url: '/assets/img/tires/pirelli-cinturato-p7.jpg',
      alt: 'Pirelli Cinturato P7',
      isPrimary: true
    }],
    description: 'Pirelli Cinturato P7, çevre dostu teknolojiler ile üretilmiş yaz lastiği.',
    shortDescription: 'Çevre dostu yaz lastiği',
    rating: {
      average: 4.5,
      count: 174
    },
    salesCount: 98,
    viewCount: 1456
  },
  {
    name: 'Goodyear EfficientGrip Performance',
    sku: 'GOOD-EGP-225-45-17',
    brand: 'Goodyear',
    category: 'Lastik',
    price: 980,
    stock: 25,
    specifications: {
      size: '225/45R17',
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      season: 'yaz',
      loadIndex: '94',
      speedIndex: 'V',
      vehicleType: 'otomobil',
      fuelEfficiency: 'A',
      wetGrip: 'A',
      noiseLevel: 69,
      runflat: false,
      reinforced: false
    },
    images: [{
      url: '/assets/img/tires/goodyear-efficientgrip-performance.jpg',
      alt: 'Goodyear EfficientGrip Performance',
      isPrimary: true
    }],
    description: 'Goodyear EfficientGrip Performance, yakıt tasarrufu ve güvenliği önceleyenler için.',
    shortDescription: 'Ekonomik yaz lastiği',
    rating: {
      average: 4.3,
      count: 89
    },
    salesCount: 156,
    viewCount: 2100
  },
  // Kış lastikleri
  {
    name: 'Michelin Pilot Alpin 5',
    sku: 'MICH-PA5-225-45-17',
    brand: 'Michelin',
    category: 'Lastik',
    price: 1350,
    originalPrice: 1500,
    stock: 8,
    specifications: {
      size: '225/45R17',
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      season: 'kis',
      loadIndex: '94',
      speedIndex: 'V',
      vehicleType: 'otomobil',
      fuelEfficiency: 'C',
      wetGrip: 'A',
      noiseLevel: 71,
      runflat: false,
      reinforced: false
    },
    images: [{
      url: '/assets/img/tires/michelin-pilot-alpin-5.jpg',
      alt: 'Michelin Pilot Alpin 5',
      isPrimary: true
    }],
    description: 'Michelin Pilot Alpin 5, kış koşullarında üstün performans sunan premium kış lastiği.',
    shortDescription: 'Premium kış lastiği',
    rating: {
      average: 4.7,
      count: 92
    },
    salesCount: 34,
    viewCount: 567
  },
  {
    name: 'Continental WinterContact TS 860',
    sku: 'CONT-WC860-225-45-17',
    brand: 'Continental',
    category: 'Lastik',
    price: 1200,
    stock: 14,
    specifications: {
      size: '225/45R17',
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      season: 'kis',
      loadIndex: '94',
      speedIndex: 'H',
      vehicleType: 'otomobil',
      fuelEfficiency: 'C',
      wetGrip: 'B',
      noiseLevel: 72,
      runflat: false,
      reinforced: false
    },
    images: [{
      url: '/assets/img/tires/continental-wintercontact-ts860.jpg',
      alt: 'Continental WinterContact TS 860',
      isPrimary: true
    }],
    description: 'Continental WinterContact TS 860, güvenli kış sürüşü için tasarlanmıştır.',
    shortDescription: 'Güvenli kış lastiği',
    rating: {
      average: 4.4,
      count: 76
    },
    salesCount: 45,
    viewCount: 432
  },
  // 4 Mevsim lastikleri
  {
    name: 'Michelin CrossClimate 2',
    sku: 'MICH-CC2-225-45-17',
    brand: 'Michelin',
    category: 'Lastik',
    price: 1280,
    originalPrice: 1420,
    stock: 19,
    specifications: {
      size: '225/45R17',
      width: 225,
      aspectRatio: 45,
      rimDiameter: 17,
      season: '4mevsim',
      loadIndex: '94',
      speedIndex: 'W',
      vehicleType: 'otomobil',
      fuelEfficiency: 'B',
      wetGrip: 'A',
      noiseLevel: 69,
      runflat: false,
      reinforced: false
    },
    images: [{
      url: '/assets/img/tires/michelin-crossclimate-2.jpg',
      alt: 'Michelin CrossClimate 2',
      isPrimary: true
    }],
    description: 'Michelin CrossClimate 2, tüm mevsim koşullarında üstün performans sunar.',
    shortDescription: 'Premium 4 mevsim lastiği',
    rating: {
      average: 4.8,
      count: 234
    },
    salesCount: 187,
    viewCount: 2890,
    isFeatured: true
  }
];

async function insertSampleTires() {
  try {
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB bağlantısı başarılı');

    // Mevcut test verilerini temizle
    await Product.deleteMany({ sku: { $regex: /^(MICH|CONT|BRID|PIR|GOOD)-/ } });
    console.log('Mevcut test verileri temizlendi');

    // Yeni test verilerini ekle
    const result = await Product.insertMany(sampleTires);
    console.log(`${result.length} adet test lastiği eklendi`);

    // Bağlantıyı kapat
    await mongoose.connection.close();
    console.log('İşlem tamamlandı');

  } catch (error) {
    console.error('Hata:', error);
    process.exit(1);
  }
}

// Script çalıştırılırsa
if (require.main === module) {
  insertSampleTires();
}

module.exports = { sampleTires, insertSampleTires };