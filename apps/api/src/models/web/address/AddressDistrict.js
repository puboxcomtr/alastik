const mongoose = require('mongoose');

const addressDistrictSchema = new mongoose.Schema({
    districtId: { type: String, required: true, unique: true },
    districtName: { type: String, required: true },
    cityId: { type: String, required: true }
}, {
    timestamps: true,
    collection: 'address_districts'
});

addressDistrictSchema.index({ districtId: 1 });
addressDistrictSchema.index({ cityId: 1 });

module.exports = mongoose.model('AddressDistrict', addressDistrictSchema);