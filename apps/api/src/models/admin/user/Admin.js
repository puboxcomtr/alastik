const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { SITES } = require('../../../config/sites');

const adminSchema = new mongoose.Schema({
  sites: {
    type: [String],
    enum: Object.keys(SITES),
    default: () => Object.keys(SITES)
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    select: false
  },
  role: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  avatar: String,
  lastLogin: Date,
  twoFactorSecret: String,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  preferences: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  permissions: [{
    type: String
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date
}, {
  timestamps: true,
  collection: 'adminusers'
});

adminSchema.index({ email: 1 });
adminSchema.index({ role: 1 });
adminSchema.index({ isActive: 1 });

adminSchema.virtual('isLocked').get(function () {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

adminSchema.virtual('status').get(function () {
  if (!this.isActive) return 'inactive';
  if (this.isLocked) return 'blocked';
  return 'active';
});

adminSchema.virtual('firstName').get(function () {
  return this.name.split(' ')[0] || this.name;
});

adminSchema.virtual('lastName').get(function () {
  const parts = this.name.split(' ');
  return parts.slice(1).join(' ') || '';
});

adminSchema.virtual('fullName').get(function () {
  return this.name;
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.incLoginAttempts = function () {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }

  const updates = { $inc: { loginAttempts: 1 } };
  const maxAttempts = 5;
  const lockTime = 2 * 60 * 60 * 1000;

  if (this.loginAttempts + 1 >= maxAttempts && !this.isLocked) {
    updates.$set = { lockUntil: Date.now() + lockTime };
  }

  return this.updateOne(updates);
};

adminSchema.methods.resetLoginAttempts = function () {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

adminSchema.methods.updateLastLogin = function (ip, userAgent) {
  return this.updateOne({
    $set: {
      lastLogin: new Date(),
      'metadata.lastLoginIP': ip,
      'metadata.lastLoginUserAgent': userAgent
    }
  });
};

adminSchema.methods.createSession = function (ip, userAgent) {
  return Math.random().toString(36).substring(7);
};

adminSchema.methods.invalidateSession = function (token) {
  return Promise.resolve();
};

adminSchema.methods.hasPermission = function (resource, action) {
  if (this.role === 'superadmin') return true;

  const permissionString = `${resource}.${action}`;
  return this.permissions.includes(permissionString);
};

adminSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.twoFactorSecret;
  delete obj.__v;
  return obj;
};

adminSchema.statics.findByEmail = function (email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password');
};

adminSchema.statics.findByUsername = function (username) {
  return this.findOne({ email: username.toLowerCase() }).select('+password');
};

adminSchema.statics.getActiveAdmins = function () {
  return this.find({ isActive: true });
};

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

module.exports = mongoose.model('Admin', adminSchema);