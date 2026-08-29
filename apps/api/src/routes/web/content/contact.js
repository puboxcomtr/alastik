const express = require('express');
const router = express.Router();
const WebContact = require('../../../models/web/content/WebContact');
const { sendTemplateMail } = require('../../../services/plugins/mail/mailOrchestrator');
const WebCallbackRequest = require('../../../models/web/content/WebCallbackRequest');
const { CALLBACK_TOPICS, CALLBACK_TIME_SLOTS } = require('../../../config/callbackForm');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');


router.post('/', async (req, res) => {
    try {
        const { name, surname, email, phone, subject, message } = req.body;

        if (!name || !surname || !email || !phone || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur' });
        }

        const contact = new WebContact({ site: req.site, name, surname, email, phone, subject, message });
        await contact.save();

        // Mail tetikle (fire-and-forget)
        // Hem gönderene hem admin'e aynı şablon gider
        sendTemplateMail({
            templateKey: 'iletisim_formu',
            context: {
                formData: { name, surname, email, phone, subject, message }
            },
            to: email,
            alsoSendToAdmin: true,
            adminPurpose: 'general',
            site: req.site
        }).then((mailResult) => {
            if (!mailResult.success) {
                console.warn('[contact] Mail gönderilemedi:', email, mailResult.errors);
            } else {
                console.log('[contact] Mail gönderildi:', email, {
                    customer: mailResult.customerSent,
                    admin: mailResult.adminSent
                });
            }
        }).catch((err) => {
            console.error('[contact] Mail hatası:', email, err.message);
        });

        res.json({ success: true, message: 'Mesajınız iletildi' });
    } catch (err) {
        console.error('[contact] Kayıt hatası:', err.message);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

// GET /api/contact/callback/options — form seçenekleri (konu, uygun saat)
router.get('/callback/options', (req, res) => {
    res.json({ success: true, data: { topics: CALLBACK_TOPICS, timeSlots: CALLBACK_TIME_SLOTS } });
});

// POST /api/contact/callback — "Biz Sizi Arayalım" talebi
router.post('/callback', async (req, res) => {
    try {
        const name = String(req.body.name || '').trim();
        const phoneDigits = String(req.body.phone || '').replace(/\D/g, '');
        const topicKey = String(req.body.topic || '');
        const timeSlotKey = String(req.body.timeSlot || '');

        if (name.length < 2) {
            return res.status(400).json({ success: false, message: 'Lütfen adınızı girin' });
        }
        if (phoneDigits.length < 10) {
            return res.status(400).json({ success: false, message: 'Lütfen geçerli bir telefon numarası girin' });
        }

        const topic = CALLBACK_TOPICS.find(t => t.key === topicKey);
        const timeSlot = CALLBACK_TIME_SLOTS.find(t => t.key === timeSlotKey);

        const request = new WebCallbackRequest({
            site: req.site,
            name,
            phone: phoneDigits,
            topic: topic ? topic.key : '',
            timeSlot: timeSlot ? timeSlot.key : '',
            ip: req.ip || ''
        });
        await request.save();

        // Yöneticiye bildirim (iletişim formu şablonuyla) — fire-and-forget
        const details = [
            topic ? `Konu: ${topic.label}` : null,
            timeSlot ? `Uygun saat: ${timeSlot.label}` : null
        ].filter(Boolean).join(' | ');

        sendTemplateMail({
            templateKey: 'iletisim_formu',
            context: {
                formData: {
                    name,
                    surname: '',
                    email: '-',
                    phone: phoneDigits,
                    subject: 'Biz Sizi Arayalım',
                    message: `Müşteri aranmak istiyor. ${details}`.trim()
                }
            },
            to: null,
            alsoSendToAdmin: true,
            adminPurpose: 'callback',
            site: req.site,
            subjectOverride: `${(SITES[req.site] || SITES[DEFAULT_SITE]).name} - Geri Arama Talebi: ${name}`,
            adminCopyPrefix: ''
        }).then((mailResult) => {
            if (!mailResult.success) {
                console.warn('[callback] Yönetici maili gönderilemedi:', phoneDigits, mailResult.errors);
            } else {
                console.log('[callback] Talep maili gönderildi:', phoneDigits);
            }
        }).catch((err) => {
            console.error('[callback] Mail hatası:', phoneDigits, err.message);
        });

        res.json({ success: true, message: 'Talebiniz alındı, en kısa sürede sizi arayacağız' });
    } catch (err) {
        console.error('[callback] Kayıt hatası:', err.message);
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

module.exports = router;