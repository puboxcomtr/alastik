const express = require('express')
const mongoose = require('mongoose')
const router = express.Router()

const MailManagement = require('../../../models/admin/mail/Management')
const MailGroup = require('../../../models/admin/mail/MailGroup')

// Liste - GET /admin/mail-management
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = parseInt(req.query.limit) || 50
        const skip = (page - 1) * limit

        // Yalnızca seçili sitenin şablonları (X-Site başlığından çözülür)
        const filter = { site: req.site }

        if (req.query.search) {
            filter.title = { $regex: req.query.search, $options: 'i' }
        }

        if (req.query.isActive !== undefined) {
            filter.isActive = req.query.isActive === 'true'
        }

        const [items, total] = await Promise.all([
            MailManagement.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            MailManagement.countDocuments(filter)
        ])

        const data = items.map(item => ({
            id: item._id.toString(),
            title: item.title,
            subject: item.subject,
            recipientType: item.recipientType,
            recipientValue: item.recipientValue,
            isActive: item.isActive,
            lastSentAt: item.lastSentAt,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        }))

        res.json({
            success: true,
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        })
    } catch (error) {
        console.error('Mail management list hatası:', error)
        res.status(500).json({ success: false, message: 'Liste yüklenirken hata oluştu' })
    }
})

// Mail Grupları - GET /admin/mail-management/groups
router.get('/groups', async (req, res) => {
    try {
        const groups = await MailGroup.find({ isActive: true, site: req.site })
            .sort({ name: 1 })
            .lean()

        const data = groups.map(g => ({
            id: g._id.toString(),
            name: g.name,
            description: g.description,
            emailCount: (g.emails || []).length
        }))

        res.json({ success: true, data })
    } catch (error) {
        console.error('Mail groups hatası:', error)
        res.status(500).json({ success: false, message: 'Mail grupları yüklenemedi' })
    }
})

// Kullanıcı listesi (alıcı seçimi için) - GET /admin/mail-management/users
router.get('/users', async (req, res) => {
    try {
        const WebMember = mongoose.model('WebMember')

        const users = await WebMember.find({ status: 'active', site: req.site })
            .select('_id firstName lastName email')
            .sort({ firstName: 1 })
            .limit(1000)
            .lean()

        const data = users.map(u => ({
            id: u._id.toString(),
            name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'İsimsiz',
            email: u.email || ''
        }))

        res.json({ success: true, data })
    } catch (error) {
        console.error('Users hatası:', error)
        res.status(500).json({ success: false, message: 'Kullanıcılar yüklenemedi' })
    }
})

// Detay - GET /admin/mail-management/:id
router.get('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' })
        }

        const item = await MailManagement.findOne({ _id: req.params.id, site: req.site }).lean()

        if (!item) {
            return res.status(404).json({ success: false, message: 'Mail şablonu bulunamadı' })
        }

        res.json({
            success: true,
            data: {
                id: item._id.toString(),
                title: item.title,
                subject: item.subject,
                body: item.body,
                recipientType: item.recipientType,
                recipientValue: item.recipientValue,
                isActive: item.isActive,
                lastSentAt: item.lastSentAt,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            }
        })
    } catch (error) {
        console.error('Mail management detay hatası:', error)
        res.status(500).json({ success: false, message: 'Detay yüklenirken hata oluştu' })
    }
})

// Oluştur - POST /admin/mail-management
router.post('/', async (req, res) => {
    try {
        const { title, subject, body, recipientType, recipientValue, isActive } = req.body

        if (!title || !subject || !body || !recipientType) {
            return res.status(400).json({ success: false, message: 'Zorunlu alanlar eksik' })
        }

        const allowedTypes = ['mail_group', 'user', 'single_email']

        if (!allowedTypes.includes(recipientType)) {
            return res.status(400).json({ success: false, message: 'Geçersiz alıcı tipi' })
        }

        const recipients = Array.isArray(recipientValue) ? recipientValue : [recipientValue]
        const cleanRecipients = recipients.map(r => String(r || '').trim()).filter(Boolean)

        if (cleanRecipients.length === 0) {
            return res.status(400).json({ success: false, message: 'En az bir alıcı seçilmelidir' })
        }

        const newItem = await MailManagement.create({
            site: req.site,
            title: title.trim(),
            subject: subject.trim(),
            body,
            recipientType,
            recipientValue: cleanRecipients,
            isActive: isActive !== false
        })

        res.json({
            success: true,
            message: 'Mail şablonu oluşturuldu',
            data: { id: newItem._id.toString() }
        })
    } catch (error) {
        console.error('Mail management create hatası:', error)
        res.status(500).json({ success: false, message: 'Oluşturma sırasında hata oluştu' })
    }
})

// Güncelle - PATCH /admin/mail-management/:id
router.patch('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' })
        }

        const { title, subject, body, recipientType, recipientValue, isActive } = req.body
        const updateData = {}

        if (title !== undefined) updateData.title = title.trim()
        if (subject !== undefined) updateData.subject = subject.trim()
        if (body !== undefined) updateData.body = body
        if (recipientType !== undefined) {
            const allowedTypes = ['mail_group', 'user', 'single_email']

            if (!allowedTypes.includes(recipientType)) {
                return res.status(400).json({ success: false, message: 'Geçersiz alıcı tipi' })
            }

            updateData.recipientType = recipientType
        }
        if (recipientValue !== undefined) {
            const recipients = Array.isArray(recipientValue) ? recipientValue : [recipientValue]
            const cleanRecipients = recipients.map(r => String(r || '').trim()).filter(Boolean)

            if (cleanRecipients.length === 0) {
                return res.status(400).json({ success: false, message: 'En az bir alıcı seçilmelidir' })
            }

            updateData.recipientValue = cleanRecipients
        }
        if (isActive !== undefined) updateData.isActive = isActive

        const updated = await MailManagement.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { $set: updateData },
            { new: true }
        )

        if (!updated) {
            return res.status(404).json({ success: false, message: 'Mail şablonu bulunamadı' })
        }

        res.json({ success: true, message: 'Mail şablonu güncellendi' })
    } catch (error) {
        console.error('Mail management update hatası:', error)
        res.status(500).json({ success: false, message: 'Güncelleme sırasında hata oluştu' })
    }
})

// Sil - DELETE /admin/mail-management/:id
router.delete('/:id', async (req, res) => {
    try {
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz ID' })
        }

        const deleted = await MailManagement.findOneAndDelete({ _id: req.params.id, site: req.site })

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Mail şablonu bulunamadı' })
        }

        res.json({ success: true, message: 'Mail şablonu silindi' })
    } catch (error) {
        console.error('Mail management delete hatası:', error)
        res.status(500).json({ success: false, message: 'Silme sırasında hata oluştu' })
    }
})

module.exports = router