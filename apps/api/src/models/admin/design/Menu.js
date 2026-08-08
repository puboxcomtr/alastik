const mongoose = require('mongoose');

const linkDataSchema = new mongoose.Schema({
    url: String,
    categoryId: String,
    categoryLevel: { type: Number, enum: [1, 2] },
    pageId: String,
    blogId: String,
    productId: String
}, { _id: false });

const menuSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    menuType: {
        type: String,
        required: true,
        enum: ['link', 'category', 'page', 'blog', 'product', 'heading']
    },
    linkData: {
        type: linkDataSchema,
        required: true
    },
    openNewTab: {
        type: Boolean,
        default: false
    },
    displayArea: {
        type: String,
        required: true,
        enum: ['header', 'footer', 'mobile', 'general'] // general: serbest alan, site üzerinde bir yere bağlı değildir
    },
    rowLevel: {
        type: Number,
        required: true,
        enum: [1, 2, 3], // 1: menü (grup), 2: üst bar öğesi, 3: açılır menü öğesi

        default: 1
    },
    parentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Menu',
        default: null
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    },
    site: {
        type: String,
        required: true,
        enum: ['alastik', 'lastikjantavm'],
        default: 'alastik',
        index: true
    }
}, {
    timestamps: true,
    collection: 'menus'
});

// Index'ler
menuSchema.index({ site: 1, displayArea: 1, order: 1 });
menuSchema.index({ site: 1, parentId: 1 });
menuSchema.index({ site: 1, rowLevel: 1, displayArea: 1 });
menuSchema.index({ site: 1, isActive: 1 });

// Virtual - Alt menüleri getir
menuSchema.virtual('children', {
    ref: 'Menu',
    localField: '_id',
    foreignField: 'parentId'
});

menuSchema.set('toJSON', { virtuals: true });
menuSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Menu', menuSchema);