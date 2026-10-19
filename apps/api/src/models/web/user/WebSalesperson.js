const mongoose = require('mongoose');
const { SITE_SLUGS } = require('../../../config/sites');
const bcrypt = require('bcrypt');

const SALES_GROUPS = [
    { id: 'retail', label: 'Perakende' },
    { id: 'wholesale', label: 'Toptan' }
];
const SALES_GROUP_IDS = SALES_GROUPS.map(g => g.id);

const webSalespersonSchema = new mongoose.Schema({
    site: {
        type: String,
        enum: SITE_SLUGS,
        default: 'b2b',
        index: true
    },

    diaUserKey: { type: String, required: true, index: true },
    diaUsername: { type: String, trim: true },
    name: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    diaGroups: { type: String, trim: true },
    diaTitle: { type: String, trim: true },
    diaStatus: { type: String, trim: true },

    salesGroup: { type: String, enum: ['', ...SALES_GROUP_IDS], default: '' },

    password: { type: String },
    plainPassword: { type: String },
    mustChangePassword: { type: Boolean, default: false },

    lastLoginAt: Date,
    diaSyncedAt: Date
}, { timestamps: true });

webSalespersonSchema.index({ site: 1, diaUserKey: 1 }, { unique: true });

webSalespersonSchema.pre('save', async function (next) {
    if (!this.isModified('password') || !this.password) return next();
    try {
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (err) {
        next(err);
    }
});

webSalespersonSchema.methods.comparePassword = async function (candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
};

webSalespersonSchema.methods.canLogin = function () {
    return !!this.password && SALES_GROUP_IDS.includes(this.salesGroup);
};

module.exports = mongoose.model('WebSalesperson', webSalespersonSchema);
module.exports.SALES_GROUPS = SALES_GROUPS;
module.exports.SALES_GROUP_IDS = SALES_GROUP_IDS;
