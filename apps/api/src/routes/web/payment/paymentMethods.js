const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// GET - Aktif banka havale yöntemlerini getir
router.get('/bank-transfer', async (req, res) => {
    try {
        const PaymentMethod = mongoose.connection.collection('paymentmethods');

        // Yalnızca isteğin geldiği sitenin banka hesapları
        const bankAccounts = await PaymentMethod.find({
            type: 'bank_transfer',
            isActive: true,
            isDeleted: { $ne: true },
            site: req.site
        }).toArray();

        const formatted = bankAccounts.map(acc => ({
            _id: acc._id,
            name: acc.providerMeta?.displayName || acc.name,
            logo: acc.providerMeta?.logo,
            accountName: acc.bankTransferSettings?.accountName,
            iban: acc.bankTransferSettings?.iban,
            processingTime: acc.bankTransferSettings?.processingTime
        }));

        res.json({ success: true, data: formatted });
    } catch (error) {
        console.error('Banka hesapları hatası:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;