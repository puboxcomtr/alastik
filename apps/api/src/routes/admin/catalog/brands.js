const express = require('express');
const DiaStock = require('../../../models/DiaStock');
const { authenticateAdmin } = require('../../../middleware/auth');

const router = express.Router();

const maybeAuth = process.env.NODE_ENV === 'production' ? authenticateAdmin : (req, res, next) => next();

router.get('/', maybeAuth, async (req, res) => {
    try {
        const brands = await DiaStock.aggregate([
            {
                $match: {
                    durum: 'A',
                    b2c_durum: 'E',
                    b2c_gonder: 'E',
                    fiili_stok: { $gt: 0 },
                    marka: { $ne: null, $ne: '' },
                    'm_urunOzellikleri': {
                        $not: {
                            $elemMatch: {
                                ozellikadi: 'Durumu',
                                detayaciklama: 'İkinci El'
                            }
                        }
                    }
                }
            },
            {
                $group: {
                    _id: '$marka',
                    uniqueProducts: { $addToSet: '$_key' }
                }
            },
            {
                $project: {
                    _id: 1,
                    count: { $size: '$uniqueProducts' }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        const formattedBrands = brands.map(brand => ({
            name: brand._id,
            count: brand.count
        }));

        res.json({ success: true, data: formattedBrands });
    } catch (error) {
        console.error('Brands get error:', error);
        res.status(500).json({
            success: false,
            message: 'Markalar getirilirken hata oluştu'
        });
    }
});

module.exports = router;