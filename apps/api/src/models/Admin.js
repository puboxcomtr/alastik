const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const AdminSchema = new mongoose.Schema({
  // Temel kimlik bilgileri
  email: {
    type: String,
    required: [true, 'Email gereklidir'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Geçerli bir email adresi giriniz']
  },
  
  username: {
    type: String,
    required: [true, 'Kullanıcı adı gereklidir'],
    unique: true,
    trim: true,
    minlength: [3, 'Kullanıcı adı en az 3 karakter olmalıdır'],
    maxlength: [20, 'Kullanıcı adı en fazla 20 karakter olabilir'],
    match: [/^[a-zA-Z0-9_-]+$/, 'Kullanıcı adı sadece harf, rakam, tire ve alt çizgi içerebilir']
  },
  
  password: {
    type: String,
    required: [true, 'Şifre gereklidir'],
    minlength: [8, 'Şifre en az 8 karakter olmalıdır'],
    select: false
  },
  
  // Kişisel bilgiler
  profile: {
    firstName: {
      type: String,
      required: [true, 'Ad gereklidir'],
      trim: true,
      maxlength: [50, 'Ad 50 karakterden uzun olamaz']
    },
    lastName: {
      type: String,
      required: [true, 'Soyad gereklidir'],
      trim: true,
      maxlength: [50, 'Soyad 50 karakterden uzun olamaz']
    },
    phone: {
      type: String,
      trim: true,
      match: [/^[0-9]{10,11}$/, 'Geçerli bir telefon numarası giriniz']
    },
    avatar: {
      url: String,
      publicId: String
    },
    department: {
      type: String,
      enum: ['IT', 'Sales', 'Marketing', 'Customer Service', 'Management', 'Operations', 'Finance'],
      default: 'Operations'
    },
    position: {
      type: String,
      trim: true,
      maxlength: [100, 'Pozisyon 100 karakterden uzun olamaz']
    }
  },
  
  // Rol ve yetkiler
  role: {
    type: String,
    enum: ['super_admin', 'admin', 'manager', 'editor', 'viewer'],
    default: 'viewer'
  },
  
  permissions: {
    // Ürün yönetimi
    products: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    
    // Kullanıcı yönetimi
    users: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      ban: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    
    // Sipariş yönetimi
    orders: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      cancel: { type: Boolean, default: false },
      refund: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    
    // Sepet yönetimi
    carts: {
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    
    // Stok yönetimi
    inventory: {
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      import: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    
    // Kategori yönetimi
    categories: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: true },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false }
    },
    
    // Raporlar
    reports: {
      sales: { type: Boolean, default: false },
      users: { type: Boolean, default: false },
      inventory: { type: Boolean, default: false },
      analytics: { type: Boolean, default: false },
      export: { type: Boolean, default: false }
    },
    
    // Sistem ayarları
    settings: {
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      system: { type: Boolean, default: false },
      backup: { type: Boolean, default: false }
    },
    
    // Admin yönetimi
    admins: {
      create: { type: Boolean, default: false },
      read: { type: Boolean, default: false },
      update: { type: Boolean, default: false },
      delete: { type: Boolean, default: false },
      permissions: { type: Boolean, default: false }
    }
  },
  
  // Hesap durumu
  status: {
    type: String,
    enum: ['active', 'inactive', 'suspended', 'pending'],
    default: 'pending'
  },
  
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  
  // Doğrulama token'ları
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  passwordResetToken: String,
  passwordResetExpires: Date,
  
  // Güvenlik
  loginAttempts: {
    count: {
      type: Number,
      default: 0
    },
    lastAttempt: Date,
    lockedUntil: Date
  },
  
  lastLogin: {
    date: Date,
    ip: String,
    userAgent: String
  },
  
  // Oturum yönetimi
  sessions: [{
    token: String,
    createdAt: { type: Date, default: Date.now },
    lastActivity: { type: Date, default: Date.now },
    ip: String,
    userAgent: String,
    isActive: { type: Boolean, default: true }
  }],
  
  // Aktivite geçmişi
  activityLog: [{
    action: {
      type: String,
      required: true
    },
    resource: String,
    resourceId: String,
    details: mongoose.Schema.Types.Mixed,
    ip: String,
    userAgent: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Tercihler
  preferences: {
    language: {
      type: String,
      enum: ['tr', 'en'],
      default: 'tr'
    },
    timezone: {
      type: String,
      default: 'Europe/Istanbul'
    },
    dateFormat: {
      type: String,
      enum: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'],
      default: 'DD/MM/YYYY'
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    notifications: {
      email: {
        login: { type: Boolean, default: true },
        systemAlerts: { type: Boolean, default: true },
        reports: { type: Boolean, default: false }
      },
      browser: {
        enabled: { type: Boolean, default: true },
        sound: { type: Boolean, default: false }
      }
    },
    dashboard: {
      layout: {
        type: String,
        enum: ['grid', 'list'],
        default: 'grid'
      },
      widgets: [{
        type: String,
        position: Number,
        size: String,
        visible: { type: Boolean, default: true }
      }]
    }
  },
  
  // İstatistikler
  statistics: {
    totalLogins: {
      type: Number,
      default: 0
    },
    lastActivityDate: Date,
    actionsPerformed: {
      type: Number,
      default: 0
    },
    averageSessionDuration: {
      type: Number,
      default: 0
    }
  },
  
  // Oluşturan admin
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  
  // Tarih bilgileri
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  lastActiveAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.emailVerificationToken;
      delete ret.passwordResetToken;
      delete ret.sessions;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Indexes for performance
AdminSchema.index({ email: 1 });
AdminSchema.index({ username: 1 });
AdminSchema.index({ role: 1 });
AdminSchema.index({ status: 1 });
AdminSchema.index({ 'profile.department': 1 });
AdminSchema.index({ createdAt: -1 });
AdminSchema.index({ lastActiveAt: -1 });

// Virtual fields
AdminSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

AdminSchema.virtual('isLocked').get(function() {
  return !!(this.loginAttempts.lockedUntil && this.loginAttempts.lockedUntil > Date.now());
});

AdminSchema.virtual('activeSessions').get(function() {
  return this.sessions.filter(session => session.isActive);
});

// Middleware
AdminSchema.pre('save', async function(next) {
  // Şifre hashleme
  if (this.isModified('password')) {
    this.password = await bcrypt.hash(this.password, 12);
  }
  
  // Rol bazlı varsayılan yetkileri ayarla
  if (this.isModified('role')) {
    this.setDefaultPermissions();
  }
  
  // Güncelleme tarihi
  this.updatedAt = Date.now();
  
  next();
});

// Instance methods
AdminSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

AdminSchema.methods.generateEmailVerificationToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.emailVerificationToken = crypto.createHash('sha256').update(token).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 saat
  return token;
};

AdminSchema.methods.generatePasswordResetToken = function() {
  const token = crypto.randomBytes(32).toString('hex');
  this.passwordResetToken = crypto.createHash('sha256').update(token).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 dakika
  return token;
};

AdminSchema.methods.incrementLoginAttempts = function() {
  // Eğer önceki kilitlenme süresi geçmişse sıfırla
  if (this.loginAttempts.lockedUntil && this.loginAttempts.lockedUntil < Date.now()) {
    return this.updateOne({
      $unset: { 'loginAttempts.lockedUntil': 1 },
      $set: { 'loginAttempts.count': 1, 'loginAttempts.lastAttempt': Date.now() }
    });
  }
  
  const updates = { 
    $inc: { 'loginAttempts.count': 1 },
    $set: { 'loginAttempts.lastAttempt': Date.now() }
  };
  
  // 5 başarısız denemeden sonra 1 saat kilitle
  if (this.loginAttempts.count + 1 >= 5 && !this.isLocked) {
    updates.$set['loginAttempts.lockedUntil'] = Date.now() + 1 * 60 * 60 * 1000;
  }
  
  return this.updateOne(updates);
};

AdminSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { 
      'loginAttempts.count': 1,
      'loginAttempts.lastAttempt': 1,
      'loginAttempts.lockedUntil': 1
    }
  });
};

AdminSchema.methods.updateLastLogin = function(ip, userAgent) {
  this.lastLogin = {
    date: new Date(),
    ip: ip,
    userAgent: userAgent
  };
  this.lastActiveAt = new Date();
  this.statistics.totalLogins += 1;
  return this.save();
};

AdminSchema.methods.createSession = function(ip, userAgent) {
  const sessionToken = crypto.randomBytes(32).toString('hex');
  
  this.sessions.push({
    token: crypto.createHash('sha256').update(sessionToken).digest('hex'),
    ip: ip,
    userAgent: userAgent,
    isActive: true
  });
  
  // Maksimum 5 aktif oturum
  if (this.sessions.length > 5) {
    this.sessions.shift();
  }
  
  return sessionToken;
};

AdminSchema.methods.invalidateSession = function(sessionToken) {
  const hashedToken = crypto.createHash('sha256').update(sessionToken).digest('hex');
  const session = this.sessions.find(s => s.token === hashedToken);
  
  if (session) {
    session.isActive = false;
  }
  
  return this.save();
};

AdminSchema.methods.invalidateAllSessions = function() {
  this.sessions.forEach(session => session.isActive = false);
  return this.save();
};

AdminSchema.methods.hasPermission = function(resource, action) {
  if (this.role === 'super_admin') return true;
  
  const resourcePermissions = this.permissions[resource];
  if (!resourcePermissions) return false;
  
  return resourcePermissions[action] === true;
};

AdminSchema.methods.setDefaultPermissions = function() {
  const rolePermissions = {
    super_admin: {
      // Super admin her şeyi yapabilir
      products: { create: true, read: true, update: true, delete: true, import: true, export: true },
      users: { create: true, read: true, update: true, delete: true, ban: true, export: true },
      orders: { create: true, read: true, update: true, delete: true, cancel: true, refund: true, export: true },
      carts: { read: true, update: true, delete: true, analytics: true, export: true },
      inventory: { read: true, update: true, import: true, export: true },
      categories: { create: true, read: true, update: true, delete: true },
      reports: { sales: true, users: true, inventory: true, analytics: true, export: true },
      settings: { read: true, update: true, system: true, backup: true },
      admins: { create: true, read: true, update: true, delete: true, permissions: true }
    },
    admin: {
      products: { create: true, read: true, update: true, delete: false, import: true, export: true },
      users: { create: false, read: true, update: true, delete: false, ban: true, export: true },
      orders: { create: false, read: true, update: true, delete: false, cancel: true, refund: true, export: true },
      carts: { read: true, update: true, delete: false, analytics: true, export: true },
      inventory: { read: true, update: true, import: true, export: true },
      categories: { create: true, read: true, update: true, delete: false },
      reports: { sales: true, users: true, inventory: true, analytics: true, export: true },
      settings: { read: true, update: false, system: false, backup: false },
      admins: { create: false, read: true, update: false, delete: false, permissions: false }
    },
    manager: {
      products: { create: true, read: true, update: true, delete: false, import: false, export: true },
      users: { create: false, read: true, update: false, delete: false, ban: false, export: true },
      orders: { create: false, read: true, update: true, delete: false, cancel: true, refund: false, export: true },
      carts: { read: true, update: false, delete: false, analytics: true, export: true },
      inventory: { read: true, update: true, import: false, export: true },
      categories: { create: false, read: true, update: true, delete: false },
      reports: { sales: true, users: false, inventory: true, analytics: true, export: true },
      settings: { read: true, update: false, system: false, backup: false },
      admins: { create: false, read: false, update: false, delete: false, permissions: false }
    },
    editor: {
      products: { create: true, read: true, update: true, delete: false, import: false, export: false },
      users: { create: false, read: true, update: false, delete: false, ban: false, export: false },
      orders: { create: false, read: true, update: false, delete: false, cancel: false, refund: false, export: false },
      carts: { read: true, update: false, delete: false, analytics: false, export: false },
      inventory: { read: true, update: false, import: false, export: false },
      categories: { create: false, read: true, update: true, delete: false },
      reports: { sales: false, users: false, inventory: false, analytics: false, export: false },
      settings: { read: false, update: false, system: false, backup: false },
      admins: { create: false, read: false, update: false, delete: false, permissions: false }
    },
    viewer: {
      products: { create: false, read: true, update: false, delete: false, import: false, export: false },
      users: { create: false, read: false, update: false, delete: false, ban: false, export: false },
      orders: { create: false, read: true, update: false, delete: false, cancel: false, refund: false, export: false },
      carts: { read: true, update: false, delete: false, analytics: false, export: false },
      inventory: { read: true, update: false, import: false, export: false },
      categories: { create: false, read: true, update: false, delete: false },
      reports: { sales: false, users: false, inventory: false, analytics: false, export: false },
      settings: { read: false, update: false, system: false, backup: false },
      admins: { create: false, read: false, update: false, delete: false, permissions: false }
    }
  };
  
  this.permissions = rolePermissions[this.role] || rolePermissions.viewer;
};

AdminSchema.methods.logActivity = function(action, resource, resourceId, details, ip, userAgent) {
  this.activityLog.push({
    action,
    resource,
    resourceId,
    details,
    ip,
    userAgent,
    timestamp: new Date()
  });
  
  // Son 1000 aktiviteyi tut
  if (this.activityLog.length > 1000) {
    this.activityLog = this.activityLog.slice(-1000);
  }
  
  this.statistics.actionsPerformed += 1;
  this.statistics.lastActivityDate = new Date();
  
  return this.save();
};

// Static methods
AdminSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

AdminSchema.statics.findByUsername = function(username) {
  return this.findOne({ username: username.toLowerCase() });
};

AdminSchema.statics.findByRole = function(role) {
  return this.find({ role: role, status: 'active' });
};

AdminSchema.statics.findActiveAdmins = function() {
  return this.find({ status: 'active' });
};

AdminSchema.statics.findByDepartment = function(department) {
  return this.find({ 'profile.department': department, status: 'active' });
};

module.exports = mongoose.model('Admin', AdminSchema); 