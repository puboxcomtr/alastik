const mongoose = require('mongoose');

const DiaStockSchema = new mongoose.Schema({
  _key: {
    type: String,
    required: [true, 'DIA _key gereklidir'],
    unique: true,
    trim: true
  },

  synchronization: {
    type: String,
    enum: ['Y', 'N'],
    default: 'Y',
    description: 'Y: Her şeyi senkronize et, N: Sadece stok/fiyat senkronize et'
  },
  dataHash: {
    type: String,
    default: null,
    index: true
  },
  priceHash: {
    type: String,
    default: null
  },
  stockHash: {
    type: String,
    default: null
  },
  ozelkodHash: {
    type: String,
    default: null
  },
  _cdate: String,
  _date: String,

  _key_scf_karebarkod: String,
  _key_scf_marka: String,
  _key_scf_odeme_plani: String,
  _key_scf_urun_ozellik: String,
  _key_sis_ozelkod1: String,
  _key_sis_ozelkod2: String,
  _key_sis_ozelkod3: String,
  _key_sis_ozelkod4: String,
  _key_sis_ozelkod5: String,
  _key_sis_ozelkod6: String,
  _key_sis_ozelkod7: String,
  _key_sis_ozelkod8: String,
  _key_sis_ozelkod9: String,
  _key_sis_ozelkod10: String,
  _key_sis_ozelkod11: String,
  _key_sis_resim: String,
  _key_sis_ulkeler_mensei: String,
  _key_web_b2c_magazalar: String,

  aciklama: {
    type: String,
    trim: true
  },

  anabarkod: { type: String, index: true },
  barkodu: String,
  karebarkod: String,
  anabirimbrutagirlik: Number,
  anabirimdesi: Number,
  anabirimkey: String,
  anabirimnetagirlik: Number,
  birimadi: String,
  birimindirimorani: String,

  fiili_stok: {
    type: Number,
    default: 0
  },
  gercek_stok: {
    type: Number,
    default: 0
  },
  azamimiktar: Number,
  azamimiktar_firma: Number,

  b2b_depomiktari: Number,
  b2b_gonder: {
    type: String,
    enum: ['E', 'H']
  },
  b2b_kargobedava: String,
  b2bgoster: String,
  b2bgoster_birim: String,

  b2c_depomiktari: Number,
  b2c_depomiktari_list: String,
  b2c_depomiktari_listesi: String,
  b2c_description: String,
  b2c_durum: {
    type: String,
    enum: ['E', 'H']
  },
  b2c_gonder: {
    type: String,
    enum: ['E', 'H']
  },
  b2c_indirimorani: Number,
  b2c_kargobedava: String,
  b2c_kargobedava_birim: String,
  b2c_kargodurumu: String,

  fiyat1: Number,
  fiyat2: Number,
  fiyat3: Number,
  fiyat4: Number,
  fiyat4Ham: Number,
  fiyatDinamik: Number,
  fiyat10: Number,
  sontuketicifiyati: Number,

  doviz1: String,
  doviz2: String,
  doviz3: String,
  doviz4: String,

  durum: {
    type: String,
    enum: ['A', 'P'],
    default: 'A'
  },

  ekalan1: String,
  ekalan2: String,
  ekalan3: String,
  ekalan4: String,
  ekalan5: String,
  ekalan6: String,
  ekalan7: String,
  ekalan8: String,
  ekalan9: String,
  ekalan10: String,
  ekalantum: String,

  ekleyenkullaniciadi: String,
  kullaniciadi: String,
  firmaadi: String,

  kdvalis: Number,
  kdvdurumu: String,
  kdvdurumu1: String,
  kdvdurumu2: String,
  kdvdurumu3: String,
  kdvdurumu4: String,
  kdvdurumu10: String,
  kdviade: Number,
  kdvsatis: Number,
  kdvsatistoptan: Number,
  kdvtevkifatkodu: String,
  kdvtevkifatorani: Number,

  gtipno: String,
  images_count: Number,
  is_aws: String,
  aws_info: String,
  aws_url: String,
  karyuzdesi: Number,
  kilitli: String,
  kodveaciklama: String,

  marka: {
    type: String,
    trim: true
  },
  markaack: String,
  menseiulkeadi: String,

  note: String,

  ozelkod1: String,
  ozelkod1kodu: String,
  ozelkod2: String,
  ozelkod2kodu: String,
  ozelkod3: String,
  ozelkod3kodu: String,
  ozelkod4: String,
  ozelkod4kodu: String,
  ozelkod5: String,
  ozelkod5kodu: String,
  ozelkod6: String,
  ozelkod6kodu: String,
  ozelkod7: String,
  ozelkod7kodu: String,
  ozelkod8: String,
  ozelkod8kodu: String,
  ozelkod9: String,
  ozelkod9kodu: String,
  ozelkod10: String,
  ozelkod10kodu: String,
  ozelkod11: String,
  ozelkod11kodu: String,

  stokkartkodu: {
    type: String,
    trim: true
  },

  urunagaci1: String,
  urunagaclari: String,

  m_birimler: [{
    _key: String,
    _key_scf_stokkart: String,
    _key_sis_doviz1: String,
    _key_sis_doviz2: String,
    _key_sis_doviz3: String,
    _key_sis_doviz4: String,
    _key_sis_doviz10: String,
    birimadi: String,
    birimkod: String,
    carpan: Number,
    fiyat1: Number,
    fiyat2: Number,
    fiyat3: Number,
    fiyat4: Number,
    fiyat4Ham: Number,
    fiyatDinamik: Number,
    fiyat10: Number,
    kdvdurumu1: String,
    kdvdurumu2: String,
    kdvdurumu3: String,
    kdvdurumu4: String,
    kdvdurumu10: String,
    miktar: Number,
    oranlama: String
  }],

  m_kategoriler: [{
    _key: String,
    _key_scf_stokkart: String,
    _key_scf_malzeme_kategori_1: String,
    _key_scf_malzeme_kategori_2: String,
    _key_scf_malzeme_kategori_3: String,
    _key_scf_malzeme_kategori_4: String,
    _key_scf_malzeme_kategori_5: String,
    _key_scf_malzeme_kategori_6: String,
    kategori_aciklama_1: String,
    kategori_aciklama_2: String,
    kategori_aciklama_3: String,
    kategori_aciklama_4: String,
    kategori_aciklama_5: String,
    kategori_aciklama_6: String,
    kategori_durum_1: String,
    kategori_durum_2: String,
    kategori_durum_3: String,
    kategori_durum_4: String,
    kategori_durum_5: String,
    kategori_durum_6: String
  }],

  m_urunOzellikleri: [{
    _key: String,
    _key_scf_stokkart: String,
    _key_scf_urun_ozellik: String,
    _key_scf_urun_ozellik_kalemi: String,
    _key_scf_urun_ozellik_kalemi_detayi: String,
    detayaciklama: String,
    ozellikadi: String,
    ozellisirano: String
  }],

  m_resimler: [{
    _key: String,
    _key_kayit: String,
    aws_url: String,
    content_type: String,
    is_aws: String,
    kayitturu: String,
    localdata: String,
    order_id: String,
    varyantlar: String,
    yukleyen: String
  }],

  syncInfo: {
    lastSyncDate: {
      type: Date,
      default: Date.now
    },
    lastSeenAt: { type: Date },
    syncStatus: {
      type: String,
      enum: ['pending', 'synced', 'error'],
      default: 'synced'
    },
    errorMessage: String,
    syncSource: {
      type: String,
      enum: ['dia_api', 'manual'],
      default: 'dia_api'
    }
  },

  isActive: {
    type: Boolean,
    default: true
  },

  hasStock: {
    type: Boolean,
    default: false
  },

  isB2CActive: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

DiaStockSchema.index({ durum: 1, b2c_gonder: 1 });
DiaStockSchema.index({ marka: 1, durum: 1 });
DiaStockSchema.index({ stokkartkodu: 1, durum: 1 });
DiaStockSchema.index({ fiili_stok: 1, durum: 1 });
DiaStockSchema.index({ 'syncInfo.lastSyncDate': 1 });
DiaStockSchema.index({ 'syncInfo.syncStatus': 1 });
DiaStockSchema.index({ synchronization: 1 });

DiaStockSchema.index({
  aciklama: 'text',
  marka: 'text',
  stokkartkodu: 'text',
  ekalan1: 'text',
  ekalan2: 'text'
});

DiaStockSchema.virtual('isInStock').get(function () {
  return this.fiili_stok > 0;
});

DiaStockSchema.virtual('isB2CEnabled').get(function () {
  return this.b2c_gonder === 'E' && this.durum === 'A';
});

DiaStockSchema.virtual('primaryCategory').get(function () {
  if (this.m_kategoriler && this.m_kategoriler.length > 0) {
    return this.m_kategoriler[0].kategori_aciklama_1;
  }
  return null;
});

DiaStockSchema.virtual('primaryUnit').get(function () {
  if (this.m_birimler && this.m_birimler.length > 0) {
    return this.m_birimler[0].birimadi;
  }
  return this.birimadi;
});

DiaStockSchema.virtual('primaryPrice').get(function () {
  return this.fiyat1 || this.sontuketicifiyati || 0;
});

DiaStockSchema.virtual('primaryImage').get(function () {
  if (this.m_resimler && this.m_resimler.length > 0) {
    return this.m_resimler[0].aws_url;
  }
  return null;
});

DiaStockSchema.pre('save', function (next) {
  this.isActive = this.durum === 'A';

  this.hasStock = this.fiili_stok > 0;

  this.isB2CActive = this.b2c_gonder === 'E' && this.durum === 'A';

  this.syncInfo.lastSyncDate = new Date();

  next();
});

DiaStockSchema.statics.findActiveProducts = function () {
  return this.find({ durum: 'A', isActive: true });
};

DiaStockSchema.statics.findB2CProducts = function () {
  return this.find({ b2c_gonder: 'E', durum: 'A' });
};

DiaStockSchema.statics.findInStockProducts = function () {
  return this.find({ fiili_stok: { $gt: 0 }, durum: 'A' });
};

DiaStockSchema.statics.findByBrand = function (brand) {
  return this.find({ marka: brand, durum: 'A' });
};

DiaStockSchema.statics.findByCategory = function (category) {
  return this.find({
    'm_kategoriler.kategori_aciklama_1': category,
    durum: 'A'
  });
};

DiaStockSchema.statics.findBySyncStatus = function (status) {
  return this.find({ 'syncInfo.syncStatus': status });
};

DiaStockSchema.statics.findPendingSync = function () {
  return this.find({ 'syncInfo.syncStatus': 'pending' });
};

DiaStockSchema.statics.findSyncErrors = function () {
  return this.find({ 'syncInfo.syncStatus': 'error' });
};

DiaStockSchema.statics.findLimitedSyncProducts = function () {
  return this.find({ synchronization: 'N' });
};

DiaStockSchema.statics.findFullSyncProducts = function () {
  return this.find({ synchronization: 'Y' });
};

DiaStockSchema.methods.markSyncSuccess = function () {
  this.syncInfo.syncStatus = 'synced';
  this.syncInfo.errorMessage = null;
  this.syncInfo.lastSyncDate = new Date();
  return this.save();
};

DiaStockSchema.methods.markSyncError = function (errorMessage) {
  this.syncInfo.syncStatus = 'error';
  this.syncInfo.errorMessage = errorMessage;
  this.syncInfo.lastSyncDate = new Date();
  return this.save();
};

DiaStockSchema.methods.updateStock = function (newStock) {
  this.fiili_stok = newStock;
  this.gercek_stok = newStock;
  this.hasStock = newStock > 0;
  return this.save();
};

DiaStockSchema.methods.updateFromDiaData = function (diaData) {
  if (this.synchronization === 'N') {
    const limitedFields = ['fiili_stok', 'gercek_stok', 'fiyat1', 'fiyat2', 'fiyat3', 'fiyat4', 'fiyat10', 'sontuketicifiyati'];
    limitedFields.forEach(field => {
      if (diaData.hasOwnProperty(field)) {
        this[field] = diaData[field];
      }
    });
  } else {
    Object.keys(diaData).forEach(key => {
      if (key !== '_id' && key !== 'createdAt' && key !== 'updatedAt') {
        this[key] = diaData[key];
      }
    });
  }

  this.syncInfo.lastSyncDate = new Date();
  this.syncInfo.syncStatus = 'synced';
  this.syncInfo.errorMessage = null;

  return this.save();
};

DiaStockSchema.methods.enableLimitedSync = function () {
  return this.save();
};

DiaStockSchema.methods.enableFullSync = function () {
  this.synchronization = 'Y';
  return this.save();
};

DiaStockSchema.methods.toggleSyncMode = function () {
  this.synchronization = this.synchronization === 'Y' ? 'N' : 'Y';
  return this.save();
};

module.exports = mongoose.model('DiaStock', DiaStockSchema);