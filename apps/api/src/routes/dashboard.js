const express = require('express');
const Product = require('../models/admin/catalog/Product');
const Inventory = require('../models/admin/settings/Inventory');
const Category = require('../models/admin/catalog/Category');
const { authenticateAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', authenticateAdmin, async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();

    const totalCategories = await Category.countDocuments();

    const lowStockProducts = await Inventory.countDocuments({
      $expr: { $lte: ['$quantity', '$minStock'] }
    });

    const inventoryValue = await Inventory.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $group: {
          _id: null,
          totalValue: {
            $sum: { $multiply: ['$quantity', '$product.price'] }
          }
        }
      }
    ]);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMovements = await Inventory.aggregate([
      {
        $unwind: '$movements'
      },
      {
        $match: {
          'movements.date': { $gte: thirtyDaysAgo }
        }
      },
      {
        $group: {
          _id: '$movements.type',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$movements.quantity' }
        }
      }
    ]);

    const categoryDistribution = await Product.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'category'
        }
      },
      {
        $unwind: '$category'
      },
      {
        $project: {
          categoryName: '$category.name',
          count: 1
        }
      }
    ]);

    const stats = {
      totalProducts,
      totalCategories,
      lowStockProducts,
      totalInventoryValue: inventoryValue[0]?.totalValue || 0,
      recentMovements: {
        stockIn: recentMovements.find(m => m._id === 'in')?.totalQuantity || 0,
        stockOut: recentMovements.find(m => m._id === 'out')?.totalQuantity || 0
      },
      categoryDistribution
    };

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Dashboard istatistikleri getirilirken hata oluştu'
    });
  }
});

router.get('/recent-sales', authenticateAdmin, async (req, res) => {
  try {
    const { limit = 10 } = req.query;
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentSales = await Inventory.aggregate([
      {
        $unwind: '$movements'
      },
      {
        $match: {
          'movements.type': 'out',
          'movements.date': { $gte: thirtyDaysAgo }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $project: {
          productName: '$product.name',
          sku: '$product.sku',
          quantity: '$movements.quantity',
          date: '$movements.date',
          reason: '$movements.reason',
          notes: '$movements.notes'
        }
      },
      {
        $sort: { date: -1 }
      },
      {
        $limit: parseInt(limit)
      }
    ]);

    res.json({
      success: true,
      data: recentSales
    });
  } catch (error) {
    console.error('Recent sales error:', error);
    res.status(500).json({
      success: false,
      message: 'Son satışlar getirilirken hata oluştu'
    });
  }
});

router.get('/low-stock-alerts', authenticateAdmin, async (req, res) => {
  try {
    const lowStockAlerts = await Inventory.find({
      $expr: { $lte: ['$quantity', '$minStock'] }
    })
    .populate('product', 'name sku price')
    .populate('category', 'name')
    .sort({ quantity: 1 })
    .limit(20);

    res.json({
      success: true,
      data: lowStockAlerts
    });
  } catch (error) {
    console.error('Low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Düşük stok uyarıları getirilirken hata oluştu'
    });
  }
});

router.get('/stock-movements', authenticateAdmin, async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const movements = await Inventory.aggregate([
      {
        $unwind: '$movements'
      },
      {
        $match: {
          'movements.date': { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$movements.date' } },
            type: '$movements.type'
          },
          count: { $sum: 1 },
          totalQuantity: { $sum: '$movements.quantity' }
        }
      },
      {
        $group: {
          _id: '$_id.date',
          movements: {
            $push: {
              type: '$_id.type',
              count: '$count',
              totalQuantity: '$totalQuantity'
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json({
      success: true,
      data: movements
    });
  } catch (error) {
    console.error('Stock movements error:', error);
    res.status(500).json({
      success: false,
      message: 'Stok hareket grafiği verileri getirilirken hata oluştu'
    });
  }
});

module.exports = router; 