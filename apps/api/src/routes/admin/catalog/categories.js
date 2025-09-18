const express = require('express');
const DiaStock = require('../../../models/DiaStock');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const categories = await DiaStock.aggregate([
      {
        $match: {
          'm_kategoriler': { $exists: true, $ne: [] },
          'durum': 'A',
          'b2c_durum': 'E',
          'b2c_gonder': 'E',
          'fiili_stok': { $gt: 0 }
        }
      },
      { $unwind: '$m_kategoriler' },
      {
        $group: {
          _id: '$m_kategoriler.kategori_aciklama_1',
          subCategories: {
            $addToSet: '$m_kategoriler.kategori_aciklama_2'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Hata' });
  }
});

module.exports = router;