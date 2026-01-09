const express = require('express');
const router = express.Router();
const AddressCity = require('../../../models/web/address/AddressCity');
const AddressDistrict = require('../../../models/web/address/AddressDistrict');
const AddressNeighborhood = require('../../../models/web/address/AddressNeighborhood');

// GET /api/location/cities
router.get('/cities', async (req, res) => {
    try {
        const cities = await AddressCity.find().sort({ cityName: 1 });
        res.json({ success: true, data: cities });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/location/districts/:cityId
router.get('/districts/:cityId', async (req, res) => {
    try {
        const districts = await AddressDistrict.find({ cityId: req.params.cityId }).sort({ districtName: 1 });
        res.json({ success: true, data: districts });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// GET /api/location/neighborhoods/:districtId
router.get('/neighborhoods/:districtId', async (req, res) => {
    try {
        const neighborhoods = await AddressNeighborhood.find({ districtId: req.params.districtId }).sort({ neighborhoodName: 1 });
        res.json({ success: true, data: neighborhoods });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;