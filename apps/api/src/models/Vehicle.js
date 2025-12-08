const mongoose = require('mongoose');

const vehicleSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    brand: {
        type: String,
        required: true
    },
    model: {
        type: String,
        required: true
    },
    year: {
        type: Number,
        required: true
    },
    plate: {
        type: String,
        uppercase: true,
        trim: true
    },
    // Teknik özellikler
    specs: {
        engineSize: String,
        fuelType: String,
        transmission: String
    },
    isDefault: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    deletedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index'ler
vehicleSchema.index({ userId: 1, isActive: 1 });
vehicleSchema.index({ userId: 1, isDefault: 1 });

// Soft delete
vehicleSchema.methods.softDelete = function () {
    this.isActive = false;
    this.deletedAt = new Date();
    return this.save();
};

module.exports = mongoose.model('Vehicle', vehicleSchema);