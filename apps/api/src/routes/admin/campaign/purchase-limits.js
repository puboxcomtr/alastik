const express = require('express')
const router = express.Router()
const PurchaseLimit = require('../../../models/admin/campaign/PurchaseLimit')

// Liste
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 100,
            search = '',
            limitType = '',
            memberGroup = '',
            isActive = ''
        } = req.query

        const filter = { site: req.site }

        if (search) {
            filter.name = { $regex: search, $options: 'i' }
        }
        if (limitType) {
            filter.limitType = limitType
        }
        if (memberGroup) {
            filter.memberGroups = memberGroup
        }
        if (isActive !== '') {
            filter.isActive = isActive === 'true'
        }

        const skip = (Number(page) - 1) * Number(limit)
        const total = await PurchaseLimit.countDocuments(filter)
        const items = await PurchaseLimit.find(filter)
            .sort({ priority: -1, createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean()

        res.json({
            success: true,
            data: items,
            meta: {
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        })
    } catch (error) {
        console.error('PurchaseLimit list error:', error)
        res.status(500).json({ success: false, message: 'Liste alınamadı', error: error.message })
    }
})

// Detay
router.get('/:id', async (req, res) => {
    try {
        const item = await PurchaseLimit.findOne({ _id: req.params.id, site: req.site }).lean()
        if (!item) {
            return res.status(404).json({ success: false, message: 'Limit bulunamadı' })
        }
        res.json({ success: true, data: item })
    } catch (error) {
        console.error('PurchaseLimit detail error:', error)
        res.status(500).json({ success: false, message: 'Detay alınamadı', error: error.message })
    }
})

// Ekle
router.post('/', async (req, res) => {
    try {
        const {
            name,
            minLimit,
            maxLimit,
            limitType,
            targets,
            memberGroups,
            priority,
            isActive
        } = req.body

        const newItem = new PurchaseLimit({
            site: req.site,
            name,
            minLimit: minLimit != null && minLimit !== '' ? Number(minLimit) : null,
            maxLimit: maxLimit != null && maxLimit !== '' ? Number(maxLimit) : null,
            limitType,
            targets: targets || [],
            memberGroups: memberGroups || [],
            priority: priority != null ? Number(priority) : 0,
            isActive: isActive != null ? isActive : true
        })

        await newItem.save()
        res.status(201).json({ success: true, message: 'Satın alma limiti oluşturuldu', data: newItem })
    } catch (error) {
        console.error('PurchaseLimit create error:', error)
        res.status(400).json({ success: false, message: error.message || 'Limit oluşturulamadı' })
    }
})

// Güncelle
router.put('/:id', async (req, res) => {
    try {
        const {
            name,
            minLimit,
            maxLimit,
            limitType,
            targets,
            memberGroups,
            priority,
            isActive
        } = req.body

        const item = await PurchaseLimit.findOne({ _id: req.params.id, site: req.site })
        if (!item) {
            return res.status(404).json({ success: false, message: 'Limit bulunamadı' })
        }

        if (name !== undefined) item.name = name
        if (minLimit !== undefined) item.minLimit = minLimit != null && minLimit !== '' ? Number(minLimit) : null
        if (maxLimit !== undefined) item.maxLimit = maxLimit != null && maxLimit !== '' ? Number(maxLimit) : null
        if (limitType !== undefined) item.limitType = limitType
        if (targets !== undefined) item.targets = targets
        if (memberGroups !== undefined) item.memberGroups = memberGroups
        if (priority !== undefined) item.priority = Number(priority)
        if (isActive !== undefined) item.isActive = isActive

        await item.save()
        res.json({ success: true, message: 'Satın alma limiti güncellendi', data: item })
    } catch (error) {
        console.error('PurchaseLimit update error:', error)
        res.status(400).json({ success: false, message: error.message || 'Limit güncellenemedi' })
    }
})

// Aktif/Pasif Toggle
router.patch('/:id/toggle', async (req, res) => {
    try {
        const item = await PurchaseLimit.findOne({ _id: req.params.id, site: req.site })
        if (!item) {
            return res.status(404).json({ success: false, message: 'Limit bulunamadı' })
        }
        item.isActive = !item.isActive
        await item.save()
        res.json({ success: true, message: 'Durum güncellendi', data: item })
    } catch (error) {
        console.error('PurchaseLimit toggle error:', error)
        res.status(500).json({ success: false, message: 'Durum güncellenemedi', error: error.message })
    }
})

// Sil
router.delete('/:id', async (req, res) => {
    try {
        const item = await PurchaseLimit.findOneAndDelete({ _id: req.params.id, site: req.site })
        if (!item) {
            return res.status(404).json({ success: false, message: 'Limit bulunamadı' })
        }
        res.json({ success: true, message: 'Satın alma limiti silindi' })
    } catch (error) {
        console.error('PurchaseLimit delete error:', error)
        res.status(500).json({ success: false, message: 'Silme başarısız', error: error.message })
    }
})

module.exports = router