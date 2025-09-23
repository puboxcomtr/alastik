const mongoose = require('mongoose');

const productCustomSchema = new mongoose.Schema({
    dia_id: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    note: {
        type: String,
        default: ''
    }, 
    seo_title: {
        type: String,
        default: ''
    },
    seo_description: {
        type: String,
        default: ''
    },
    seo_url: {
        type: String,
        default: ''
    },
    custom_tags: [String], 
    web_status: {
        type: String,
        enum: ['A', 'P'],
        default: 'A'
    },
}, {
    timestamps: true 
});

module.exports = mongoose.model('ProductCustom', productCustomSchema);