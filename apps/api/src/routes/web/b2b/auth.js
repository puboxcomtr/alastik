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

        const sonuc = {};
        const eksik = [];
        for (const kod of kodlar) {
            const cached = depoStokCache.get(kod);
            if (cached && Date.now() - cached.at < DEPO_STOK_TTL_MS) sonuc[kod] = cached.data;
            else eksik.push(kod);
        }

        if (eksik.length > 0) {
            const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
            const svc = new DiaOrderService(req.site);
            svc.settings = settings;
            svc.firmaKodu = settings.firmaKodu || 1;
            svc.donemKodu = settings.donemKodu || 1;
            await svc.login();

            // Her depo için TEK toplu DIA çağrısı (stokkartkodu IN) — eskiden ürün×depo
            // sayısınca çağrı yapılıyordu (100 ürün = 300 çağrı, çok yavaş). Artık depo
            // sayısı kadar çağrı (3) yapılır.
            const depoMaps = [];
            for (const d of depolar) {
                const map = await svc.getDepotStockBatch(eksik, d.key).catch(() => ({}));
                depoMaps.push({ ad: d.ad, map });
            }
            for (const kod of eksik) {
                const satirlar = depoMaps.map(dm => ({ ad: dm.ad, adet: Math.max(0, Math.floor(dm.map[kod] || 0)) }));
                depoStokCache.set(kod, { at: Date.now(), data: satirlar });
                sonuc[kod] = satirlar;
            }
        }

        res.json({ success: true, data: sonuc });
    } catch (error) {
        console.error('[b2b-auth] Depo stok hatası:', error.message);
        res.status(500).json({ success: false, message: 'Depo stoğu alınamadı.' });
    }
});

/**
 * Oturumdaki bayinin DIA cari adreslerini map'ler (scf_carikart m_adresler).
 */
function mapDiaAddresses(list) {
    return (Array.isArray(list) ? list : []).map((a, i) => {
        // DIA'nın kendi (fatura/ana) adresi ya da başlıksız kayıtlar "Varsayılan"
        // olarak gösterilir; bayinin form ile eklediği kendi başlığı korunur.
        const rawBaslik = String(a.adresadi || '').trim();
        // DIA'nın kendi (fatura/ana) adresi başlıksızsa "Adres" gösterilir;
        // "Varsayılan" ayrı bir rozet olarak (a.ana) çıkar, çift yazılmasın.
        const varsayilan = !rawBaslik || String(a.anaadres) === '1' || /fatura/i.test(rawBaslik);
        return {
        id: String(a._key || i),
        baslik: varsayilan ? 'Adres' : rawBaslik,
        teslimat: a.adrestipi === 'T',
        ana: String(a.anaadres) === '1',
        adres: [a.adres1, a.adres2].filter((x) => x && String(x).trim()).join(' ').trim(),
        il: a._key_sis_sehirler?.sehiradi || a.sehiradi || '',
        ilce: a.ilce || '',
        telefon: a.ceptel || ''
        };
    });
}

const adresCache = new Map();
const ADRES_TTL_MS = 2 * 60 * 1000;

/**
 * GET /adresler — bayinin DIA carisindeki adresleri döner (fatura + teslimat).
 * 2 dk önbellekli (her sepet açılışında DIA'ya gidilmesin).
 */
router.get('/adresler', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey').lean();
        if (!member?.diaCustomerKey) return res.json({ success: true, data: [] });

        const cacheKey = String(member.diaCustomerKey);
        const cached = adresCache.get(cacheKey);
        if (cached && Date.now() - cached.at < ADRES_TTL_MS) {
            return res.json({ success: true, data: cached.data, cached: true });
        }

        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        const svc = new DiaOrderService(req.site);
        await svc.init().catch(() => {});
        await svc.login();
        const r = await svc.sendRequest('/api/v3/scf/json', {
            scf_carikart_getir: {
                session_id: svc.sessionId,
                firma_kodu: svc.firmaKodu,
                donem_kodu: svc.donemKodu,
                key: parseInt(member.diaCustomerKey)
            }
        });
        const data = mapDiaAddresses(r?.result?.m_adresler);
        adresCache.set(cacheKey, { at: Date.now(), data });
        res.json({ success: true, data });
    } catch (error) {
        console.error('[b2b-auth] Adres listesi hatası:', error.message);
        res.status(500).json({ success: false, message: 'Adresler alınamadı.' });
    }
});

