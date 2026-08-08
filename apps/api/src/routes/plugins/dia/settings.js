const router = require('express').Router();
const WebDia = require('../../../models/plugins/dia/DiaSettings');
const DiaStock = require('../../../models/plugins/DiaStock');
const axios = require('axios');

function escapeRegex(str) {
    return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Aktarım Ayarları seçicileri — kaynak: diastocks (DIA'daki TÜM ürünler)
router.get('/aktarim/products', async (req, res) => {
    try {
        const search = (req.query.search || '').trim();
        if (!search) {
            return res.json({ success: true, data: [] });
        }
        const regex = new RegExp(escapeRegex(search), 'i');
        const items = await DiaStock.find(
            { $or: [{ aciklama: regex }, { stokkartkodu: regex }] },
            { _key: 1, aciklama: 1, stokkartkodu: 1, marka: 1, gercek_stok: 1 }
        ).limit(200).lean();

        res.json({
            success: true,
            data: items.map(i => ({
                id: String(i._key),
                name: i.aciklama || '',
                sku: i.stokkartkodu || '',
                brand: i.marka || '',
                qty: i.gercek_stok || 0
            }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Ürünler yüklenemedi', error: err.message });
    }
});

router.get('/aktarim/categories', async (req, res) => {
    try {
        const rows = await DiaStock.aggregate([
            { $unwind: '$m_kategoriler' },
            {
                $project: {
                    names: ['$m_kategoriler.kategori_aciklama_1', '$m_kategoriler.kategori_aciklama_2', '$m_kategoriler.kategori_aciklama_3']
                }
            },
            { $unwind: '$names' },
            { $match: { names: { $nin: [null, ''] } } },
            { $group: { _id: '$names', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: rows.map(r => ({ id: r._id, name: r._id, count: r.count }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Kategoriler yüklenemedi', error: err.message });
    }
});

router.get('/aktarim/brands', async (req, res) => {
    try {
        const rows = await DiaStock.aggregate([
            { $match: { marka: { $nin: [null, ''] } } },
            { $group: { _id: '$marka', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]);

        res.json({
            success: true,
            data: rows.map(r => ({ id: r._id, name: r._id, count: r.count }))
        });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Markalar yüklenemedi', error: err.message });
    }
});

// GET - Ayarları getir (X-Site header'ına göre site bazlı)
router.get('/settings', async (req, res) => {
    try {
        const settings = await WebDia.getSettings(req.site || 'alastik');

        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Ayarlar yüklenemedi', error: err.message });
    }
});

// PUT - Ayarları güncelle (X-Site header'ına göre site bazlı)
router.put('/settings', async (req, res) => {
    try {
        const settings = await WebDia.updateSettings(req.body, req.site || 'alastik');

        res.json({ success: true, data: settings, message: 'Ayarlar kaydedildi' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Ayarlar kaydedilemedi', error: err.message });
    }
});

// POST - Bağlantı testi
router.post('/test-connection', async (req, res) => {
    try {
        const { baseURL, apiKey, username, password, firmaKodu, donemKodu } = req.body;

        if (!baseURL || !username || !password) {
            return res.status(400).json({ success: false, message: 'Sunucu adresi, kullanıcı adı ve şifre zorunludur' });
        }

        const loginRes = await axios.post(`${baseURL}/api/v3/sis/json`, {
            login: {
                username,
                password,
                disconnect_same_user: 'True',
                params: { apikey: apiKey }
            }
        }, { timeout: 15000, headers: { 'Content-Type': 'application/json' } });

        const data = loginRes.data;

        if (data.code === '200' && data.msg) {
            // Logout yap session'ı düşürme
            try {
                await axios.post(`${baseURL}/api/v3/sis/json`, {
                    logout: { session_id: data.msg }
                }, { timeout: 5000, headers: { 'Content-Type': 'application/json' } });
            } catch { }

            res.json({
                success: true,
                message: `Bağlantı başarılı. Firma: ${firmaKodu}, Dönem: ${donemKodu}`
            });
        } else {
            res.json({ success: false, message: data.msg || 'Giriş başarısız' });
        }
    } catch (err) {
        const msg = err.code === 'ECONNABORTED' ? 'Bağlantı zaman aşımına uğradı' :
            err.code === 'ECONNREFUSED' ? 'Sunucuya bağlanılamadı' :
                err.message;

        res.status(500).json({ success: false, message: msg });
    }
});

module.exports = router;