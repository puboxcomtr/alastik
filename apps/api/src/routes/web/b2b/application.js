const express = require('express');
const router = express.Router();
const WebB2BApplication = require('../../../models/web/user/WebB2BApplication');

/**
 * POST / — B2B bayi başvurusu (public form).
 * Başvuru kaydedilir ve sitenin SMTP posta kutusuna bildirim gönderilir.
 * Hesap/şifre OLUŞTURMAZ — bayilik DIA tarafında açılır.
 */
router.post('/', async (req, res) => {
    try {
        const {
            firstName, lastName, email, phone, city, district, address,
            companyName, taxOffice, taxNumber, message,
            yearsOfExperience, monthlySalesVolume, brands, wantsBrandedSignage, termsAccepted
        } = req.body || {};

        const zorunlu = { firstName, lastName, email, city, district, yearsOfExperience, monthlySalesVolume };
        for (const [alan, deger] of Object.entries(zorunlu)) {
            if (!deger || !String(deger).trim()) {
                return res.status(400).json({ success: false, message: 'Lütfen zorunlu alanları doldurun' });
            }
        }
        if (!String(email).includes('@')) {
            return res.status(400).json({ success: false, message: 'Geçerli bir e-posta adresi girin' });
        }
        if (termsAccepted !== true && termsAccepted !== 'true') {
            return res.status(400).json({ success: false, message: 'Sözleşme koşullarını kabul etmeniz gereklidir' });
        }

        // Aynı e-postadan kısa aralıklı tekrarları engelle (basit koruma)
        const son = await WebB2BApplication.findOne({
            site: req.site,
            email: String(email).toLowerCase().trim(),
            createdAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }
        }).lean();
        if (son) {
            return res.status(429).json({ success: false, message: 'Başvurunuz zaten alındı, en kısa sürede dönüş yapacağız' });
        }

        const application = await WebB2BApplication.create({
            site: req.site,
            firstName: String(firstName).trim().slice(0, 60),
            lastName: String(lastName).trim().slice(0, 60),
            email: String(email).trim().slice(0, 160),
            phone: String(phone || '').trim().slice(0, 30),
            city: String(city).trim().slice(0, 60),
            district: String(district || '').trim().slice(0, 60),
            address: String(address || '').trim().slice(0, 500),
            companyName: String(companyName || '').trim().slice(0, 200),
            taxOffice: String(taxOffice || '').trim().slice(0, 80),
            taxNumber: String(taxNumber || '').trim().slice(0, 20),
            message: String(message || '').trim().slice(0, 2000),
            yearsOfExperience: String(yearsOfExperience || '').trim().slice(0, 10),
            monthlySalesVolume: String(monthlySalesVolume || '').trim().slice(0, 20),
            brands: Array.isArray(brands) ? brands.slice(0, 40).map(b => String(b).trim().slice(0, 60)).filter(Boolean) : [],
            wantsBrandedSignage: wantsBrandedSignage === 'evet' || wantsBrandedSignage === true,
            termsAccepted: true,
            ip: req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || ''
        });

        // Bildirim: sitenin mail şablonundan (panelde Mail Şablonları > Bayi Başvuru
        // Bildirimi) render edilir, SMTP posta kutusuna gönderilir
        try {
            const SmtpSettings = require('../../../models/admin/mail/smtp/SmtpSettings');
            const WebMailTemplate = require('../../../models/admin/mail/Template');
            const { render } = require('../../../services/plugins/mail/templateRenderer');
            const { sendMail } = require('../../../services/web/mail/MailService');

            const smtp = await SmtpSettings.findOne({ site: req.site }).lean();
            // Bildirim alıcıları ayarı (settings: group b2b / basvuruBildirimAdresleri,
            // virgülle çok adres); tanımlı değilse SMTP posta kutusuna düşer
            let bildirimAdresi = smtp?.username;
            try {
                const Setting = require('../../../models/admin/settings/Setting');
                const ayar = await Setting.findOne({ site: req.site, group: 'b2b', key: 'basvuruBildirimAdresleri' }).lean();
                if (ayar?.value && String(ayar.value).includes('@')) bildirimAdresi = String(ayar.value);
            } catch { /* ayar okunamazsa SMTP kutusu kullanılır */ }
            const template = await WebMailTemplate.findOne({
                site: req.site, templateKey: 'b2b_bayi_basvuru_bildirim', isActive: true
            }).lean();

            if (bildirimAdresi && bildirimAdresi.includes('@') && template?.content) {
                const data = {
                    contactName: `${application.firstName} ${application.lastName}`.trim(),
                    companyName: application.companyName || '-',
                    phone: application.phone || '-',
                    email: application.email,
                    city: application.city,
                    district: application.district || '-',
                    address: application.address || '-',
                    taxOffice: application.taxOffice || '-',
                    taxNumber: application.taxNumber || '-',
                    yearsOfExperience: application.yearsOfExperience || '-',
                    monthlySalesVolume: application.monthlySalesVolume || '-',
                    brands: application.brands?.length ? application.brands.join(', ') : '-',
                    wantsBrandedSignage: application.wantsBrandedSignage ? 'Evet' : 'Hayır',
                    message: application.message || '-'
                };
                await sendMail({
                    to: bildirimAdresi,
                    subject: render(template.subject || 'Yeni B2B Bayi Başvurusu', { data }),
                    html: render(template.content, { data }),
                    site: req.site
                });
            }
        } catch (mailError) {
            console.error('[b2b-basvuru] Bildirim maili gönderilemedi:', mailError.message);
        }

        res.json({ success: true, message: 'Başvurunuz alındı, en kısa sürede sizinle iletişime geçeceğiz' });
    } catch (error) {
        console.error('[b2b-basvuru] Hata:', error);
        res.status(500).json({ success: false, message: 'Başvuru kaydedilemedi, lütfen tekrar deneyin' });
    }
});

module.exports = router;