/**
 * POST /adres — bayinin DIA carisine yeni bir TESLİMAT adresi ekler.
 * Read-modify-write: cari kartı okunur, m_adresler'e eklenir, kart geri yazılır
 * (diğer alanlar korunur). { baslik, adres, il, ilce, telefon }
 */
router.post('/adres', authMiddleware, async (req, res) => {
    try {
        const { baslik, adSoyad, adres, adresDetay, il, ilce, telefon, postaKodu } = req.body || {};
        if (!adres || !String(adres).trim()) {
            return res.status(400).json({ success: false, message: 'Adres alanı zorunludur.' });
        }
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey diaCustomerCode firstName lastName email phone').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }

        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        const svc = new DiaOrderService(req.site);
        await svc.init().catch(() => {});
        await svc.login();

        // Cari kartını HİÇ güncellemeden, DIA'nın adrese özel metoduyla yeni
        // adresi doğrudan ekliyoruz: scf_carikart_adresleri_ekle. Adres cariye
        // `_key_scf_carikart` ile bağlanır ve DIA'da "Diğer Adresler" sekmesine
        // düşer. (scf_carikart_ekle yalnız INSERT'tir; tüm kartı yazmak vergi
        // no/kod/e-posta zorunluluklarına ve kopya cari riskine yol açıyordu.)
        const adresKart = {
            _key_scf_carikart: parseInt(member.diaCustomerKey),
            _key_dag_bolge: 0,
            _key_sis_ulkeler: 0,
            _key_sis_vergidairesi: 0,
            _key_sis_sehirler: il ? { sehiradi: String(il).toLocaleUpperCase('tr-TR') } : 0,
            adres1: String(adres).trim(),
            adres2: (adresDetay || '').trim(),
            adresadi: (baslik && String(baslik).trim()) || 'Teslimat Adresi',
            adrestipi: 'T', // Teslimat → Fatura (F) dışı, "Diğer Adresler"e düşer
            anaadres: '0',
            bolge: '',
            unvan: (adSoyad || '').trim(),
            ceptel: telefon ? svc.normalizePhone(telefon) : '',
            telefon1: '',
            telefon2: '',
            fax: '',
            ilce: (ilce || '').toLocaleUpperCase('tr-TR'),
            sehir: '',
            postakodu: (postaKodu || '').trim(),
            ulke: 'TÜRKİYE',
            ulkeno: '',
            tckimlikno: '',
            verginumarasi: '',
            kayitturu: 'SHS',
            yabanciuyruklu: 'H',
            koordinat_latitude: '0',
            koordinat_longitude: '0'
        };
        const upd = await svc.sendRequest('/api/v3/scf/json', {
            scf_carikart_adresleri_ekle: {
                session_id: svc.sessionId,
                firma_kodu: svc.firmaKodu,
                donem_kodu: svc.donemKodu,
                kart: adresKart
            }
        });
        console.log('[b2b-adres] DIA adres ekle cevabı:', JSON.stringify({ code: upd?.code, key: upd?.key, msg: upd?.msg }));
        if (String(upd?.code) !== '200') {
            return res.status(502).json({ success: false, message: upd?.msg || 'Adres DIA cariye eklenemedi.' });
        }

        adresCache.delete(String(member.diaCustomerKey)); // önbelleği tazele

        // Yeni teslimat adresi yönetici paneline de düşsün: Mongo webaddresses'a
        // ayna kaydı yazılır (kaynak yine DIA; bu kayıt salt görüntüleme içindir).
        // Panelde ad ile gösterildiğinden il/ilçe/mahalle ID alanları için yer
        // tutucu yeterli; validasyon atlanır (b2b formunda mahalle ID yok).
        try {
            const WebAddress = require('../../../models/web/address/WebAddress');
            const adSoyadTam = (adSoyad && String(adSoyad).trim())
                || `${member.firstName || ''} ${member.lastName || ''}`.replace(/ \.$/, '').trim();
            const doc = new WebAddress({
                userId: member._id,
                addressName: (baslik && String(baslik).trim()) || 'Teslimat Adresi',
                addressDescription: String(adres).trim(),
                invoiceType: 'corporate',
                fullName: adSoyadTam,
                companyName: adSoyadTam,
                email: member.email || `${(member.diaCustomerCode || 'b2b').toLowerCase()}@eposta-tanimsiz.b2b`,
                phone: (telefon && String(telefon).trim()) || member.phone || '-',
                cityId: '-',
                cityName: (il || '').trim(),
                districtId: '-',
                districtName: (ilce || '').trim(),
                neighborhoodId: '-',
                neighborhoodName: '',
                addressNote: (adresDetay || '').trim(),
                isBilling: false,
                isShipping: true,
                isDefault: false
            });
            await doc.save({ validateBeforeSave: false });
        } catch (mongoErr) {
            console.error('[b2b-auth] Adres Mongo aynası yazılamadı:', mongoErr.message);
            // DIA yazımı başarılı; ayna hatası ana akışı bozmaz.
        }

        // Güncel listeyi döndür
        const after = await svc.sendRequest('/api/v3/scf/json', {
            scf_carikart_getir: {
                session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu,
                key: parseInt(member.diaCustomerKey)
            }
        });
        res.json({ success: true, data: mapDiaAddresses(after?.result?.m_adresler) });
    } catch (error) {
        console.error('[b2b-auth] Adres ekleme hatası:', error.message);
        res.status(500).json({ success: false, message: 'Adres eklenemedi.' });
    }
});

