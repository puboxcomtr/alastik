const express = require('express');
const router = express.Router();
const WebContact = require('../../../models/web/content/WebContact');
const { sendTemplateMail } = require('../../../services/plugins/mail/mailOrchestrator');


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

module.exports = router;