const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema({
    module: {
        type: String,
        required: true,
        enum: ['products', 'categories', 'brands', 'tags']
    },
    view: { type: Boolean, default: false },
    create: { type: Boolean, default: false },
    edit: { type: Boolean, default: false },
    delete: { type: Boolean, default: false }
}, { _id: false });

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    permissions: [permissionSchema],
    isSystem: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
}, {
    timestamps: true,
    collection: 'roles'
});

// Index'ler
roleSchema.index({ name: 1 });
roleSchema.index({ status: 1 });

// Sistem rollerini silme engeli
roleSchema.pre('remove', function (next) {
    if (this.isSystem) {
        next(new Error('Sistem rolleri silinemez'));
    }
    next();
});

// Static metodlar
roleSchema.statics.getActiveRoles = function () {
    return this.find({ status: 'active' });
};

roleSchema.statics.findByName = function (name) {
    return this.findOne({ name });
};

// Instance metodlar
roleSchema.methods.hasPermission = function (module, action) {
    const permission = this.permissions.find(p => p.module === module);
    return permission ? permission[action] === true : false;
};

module.exports = mongoose.model('Role', roleSchema);