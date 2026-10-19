const router = require('express').Router();
const WebRedirect = require('../../../models/web/other/WebRedirect');
const { clearRedirectCache } = require('../../web/other/redirects');

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 50, 500);
        const query = { site: req.site };

        if (req.query.search && req.query.search.trim()) {
            const regex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            query.$or = [{ source: regex }, { target: regex }];
        }

        const [items, total] = await Promise.all([
            WebRedirect.find(query).sort({ updatedAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            WebRedirect.countDocuments(query)
        ]);

        res.json({ success: true, data: items, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Yönlendirmeler yüklenemedi', error: err.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const source = WebRedirect.normalizeSource(req.body.source);
        const target = String(req.body.target || '').trim();

        if (!source || source === '/' || !target) {
            return res.status(400).json({ success: false, message: 'Kaynak ve hedef URL zorunludur (kaynak kök dizin olamaz)' });
        }

        const doc = await WebRedirect.create({
            site: req.site,
            source,
            target,
            statusCode: req.body.statusCode === 302 ? 302 : 301,
            isActive: req.body.isActive !== false,
            note: req.body.note || ''
        });

        clearRedirectCache(req.site);
        res.json({ success: true, data: doc, message: 'Yönlendirme eklendi' });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'Bu kaynak URL için zaten bir yönlendirme var' });
        }
        res.status(500).json({ success: false, message: 'Yönlendirme eklenemedi', error: err.message });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const update = {};
        if (req.body.source !== undefined) update.source = WebRedirect.normalizeSource(req.body.source);
        if (req.body.target !== undefined) update.target = String(req.body.target).trim();
        if (req.body.statusCode !== undefined) update.statusCode = req.body.statusCode === 302 ? 302 : 301;
        if (req.body.isActive !== undefined) update.isActive = !!req.body.isActive;
        if (req.body.note !== undefined) update.note = req.body.note;

        const doc = await WebRedirect.findOneAndUpdate(
            { _id: req.params.id, site: req.site },
            { $set: update },
            { new: true }
        );
        if (!doc) return res.status(404).json({ success: false, message: 'Yönlendirme bulunamadı' });

        clearRedirectCache(req.site);
        res.json({ success: true, data: doc, message: 'Yönlendirme güncellendi' });
    } catch (err) {
        if (err.code === 11000) {
            return res.status(409).json({ success: false, message: 'Bu kaynak URL için zaten bir yönlendirme var' });
        }
        res.status(500).json({ success: false, message: 'Yönlendirme güncellenemedi', error: err.message });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const doc = await WebRedirect.findOneAndDelete({ _id: req.params.id, site: req.site });
        if (!doc) return res.status(404).json({ success: false, message: 'Yönlendirme bulunamadı' });

        clearRedirectCache(req.site);
        res.json({ success: true, message: 'Yönlendirme silindi' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Yönlendirme silinemedi', error: err.message });
    }
});

router.post('/import', async (req, res) => {
    try {
        const items = Array.isArray(req.body.items) ? req.body.items : [];
        if (!items.length) return res.status(400).json({ success: false, message: 'İçe aktarılacak kayıt bulunamadı' });

        let ok = 0, skipped = 0;
        for (const item of items) {
            const source = WebRedirect.normalizeSource(item.source);
            const target = String(item.target || '').trim();
            if (!source || source === '/' || !target) { skipped++; continue; }
            await WebRedirect.updateOne(
                { site: req.site, source },
                { $set: { target, statusCode: 301, isActive: true }, $setOnInsert: { note: item.note || 'toplu içe aktarım' } },
                { upsert: true }
            );
            ok++;
        }

        clearRedirectCache(req.site);
        res.json({ success: true, message: `${ok} yönlendirme içe aktarıldı${skipped ? `, ${skipped} satır atlandı` : ''}` });
    } catch (err) {
        res.status(500).json({ success: false, message: 'İçe aktarım başarısız', error: err.message });
    }
});

module.exports = router;
