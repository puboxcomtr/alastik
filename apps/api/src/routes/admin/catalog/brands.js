const express = require('express');
const DiaStock = require('../../../models/DiaStock');
const { MAIN_DIA_FILTERS } = require('../../../config/diaFilters');
const router = express.Router();

router.get('/', async (req, res) => {
    try {
        const diaFilter = {};
        MAIN_DIA_FILTERS.forEach(filter => {
            const { field, operator, value } = filter;

            switch (operator) {
                case '=':
                    diaFilter[field] = value;
                    break;
                case '>':
                    diaFilter[field] = { $gt: parseFloat(value) };
                    break;
                case '<':
                    diaFilter[field] = { $lt: parseFloat(value) };
                    break;
                case '>=':
                    diaFilter[field] = { $gte: parseFloat(value) };
                    break;
                case '<=':
                    diaFilter[field] = { $lte: parseFloat(value) };
                    break;
                default:
                    diaFilter[field] = value;
            }
        });
        diaFilter.marka = { $ne: null, $ne: '' };
        diaFilter['m_urunOzellikleri'] = {
            $not: {
                $elemMatch: {
                    ozellikadi: 'Durumu',
                    detayaciklama: 'İkinci El'
                }
            }
        };
        const brands = await DiaStock.aggregate([
            { $match: diaFilter },
            {
                $group: {
                    _id: '$marka',
                    uniqueProducts: { $addToSet: '$_key' }
                }
            },
            {
                $project: {
                    name: '$_id',
                    count: { $size: '$uniqueProducts' }
                }
            },
            {
                $sort: { name: 1 }
            }
        ]);
        res.json({
            success: true,
            data: brands
        });
    } catch (error) {
        console.error('Brands get error:', error);
        res.status(500).json({
            success: false,
            message: 'Markalar getirilirken hata oluştu'
        });
    }
});

module.exports = router;