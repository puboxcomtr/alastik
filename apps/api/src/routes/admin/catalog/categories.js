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

    diaFilter['m_kategoriler'] = { $exists: true, $ne: [] };

    const categories = await DiaStock.aggregate([
      { $match: diaFilter },
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
    console.error('Categories get error:', error);
    res.status(500).json({ success: false, message: 'Kategoriler getirilirken hata oluştu' });
  }
});

module.exports = router;