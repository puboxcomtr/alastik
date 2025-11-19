// apps/api/src/routes/web/catalog/brands.js
const express = require('express');
const router = express.Router();
const WebBrand = require('../../../models/WebBrand');

router.get('/:brandName', async (req, res) => {
    try {
        const { brandName } = req.params;

        const brand = await WebBrand.findOne({
            $or: [
                { diaBrand: brandName },
                { diaMarkaAck: brandName },
                { name: brandName }
            ],
            webVisible: true
        })
            .select('name diaMarkaAck logo')
            .lean();

        if (!brand) {
            return res.json({
                success: true,
                data: null
            });
        }

        res.json({
            success: true,
            data: {
                name: brand.diaMarkaAck || brand.name,
                logo: brand.logo?.url || null
            }
        });
    } catch (error) {
        console.error('Brand fetch error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;