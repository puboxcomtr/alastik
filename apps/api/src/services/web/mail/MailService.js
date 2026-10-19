const nodemailer = require('nodemailer')
const SmtpSettings = require('../../../models/admin/mail/smtp/SmtpSettings')
const { SITES, DEFAULT_SITE } = require('../../../config/sites')

const cachedBySite = {}

const resolveSite = (site) => (SITES[site] ? site : DEFAULT_SITE)

const buildConfigKey = (s) => `${s.host}|${s.port}|${s.username}|${s.password}|${s.provider}`

const buildTransporter = (settings) => {
    const port = Number(settings.port)
    const secure = port === 465

    return nodemailer.createTransport({
        host: settings.host,
        port,
        secure,
        auth: {
            user: settings.username,
            pass: settings.password
        },
        tls: { rejectUnauthorized: false }
    })
}

const getTransporter = async (overrideSettings = null, site = DEFAULT_SITE) => {
    const slug = resolveSite(site)
    const settings = overrideSettings || (await SmtpSettings.getForSite(slug))

    if (!settings.host || !settings.username || !settings.password) {
        throw new Error('SMTP ayarları eksik. Lütfen önce ayarları kaydedin.')
    }

    if (overrideSettings) {
        return { transporter: buildTransporter(settings), settings }
    }

    const key = buildConfigKey(settings)
    const cached = cachedBySite[slug]

    if (!cached || cached.configKey !== key) {
        cachedBySite[slug] = { transporter: buildTransporter(settings), configKey: key }
    }

    return { transporter: cachedBySite[slug].transporter, settings }
}

const invalidateCache = (site = null) => {
    if (site) {
        delete cachedBySite[resolveSite(site)]
    } else {
        Object.keys(cachedBySite).forEach(key => delete cachedBySite[key])
    }
}

const verifyConnection = async (overrideSettings = null, site = DEFAULT_SITE) => {
    const { transporter } = await getTransporter(overrideSettings, site)
    await transporter.verify()

    return true
}

const sendMail = async ({ to, subject, html, text, from, attachments, site }, overrideSettings = null) => {
    const slug = resolveSite(site)
    const { transporter, settings } = await getTransporter(overrideSettings, slug)

    const fromAddress = from || settings.senderEmail || settings.username
    const fromHeader = `${SITES[slug].name} <${fromAddress}>`

    const info = await transporter.sendMail({
        from: fromHeader,
        to,
        subject,
        html,
        text,
        attachments
    })

    console.log('[MailService] Gönderim sonucu:', {
        site: slug,
        to,
        subject,
        messageId: info.messageId,
        accepted: info.accepted,
        rejected: info.rejected,
        response: info.response
    })

    return info
}

module.exports = {
    getTransporter,
    invalidateCache,
    verifyConnection,
    sendMail
}
