const express = require('express');
const DiaStock = require('../../../models/DiaStock');
const { authenticateAdmin } = require('../../../middleware/auth');

const router = express.Router();

const maybeAuth = process.env.NODE_ENV === 'production' ? authenticateAdmin : (req, res, next) => next();

router.get('/', maybeAuth, async (req, res) => {
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
      },
      {
        $project: {
          _id: 1,
          subCategories: {
            $filter: {
              input: '$subCategories',
              cond: {
                $and: [
                  { $ne: ['$$this', null] },
                  { $ne: ['$$this', ''] },
                  { $ne: ['$$this', undefined] }
                ]
              }
            }
          },
          count: 1
        }
      },
      { $match: { '_id': { $ne: null, $ne: '' } } },
      { $sort: { count: -1 } }
    ]);

    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilemedi'
    });
  }
});
module.exports = router;