// Cari segment (özelkod2, ör. F4) önbelleği — ödeme iskontoları buna bağlı.
const segmentCache = new Map();
const SEGMENT_TTL_MS = 10 * 60 * 1000;

async function getCariSegment(site, diaCustomerKey) {
    const key = `${site}:${diaCustomerKey}`;
    const c = segmentCache.get(key);
    if (c && Date.now() - c.at < SEGMENT_TTL_MS) return c.segment;
    const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
    const svc = new DiaOrderService(site);
    await svc.init().catch(() => {});
    await svc.login();
    const r = await svc.sendRequest('/api/v3/scf/json', {
        scf_carikart_getir: {
            session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu,
            key: parseInt(diaCustomerKey)
        }
    });
    const oz2 = r?.result?._key_sis_ozelkod2;
    const segment = (oz2 && typeof oz2 === 'object' ? oz2.kod : r?.result?.ozelkod2kodu) || '';
    segmentCache.set(key, { at: Date.now(), segment });
    return segment;
}

/**
 * GET /odeme-yontemleri — oturumdaki carinin segmentine (özelkod2) göre b2b
 * ödeme yöntemleri + marka bazlı iskonto haritası (DIA kampanyalarından).
 */
router.get('/odeme-yontemleri', authMiddleware, async (req, res) => {
    try {
        const member = await WebMember.findOne({ _id: req.user._id, site: req.site })
            .select('diaCustomerKey').lean();
        if (!member?.diaCustomerKey) {
            return res.status(404).json({ success: false, message: 'Cari kaydınız bulunamadı.' });
        }
        const segment = await getCariSegment(req.site, member.diaCustomerKey);
        if (!segment) {
            return res.json({ success: true, data: { segment: '', methods: [], brandMap: {}, defaultDiscounts: {} } });
        }
        const { getB2bPaymentPricing } = require('../../../services/plugins/dia/diaCampaignPricing');
        const pricing = await getB2bPaymentPricing(req.site, segment);
        res.json({ success: true, data: pricing });
    } catch (error) {
        console.error('[b2b-auth] Ödeme yöntemleri hatası:', error.message);
        res.status(500).json({ success: false, message: 'Ödeme yöntemleri alınamadı.' });
    }
});

module.exports = router;
