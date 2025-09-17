const mongoose = require('mongoose');

const InstallmentRateSchema = new mongoose.Schema({
  // Banka bilgileri
  bankName: {
    type: String,
    required: [true, 'Banka adı gereklidir'],
    trim: true,
    maxlength: [100, 'Banka adı 100 karakterden uzun olamaz']
  },
  
  bankCode: {
    type: String,
    required: [true, 'Banka kodu gereklidir'],
    trim: true,
    lowercase: true,
    maxlength: [50, 'Banka kodu 50 karakterden uzun olamaz']
  },
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  maxInstallment: {
    type: Number,
    default: 1,
    min: [1, 'Maksimum taksit 1\'den küçük olamaz'],
    max: [12, 'Maksimum taksit 12\'den büyük olamaz']
  },
  
  // Taksit seçenekleri
  installment2: { type: Boolean, default: false },
  installment3: { type: Boolean, default: false },
  installment4: { type: Boolean, default: false },
  installment5: { type: Boolean, default: false },
  installment6: { type: Boolean, default: false },
  installment7: { type: Boolean, default: false },
  installment8: { type: Boolean, default: false },
  installment9: { type: Boolean, default: false },
  installment10: { type: Boolean, default: false },
  installment11: { type: Boolean, default: false },
  installment12: { type: Boolean, default: false },
  
  // Taksit oranları (%)
  rate2: { type: Number, default: 0, min: 0, max: 100 },
  rate3: { type: Number, default: 0, min: 0, max: 100 },
  rate4: { type: Number, default: 0, min: 0, max: 100 },
  rate5: { type: Number, default: 0, min: 0, max: 100 },
  rate6: { type: Number, default: 0, min: 0, max: 100 },
  rate7: { type: Number, default: 0, min: 0, max: 100 },
  rate8: { type: Number, default: 0, min: 0, max: 100 },
  rate9: { type: Number, default: 0, min: 0, max: 100 },
  rate10: { type: Number, default: 0, min: 0, max: 100 },
  rate11: { type: Number, default: 0, min: 0, max: 100 },
  rate12: { type: Number, default: 0, min: 0, max: 100 },
  
  // Logo ve görsel
  imageUrl: {
    type: String,
    trim: true,
    maxlength: [255, 'Logo URL 255 karakterden uzun olamaz']
  },
  
  // Netahsilat POS bilgileri
  vposId: {
    type: Number,
    required: [true, 'VPos ID gereklidir']
  },
  
  vposName: {
    type: String,
    trim: true,
    maxlength: [100, 'VPos adı 100 karakterden uzun olamaz']
  },
  
  // Komisyon oranları
  commissionRate: {
    type: Number,
    default: 0,
    min: [0, 'Komisyon oranı negatif olamaz'],
    max: [100, 'Komisyon oranı 100\'den büyük olamaz']
  },
  
  serviceCommissionRate: {
    type: Number,
    default: 0,
    min: [0, 'Servis komisyon oranı negatif olamaz'],
    max: [100, 'Servis komisyon oranı 100\'den büyük olamaz']
  },
  
  // Tarih bilgileri
  createdDate: {
    type: Date,
    default: Date.now
  },
  
  updatedDate: {
    type: Date
  },
  
  updatedBy: {
    type: String,
    trim: true,
    maxlength: [100, 'Güncelleyen kullanıcı adı 100 karakterden uzun olamaz']
  }
}, {
  timestamps: true,
  collection: 'installmentrates'
});

// Indexes
InstallmentRateSchema.index({ bankCode: 1 });
InstallmentRateSchema.index({ isActive: 1 });
InstallmentRateSchema.index({ vposId: 1 });

// Virtual methods
InstallmentRateSchema.virtual('availableInstallments').get(function() {
  const installments = [];
  for (let i = 2; i <= 12; i++) {
    if (this[`installment${i}`]) {
      installments.push({
        count: i,
        rate: this[`rate${i}`],
        enabled: true
      });
    }
  }
  return installments;
});

// Instance methods
InstallmentRateSchema.methods.getInstallmentRate = function(installmentCount) {
  if (installmentCount < 2 || installmentCount > 12) {
    return 0;
  }
  return this[`rate${installmentCount}`] || 0;
};

InstallmentRateSchema.methods.isInstallmentAvailable = function(installmentCount) {
  if (installmentCount < 2 || installmentCount > 12) {
    return false;
  }
  return this[`installment${installmentCount}`] || false;
};

InstallmentRateSchema.methods.calculateInstallmentAmount = function(totalAmount, installmentCount) {
  if (!this.isInstallmentAvailable(installmentCount)) {
    return null;
  }
  
  const rate = this.getInstallmentRate(installmentCount);
  const rateMultiplier = 1 + (rate / 100);
  const totalWithRate = totalAmount * rateMultiplier;
  
  return {
    installmentCount,
    monthlyAmount: Math.round((totalWithRate / installmentCount) * 100) / 100,
    totalAmount: Math.round(totalWithRate * 100) / 100,
    rate: rate,
    extraAmount: Math.round((totalWithRate - totalAmount) * 100) / 100
  };
};

// Static methods
InstallmentRateSchema.statics.findByBankCode = function(bankCode) {
  return this.findOne({ bankCode: bankCode.toLowerCase(), isActive: true });
};

InstallmentRateSchema.statics.getActiveInstallmentRates = function() {
  return this.find({ isActive: true }).sort({ bankName: 1 });
};

InstallmentRateSchema.statics.findByVposId = function(vposId) {
  return this.findOne({ vposId: vposId, isActive: true });
};

module.exports = mongoose.model('InstallmentRate', InstallmentRateSchema);