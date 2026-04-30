const mongoose = require('mongoose')

const smtpSettingsSchema = new mongoose.Schema(
    {
        host: { type: String, required: true, trim: true },
        port: { type: Number, required: true, default: 587 },
        username: { type: String, required: true, trim: true },
        password: { type: String, required: true },
        provider: { type: String, enum: ['smtp', 'mailgun'], default: 'smtp' },
        senderEmail: { type: String, trim: true },
        isSingleton: { type: Boolean, default: true, unique: true }
    },
    { timestamps: true, collection: 'smtpsettings' }
)

smtpSettingsSchema.statics.getSingleton = async function () {
    let doc = await this.findOne({ isSingleton: true })

    if (!doc) {
        doc = await this.create({
            isSingleton: true,
            host: '',
            port: 587,
            username: '',
            password: '',
            provider: 'smtp',
            senderEmail: ''
        })
    }

    return doc
}

module.exports = mongoose.model('SmtpSettings', smtpSettingsSchema)