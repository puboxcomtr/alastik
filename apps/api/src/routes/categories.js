const express = require('express');
const Category = require('../models/Category');
const { authenticateAdmin } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Tüm kategorileri getir
router.get('/', authenticateAdmin, async (req, res) => {
  try {
    const categories = await Category.find()
      .sort({ name: 1 });

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Categories get error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategoriler getirilirken hata oluştu'
    });
  }
});

// Kategori detayı getir
router.get('/:id', authenticateAdmin, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Category get error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori getirilirken hata oluştu'
    });
  }
});

// Yeni kategori oluştur
router.post('/', authenticateAdmin, [
  body('name').notEmpty().withMessage('Kategori adı gerekli'),
  body('description').optional(),
  body('slug').optional()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(error => error.msg)
      });
    }

    const category = new Category(req.body);
    await category.save();

    res.status(201).json({
      success: true,
      data: category,
      message: 'Kategori başarıyla oluşturuldu'
    });
  } catch (error) {
    console.error('Category create error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori oluşturulurken hata oluştu'
    });
  }
});

// Kategori güncelle
router.put('/:id', authenticateAdmin, [
  body('name').optional().notEmpty().withMessage('Kategori adı boş olamaz')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: errors.array().map(error => error.msg)
      });
    }

    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }

    res.json({
      success: true,
      data: category,
      message: 'Kategori başarıyla güncellendi'
    });
  } catch (error) {
    console.error('Category update error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori güncellenirken hata oluştu'
    });
  }
});

// Kategori sil
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Kategori bulunamadı'
      });
    }

    res.json({
      success: true,
      message: 'Kategori başarıyla silindi'
    });
  } catch (error) {
    console.error('Category delete error:', error);
    res.status(500).json({
      success: false,
      message: 'Kategori silinirken hata oluştu'
    });
  }
});

module.exports = router; 