const express = require('express')
const router = express.Router()

const SmtpSettings = require('../../../models/admin/mail/smtp/SmtpSettings')
const MailService = require('../../../services/web/mail/MailService')
const { SITES, DEFAULT_SITE } = require('../../../config/sites')

const sanitize = (doc) => {
    if (!doc) return null

    return {
        host: doc.host || '',
        port: doc.port || 587,
        username: doc.username || '',
        password: doc.password || '',
        provider: doc.provider || 'smtp',
        senderEmail: doc.senderEmail || ''
    }
}

router.get('/', async (req, res) => {
    try {
        const doc = await SmtpSettings.getForSite(req.site)

        return res.json({ success: true, data: sanitize(doc) })
    } catch (err) {
        console.error('[SMTP] GET error:', err)

        return res.status(500).json({ success: false, message: 'SMTP ayarları yüklenemedi' })
    }
})

router.patch('/', async (req, res) => {
    try {
        const { host, port, username, password, provider, senderEmail } = req.body

        if (!host || !username || !password || !port) {
            return res.status(400).json({ success: false, message: 'Zorunlu alanlar eksik' })
        }

        const doc = await SmtpSettings.getForSite(req.site)

        doc.host = host.trim()
        doc.port = Number(port)
        doc.username = username.trim()
        doc.password = password
        doc.provider = provider || 'smtp'
        doc.senderEmail = (senderEmail || '').trim()

        await doc.save()
        MailService.invalidateCache(req.site)

        return res.json({
            success: true,
            message: 'SMTP ayarları kaydedildi',
            data: sanitize(doc)
        })
    } catch (err) {
        console.error('[SMTP] PATCH error:', err)

        return res.status(500).json({ success: false, message: 'Kayıt sırasında hata oluştu' })
    }
})

router.post('/test', async (req, res) => {
    try {
        const { host, port, username, password, provider, senderEmail, recipientEmail } = req.body

        if (!recipientEmail || !recipientEmail.trim()) {
            return res.status(400).json({ success: false, message: 'Test maili için alıcı adresi gerekli' })
        }

        const overrideSettings = host
            ? {
                host: host.trim(),
                port: Number(port),
                username: username.trim(),
                password,
                provider: provider || 'smtp',
                senderEmail: (senderEmail || '').trim()
            }
            : null

        await MailService.verifyConnection(overrideSettings, req.site)

        const siteName = SITES[req.site]?.name || SITES[DEFAULT_SITE].name
        const subject = `${siteName} SMTP Test Maili`

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 24px; max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1976d2; margin: 0 0 16px;">SMTP Bağlantısı Başarılı</h2>
                <p style="color: #333; line-height: 1.6;">
                    Bu mail, ${siteName} yönetim panelinden gönderilen bir test mailidir.
                    Eğer bu maili görüyorsanız SMTP ayarlarınız doğru çalışıyor demektir.
                </p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
                <p style="color: #888; font-size: 12px;">
                    Gönderim Tarihi: ${new Date().toLocaleString('tr-TR')}<br/>
                    SMTP Sunucusu: ${overrideSettings?.host || '(kayıtlı ayarlar)'}
                </p>
            </div>
        `

        await MailService.sendMail(
            {
                to: recipientEmail.trim(),
                subject,
                html,
                text: `${siteName} SMTP test maili. Bu mail bağlantı testidir.`,
                site: req.site
            },
            overrideSettings
        )

        return res.json({
            success: true,
            message: `Test maili ${recipientEmail.trim()} adresine gönderildi`
        })
    } catch (err) {
        console.error('[SMTP] TEST error:', err)

        return res.status(500).json({
            success: false,
            message: `Test başarısız: ${err.message || 'bilinmeyen hata'}`
        })
    }
})

module.exports = router