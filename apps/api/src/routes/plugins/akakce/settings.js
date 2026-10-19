const express = require('express');
const router = express.Router();
const multer = require('multer');
const XLSX = require('xlsx');
const WebAkakceSettings = require('../../../models/plugins/akakce/WebAkakceSettings');

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }
});

router.get('/', async (req, res) => {
    try {
        let settings = await WebAkakceSettings.findOne({ site: req.site });
        if (!settings) {
            settings = await WebAkakceSettings.create({ site: req.site });
        }
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.put('/', async (req, res) => {
    try {
        const { _id, createdAt, updatedAt, __v, lastGenerated, productCount, site, ...payload } = req.body || {};

        let settings = await WebAkakceSettings.findOne({ site: req.site });
        if (!settings) {
            settings = await WebAkakceSettings.create({ ...payload, site: req.site });
        } else {
            settings.set(payload);
            await settings.save();
        }
        res.json({ success: true, data: settings });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.post('/import-products', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Dosya yüklenmedi' });
        }

        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        if (!sheet) {
            return res.status(400).json({ success: false, message: 'Excel dosyasında sayfa bulunamadı' });
        }

        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
        const cells = [];
        rows.forEach((row, r) => {
            (row || []).forEach((cell, c) => {
                const value = String(cell ?? '').trim();
                if (value && value.length <= 300) cells.push({ value, row: r, col: c });
            });
        });

        if (!cells.length) {
            return res.status(400).json({ success: false, message: 'Dosyada okunabilir veri bulunamadı' });
        }

        const candidates = [...new Set(cells.filter(c => c.value.length <= 64).flatMap(c => [c.value, c.value.toUpperCase()]))];
        const db = require('mongoose').connection.db;
        const docs = await db.collection('webproducts')
            .find(
                { 'diaData.stokkartkodu': { $in: candidates } },
                { projection: { 'diaData.stokkartkodu': 1, 'diaData.aciklama': 1, 'customData.seoTitle': 1 } }
            )
            .toArray();

        const byUpperCode = new Map();
        docs.forEach(d => {
            const code = d.diaData?.stokkartkodu;
            if (code) byUpperCode.set(String(code).toUpperCase(), d);
        });

        const matchCountByCol = new Map();
        cells.forEach(c => {
            if (byUpperCode.has(c.value.toUpperCase())) {
                matchCountByCol.set(c.col, (matchCountByCol.get(c.col) || 0) + 1);
            }
        });

        if (!matchCountByCol.size) {
            return res.json({
                success: true,
                data: { matched: [], notFound: [], totalCodes: 0, message: 'Dosyadaki hiçbir değer stok kodlarıyla eşleşmedi' }
            });
        }

        const bestCol = [...matchCountByCol.entries()].sort((a, b) => b[1] - a[1])[0][0];
        const colCells = cells.filter(c => c.col === bestCol);

        const nameByRow = new Map();
        cells.forEach(c => {
            if (c.col === bestCol + 1) nameByRow.set(c.row, c.value);
        });
        const matchedRows = colCells.filter(c => byUpperCode.has(c.value.toUpperCase()));
        const nameColUsable = matchedRows.length > 0 &&
            matchedRows.filter(c => nameByRow.has(c.row)).length >= matchedRows.length * 0.5;

        const matched = [];
        const notFound = [];
        const seen = new Set();
        colCells.forEach(c => {
            const key = c.value.toUpperCase();
            if (seen.has(key)) return;
            seen.add(key);
            const doc = byUpperCode.get(key);
            if (doc) {
                matched.push({
                    id: String(doc.diaData.stokkartkodu),
                    name: doc.diaData?.aciklama || doc.customData?.seoTitle || String(doc.diaData.stokkartkodu),
                    xmlName: nameColUsable ? (nameByRow.get(c.row) || '') : ''
                });
            } else if (c.row > 0) {
                notFound.push(c.value);
            }
        });

        res.json({ success: true, data: { matched, notFound, totalCodes: matched.length + notFound.length } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/price-fields', async (req, res) => {
    try {
        const db = require('mongoose').connection.db;
        const product = await db.collection('webproducts').findOne(
            { 'diaData.m_birimler': { $exists: true } },
            { projection: { 'diaData.m_birimler': 1 } }
        );

        if (!product || !product.diaData?.m_birimler?.length) {
            return res.json({ success: true, data: [] });
        }

        const birim = product.diaData.m_birimler[0];
        const fields = Object.keys(birim)
            .filter(k => k.startsWith('fiyat'))
            .map(k => ({ key: k, value: birim[k] }));

        res.json({ success: true, data: fields });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

router.get('/text-fields', async (req, res) => {
    try {
        const db = require('mongoose').connection.db;
        const product = await db.collection('webproducts').findOne(
            {
                'customData.customDescription': { $exists: true, $ne: null },
                'diaData.aciklama': { $exists: true }
            },
            { projection: { 'diaData': 1, 'customData': 1 } }
        );

        if (!product) return res.json({ success: true, data: { diaFields: [], customFields: [] } });

        const excludedDiaFields = ['synced', 'durum', 'barkodu', 'menseiulkeadi', 'stokkartkodu', 'marka', 'anabarkod'];
        const diaFields = Object.entries(product.diaData)
            .filter(([k, v]) => typeof v === 'string' && v.length > 0 && !k.startsWith('_') && !excludedDiaFields.includes(k))
            .map(([k, v]) => ({ key: `diaData.${k}`, preview: String(v).substring(0, 60) }));

        const excludedCustomFields = ['seoUrl', 'webCategory', 'webSubCategory', 'discountType', 'delivery', 'seoTitle', 'seoDescription', 'featuredImage', 'shortDescription'];
        const customFields = Object.entries(product.customData)
            .filter(([k, v]) => typeof v === 'string' && v.length > 0 && !excludedCustomFields.includes(k))
            .map(([k, v]) => ({ key: `customData.${k}`, preview: String(v).replace(/<[^>]*>/g, '').trim().substring(0, 60) || k }));

        res.json({ success: true, data: { diaFields, customFields } });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
