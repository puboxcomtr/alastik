const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const WebSalesperson = require('../../../models/web/user/WebSalesperson');
const WebMember = require('../../../models/web/user/WebMember');
const salespersonAuth = require('../../../middleware/salespersonAuthMiddleware');
const { salespersonOrImpersonationAuth } = salespersonAuth;

const escapeRegex = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

router.post('/login', async (req, res) => {
    try {
        const { kullaniciKodu, password } = req.body || {};
        const kod = String(kullaniciKodu || '').trim();

        if (!kod || !password) {
            return res.status(400).json({ success: false, message: 'Kullanıcı adı ve şifre giriniz.' });
        }

        const sp = await WebSalesperson.findOne({
            site: req.site,
            diaUsername: new RegExp(`^${escapeRegex(kod)}$`, 'i')
        });

        if (!sp || !sp.password) {
            return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
        }

        const ok = await sp.comparePassword(password);
        if (!ok) {
            return res.status(401).json({ success: false, message: 'Kullanıcı adı veya şifre hatalı.' });
        }
        if (!sp.canLogin()) {
            return res.status(403).json({ success: false, code: 'NO_SALES_GROUP', message: 'Plasiyer grubunuz atanmadığı için giriş yapılamıyor. Lütfen yöneticinize başvurun.' });
        }

        const token = jwt.sign(
            { id: sp._id, type: 'salesperson' },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        sp.mustChangePassword = String(password) === '12345';
        sp.lastLoginAt = new Date();
        await sp.save();

        res.json({
            success: true,
            message: 'Giriş başarılı.',
            data: {
                token,
                mustChangePassword: sp.mustChangePassword,
                salesperson: { id: sp._id, kullaniciKodu: sp.diaUsername, name: sp.name || sp.diaUsername, salesGroup: sp.salesGroup }
            }
        });
    } catch (error) {
        console.error('[b2b-plasiyer] Giriş hatası:', error);
        res.status(500).json({ success: false, message: 'Giriş yapılırken bir hata oluştu.' });
    }
});

router.get('/me', salespersonAuth, async (req, res) => {
    const sp = req.salesperson;
    res.json({
        success: true,
        data: {
            id: sp._id, kullaniciKodu: sp.diaUsername, name: sp.name || sp.diaUsername,
            salesGroup: sp.salesGroup,
            mustChangePassword: sp.mustChangePassword === true
        }
    });
});

router.post('/sifre-degistir', salespersonAuth, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body || {};
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'Mevcut ve yeni parola zorunludur.' });
        }
        if (String(newPassword).length < 4) {
            return res.status(400).json({ success: false, message: 'Yeni parola en az 4 karakter olmalıdır.' });
        }
        if (String(newPassword) === '12345') {
            return res.status(400).json({ success: false, message: 'Yeni parola varsayılan parola olamaz.' });
        }
        const sp = req.salesperson;
        const ok = await sp.comparePassword(currentPassword);
        if (!ok) return res.status(400).json({ success: false, message: 'Mevcut parolanız hatalı.' });
        sp.password = String(newPassword);
        sp.plainPassword = String(newPassword);
        sp.mustChangePassword = false;
        await sp.save();
        return res.json({ success: true, message: 'Parolanız güncellendi.' });
    } catch (error) {
        console.error('[b2b-plasiyer] Parola değiştirme hatası:', error.message);
        return res.status(500).json({ success: false, message: 'Parola değiştirilemedi.' });
    }
});

router.get('/depo-stok', salespersonAuth, async (req, res) => {
    try {
        const { parseCodes, getDepotStocks } = require('../../../services/web/b2b/depotStock');
        res.json({ success: true, data: await getDepotStocks(req.site, parseCodes(req.query.codes)) });
    } catch (error) {
        console.error('[b2b-plasiyer] Depo stok hatası:', error.message);
        res.status(500).json({ success: false, message: 'Depo stoğu alınamadı.' });
    }
});

