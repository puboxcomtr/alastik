const express = require('express');
const router = express.Router();
const WebContact = require('../../../models/web/content/WebContact');

router.post('/', async (req, res) => {
    try {
        const { name, surname, email, phone, subject, message } = req.body;

        if (!name || !surname || !email || !phone || !subject || !message) {
            return res.status(400).json({ success: false, message: 'Tüm alanlar zorunludur' });
        }

        const contact = new WebContact({ name, surname, email, phone, subject, message });
        await contact.save();

        res.json({ success: true, message: 'Mesajınız iletildi' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Sunucu hatası' });
    }
});

module.exports = router;