const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const AdminUserSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email adresi gereklidir'],
    lowercase: true,
    trim: true
  },
  
  name: {
    type: String,
    required: [true, 'İsim gereklidir'],
    trim: true
  },
  
  password: {
    type: String,
    required: [true, 'Şifre gereklidir'],
    minlength: [6, 'Şifre en az 6 karakter olmalıdır'],
    select: false
  },
  
  role: {
    type: String,
    enum: ['admin', 'super_admin', 'manager', 'editor'],
    default: 'admin'
  },
  
  permissions: [{
    resource: {
      type: String,
      required: true
    },
    actions: [{
      type: String,
      enum: ['create', 'read', 'update', 'delete', 'manage']
    }]
  }],
  
  isActive: {
    type: Boolean,
    default: true
  },
  
  avatar: {
    type: String,
    default: null
  },
  
  lastLogin: {
    type: Date,
    default: null
  },
  
  loginAttempts: {
    type: Number,
    default: 0
  },
  
  lockUntil: {
    type: Date,
    default: null
  },
  
  twoFactorSecret: {
    type: String,
    default: null,
    select: false
  },
  
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'light'
    },
    language: {
      type: String,
      enum: ['tr', 'en'],
      default: 'tr'
    },
    timezone: {
      type: String,
      default: 'Europe/Istanbul'
    },
    emailNotifications: {
      type: Boolean,
      default: true
    }
  },
  
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AdminUser',
      default: null
    },
    ipAddress: String,
    userAgent: String
  }
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.twoFactorSecret;
      delete ret.__v;
      return ret;
    }
  }
});

AdminUserSchema.index({ email: 1 }, { unique: true });
AdminUserSchema.index({ role: 1 });
AdminUserSchema.index({ isActive: 1 });
AdminUserSchema.index({ createdAt: -1 });

AdminUserSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

AdminUserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

AdminUserSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

AdminUserSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: {
        lockUntil: 1
      },
      $set: {
        loginAttempts: 1
      }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  if (this.loginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000
    };
  }
  
  return this.updateOne(updates);
};

AdminUserSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: {
      loginAttempts: 1,
      lockUntil: 1
    }
  });
};

AdminUserSchema.methods.updateLastLogin = function() {
  return this.updateOne({
    $set: {
      lastLogin: new Date()
    }
  });
};

AdminUserSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

AdminUserSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

AdminUserSchema.statics.createDefaultAdmin = async function() {
  const adminExists = await this.findOne({ role: 'super_admin' });
  
  if (!adminExists) {
    const defaultAdmin = new this({
      email: 'admin@alastik.com',
      name: 'Super Admin',
      password: 'admin123',
      role: 'super_admin',
      permissions: [
        {
          resource: '*',
          actions: ['create', 'read', 'update', 'delete', 'manage']
        }
      ]
    });
    
    await defaultAdmin.save();
    console.log('Default admin user created: admin@alastik.com / admin123');
    return defaultAdmin;
  }
  
  return adminExists;
};

module.exports = mongoose.model('AdminUser', AdminUserSchema); 