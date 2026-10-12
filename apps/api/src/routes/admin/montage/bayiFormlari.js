// Admin: Montaj Noktası (Bayi) Bilgi ve Fiyat Formu kayıtları — /api/admin/montage/dealer-forms
// (kimlik doğrulama admin/Index.js'teki ortak kapıdan gelir). Form yalnızca bir sitede açıldığı için
// panelde hangi site seçili olursa olsun aynı kayıtlar listelenir.
const express = require('express');
const XLSX = require('xlsx');
const router = express.Router();
const WebDealerForm = require('../../../models/web/content/WebDealerForm');
const form = require('../../../config/bayiFormu');

const kacis = s => String(s || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const tarih = d => d ? new Date(d).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
const fiyatMetni = v => v === form.VERMIYORUM ? form.VERMIYORUM_ETIKET : (typeof v === 'number' ? v : '');

function filtre(q) {
    const f = { site: form.SITE };
    if (q.cityId) f.cityId = String(q.cityId);
    const ara = String(q.search || '').trim();
    if (ara) {
        const rx = new RegExp(kacis(ara), 'i'); const rakam = ara.replace(/\D/g, '');
        f.$or = [{ bayiAdi: rx }, { cityName: rx }, { districtName: rx }, ...(rakam.length >= 3 ? [{ telefonAnahtar: new RegExp(rakam) }, { telefon2: new RegExp(rakam.split('').join('\\s*')) }] : [])];
    }
    return f;
}

// Liste — GET /admin/montage/dealer-forms?search=&cityId=&page=&limit=
router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1); const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
        const f = filtre(req.query);
        const [kayitlar, toplam, iller] = await Promise.all([
            WebDealerForm.find(f, { bayiAdi: 1, cityName: 1, districtName: 1, telefon1: 1, telefon2: 1, ilkGonderim: 1, sonGuncelleme: 1, gonderimSayisi: 1 }).sort({ sonGuncelleme: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            WebDealerForm.countDocuments(f),
            WebDealerForm.aggregate([{ $match: { site: form.SITE } }, { $group: { _id: { cityId: '$cityId', cityName: '$cityName' }, n: { $sum: 1 } } }, { $sort: { '_id.cityName': 1 } }])
        ]);
        res.json({ success: true, data: kayitlar, toplam, page, limit, iller: iller.map(i => ({ cityId: i._id.cityId, cityName: i._id.cityName, adet: i.n })) });
    } catch (error) {
        console.error('Bayi formları listelenemedi:', error);
        res.status(500).json({ success: false, message: 'Bayi formları alınamadı' });
    }
});

