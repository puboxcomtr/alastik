const router = require('express').Router();
const mongoose = require('mongoose');
const WebSalesperson = require('../../../models/web/user/WebSalesperson');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
// Şifre alanları listede dönmez; düz şifre yalnız özel /:id/password ucundan alınır
const HIDDEN_FIELDS = '-password -plainPassword';

/**
 * GET / — plasiyer listesi (arama + durum filtresi + sayfalama).
 * Şifre alanı asla dönmez; hasPassword bayrağı ayrıca hesaplanır.
 */
router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const match = { site: req.site };

        if (req.query.search && req.query.search.trim()) {
            const regex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            match.$or = [
                { name: regex },
                { diaUsername: regex },
                { email: regex },
                { phone: regex },
                { diaGroups: regex }
            ];
        }

        const total = await WebSalesperson.countDocuments(match);
        const docs = await WebSalesperson.find(match)
            .select(HIDDEN_FIELDS)
            .sort({ name: 1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        // hasPassword: şifre atanmış mı (değerini sızdırmadan)
        const withFlag = await WebSalesperson.find(match, { password: 1 }).lean();
        const passMap = new Map(withFlag.map(d => [String(d._id), !!d.password]));

        const data = docs.map(d => ({ ...d, hasPassword: passMap.get(String(d._id)) || false }));

        res.json({ success: true, data, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
    } catch (error) {
        console.error('Plasiyer listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Plasiyer listesi alınamadı' });
    }
});

/**
 * POST /sync-dia — DIA sistem kullanıcılarını (sis_kullanici) plasiyer adayı olarak
 * senkronlar. Aktif (durum=A) kullanıcılar { site, diaUserKey } anahtarıyla upsert
 * edilir; şifre ve status'e DOKUNULMAZ (yeniler 'pending' başlar, admin aktive eder).
 */
router.post('/sync-dia', async (req, res) => {
    try {
        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        const WebDia = require('../../../models/plugins/dia/DiaSettings');

        const settings = await WebDia.getSettings(req.site);
        if (!settings?.baseURL || !settings?.username) {
            return res.status(400).json({ success: false, message: 'Bu site için DIA bağlantı ayarları eksik' });
        }

        const svc = new DiaOrderService(req.site);
        svc.settings = settings;
        svc.firmaKodu = settings.firmaKodu || 1;
        svc.donemKodu = settings.donemKodu || 1;
        await svc.login();

        const cols = ['_key', 'gercekadi', 'kullaniciadi', 'uye_oldugu_gruplar', 'eposta', 'ceptel', 'durum', 'unvan'];

        // Personel olmayan sistem/entegrasyon kullanıcıları plasiyer listesine ALINMAZ.
        // Önek kuralı (kendini yenileyen): yeni ws_/mobil/sevkiyat... hesapları da otomatik elenir.
        const EXCLUDED_PREFIXES = ['ws_', 'ws-', 'mobil', 'sevkiyat', 'arge', 'maslak-ekran', 'toptan-ekran', 'servis', 'user'];
        const EXCLUDED_EXACT = ['siparis_yonetimi', 'ikinciel', 'devir', 'ferhatm'];
        const isServiceUser = (kullaniciadi) => {
            const k = String(kullaniciadi || '').trim().toLowerCase();
            if (!k) return true;
            if (EXCLUDED_EXACT.includes(k)) return true;
            return EXCLUDED_PREFIXES.some(p => k.startsWith(p));
        };

        const fetchPage = async (offset) => {
            for (let attempt = 0; attempt < 3; attempt++) {
                const resp = await svc.sendRequest('/api/v3/sis/json', {
                    sis_kullanici_listele: {
                        session_id: svc.sessionId,
                        firma_kodu: svc.firmaKodu,
                        donem_kodu: svc.donemKodu,
                        filters: [{ field: 'durum', operator: '=', value: 'A' }],
                        sorts: '',
                        params: { selectedcolumns: cols },
                        limit: 500,
                        offset
                    }
                });
                if (Array.isArray(resp?.result)) return resp.result;
                svc.sessionId = null;
                await svc.login();
            }
            return null;
        };

        const kullanicilar = [];
        const diaActiveKeys = new Set(); // DIA'da aktif olan TÜM kullanıcı _key'leri (prune için)
        let taranan = 0;
        for (let offset = 0; offset < 20000; offset += 500) {
            const rows = await fetchPage(offset);
            if (rows === null) {
                return res.status(502).json({ success: false, message: 'DIA kullanıcı listesi alınamadı, lütfen tekrar deneyin' });
            }
            taranan += rows.length;
            for (const r of rows) {
                if (r.durum !== 'A') continue;
                diaActiveKeys.add(String(r._key));
                if (isServiceUser(r.kullaniciadi)) continue;
                kullanicilar.push(r);
            }
            if (rows.length < 500) break;
        }

        const now = new Date();
        const ops = kullanicilar.map(u => ({
            updateOne: {
                filter: { site: req.site, diaUserKey: String(u._key) },
                update: {
                    $set: {
                        diaUsername: String(u.kullaniciadi || '').trim(),
                        name: String(u.gercekadi || '').trim() || String(u.kullaniciadi || '').trim(),
                        email: String(u.eposta || '').trim().toLowerCase(),
                        phone: String(u.ceptel || '').trim(),
                        diaGroups: String(u.uye_oldugu_gruplar || '').trim(),
                        diaTitle: String(u.unvan || '').trim(),
                        diaStatus: String(u.durum || '').trim(),
                        diaSyncedAt: now,
                        updatedAt: now
                    },
                    $setOnInsert: {
                        site: req.site,
                        diaUserKey: String(u._key),
                        createdAt: now
                    }
                },
                upsert: true
            }
        }));

        let yeni = 0, guncellenen = 0, hata = 0;
        const collName = WebSalesperson.collection.name;
        const db = mongoose.connection.db;
        for (let i = 0; i < ops.length; i += 500) {
            try {
                const r = await db.collection(collName).bulkWrite(ops.slice(i, i + 500), { ordered: false });
                yeni += r.upsertedCount; guncellenen += r.modifiedCount;
            } catch (e) {
                const r = e.result || {};
                yeni += r.upsertedCount || 0; guncellenen += r.modifiedCount || 0;
                hata += (e.writeErrors || []).length;
            }
        }

        // DIA'da artık aktif olmayan (silinmiş/pasifleşmiş) plasiyerler buradan da silinir.
        // GÜVENLİK: DIA boş yanıt döndüyse (0 aktif kullanıcı) tümünü silmemek için prune atlanır.
        let silinen = 0;
        if (diaActiveKeys.size > 0) {
            const r = await WebSalesperson.deleteMany({ site: req.site, diaUserKey: { $nin: [...diaActiveKeys] } });
            silinen = r.deletedCount || 0;
        }

        res.json({
            success: true,
            message: `Plasiyer senkronu tamamlandı: ${yeni} yeni, ${guncellenen} güncellendi${silinen ? `, ${silinen} silindi` : ''}${hata ? `, ${hata} hata` : ''}`,
            data: { taranan, eslesen: kullanicilar.length, yeni, guncellenen, silinen, hata }
        });
    } catch (error) {
        console.error('Plasiyer senkron hatası:', error);
        res.status(500).json({ success: false, message: `Plasiyer senkronu başarısız: ${error.message}` });
    }
});

