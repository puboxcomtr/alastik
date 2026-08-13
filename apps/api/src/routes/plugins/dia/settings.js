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

// Sipariş Entegrasyonu key alanları için DIA seçenek listeleri.
// Şube/depo ve yetki kodlarının doğrudan listeleme servisi yoktur —
// mevcut belgelerden (sipariş/fatura/irsaliye/cari) türetilir.
const siparisOptionsCache = new Map(); // site → { at, data }
const SIPARIS_OPTIONS_TTL = 10 * 60 * 1000;

router.get('/siparis-options', async (req, res) => {
    try {
        const cached = siparisOptionsCache.get(req.site);
        if (cached && Date.now() - cached.at < SIPARIS_OPTIONS_TTL && !req.query.refresh) {
            return res.json({ success: true, data: cached.data, cached: true });
        }

        const settings = await WebDia.getSettings(req.site);
        if (!settings.baseURL || !settings.username || !settings.password || !settings.apiKey) {
            return res.status(400).json({ success: false, message: 'DIA bağlantı ayarları eksik' });
        }

        const firma = settings.siparis?.firmaKodu || settings.firmaKodu || 1;
        const donem = settings.siparis?.donemKodu || settings.donemKodu || 1;

        const send = async (endpoint, payload) => {
            const response = await axios.post(`${settings.baseURL}${endpoint}`, payload, {
                headers: { 'Content-Type': 'application/json' }, timeout: 60000, validateStatus: () => true
            });
            return response.data;
        };

        const loginRes = await send('/api/v3/sis/json', {
            login: {
                username: settings.username,
                password: settings.password,
                disconnect_same_user: 'True',
                params: { apikey: settings.apiKey }
            }
        });
        if (loginRes?.code !== '200') {
            return res.status(502).json({ success: false, message: `DIA oturumu açılamadı: ${loginRes?.msg || ''}` });
        }
        const sessionId = loginRes.msg;

        const list = async (serviceName, limit = 100, sorts = '', endpoint = '/api/v3/scf/json') => {
            const response = await send(endpoint, {
                [serviceName]: {
                    session_id: sessionId, firma_kodu: firma, donem_kodu: donem,
                    filters: '', sorts, params: {}, limit, offset: 0
                }
            });
            return Array.isArray(response?.result) ? response.result : [];
        };

        // Doğrudan listelenebilenler (kargo firmaları krg modülündedir)
        const [kargoRows, elemanRows, planRows] = [
            await list('krg_firma_listele', 100, '', '/api/v3/krg/json'),
            await list('scf_satiselemani_listele', 200),
            await list('scf_odeme_plani_listele', 200)
        ];

        // Belgelerden türetilenler (son kayıtlar, _key azalan)
        const desc = [{ field: '_key', sorttype: 'DESC' }];
        const [siparisRows, faturaRows, irsaliyeRows, cariRows] = [
            await list('scf_siparis_listele', 100, desc),
            await list('scf_fatura_listele', 100, desc),
            await list('scf_irsaliye_listele', 100, desc),
            await list('scf_carikart_listele', 100, desc)
        ];

        const collectPairs = (rows, keyField, labelField) => {
            const map = new Map();
            for (const row of rows) {
                const key = parseInt(row[keyField]) || 0;
                const label = String(row[labelField] || '').trim();
                if (key && label && !map.has(key)) map.set(key, label);
            }
            return [...map.entries()].map(([key, label]) => ({ key, label })).sort((a, b) => a.label.localeCompare(b.label, 'tr'));
        };

        const belgeRows = [...siparisRows, ...faturaRows, ...irsaliyeRows];
        const data = {
            subeler: collectPairs(belgeRows, '_key_sis_sube_source', '__sourcesubeadi'),
            depolar: collectPairs(belgeRows, '_key_sis_depo_source', '__sourcedepoadi'),
            // Alan adları DIA yanıtına göre: kargo adı 'aciklama', satış elemanı adı 'kodu' + açıklaması 'aciklama'
            kargoFirmalari: kargoRows.filter(r => r.durum === 'A').map(r => ({ key: parseInt(r._key), label: `${r.aciklama || ''} (${r.kodu || ''})`.trim() })),
            satisElemanlari: elemanRows.filter(r => r.durum === 'A').map(r => ({ key: parseInt(r._key), label: [r.kodu, r.aciklama].filter(Boolean).join(' — ') || String(r._key) })).sort((a, b) => a.label.localeCompare(b.label, 'tr')),
            odemePlanlari: planRows.filter(r => r.durum === 'A').map(r => ({ key: parseInt(r._key), label: [r.kodu, r.aciklama || r.adi].filter(Boolean).join(' — ') || String(r._key) })).sort((a, b) => a.label.localeCompare(b.label, 'tr')),
            cariOzelKodlari: collectPairs(cariRows, '_key_sis_ozelkod1', 'ozelkod1kod'),
            cariYetkiKodlari: collectPairs(cariRows, '_key_sis_seviyekodu', 'yetkikodu'),
            siparisYetkiKodlari: collectPairs(siparisRows, '_key_sis_seviyekodu', 'yetkikodu'),
            faturaYetkiKodlari: collectPairs(faturaRows, '_key_sis_seviyekodu', 'yetkikodu')
        };

        siparisOptionsCache.set(req.site, { at: Date.now(), data });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'DIA seçenekleri yüklenemedi', error: err.message });
    }
});

module.exports = router;