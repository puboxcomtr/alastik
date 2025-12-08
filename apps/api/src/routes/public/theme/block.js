// apps/api/src/routes/public/blocks.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Block Model
const blockSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true, index: true },
    component: { type: String, required: true },
    type: { type: String, default: 'custom' },
    active: { type: Boolean, default: true },
    content: mongoose.Schema.Types.Mixed,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, { collection: 'blocks' });

const Block = mongoose.model('Block', blockSchema);

/**
 * Blok Getir
 * GET /api/blocks/:key
 */
router.get('/:key', async (req, res) => {
    try {
        const { key } = req.params;

        const block = await Block.findOne({
            key: key,
            active: true
        });

        if (!block) {
            return res.status(404).json({
                success: false,
                message: 'Blok bulunamadı'
            });
        }

        res.json({
            success: true,
            data: block
        });
    } catch (error) {
        console.error('Block get error:', error);
        res.status(500).json({
            success: false,
            message: 'Blok getirilemedi',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

module.exports = router;