router.get('/xml-kaynak', salespersonOrImpersonationAuth, async (req, res) => {
    try {
        const { parseCodes } = require('../../../services/web/b2b/depotStock');
        const codes = parseCodes(req.query.codes);
        if (!codes.length) return res.json({ success: true, data: {} });
        const WebProduct = require('../../../models/web/catalog/WebProduct');
        const XmlProduct = require('../../../models/plugins/xml/XmlProduct');
        const WebXml = require('../../../models/plugins/xml/WebXml');
        const xmlSync = require('../../../services/plugins/xml/XmlWebProductSyncService');

        const products = await WebProduct.find({
            sites: req.site,
            'diaData.stokkartkodu': { $in: codes },
            'syncInfo.syncSource': 'xml_integration'
        }).select('_key diaData.stokkartkodu').lean();
        if (!products.length) return res.json({ success: true, data: {} });

        const keys = products.map(p => String(p._key));
        const [candidates, integrations] = await Promise.all([
            XmlProduct.find({ diaKey: { $in: keys } }).select('diaKey source rawData status').lean(),
            WebXml.find({}).lean()
        ]);
        const integrationMap = Object.fromEntries(integrations.map(i => [i.code, i]));
        const byKey = new Map();
        for (const c of candidates) {
            const k = String(c.diaKey);
            if (!byKey.has(k)) byKey.set(k, []);
            byKey.get(k).push(c);
        }

        const data = {};
        for (const p of products) {
            const list = byKey.get(String(p._key)) || [];
            if (!list.length) continue;
            const best = xmlSync.selectBestSource(list, integrationMap) || list[0];
            const intg = integrationMap[best.source];
            data[p.diaData.stokkartkodu] = String(intg?.name || '').trim() || best.source;
        }
        res.json({ success: true, data });
    } catch (error) {
        console.error('[b2b-plasiyer] XML kaynak hatası:', error.message);
        res.status(500).json({ success: false, message: 'XML kaynağı alınamadı.' });
    }
});

router.get('/cariler', salespersonAuth, async (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 30, 100);
        const match = { site: req.site, status: 'active' };

        const search = String(req.query.search || '').trim();
        if (search) {
            const rgx = new RegExp(escapeRegex(search), 'i');
            match.$or = [
                { firstName: rgx },
                { lastName: rgx },
                { email: rgx },
                { phone: rgx },
                { diaCustomerCode: rgx }
            ];
        }

        const total = await WebMember.countDocuments(match);
        const rows = await WebMember.find(match)
            .select('firstName lastName email phone diaCustomerCode diaCari.premium')
            .sort({ firstName: 1 })
            .limit(limit)
            .lean();

        const data = rows.map(m => ({
            id: m._id,
            name: `${m.firstName || ''} ${m.lastName || ''}`.replace(/ \.$/, '').trim(),
            cariKodu: m.diaCustomerCode || '',
            email: m.email || '',
            phone: m.phone || '',
            premium: m.diaCari?.premium === true
        }));

        res.json({ success: true, data, pagination: { limit, total } });
    } catch (error) {
        console.error('[b2b-plasiyer] Cari listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Cari listesi alınamadı.' });
    }
});

router.post('/bayi-giris', salespersonAuth, async (req, res) => {
    try {
        const { memberId } = req.body || {};
        if (!memberId) {
            return res.status(400).json({ success: false, message: 'Bayi seçiniz.' });
        }

        const member = await WebMember.findOne({ _id: memberId, site: req.site, status: 'active' });
        if (!member) {
            return res.status(404).json({ success: false, message: 'Bayi bulunamadı veya aktif değil.' });
        }

        const sp = req.salesperson;
        const token = jwt.sign(
            {
                id: member._id,
                email: member.email,
                type: 'member',
                impersonatedBy: String(sp._id),
                impersonatedByName: sp.name || sp.diaUsername
            },
            process.env.JWT_SECRET,
            { expiresIn: '1d' }
        );

        res.json({
            success: true,
            message: 'Bayi adına giriş yapıldı.',
            data: {
                token,
                member: {
                    id: member._id,
                    name: `${member.firstName || ''} ${member.lastName || ''}`.replace(/ \.$/, '').trim(),
                    cariKodu: member.diaCustomerCode || ''
                },
                salesperson: { id: sp._id, name: sp.name || sp.diaUsername }
            }
        });
    } catch (error) {
        console.error('[b2b-plasiyer] Bayi adına giriş hatası:', error);
        res.status(500).json({ success: false, message: 'Bayi adına giriş yapılırken hata oluştu.' });
    }
});

module.exports = router;
