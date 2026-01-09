const mongoose = require('mongoose');

const addressNeighborhoodSchema = new mongoose.Schema({
    neighborhoodId: { type: String, required: true, unique: true },
    neighborhoodName: { type: String, required: true },
    districtId: { type: String, required: true },
    cityId: { type: String, required: true }
}, {
    timestamps: true,
    collection: 'address_neighborhoods'
});

addressNeighborhoodSchema.index({ neighborhoodId: 1 });
addressNeighborhoodSchema.index({ districtId: 1 });
addressNeighborhoodSchema.index({ cityId: 1 });

module.exports = mongoose.model('AddressNeighborhood', addressNeighborhoodSchema);