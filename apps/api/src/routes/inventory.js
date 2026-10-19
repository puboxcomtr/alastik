const express = require('express');
const Inventory = require('../models/admin/settings/Inventory');
const Product = require('../models/admin/catalog/Product');
const { authenticateAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

router.get('/stock', authenticateAdmin, async (req, res) => {
  try {
    const { productId, category, lowStock } = req.query;
    const filter = {};

    if (productId) filter.product = productId;
    if (category) filter.category = category;
    if (lowStock === 'true') {
      filter.quantity = { $lte: 10 };
    }

    const inventory = await Inventory.find(filter)
      .populate('product', 'name sku price')
      .populate('category', 'name')
      .sort({ quantity: 1 });

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Inventory stock get error:', error);
    res.status(500).json({
      success: false,
      message: 'Stok durumu getirilirken hata oluştu'
    });
  }
});

router.get('/stock/:productId', authenticateAdmin, async (req, res) => {
  try {
    const inventory = await Inventory.findOne({ product: req.params.productId })
      .populate('product', 'name sku price')
      .populate('category', 'name');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Stok kaydı bulunamadı'
      });
    }

    res.json({
      success: true,
      data: inventory
    });
  } catch (error) {
    console.error('Inventory stock get error:', error);
    res.status(500).json({
      success: false,
      message: 'Stok durumu getirilirken hata oluştu'
    });
  }
});

router.put('/stock/:productId', authenticateAdmin, [
  body('quantity').isNumeric().withMessage('Geçerli miktar gerekli'),
  body('minStock').optional().isNumeric().withMessage('Geçerli minimum stok gerekli')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(error => error.msg)
      });
    }

    const { quantity, minStock } = req.body;

    let inventory = await Inventory.findOne({ product: req.params.productId });

    if (!inventory) {
      const product = await Product.findById(req.params.productId);
      if (!product) {
        return res.status(404).json({
          success: false,
          message: 'Ürün bulunamadı'
        });
      }

      inventory = new Inventory({
        product: req.params.productId,
        quantity,
        minStock: minStock || 10,
        category: product.category
      });
    } else {
      inventory.quantity = quantity;
      if (minStock !== undefined) {
        inventory.minStock = minStock;
      }
    }

    await inventory.save();

    await inventory.populate('product', 'name sku price');
    await inventory.populate('category', 'name');

    res.json({
      success: true,
      data: inventory,
      message: 'Stok başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Inventory stock update error:', error);
    res.status(500).json({
      success: false,
      message: 'Stok güncellenirken hata oluştu'
    });
  }
});

router.post('/stock/:productId/movement', authenticateAdmin, [
  body('type').isIn(['in', 'out']).withMessage('Geçerli hareket tipi gerekli'),
  body('quantity').isNumeric().withMessage('Geçerli miktar gerekli'),
  body('reason').optional(),
  body('notes').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(error => error.msg)
      });
    }

    const { type, quantity, reason, notes } = req.body;

    let inventory = await Inventory.findOne({ product: req.params.productId });

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: 'Stok kaydı bulunamadı'
      });
    }

    const movement = {
      type,
      quantity: parseInt(quantity),
      reason: reason || (type === 'in' ? 'Stok girişi' : 'Stok çıkışı'),
      notes,
      date: new Date()
    };

    inventory.movements.push(movement);

    if (type === 'in') {
      inventory.quantity += parseInt(quantity);
    } else {
      if (inventory.quantity < parseInt(quantity)) {
        return res.status(400).json({
          success: false,
          message: 'Yetersiz stok'
        });
      }
      inventory.quantity -= parseInt(quantity);
    }

    await inventory.save();

    await inventory.populate('product', 'name sku price');
    await inventory.populate('category', 'name');

    res.json({
      success: true,
      data: inventory,
      message: 'Stok hareketi başarıyla eklendi'
    });
  } catch (error) {
    console.error('Inventory movement error:', error);
    res.status(500).json({
      success: false,
      message: 'Stok hareketi eklenirken hata oluştu'
    });
  }
});

router.get('/low-stock-alerts', authenticateAdmin, async (req, res) => {
  try {
    const lowStockItems = await Inventory.find({
      $expr: { $lte: ['$quantity', '$minStock'] }
    })
    .populate('product', 'name sku price')
    .populate('category', 'name')
    .sort({ quantity: 1 });

    res.json({
      success: true,
      data: lowStockItems
    });
  } catch (error) {
    console.error('Low stock alerts error:', error);
    res.status(500).json({
      success: false,
      message: 'Düşük stok uyarıları getirilirken hata oluştu'
    });
  }
});

module.exports = router; 