const mongoose = require('mongoose');

const webSettingsSchema = new mongoose.Schema({
    companyInfo: {
        name: { type: String, default: '' },
        officialName: { type: String, default: '' },
        website: { type: String, default: '' },
        authorizedPerson: { type: String, default: '' },
        phone: { type: String, default: '' },
        phone2: { type: String, default: '' },
        fax: { type: String, default: '' },
        country: { type: String, default: '' },
        city: { type: String, default: '' },
        district: { type: String, default: '' },
        postalCode: { type: String, default: '' },
        address: { type: String, default: '' }
    },
    emailInfo: {
        email: { type: String, default: '' },
        orderEmail: { type: String, default: '' }
    },
    // Servis noktaları — hizmet ürünlerinin kartlarında iletişim bilgisi olarak gösterilir
    serviceInfo: {
        points: [{
            _id: false,
            name: { type: String, default: '' },
            phone: { type: String, default: '' }
        }]
    },
    taxInfo: {
        registrationNumber: { type: String, default: '' },
        taxOffice: { type: String, default: '' },
        taxNumber: { type: String, default: '' }
    },
    legalContracts: {
        contact: { type: String, default: '' },
        preInformation: { type: String, default: '' },
        membershipAgreement: { type: String, default: '' },
        kvkk: { type: String, default: '' },
        salesAgreement: { type: String, default: '' },
        returnPolicy: { type: String, default: '' },
        salesConditions: { type: String, default: '' }
    },
    images: {
        mailLogo: { type: String, default: '' },
        favicon: { type: String, default: '' }
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
    collection: 'websettings'
});

webSettingsSchema.statics.getSettings = async function (site = 'alastik') {
    let settings = await this.findOne({ site });
    if (!settings) {
        settings = await this.create({ site });
    }
    return settings;
};

module.exports = mongoose.model('WebSettings', webSettingsSchema);