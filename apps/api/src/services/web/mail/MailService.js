const nodemailer = require('nodemailer')
const SmtpSettings = require('../../../models/admin/mail/smtp/SmtpSettings')

let cachedTransporter = null
let cachedConfigKey = null

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

const getTransporter = async (overrideSettings = null) => {
    const settings = overrideSettings || (await SmtpSettings.getSingleton())

    if (!settings.host || !settings.username || !settings.password) {
        throw new Error('SMTP ayarları eksik. Lütfen önce ayarları kaydedin.')
    }

    if (overrideSettings) {
        return { transporter: buildTransporter(settings), settings }
    }

    const key = buildConfigKey(settings)

    if (!cachedTransporter || cachedConfigKey !== key) {
        cachedTransporter = buildTransporter(settings)
        cachedConfigKey = key
    }

    return { transporter: cachedTransporter, settings }
}

const invalidateCache = () => {
    cachedTransporter = null
    cachedConfigKey = null
}

const verifyConnection = async (overrideSettings = null) => {
    const { transporter } = await getTransporter(overrideSettings)
    await transporter.verify()

    return true
}

const sendMail = async ({ to, subject, html, text, from, attachments }, overrideSettings = null) => {
    const { transporter, settings } = await getTransporter(overrideSettings)

    const fromAddress = from || settings.senderEmail || settings.username
    const fromHeader = `ALastik <${fromAddress}>`

    const info = await transporter.sendMail({
        from: fromHeader,
        to,
        subject,
        html,
        text,
        attachments
    })

    return info
}

module.exports = {
    getTransporter,
    invalidateCache,
    verifyConnection,
    sendMail
}