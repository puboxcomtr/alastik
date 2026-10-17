// Montaj Noktası (Bayi) Bilgi ve Fiyat Formu — /api/bayi-formu (config/bayiFormu.js SITELER'deki sitelerde)
// lastikjantavm: tek ortak link, giriş yok. b2b: yalnız giriş yapmış bayi; kayıt bayiye bağlanır.
// Tüm doğrulama config/bayiFormu.js tanımına göre sunucuda yapılır.
const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const WebDealerForm = require('../../../models/web/content/WebDealerForm');
const AddressCity = require('../../../models/web/address/AddressCity');
const AddressDistrict = require('../../../models/web/address/AddressDistrict');
const form = require('../../../config/bayiFormu');

const authMiddleware = require('../../../middleware/authMiddleware');

// Form yalnızca tanımlı sitelerde vardır; diğer sitelerde bu uçlar yok gibi davranır.
// Giriş gerektiren sitede bayi oturumu doğrulanır (req.user = bayi)
router.use((req, res, next) => {
    const ayar = form.SITELER[req.site];
    if (!ayar) return res.status(404).json({ success: false, message: 'Bulunamadı' });
    if (ayar.girisGerekli) return authMiddleware(req, res, next);
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

// ---- Görsel yükleme (isteğe bağlı alanlar) ----
// Dosya seçildiği anda yüklenir; dönen dosya adı form gönderilirken "gorseller" içinde yollanır.
// Dosyalar özel dizinde durur, sitede yayınlanmaz; yalnız admin panelinden açılır.
const multer = require('multer');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const yuklemeLimiti = rateLimit({
    windowMs: 15 * 60 * 1000, max: 80, standardHeaders: true, legacyHeaders: false,
    message: { success: false, message: 'Çok fazla dosya yüklendi, lütfen biraz sonra tekrar deneyin' }
});
const yukle = multer({ storage: multer.memoryStorage(), limits: { fileSize: form.GORSEL_BOYUT_MB * 1024 * 1024, files: 1, fields: 4 } }).single('dosya');
// Tür, dosya adına ya da tarayıcının bildirdiğine değil içeriğin ilk baytlarına bakılarak belirlenir
function dosyaTuru(buf) {
    if (!buf || buf.length < 12) return null;
    if (buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF) return 'jpg';
    if (buf[0] === 0x89 && buf.toString('latin1', 1, 4) === 'PNG') return 'png';
    if (buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP') return 'webp';
    if (buf.toString('latin1', 0, 5) === '%PDF-') return 'pdf';
    return null;
}
const DOSYA_UST_SINIR = 20000; // dizindeki toplam dosya sayısı tavanı (kötüye kullanım freni)

// POST /api/bayi-formu/gorsel — tek dosya (alan adı "dosya"), hangi başlık için olduğu "alan" ile
router.post('/gorsel', yuklemeLimiti, (req, res) => {
    yukle(req, res, async (err) => {
        try {
            if (err) return res.status(400).json({ success: false, message: err.code === 'LIMIT_FILE_SIZE' ? `Dosya en fazla ${form.GORSEL_BOYUT_MB} MB olabilir` : 'Dosya yüklenemedi' });
            const alan = form.GORSEL_ALANLARI.find(a => a.key === String(req.body?.alan || ''));
            if (!alan || !req.file) return res.status(400).json({ success: false, message: 'Dosya seçilmedi' });
            const tur = dosyaTuru(req.file.buffer);
            if (!tur || (tur === 'pdf' && !alan.pdf)) {
                return res.status(400).json({ success: false, message: alan.pdf ? 'Yalnızca fotoğraf (JPG, PNG) ya da PDF yükleyebilirsiniz' : 'Yalnızca fotoğraf (JPG, PNG) yükleyebilirsiniz' });
            }
            await fs.promises.mkdir(form.GORSEL_DIZIN, { recursive: true, mode: 0o750 });
            if ((await fs.promises.readdir(form.GORSEL_DIZIN)).length >= DOSYA_UST_SINIR) return res.status(503).json({ success: false, message: 'Şu an dosya yüklenemiyor, lütfen daha sonra deneyin' });
            const ad = `${crypto.randomBytes(16).toString('hex')}.${tur}`;
            await fs.promises.writeFile(path.join(form.GORSEL_DIZIN, ad), req.file.buffer, { mode: 0o640 });
            res.json({ success: true, data: { dosya: ad, boyut: req.file.size, tur } });
        } catch (error) {
            console.error('Bayi formu görseli kaydedilemedi:', error);
            res.status(500).json({ success: false, message: 'Dosya yüklenemedi, lütfen tekrar deneyin' });
        }
    });
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

        // Yalnızca sunucuda gerçekten duran dosyalar kayda girer
        for (const a of form.GORSEL_ALANLARI) {
            temiz.gorseller[a.key] = (temiz.gorseller[a.key] || []).filter(d => fs.existsSync(path.join(form.GORSEL_DIZIN, d)));
        }

        const telefonAnahtar = temiz.telefon1.replace(/\D/g, '');
        const simdi = new Date();
        const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || '';
        // Giriş gerektiren sitede kayıt bayiye bağlıdır: bayinin önceki formu (telefon değişse de) güncellenir
        const bayi = form.SITELER[req.site]?.girisGerekli && req.user
            ? { memberId: req.user._id, cariKodu: req.user.diaCustomerCode || '' }
            : {};
        const mevcut = (bayi.memberId && await WebDealerForm.findOne({ site: req.site, memberId: bayi.memberId }))
            || await WebDealerForm.findOne({ site: req.site, telefonAnahtar });
        if (mevcut) {
            Object.assign(mevcut, temiz, bayi, { telefonAnahtar, sonGuncelleme: simdi, ip, gonderimSayisi: (mevcut.gonderimSayisi || 1) + 1 });
            mevcut.markModified('saatler'); mevcut.markModified('fiyatlar'); mevcut.markModified('tesis'); mevcut.markModified('gorseller');
            await mevcut.save();
            return res.json({ success: true, guncellendi: true });
        }
        await WebDealerForm.create({ ...temiz, ...bayi, site: req.site, telefonAnahtar, ilkGonderim: simdi, sonGuncelleme: simdi, gonderimSayisi: 1, ip });
        res.json({ success: true, guncellendi: false });
    } catch (error) {
        console.error('Bayi formu kaydedilemedi:', error);
        res.status(500).json({ success: false, message: 'Form kaydedilemedi, lütfen tekrar deneyin' });
    }
});

module.exports = router;
