const express = require('express');
const router = express.Router();
const WebAddress = require('../../../models/web/address/WebAddress');

router.get('/user/:userId', async (req, res) => {
    try {
        const addresses = await WebAddress.find({ userId: req.params.userId }).sort({ isDefault: -1, createdAt: -1 });
        res.json({ success: true, data: addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/session/:sessionId', async (req, res) => {
    try {
        const addresses = await WebAddress.find({ sessionId: req.params.sessionId }).sort({ createdAt: -1 });
        res.json({ success: true, data: addresses });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const address = new WebAddress(req.body);
        if (address.isDefault && address.userId) {
            await WebAddress.updateMany(
                { userId: address.userId, _id: { $ne: address._id } },
                { isDefault: false }
            );
        }

        await address.save();
        res.json({ success: true, data: address });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const address = await WebAddress.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true }
        );

        if (!address) {
            return res.status(404).json({ success: false, message: 'Adres bulunamadı' });
        }
        if (req.body.isDefault && address.userId) {
            await WebAddress.updateMany(
                { userId: address.userId, _id: { $ne: address._id } },
                { isDefault: false }
            );
        }

        res.json({ success: true, data: address });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const address = await WebAddress.findById(req.params.id);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Adres bulunamadı' });
        }
        res.json({ success: true, data: address });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const address = await WebAddress.findByIdAndDelete(req.params.id);
        if (!address) {
            return res.status(404).json({ success: false, message: 'Adres bulunamadı' });
        }
        res.json({ success: true, message: 'Adres silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;