// Excel — GET /admin/montage/dealer-forms/export (her bayi bir satır, her alan bir sütun)
router.get('/export', async (req, res) => {
    try {
        const kayitlar = await WebDealerForm.find(filtre(req.query)).sort({ cityName: 1, districtName: 1, bayiAdi: 1 }).lean();
        const basliklar = ['Bayi Adı', 'İl', 'İlçe', 'Açık Adres', 'Telefon 1', 'Telefon 2',
            ...form.SAAT_ALANLARI.map(a => a.etiket),
            ...form.FIYAT_SATIRLARI.map(r => `${r.kod} – ${r.ad} (${r.birim}, KDV dahil TL)`),
            ...form.TESIS_EVET_HAYIR.map(a => a.kisa), 'Çalışan Sayısı', 'Marka Bayiliği', 'İş Yeri m²', 'Lastik Oteli Kapasitesi (adet)',
            'Ek Hizmetler', ...form.GORSEL_ALANLARI.map(a => `${a.kisa} (dosya adedi)`),
            'İlk Gönderim', 'Son Güncelleme', 'Gönderim Sayısı'];
        const satirlar = kayitlar.map(k => [k.bayiAdi, k.cityName, k.districtName, k.adres, k.telefon1, k.telefon2 || '',
            ...form.SAAT_ALANLARI.map(a => k.saatler?.[a.key] ?? ''),
            ...form.FIYAT_SATIRLARI.map(r => fiyatMetni(k.fiyatlar?.[r.anahtar])),
            ...form.TESIS_EVET_HAYIR.map(a => k.tesis?.[a.key] ?? ''), k.tesis?.calisanSayisi ?? '', (k.tesis?.markalar || []).join(', '), k.tesis?.metrekare ?? '',
            k.tesis?.lastikOteliKapasite === form.LASTIK_OTELI_YOK ? form.LASTIK_OTELI_YOK_ETIKET : (k.tesis?.lastikOteliKapasite ?? ''),
            k.ekHizmetler || '', ...form.GORSEL_ALANLARI.map(a => (k.gorseller?.[a.key] || []).length || ''),
            tarih(k.ilkGonderim), tarih(k.sonGuncelleme), k.gonderimSayisi || 1]);
        const ws = XLSX.utils.aoa_to_sheet([basliklar, ...satirlar]);
        ws['!cols'] = basliklar.map((b, i) => ({ wch: i === 3 ? 45 : Math.min(40, Math.max(12, b.length + 2)) }));
        const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Bayi Formları');
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        const gun = new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
        res.json({ success: true, data: { filename: `bayi-formlari-${gun}.xlsx`, base64: buffer.toString('base64'), adet: kayitlar.length } });
    } catch (error) {
        console.error('Bayi formları Excel hatası:', error);
        res.status(500).json({ success: false, message: 'Excel oluşturulamadı' });
    }
});

// Dosya — GET /admin/montage/dealer-forms/dosya/:ad (bayinin yüklediği görsel/PDF; yalnız oturum açmış admin görür)
const fs = require('fs');
const path = require('path');
const DOSYA_TURU = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', pdf: 'application/pdf' };
// Panel her isteği oturum anahtarıyla JSON olarak yaptığı için dosya da (Excel çıktısı gibi) base64 döner.
router.get('/dosya/:ad', async (req, res) => {
    try {
        const ad = String(req.params.ad || '');
        if (!form.DOSYA_KIMLIK.test(ad)) return res.status(400).json({ success: false, message: 'Geçersiz dosya' });
        const yol = path.join(form.GORSEL_DIZIN, ad);
        if (!fs.existsSync(yol)) return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
        const buf = await fs.promises.readFile(yol);
        res.json({ success: true, data: { dosya: ad, tur: DOSYA_TURU[ad.split('.').pop()], base64: buf.toString('base64') } });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Dosya okunamadı' });
    }
});

// Detay — GET /admin/montage/dealer-forms/:id (cevaplar + okunaklı gösterim için tanım)
router.get('/:id', async (req, res) => {
    try {
        if (!/^[a-f0-9]{24}$/i.test(String(req.params.id))) return res.status(400).json({ success: false, message: 'Geçersiz kayıt' });
        const kayit = await WebDealerForm.findOne({ _id: req.params.id, site: form.SITE }, { ip: 0, __v: 0 }).lean();
        if (!kayit) return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
        res.json({ success: true, data: kayit, tanim: form.tanim() });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Kayıt alınamadı' });
    }
});

// Sil — DELETE /admin/montage/dealer-forms/:id
router.delete('/:id', async (req, res) => {
    try {
        if (!/^[a-f0-9]{24}$/i.test(String(req.params.id))) return res.status(400).json({ success: false, message: 'Geçersiz kayıt' });
        const kayit = await WebDealerForm.findOneAndDelete({ _id: req.params.id, site: form.SITE }).lean();
        if (!kayit) return res.status(404).json({ success: false, message: 'Kayıt bulunamadı' });
        // Kayıtla birlikte bayinin yüklediği dosyalar da silinir
        for (const d of Object.values(kayit.gorseller || {}).flat()) {
            if (form.DOSYA_KIMLIK.test(String(d))) fs.promises.unlink(path.join(form.GORSEL_DIZIN, String(d))).catch(() => { });
        }
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Kayıt silinemedi' });
    }
});

module.exports = router;
