const router = require('express').Router();
const WebDia = require('../../../models/plugins/dia/DiaSettings');
const axios = require('axios');

// GET - Ayarları getir
router.get('/settings', async (req, res) => {
    try {
        const settings = await WebDia.getSettings();

        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Ayarlar yüklenemedi', error: err.message });
    }
});

// PUT - Ayarları güncelle
router.put('/settings', async (req, res) => {
    try {
        const settings = await WebDia.updateSettings(req.body);

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