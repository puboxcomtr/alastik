const mongoose = require('mongoose');

const addressCitySchema = new mongoose.Schema({
    cityId: { type: String, required: true, unique: true },
    cityName: { type: String, required: true }
}, {
    timestamps: true,
    collection: 'address_cities'
});

addressCitySchema.index({ cityId: 1 });
addressCitySchema.index({ cityName: 1 });

module.exports = mongoose.model('AddressCity', addressCitySchema);