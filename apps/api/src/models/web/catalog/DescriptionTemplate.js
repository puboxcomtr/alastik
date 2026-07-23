const mongoose = require('mongoose');

const descriptionTemplateSchema = new mongoose.Schema({
    // Şablon adı (örn. "Pirelli Scorpion Verde Açıklaması")
    name: {
        type: String,
        required: true,
        trim: true
    },

    // Şablon içeriği (HTML formatında)
    content: {
        type: String,
        default: ''
    },

    // Atanmış modeller (ozelkod5kodu değerleri, örn. ["Agilis 3", "P Zero"])
    models: {
        type: [String],
        default: []
    },

    // Aktif/Pasif
    isActive: {
        type: Boolean,
        default: true
    },

    // Son uygulanma bilgileri
    lastAppliedAt: {
        type: Date,
        default: null
    },
    appliedCount: {
        type: Number,
        default: 0
    },

    site: {
        type: String,
        enum: ['alastik', 'lastikjantavm'],
        default: 'alastik',
        required: true,
        index: true
    }
}, {
    timestamps: true,
    collection: 'descriptiontemplates'
});

descriptionTemplateSchema.index({ site: 1, name: 1 });
descriptionTemplateSchema.index({ site: 1, models: 1 });
descriptionTemplateSchema.index({ site: 1, isActive: 1 });

module.exports = mongoose.model('DescriptionTemplate', descriptionTemplateSchema);