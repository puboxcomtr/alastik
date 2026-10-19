const mongoose = require('mongoose')
const { SITES, DEFAULT_SITE } = require('../../../../config/sites')

const smtpSettingsSchema = new mongoose.Schema(
    {
        site: {
            type: String,
            enum: Object.keys(SITES),
            default: DEFAULT_SITE,
            required: true,
            unique: true,
            index: true
        },
        host: { type: String, default: '', trim: true },
        port: { type: Number, default: 587 },
        username: { type: String, default: '', trim: true },
        password: { type: String, default: '' },
        provider: { type: String, enum: ['smtp', 'mailgun'], default: 'smtp' },
        senderEmail: { type: String, trim: true }
    },
    { timestamps: true, collection: 'smtpsettings' }
)

smtpSettingsSchema.statics.getForSite = async function (site) {
    const slug = SITES[site] ? site : DEFAULT_SITE
    let doc = await this.findOne({ site: slug })

    if (!doc) {
        doc = await this.create({ site: slug })
    }

    return doc
}

module.exports = mongoose.model('SmtpSettings', smtpSettingsSchema)