/**
 * PUT /:id — plasiyer şifresini belirler/değiştirir (admin). Şifresi olan giriş yapabilir.
 */
router.put('/:id', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz plasiyer kimliği' });
        }
        const sp = await WebSalesperson.findOne({ _id: req.params.id, site: req.site });
        if (!sp) {
            return res.status(404).json({ success: false, message: 'Plasiyer bulunamadı' });
        }

        const { password } = req.body || {};

        if (typeof password !== 'string' || !password.trim()) {
            return res.status(400).json({ success: false, message: 'Şifre giriniz' });
        }
        if (password.trim().length < 6) {
            return res.status(400).json({ success: false, message: 'Şifre en az 6 karakter olmalıdır' });
        }
        sp.password = password.trim();
        sp.plainPassword = password.trim(); // admin sonradan görebilsin

        await sp.save();
        const out = sp.toObject();
        delete out.password;
        delete out.plainPassword;
        res.json({ success: true, message: 'Plasiyer şifresi güncellendi', data: { ...out, hasPassword: !!sp.password } });
    } catch (error) {
        console.error('Plasiyer güncelleme hatası:', error);
        res.status(500).json({ success: false, message: 'Plasiyer güncellenemedi' });
    }
});

/**
 * GET /:id/password — plasiyerin geri-okunur şifresi (admin sonradan görsün).
 * Yalnız admin-gated bu uçtan döner; liste/diğer uçlarda asla yer almaz.
 */
router.get('/:id/password', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) {
            return res.status(400).json({ success: false, message: 'Geçersiz plasiyer kimliği' });
        }
        const sp = await WebSalesperson.findOne({ _id: req.params.id, site: req.site }).select('plainPassword').lean();
        if (!sp) {
            return res.status(404).json({ success: false, message: 'Plasiyer bulunamadı' });
        }
        res.json({ success: true, data: { password: sp.plainPassword || '' } });
    } catch (error) {
        console.error('Plasiyer şifre okuma hatası:', error);
        res.status(500).json({ success: false, message: 'Şifre alınamadı' });
    }
});

module.exports = router;
