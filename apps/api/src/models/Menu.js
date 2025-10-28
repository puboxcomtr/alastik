const mongoose = require('mongoose');

const linkDataSchema = new mongoose.Schema({
    url: String,
    categoryId: String,
    categoryLevel: { type: Number, enum: [1, 2] },
    pageId: String
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
        enum: ['link', 'category', 'page']
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
        enum: ['header', 'footer', 'mobile']
    },
    rowLevel: {
        type: Number,
        required: true,
        enum: [1, 2],
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
    }
}, {
    timestamps: true,
    collection: 'menus'
});

// Index'ler
menuSchema.index({ displayArea: 1, order: 1 });
menuSchema.index({ parentId: 1 });
menuSchema.index({ rowLevel: 1, displayArea: 1 });
menuSchema.index({ isActive: 1 });

// Virtual - Alt menüleri getir
menuSchema.virtual('children', {
    ref: 'Menu',
    localField: '_id',
    foreignField: 'parentId'
});

menuSchema.set('toJSON', { virtuals: true });
menuSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Menu', menuSchema);