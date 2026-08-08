const express = require('express')
const router = express.Router()
const PurchaseLimit = require('../../../models/admin/campaign/PurchaseLimit')
const WebCategory = require('../../../models/web/catalog/WebCategory')

// Limit Kontrol (Web sepet/ürün ekleme için)
router.post('/check', async (req, res) => {
  try {
    const { items = [], memberType = null } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.json({ success: true, valid: true, violations: [] })
    }

    // Aktif limitleri çek (ziyaret edilen sitenin limitleri)
    const filter = { site: req.site, isActive: true }
    if (memberType) {
      filter.memberGroups = memberType
    }

    const activeLimits = await PurchaseLimit.find(filter).sort({ priority: -1 }).lean()

    if (activeLimits.length === 0) {
      return res.json({ success: true, valid: true, violations: [] })
    }

    // Tüm kategori isimlerini topla (kategori adı → _id eşleştirme için)
    const allCategoryNames = new Set()
    items.forEach(item => {
      (item.categoryNames || []).forEach(n => n && allCategoryNames.add(n))
    })

    const categoryMap = {}
    if (allCategoryNames.size > 0) {
      const categories = await WebCategory.find({
        diaCategory: { $in: Array.from(allCategoryNames) }
      }).select('_id diaCategory').lean()
      categories.forEach(c => {
        categoryMap[c.diaCategory] = String(c._id)
      })
    }

    const violations = []

    for (const item of items) {
      const { sku, brand, categoryNames = [], quantity = 0 } = item
      if (!sku) continue

      const matchedLimits = []

      for (const limit of activeLimits) {
        const targetIds = (limit.targets || []).map(t => t.targetId)

        let matches = false

        if (limit.limitType === 'product') {
          matches = targetIds.includes(sku)
        } else if (limit.limitType === 'brand') {
          matches = brand && targetIds.includes(brand)
        } else if (limit.limitType === 'category') {
          const productCategoryIds = categoryNames
            .map(n => categoryMap[n])
            .filter(Boolean)
          matches = productCategoryIds.some(id => targetIds.includes(id))
        }

        if (matches) {
          matchedLimits.push(limit)
        }
      }

      if (matchedLimits.length === 0) continue

      // En katı (en düşük max, en yüksek min) limit'i hesapla
      let strictestMax = null
      let strictestMin = null
      let strictestLimit = null

      for (const limit of matchedLimits) {
        if (limit.maxLimit != null) {
          if (strictestMax == null || limit.maxLimit < strictestMax) {
            strictestMax = limit.maxLimit
            strictestLimit = limit
          }
        }
        if (limit.minLimit != null) {
          if (strictestMin == null || limit.minLimit > strictestMin) {
            strictestMin = limit.minLimit
            if (!strictestLimit) strictestLimit = limit
          }
        }
      }

      // Kontrol
      if (strictestMax != null && quantity > strictestMax) {
        violations.push({
          sku,
          message: `Bu ürün için maksimum ${strictestMax} adet sipariş verilebilir`,
          limitName: strictestLimit?.name || '',
          currentQty: quantity,
          allowedMax: strictestMax,
          allowedMin: strictestMin
        })
      } else if (strictestMin != null && quantity < strictestMin) {
        violations.push({
          sku,
          message: `Ürün, ${strictestMin} adet set olarak satılmaktadır.Siparişler minimum ${strictestMin} adet olacak şekilde verilmelidir.`,
          limitName: strictestLimit?.name || '',
          currentQty: quantity,
          allowedMax: strictestMax,
          allowedMin: strictestMin
        })
      }
    }

    res.json({
      success: true,
      valid: violations.length === 0,
      violations
    })
  } catch (error) {
    console.error('PurchaseLimit check error:', error)
    res.status(500).json({ success: false, message: 'Limit kontrolü başarısız', error: error.message })
  }
})

module.exports = router