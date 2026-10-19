const express = require('express');
const router = express.Router();
const ChampionshipTire = require('../../../models/admin/catalog/ChampionshipTire');

router.get('/', async (req, res) => {
    try {
        const championships = await ChampionshipTire.find({ site: req.site }).sort({ name: 1 }).lean();
        res.json({ success: true, data: championships });
    } catch (error) {
        console.error('Championship listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Şampiyonluklar listelenemedi' });
    }
});

router.get('/product/:productKey', async (req, res) => {
    try {
        const championships = await ChampionshipTire.find({ productKey: req.params.productKey, site: req.site }).lean();
        res.json({ success: true, data: championships });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Şampiyonluklar getirilemedi' });
    }
});

router.put('/:id/assign', async (req, res) => {
    try {
        const { productKey } = req.body;
        const championship = await ChampionshipTire.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { productKey, updatedAt: new Date() },
            { new: true }
        );
        if (!championship) {
            return res.status(404).json({ success: false, message: 'Şampiyonluk bulunamadı' });
        }
        res.json({ success: true, data: championship, message: 'Şampiyonluk ürüne bağlandı' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bağlama başarısız' });
    }
});

router.put('/:id/unassign', async (req, res) => {
    try {
        const championship = await ChampionshipTire.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { productKey: '', updatedAt: new Date() },
            { new: true }
        );
        res.json({ success: true, data: championship, message: 'Şampiyonluk bağlantısı kaldırıldı' });
    } catch (error) {
        res.status(500).json({ success: false, message: 'İşlem başarısız' });
    }
});

module.exports = router;