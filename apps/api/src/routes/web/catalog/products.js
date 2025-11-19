// apps/api/src/routes/web/catalog/products.js
const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/WebProduct');
const WebCategory = require('../../../models/WebCategory');

router.get('/filter', async (req, res) => {
    try {
        const {
            category,
            genislik,
            yukseklik,
            cap,
            limit
        } = req.query;
        const pageNum = parseInt(req.query.page) || 1;
        const limitNum = parseInt(limit) || 25;
        const filter = {
            'syncInfo.diaStatus': 'synced',
            'customData.webVisible': true,
            'diaData.durum': 'A'
        };
        if (category) {
            const webCategory = await WebCategory.findOne({
                slug: category,
                webVisible: true
            }).lean();

            if (webCategory && webCategory.diaCategory) {
                const diaLevel = webCategory.diaLevel || 'kategori_aciklama_2';
                filter['diaData.m_kategoriler'] = {
                    $elemMatch: {
                        [diaLevel]: webCategory.diaCategory
                    }
                };
            }
        }
        if (genislik && yukseklik && cap) {
            filter['diaData.m_urunOzellikleri'] = {
                $all: [
                    { $elemMatch: { ozellikadi: 'Genişlik', detayaciklama: genislik } },
                    { $elemMatch: { ozellikadi: 'Yanak', detayaciklama: yukseklik } },
                    { $elemMatch: { ozellikadi: 'Jant Çapı', detayaciklama: `R${cap}` } }
                ]
            };
        }
        const skip = (pageNum - 1) * limitNum;
        const totalProducts = await WebProduct.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / limitNum);
        const products = await WebProduct.find(filter)
            .select('_key customData diaData')
            .skip(skip)
            .limit(limitNum)
            .lean();

        res.json({
            success: true,
            data: {
                products,
                pagination: {
                    currentPage: pageNum,
                    totalPages,
                    totalProducts,
                    productsPerPage: limitNum,
                    hasNextPage: pageNum < totalPages,
                    hasPrevPage: pageNum > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});


module.exports = router;