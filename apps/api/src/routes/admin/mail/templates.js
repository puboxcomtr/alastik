const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()

const WebMailTemplate = require('../../../models/admin/mail/Template')

// Liste - GET /admin/mail-templates
// Frontend solda kategori bazlı liste yapacak, kategorize edip dönelim
router.get('/', async (req, res) => {
    try {
        const items = await WebMailTemplate.find({ isActive: true, site: req.site })
            .sort({ category: 1, order: 1, name: 1 })
            .lean()

        // Kategori bazında gruplandır
        const categoryMap = {}

        items.forEach(item => {
            if (!categoryMap[item.category]) {
                categoryMap[item.category] = {
                    id: item.category,
                    name: item.categoryName,
                    icon: item.category === 'admin'
                        ? 'ri-shield-user-line'
                        : item.category === 'uye'
                            ? 'ri-user-line'
                            : 'ri-folder-line',
                    templates: []
                }
            }

            categoryMap[item.category].templates.push({
                id: item._id.toString(),
                templateKey: item.templateKey,
                name: item.name,
                hasCustomContent: item.content !== item.defaultContent
            })
        })

        const categoryOrder = ['genel', 'admin', 'uye']
        const categories = categoryOrder
            .filter(key => categoryMap[key])
            .map(key => categoryMap[key])

        res.json({ success: true, data: categories })
    } catch (error) {
        console.error('Mail templates list hatası:', error)
        res.status(500).json({ success: false, message: 'Şablonlar yüklenirken hata oluştu' })
    }
})

// Detay - GET /admin/mail-templates/:id
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' })
        }

        const item = await WebMailTemplate.findOne({ _id: req.params.id, site: req.site }).lean()

        if (!item) {
            return res.status(404).json({ success: false, message: 'Şablon bulunamadı' })
        }

        res.json({
            success: true,
            data: {
                id: item._id.toString(),
                templateKey: item.templateKey,
                name: item.name,
                category: item.category,
                categoryName: item.categoryName,
                content: item.content,
                defaultContent: item.defaultContent,
                isActive: item.isActive,
                order: item.order,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            }
        })
    } catch (error) {
        console.error('Mail template detay hatası:', error)
        res.status(500).json({ success: false, message: 'Detay yüklenirken hata oluştu' })
    }
})

// Güncelle (sadece content) - PATCH /admin/mail-templates/:id
router.patch('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' })
        }

        const { content } = req.body

        if (content === undefined) {
            return res.status(400).json({ success: false, message: 'İçerik zorunludur' })
        }

        const updated = await WebMailTemplate.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { $set: { content } },
            { new: true }
        )

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Şablon bulunamadı' })
        }

        res.json({ success: true, message: 'Şablon güncellendi' })
    } catch (error) {
        console.error('Mail template update hatası:', error)
        res.status(500).json({ success: false, message: 'Güncelleme sırasında hata oluştu' })
    }
})

// Sıfırla - POST /admin/mail-templates/:id/reset
router.post('/:id/reset', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' })
        }

        const item = await WebMailTemplate.findOne({ _id: req.params.id, site: req.site })

        if (!item) {
            return res.status(404).json({ success: false, message: 'Şablon bulunamadı' })
        }

        item.content = item.defaultContent
        await item.save()

        res.json({
            success: true,
            message: 'Şablon varsayılan haline döndürüldü',
            data: { content: item.content }
        })
    } catch (error) {
        console.error('Mail template reset hatası:', error)
        res.status(500).json({ success: false, message: 'Sıfırlama sırasında hata oluştu' })
    }
})

// Önizleme - POST /admin/mail-templates/:id/preview
// Body: { content?: string } -> kaydedilmemiş edit varsa frontend'den geçilebilir
router.post('/:id/preview', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' })
        }

        const item = await WebMailTemplate.findOne({ _id: req.params.id, site: req.site }).lean()

        if (!item) {
            return res.status(404).json({ success: false, message: 'Şablon bulunamadı' })
        }

        const { render } = require('../../../services/plugins/mail/templateRenderer')
        const { buildData } = require('../../../services/plugins/mail/templateDataBuilder')

        // Edit edilmiş içerik gönderilmişse onu kullan, yoksa DB'deki content'i
        const templateContent = req.body?.content || item.content || item.defaultContent

        // Önizleme, panelde seçili sitenin verileriyle üretilir
        const templateData = await buildData(item.templateKey, { site: req.site })
        const html = render(templateContent, templateData)

        res.json({
            success: true,
            data: { html }
        })
    } catch (error) {
        console.error('Mail template preview hatası:', error)
        res.status(500).json({
            success: false,
            message: error.message || 'Önizleme oluşturulurken hata oluştu'
        })
    }
})

module.exports = router