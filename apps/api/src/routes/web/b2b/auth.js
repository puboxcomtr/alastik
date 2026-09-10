const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const WebMember = require('../../../models/web/user/WebMember');
const authMiddleware = require('../../../middleware/authMiddleware');

/**
 * POST /login — bayi girişi: CARİ KODU veya E-POSTA + şifre.
 * Başarıda B2C üye token'ıyla aynı biçimde JWT döner (type: member) —
 * mevcut authenticate middleware'i bayi oturumları için de geçerlidir.
 */
router.post('/login', async (req, res) => {
    try {
        const { identifier, password } = req.body || {};
        const kimlik = String(identifier || '').trim();

        if (!kimlik || !password) {
            return res.status(400).json({ success: false, message: 'Bayi kodu (veya e-posta) ve şifre giriniz.' });
        }

        const member = await WebMember.findOne({
            site: req.site,
            $or: [
                { diaCustomerCode: kimlik },
                { email: kimlik.toLowerCase() }
            ]
        });

        if (!member) {
            return res.status(401).json({ success: false, message: 'Bayi kodu/e-posta veya şifre hatalı.' });
        }
        if (member.status === 'suspended') {
            return res.status(403).json({ success: false, message: 'Hesabınız askıya alınmıştır. Lütfen bizimle iletişime geçiniz.' });
        }
        if (member.status !== 'active') {
            return res.status(403).json({ success: false, message: 'Hesabınız henüz aktif değil. Lütfen bizimle iletişime geçiniz.' });
        }

        const isPasswordValid = await member.comparePassword(password);
        if (!isPasswordValid) {
            return res.status(401).json({ success: false, message: 'Bayi kodu/e-posta veya şifre hatalı.' });
        }

        const token = jwt.sign(
            { id: member._id, email: member.email, type: 'member' },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '30d' }
        );

        member.lastLoginAt = new Date();
        member.loginAttempts = 0;
        await member.save();

        res.json({
            success: true,
            message: 'Giriş başarılı.',
            data: {
                token,
                member: {
                    id: member._id,
                    name: `${member.firstName || ''} ${member.lastName || ''}`.replace(/ \.$/, '').trim(),
                    email: member.email,
                    cariKodu: member.diaCustomerCode || ''
                }
            }
        });
    } catch (error) {
        console.error('[b2b-auth] Giriş hatası:', error);
        res.status(500).json({ success: false, message: 'Giriş yapılırken bir hata oluştu.' });
    }
});

/**
 * GET /me — oturumdaki bayinin bilgileri (token doğrulaması authenticate ile)
 */
router.get('/me', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site }).select('-password').lean();
        if (!member) {
            return res.status(404).json({ success: false, message: 'Bayi bulunamadı.' });
        }
        res.json({
            success: true,
            data: {
                id: member._id,
                name: `${member.firstName || ''} ${member.lastName || ''}`.replace(/ \.$/, '').trim(),
                email: member.email,
                cariKodu: member.diaCustomerCode || '',
                phone: member.phone || ''
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Bilgiler alınamadı.' });
    }
});

// Cari özet önbelleği: bayi başına 60 sn (her sayfa yüklemesi DIA'yı yormasın)
const cariOzetCache = new Map();
const CARI_OZET_TTL_MS = 60 * 1000;

/**
 * GET /cari-ozet — oturumdaki bayinin DIA cari özeti (kuruş cinsinden):
 * bakiye, toplam limit (risklimiti), kalan limit, platformdaki bekleyen sipariş
 * toplamı. Vadesi geçen borç DIA ekstre servisine bağlanana kadar null döner.
 */
