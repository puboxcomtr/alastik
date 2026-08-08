const WebMailTemplate = require('../../../models/admin/mail/Template')
const WebSettings = require('../../../models/web/settings/WebSettings')
const { sendMail } = require('../../web/mail/MailService')
const { render } = require('./templateRenderer')
const { buildData } = require('./templateDataBuilder')
const { SITES, DEFAULT_SITE } = require('../../../config/sites')

// Admin mail adresi: orderEmail > email > null (site bazlı ayarlardan)
const getAdminMailAddress = async (purpose = 'order', site = DEFAULT_SITE) => {
    try {
        const settings = await WebSettings.getSettings(site)
        const emailInfo = settings?.emailInfo || {}

        if (purpose === 'order' && emailInfo.orderEmail) {
            return emailInfo.orderEmail
        }

        return emailInfo.email || null
    } catch (e) {
        console.error('[mailOrchestrator] Admin mail adresi alınamadı:', e.message)

        return null
    }
}

// Şablonu DB'den çek (sitenin kendi şablonu)
const getTemplate = async (templateKey, site = DEFAULT_SITE) => {
    const template = await WebMailTemplate.findOne({ templateKey, isActive: true, site }).lean()

    if (!template) {
        throw new Error(`Mail şablonu bulunamadı veya pasif: ${templateKey} (site: ${site})`)
    }

    // Kullanıcı düzenlediyse content, yoksa defaultContent
    const content = template.content || template.defaultContent || ''
    const subject = template.subject || template.defaultSubject || template.name || SITES[site]?.name || SITES[DEFAULT_SITE].name

    if (!content) {
        throw new Error(`Şablon içeriği boş: ${templateKey}`)
    }

    return { content, subject }
}

// Ana fonksiyon: Şablon ile mail gönder
// params: { templateKey, context, to, alsoSendToAdmin, adminPurpose, site }
// site: gönderimde hangi sitenin SMTP ayarları ve gönderen adı kullanılacak
const sendTemplateMail = async ({
    templateKey,
    context = {},
    to,
    alsoSendToAdmin = false,
    adminPurpose = 'order',
    site = DEFAULT_SITE
}) => {
    const result = {
        success: false,
        customerSent: false,
        adminSent: false,
        errors: []
    }

    try {
        // 1. Şablonu çek
        const { content, subject } = await getTemplate(templateKey, site)

        // 2. Veriyi hazırla (gerçek mail için context ile; site şirket bilgisi/logo seçiminde kullanılır)
        const { data } = await buildData(templateKey, { mode: 'real', site, ...context })

        // 3. HTML render
        const html = render(content, { data })

        // 4. Subject render (subject de dinamik olabilir)
        const renderedSubject = render(subject, { data })

        // 5. Müşteriye gönder
        if (to) {
            const recipients = Array.isArray(to) ? to : [to]
            const validRecipients = recipients.filter(Boolean)

            if (validRecipients.length > 0) {
                try {
                    await sendMail({
                        to: validRecipients.join(','),
                        subject: renderedSubject,
                        html,
                        site
                    })
                    result.customerSent = true
                } catch (err) {
                    result.errors.push(`Müşteri mail hatası: ${err.message}`)
                    console.error('[mailOrchestrator] Müşteri mail hatası:', err.message)
                }
            }
        }

        // 6. Admine kopya gönder
        if (alsoSendToAdmin) {
            const adminEmail = await getAdminMailAddress(adminPurpose, site)

            if (adminEmail) {
                try {
                    await sendMail({
                        to: adminEmail,
                        subject: `[Yönetici Kopyası] ${renderedSubject}`,
                        html,
                        site
                    })
                    result.adminSent = true
                } catch (err) {
                    result.errors.push(`Admin mail hatası: ${err.message}`)
                    console.error('[mailOrchestrator] Admin mail hatası:', err.message)
                }
            } else {
                console.warn(`[mailOrchestrator] Admin mail adresi bulunamadı (purpose: ${adminPurpose}). Atlandı.`)
            }
        }

        result.success = result.customerSent || result.adminSent

        return result
    } catch (err) {
        console.error(`[mailOrchestrator] Genel hata (${templateKey}):`, err.message)
        result.errors.push(err.message)

        return result
    }
}

module.exports = {
    sendTemplateMail,
    getAdminMailAddress
}