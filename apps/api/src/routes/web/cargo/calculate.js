const express = require('express');
const router = express.Router();
const CargoCalculatorService = require('../../../services/web/cargo/CargoCalculatorService');

/**
 * POST /api/cargo/calculate
 * Sepet ürünleri için kargo hesaplama
 * 
 * Body: { items: [{ _key: string, quantity: number }] }
 */
router.post('/calculate', async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Sepet ürünleri gereklidir'
            });
        }

        const result = await CargoCalculatorService.calculate(items, req.site);
        return res.json(result);

    } catch (error) {
        console.error('[CargoCalculate] Hata:', error);
        return res.status(500).json({
            success: false,
            message: 'Kargo hesaplanırken hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;