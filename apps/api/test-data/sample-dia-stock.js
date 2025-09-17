const mongoose = require('mongoose');
const DiaStock = require('../src/models/DiaStock');

// Test DiaStock verileri
const sampleDiaStock = [
  {
    _key: 'LASTIK_001',
    aciklama: 'Michelin Pilot Sport 4 225/45R17 94W XL',
    marka: 'MICHELIN',
    stokkartkodu: 'MICH-PS4-225-45-17',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 15,
    gercek_stok: 15,
    fiyat1: 1250.00,
    fiyat2: 1180.00,
    sontuketicifiyati: 1250.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > YAZ > MICHELIN',
    ozelkod1: 'YAZ',
    ozelkod2: '225/45R17',
    ozelkod3: '94W',
    ozelkod4: 'XL',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  {
    _key: 'LASTIK_002',
    aciklama: 'Continental PremiumContact 6 225/45R17 94Y XL',
    marka: 'CONTINENTAL',
    stokkartkodu: 'CONT-PC6-225-45-17',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 22,
    gercek_stok: 22,
    fiyat1: 1180.00,
    fiyat2: 1120.00,
    sontuketicifiyati: 1180.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > YAZ > CONTINENTAL',
    ozelkod1: 'YAZ',
    ozelkod2: '225/45R17',
    ozelkod3: '94Y',
    ozelkod4: 'XL',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  {
    _key: 'LASTIK_003',
    aciklama: 'Bridgestone Turanza T005 225/45R17 94W',
    marka: 'BRIDGESTONE',
    stokkartkodu: 'BRID-T005-225-45-17',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 18,
    gercek_stok: 18,
    fiyat1: 1050.00,
    fiyat2: 990.00,
    sontuketicifiyati: 1050.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > YAZ > BRIDGESTONE',
    ozelkod1: 'YAZ',
    ozelkod2: '225/45R17',
    ozelkod3: '94W',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  {
    _key: 'LASTIK_004',
    aciklama: 'Pirelli Cinturato P7 225/45R17 94W XL',
    marka: 'PIRELLI',
    stokkartkodu: 'PIR-CP7-225-45-17',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 12,
    gercek_stok: 12,
    fiyat1: 1150.00,
    fiyat2: 1090.00,
    sontuketicifiyati: 1150.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > YAZ > PIRELLI',
    ozelkod1: 'YAZ',
    ozelkod2: '225/45R17',
    ozelkod3: '94W',
    ozelkod4: 'XL',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  {
    _key: 'LASTIK_005',
    aciklama: 'Goodyear EfficientGrip Performance 225/45R17 94V',
    marka: 'GOODYEAR',
    stokkartkodu: 'GOOD-EGP-225-45-17',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 25,
    gercek_stok: 25,
    fiyat1: 980.00,
    fiyat2: 920.00,
    sontuketicifiyati: 980.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > YAZ > GOODYEAR',
    ozelkod1: 'YAZ',
    ozelkod2: '225/45R17',
    ozelkod3: '94V',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  // Kış lastikleri
  {
    _key: 'LASTIK_006',
    aciklama: 'Michelin Pilot Alpin 5 225/45R17 94V Kış Lastiği',
    marka: 'MICHELIN',
    stokkartkodu: 'MICH-PA5-225-45-17',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 8,
    gercek_stok: 8,
    fiyat1: 1350.00,
    fiyat2: 1280.00,
    sontuketicifiyati: 1350.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > KIŞ > MICHELIN',
    ozelkod1: 'KIŞ',
    ozelkod2: '225/45R17',
    ozelkod3: '94V',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  {
    _key: 'LASTIK_007',
    aciklama: 'Continental WinterContact TS 860 225/45R17 94H Kış',
    marka: 'CONTINENTAL',
    stokkartkodu: 'CONT-WC860-225-45-17',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 14,
    gercek_stok: 14,
    fiyat1: 1200.00,
    fiyat2: 1140.00,
    sontuketicifiyati: 1200.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > KIŞ > CONTINENTAL',
    ozelkod1: 'KIŞ',
    ozelkod2: '225/45R17',
    ozelkod3: '94H',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  // 4 Mevsim lastikleri
  {
    _key: 'LASTIK_008',
    aciklama: 'Michelin CrossClimate 2 225/45R17 94W 4 Mevsim',
    marka: 'MICHELIN',
    stokkartkodu: 'MICH-CC2-225-45-17',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 19,
    gercek_stok: 19,
    fiyat1: 1280.00,
    fiyat2: 1220.00,
    sontuketicifiyati: 1280.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > 4 MEVSİM > MICHELIN',
    ozelkod1: '4 MEVSİM',
    ozelkod2: '225/45R17',
    ozelkod3: '94W',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  // Farklı ebatlar
  {
    _key: 'LASTIK_009',
    aciklama: 'Michelin Pilot Sport 4 205/55R16 91V',
    marka: 'MICHELIN',
    stokkartkodu: 'MICH-PS4-205-55-16',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 20,
    gercek_stok: 20,
    fiyat1: 950.00,
    fiyat2: 890.00,
    sontuketicifiyati: 950.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > YAZ > MICHELIN',
    ozelkod1: 'YAZ',
    ozelkod2: '205/55R16',
    ozelkod3: '91V',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  },
  {
    _key: 'LASTIK_010',
    aciklama: 'Continental PremiumContact 6 245/40R18 97Y XL',
    marka: 'CONTINENTAL',
    stokkartkodu: 'CONT-PC6-245-40-18',
    durum: 'A',
    b2c_gonder: 'E',
    b2c_durum: 'E',
    fiili_stok: 16,
    gercek_stok: 16,
    fiyat1: 1450.00,
    fiyat2: 1380.00,
    sontuketicifiyati: 1450.00,
    kdvsatis: 18,
    birimadi: 'ADET',
    urunagaci1: 'LASTİK > YAZ > CONTINENTAL',
    ozelkod1: 'YAZ',
    ozelkod2: '245/40R18',
    ozelkod3: '97Y',
    ozelkod4: 'XL',
    isActive: true,
    hasStock: true,
    isB2CActive: true
  }
];

async function insertSampleDiaStock() {
  try {
    // MongoDB bağlantısı
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('MongoDB bağlantısı başarılı');

    // Mevcut test verilerini temizle
    await DiaStock.deleteMany({ _key: { $regex: /^LASTIK_/ } });
    console.log('Mevcut test verileri temizlendi');

    // Yeni test verilerini ekle
    const result = await DiaStock.insertMany(sampleDiaStock);
    console.log(`${result.length} adet test DiaStock verisi eklendi`);

    // Test: Eklenen verileri kontrol et
    const count = await DiaStock.countDocuments({ durum: 'A', b2c_gonder: 'E' });
    console.log(`Aktif B2C verileri: ${count} adet`);

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
  insertSampleDiaStock();
}

module.exports = { sampleDiaStock, insertSampleDiaStock };