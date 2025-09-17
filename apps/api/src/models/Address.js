const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  title: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['home', 'work', 'other'],
    default: 'home'
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: true,
    trim: true
  },
  district: {
    type: String,
    required: true,
    trim: true
  },
  neighborhood: {
    type: String,
    trim: true
  },
  addressLine: {
    type: String,
    required: true,
    trim: true
  },
  buildingNo: {
    type: String,
    trim: true
  },
  floor: {
    type: String,
    trim: true
  },
  apartmentNo: {
    type: String,
    trim: true
  },
  postalCode: {
    type: String,
    trim: true
  },
  directions: {
    type: String,
    trim: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  tcNo: {
    type: String,
    trim: true,
    validate: {
      validator: function(v) {
        // TC Kimlik No validation (opsiyonel)
        if (!v) return true;
        return /^[1-9][0-9]{10}$/.test(v);
      },
      message: 'Geçersiz TC Kimlik No'
    }
  },
  companyName: {
    type: String,
    trim: true
  },
  taxNumber: {
    type: String,
    trim: true
  },
  taxOffice: {
    type: String,
    trim: true
  },
  invoiceType: {
    type: String,
    enum: ['individual', 'corporate'],
    default: 'individual'
  }
}, {
  timestamps: true
});

// Bir kullanıcının sadece bir tane default adresi olabilir
addressSchema.pre('save', async function(next) {
  if (this.isDefault) {
    await this.constructor.updateMany(
      { userId: this.userId, _id: { $ne: this._id } },
      { isDefault: false }
    );
  }
  next();
});

// Kullanıcının ilk adresi otomatik olarak default olsun
addressSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await this.constructor.countDocuments({ userId: this.userId });
    if (count === 0) {
      this.isDefault = true;
    }
  }
  next();
});

// Virtual field for full address
addressSchema.virtual('fullAddress').get(function() {
  const parts = [
    this.addressLine,
    this.buildingNo && `No: ${this.buildingNo}`,
    this.floor && `Kat: ${this.floor}`,
    this.apartmentNo && `Daire: ${this.apartmentNo}`,
    this.neighborhood,
    this.district,
    this.city,
    this.postalCode
  ].filter(Boolean);
  
  return parts.join(', ');
});

// JSON'a çevirirken virtual field'ları da dahil et
addressSchema.set('toJSON', { virtuals: true });

const Address = mongoose.model('Address', addressSchema);

module.exports = Address;
