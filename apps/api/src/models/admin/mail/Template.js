const mongoose = require('mongoose')
const { SITES, DEFAULT_SITE } = require('../../../config/sites')

const templateSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: Object.keys(SITES),
        default: DEFAULT_SITE,
        required: true,
        index: true
    },
    templateKey: {
        type: String,
        required: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        enum: ['genel', 'admin', 'uye'],
        default: 'genel'
    },
    categoryName: {
        type: String,
        required: true,
        trim: true
    },
    subject: {
        type: String,
        default: '',
        trim: true
    },
    defaultSubject: {
        type: String,
        default: '',
        trim: true
    },
    content: {
        type: String,
        default: ''
    },
    defaultContent: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    },
    order: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true,
    collection: 'webmailtemplates'
})

templateSchema.index({ site: 1, templateKey: 1 }, { unique: true })
templateSchema.index({ category: 1, order: 1 })

module.exports = mongoose.model('WebMailTemplate', templateSchema)