router.get('/cari-ozet', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCustomerCode').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }

        const cacheKey = String(member.diaCustomerKey);
        const cached = cariOzetCache.get(cacheKey);
        if (cached && Date.now() - cached.at < CARI_OZET_TTL_MS) {
            return res.json({ success: true, data: cached.data, cached: true });
        }

        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        const svc = new DiaOrderService(req.site);
        await svc.init().catch(() => { });
        await svc.login();
        const diaRes = await svc.sendRequest('/api/v3/scf/json', {
            scf_carikart_listele: {
                session_id: svc.sessionId,
                firma_kodu: svc.firmaKodu,
                donem_kodu: svc.donemKodu,
                filters: [{ field: '_key', operator: '=', value: cacheKey }],
                sorts: '',
                params: { selectedcolumns: ['carikartkodu', 'bakiye', 'borc', 'alacak', 'risklimiti'] },
                limit: 1,
                offset: 0
            }
        });
        const kart = Array.isArray(diaRes?.result) ? diaRes.result[0] : null;
        if (!kart) {
            return res.status(502).json({ success: false, message: 'Cari bilgileri şu an alınamadı.' });
        }

        const kurus = (v) => Math.round((parseFloat(v) || 0) * 100);
        const bakiyeKurus = kurus(kart.bakiye) || (kurus(kart.borc) - kurus(kart.alacak));
        const toplamLimitKurus = kurus(kart.risklimiti);

        // Platformdaki bekleyen siparişler (henüz tamamlanmamış b2b siparişleri)
        const WebOrder = require('../../../models/web/order/WebOrder');
        const bekleyenler = await WebOrder.aggregate([
            { $match: { site: req.site, memberId: new (require('mongoose').Types.ObjectId)(String(req.user._id)), isActive: true, status: { $in: ['pending', 'confirmed', 'processing'] } } },
            { $group: { _id: null, toplam: { $sum: '$pricing.total' } } }
        ]);
        const bekleyenSiparisKurus = Math.round((bekleyenler[0]?.toplam || 0) * 100);

        const data = {
            cariKodu: member.diaCustomerCode,
            bakiyeKurus,
            toplamLimitKurus,
            bekleyenSiparisKurus,
            kalanLimitKurus: toplamLimitKurus - bakiyeKurus - bekleyenSiparisKurus,
            vadesiGecenKurus: null // DIA ekstre/yaşlandırma servisine bağlanınca dolacak
        };
        cariOzetCache.set(cacheKey, { at: Date.now(), data });
        res.json({ success: true, data });
    } catch (error) {
        console.error('[b2b-auth] Cari özet hatası:', error.message);
        res.status(500).json({ success: false, message: 'Cari bilgileri alınamadı.' });
    }
});

// Depo stok önbelleği: kod başına 5 dk (DIA'yı yormasın)
const depoStokCache = new Map();
const DEPO_STOK_TTL_MS = 5 * 60 * 1000;

/**
 * GET /depo-stok?codes=kod1,kod2 — verilen stok kodlarının depo bazlı stoğu.
 * Depolar b2b DIA ayarındaki vitrinDepolari'ndan (Maslak/Merkez/Fabrika) gelir.
 * Yanıt: { "kod": [{ ad, adet }, ...], ... }
 */
router.get('/depo-stok', authMiddleware, async (req, res) => {
    try {
        const kodlar = String(req.query.codes || '')
            .split(',').map(s => s.trim()).filter(Boolean).slice(0, 120);
        if (kodlar.length === 0) return res.json({ success: true, data: {} });

        const WebDia = require('../../../models/plugins/dia/DiaSettings');
        const settings = await WebDia.getSettings(req.site);
        const depolar = Array.isArray(settings.vitrinDepolari) ? settings.vitrinDepolari : [];
        if (depolar.length === 0) return res.json({ success: true, data: {} });

        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        let svc = null;
        const sonuc = {};

        for (const kod of kodlar) {
            const cached = depoStokCache.get(kod);
            if (cached && Date.now() - cached.at < DEPO_STOK_TTL_MS) {
                sonuc[kod] = cached.data;
                continue;
            }
            if (!svc) {
                svc = new DiaOrderService(req.site);
                svc.settings = settings;
                svc.firmaKodu = settings.firmaKodu || 1;
                svc.donemKodu = settings.donemKodu || 1;
                await svc.login();
            }
            const satirlar = [];
            for (const d of depolar) {
                const adet = await svc.getDepotStock(kod, d.key).catch(() => 0);
                satirlar.push({ ad: d.ad, adet: Math.max(0, Math.floor(adet)) });
            }
            depoStokCache.set(kod, { at: Date.now(), data: satirlar });
            sonuc[kod] = satirlar;
        }

        res.json({ success: true, data: sonuc });
    } catch (error) {
        console.error('[b2b-auth] Depo stok hatası:', error.message);
        res.status(500).json({ success: false, message: 'Depo stoğu alınamadı.' });
    }
});

module.exports = router;
