// Herkese açık: Montaj Noktası (Bayi) Bilgi ve Fiyat Formu — /api/bayi-formu (yalnızca lastikjantavm)
// Tek ortak link; giriş yok. Tüm doğrulama config/bayiFormu.js tanımına göre sunucuda yapılır.
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const WebDealerForm = require('../../../models/web/content/WebDealerForm');
const AddressCity = require('../../../models/web/address/AddressCity');
const AddressDistrict = require('../../../models/web/address/AddressDistrict');
const form = require('../../../config/bayiFormu');

// Form yalnızca tanımlı sitede vardır; diğer sitelerde bu uçlar yok gibi davranır
router.use((req, res, next) => {
    if (req.site !== form.SITE) return res.status(404).json({ success: false, message: 'Bulunamadı' });
    next();
});

// Aynı IP'den 15 dakikada en çok 20 gönderim (form herkese açık olduğu için)
const gonderimLimiti = rateLimit({
    windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Çok fazla deneme yapıldı, lütfen biraz sonra tekrar deneyin' }
});

// GET /api/bayi-formu/tanim — form alanları ve seçenekleri
router.get('/tanim', (req, res) => {
    res.json({ success: true, data: form.tanim() });
});

// POST /api/bayi-formu — formu gönder (aynı birinci telefonla tekrar gönderilirse üzerine yazılır)
router.post('/', gonderimLimiti, async (req, res) => {
    try {
        const b = req.body || {};
        // Bot tuzağı: insanların görmediği alan doluysa sessizce "başarılı" dön, kaydetme
        if (String(b.website || '').trim()) return res.json({ success: true });

        const il = b.cityId ? await AddressCity.findOne({ cityId: String(b.cityId) }).lean() : null;
        const ilce = il && b.districtId ? await AddressDistrict.findOne({ districtId: String(b.districtId), cityId: il.cityId }).lean() : null;
        const { hatalar, temiz } = form.dogrula(b, { il, ilce });
        if (Object.keys(hatalar).length) {
            return res.status(400).json({ success: false, message: 'Lütfen eksik ya da hatalı alanları düzeltin', hatalar });
        }

        const telefonAnahtar = temiz.telefon1.replace(/\D/g, '');
        const simdi = new Date();
        const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '';
        const mevcut = await WebDealerForm.findOne({ site: req.site, telefonAnahtar });
        if (mevcut) {
            Object.assign(mevcut, temiz, { sonGuncelleme: simdi, ip, gonderimSayisi: (mevcut.gonderimSayisi || 1) + 1 });
            mevcut.markModified('saatler'); mevcut.markModified('fiyatlar'); mevcut.markModified('tesis');
            await mevcut.save();
            return res.json({ success: true, guncellendi: true });
        }
        await WebDealerForm.create({ ...temiz, site: req.site, telefonAnahtar, ilkGonderim: simdi, sonGuncelleme: simdi, gonderimSayisi: 1, ip });
        res.json({ success: true, guncellendi: false });
    } catch (error) {
        console.error('Bayi formu kaydedilemedi:', error);
        res.status(500).json({ success: false, message: 'Form kaydedilemedi, lütfen tekrar deneyin' });
    }
});

module.exports = router;
