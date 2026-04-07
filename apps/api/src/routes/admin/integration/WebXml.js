/**
 * WebXml API Routes
 * Dosya: apps/api/src/routes/admin/webxml.js
 */

const express = require('express');
const router = express.Router();
const WebXml = require('../../../models/plugins/xml/WebXml');
const XmlProduct = require('../../../models/plugins/xml/XmlProduct');
const XLSX = require('xlsx');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

/**
 * GET /api/admin/webxml
 * Tüm XML entegrasyonlarını listele
 */
router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 20,
            search = '',
            isActive
        } = req.query;

        const query = {};

        // Arama filtresi
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        // Aktif/Pasif filtresi
        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            WebXml.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            WebXml.countDocuments(query)
        ]);

        // Response formatla
        const formattedItems = items.map(item => ({
            id: item._id,
            name: item.name,
            code: item.code,
            description: item.description,
            apiUrl: item.apiUrl,
            format: item.format,
            isActive: item.isActive,
            syncInterval: item.syncInterval,
            dataPath: item.dataPath,
            lastSyncAt: item.syncInfo?.lastSyncAt || null,
            lastSyncStatus: item.syncInfo?.lastSyncStatus || null,
            lastSyncType: item.syncInfo?.lastSyncType || null,
            lastSyncMessage: item.syncInfo?.lastSyncMessage || '',
            productCount: item.syncInfo?.productCount || 0,
            createdAt: item.createdAt,
            updatedAt: item.updatedAt
        }));

        res.json({
            success: true,
            data: formattedItems,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });

    } catch (error) {
        console.error('WebXml list error:', error);
        res.status(500).json({
            success: false,
            message: 'Entegrasyonlar listelenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/integration/xml
 * Yeni entegrasyon ekle
 */
router.post('/', async (req, res) => {
    try {
        const { name, format, apiUrl, isActive, credentials, syncInterval } = req.body;

        if (!name?.trim()) {
            return res.status(400).json({ success: false, message: 'Kaynak adı zorunludur' });
        }

        if (!apiUrl?.trim() || !apiUrl.startsWith('http')) {
            return res.status(400).json({ success: false, message: 'Geçerli bir URL giriniz' });
        }

        // name'den otomatik slug üret
        const code = name
            .toLowerCase()
            .replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's')
            .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ç/g, 'c')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');

        const existing = await WebXml.findOne({ code });
        if (existing) {
            return res.status(400).json({ success: false, message: `"${code}" kodu zaten kullanımda` });
        }

        const item = await WebXml.create({
            name: name.trim(),
            code,
            format: format || 'xml',
            apiUrl: apiUrl.trim(),
            isActive: isActive ?? false,
            credentials: credentials || {},
            syncInterval: syncInterval || 180
        });

        res.status(201).json({
            success: true,
            message: 'Entegrasyon eklendi',
            data: {
                id: item._id,
                name: item.name,
                code: item.code,
                format: item.format,
                isActive: item.isActive
            }
        });

    } catch (error) {
        console.error('WebXml create error:', error);
        res.status(500).json({ success: false, message: 'Entegrasyon eklenirken hata oluştu', error: error.message });
    }
});

// ============================================
// GET /api/admin/integration/xml/products/export
// Tüm XML ürünlerini Excel'e aktar
// ============================================
// ============================================
// GET /api/admin/integration/xml/products/export
// Tüm XML ürünlerini Excel'e aktar (kurallara göre filtreli)
// ============================================
router.get('/products/export', async (req, res) => {
    try {
        const { source = '' } = req.query;

        const integrations = await WebXml.find({}, { code: 1, name: 1, rules: 1 }).lean();
        const intgMap = {};
        for (const i of integrations) intgMap[i.code] = i;

        const getNestedValue = (obj, path) => {
            if (!path) return '';
            return path.split('.').reduce((acc, key) => acc?.[key] ?? '', obj);
        };

        const isFiltered = (item, intg) => {
            const rules = intg?.rules || {};
            const fieldMappings = rules.fieldMappings || [];
            const get = (target) => fieldMappings.find(m => m.target === target)?.source;
            const rd = item.rawData || {};

            const stok = parseFloat(getNestedValue(rd, get('stokAdeti')) || 0);
            const gorsel = getNestedValue(rd, get('gorselUrl'));
            const fiyat = parseFloat(getNestedValue(rd, get('hamFiyat')) || 0);
            const marka = getNestedValue(rd, get('marka'));
            const kategori = getNestedValue(rd, get('kategori'));
            const yil = String(getNestedValue(rd, get('uretimYili')) || '');

            if (rules.minStock > 0 && stok < rules.minStock) return true;
            if (rules.filters?.onlyInStock && stok <= 0) return true;
            if (rules.filters?.onlyWithImage && !gorsel) return true;
            if (rules.filters?.onlyWithPrice && !fiyat) return true;
            if (rules.excludedBrands?.length > 0 && marka && rules.excludedBrands.includes(marka)) return true;
            if (rules.excludedCategories?.length > 0 && kategori && rules.excludedCategories.includes(kategori)) return true;
            if (rules.excludedYears?.length > 0 && yil && rules.excludedYears.includes(yil)) return true;

            return false;
        };

        const query = {};
        if (source) query.source = source;

        const items = await XmlProduct.find(query, {
            source: 1,
            sourceProductId: 1,
            rawData: 1,
            status: 1
        }).lean();

        const rows = [];
        for (const item of items) {
            const intg = intgMap[item.source];
            if (isFiltered(item, intg)) continue;

            const fieldMappings = intg?.rules?.fieldMappings || [];
            const get = (target) => fieldMappings.find(m => m.target === target)?.source;
            const rd = item.rawData || {};

            rows.push({
                'Stok Kodu': getNestedValue(rd, get('stokKodu')) || item.sourceProductId,
                'Ürün Adı': getNestedValue(rd, get('urunAdi')),
                'Marka': getNestedValue(rd, get('marka')),
                'Kategori': getNestedValue(rd, get('kategori')),
                'Fiyat': getNestedValue(rd, get('hamFiyat')),
                'Stok': getNestedValue(rd, get('stokAdeti')) || '0',
                'Yıl': getNestedValue(rd, get('uretimYili')),
                'Kaynak': intg?.name || item.source
            });
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 20 }, { wch: 20 }, { wch: 50 }, { wch: 20 }, { wch: 20 },
            { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 15 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Urunler');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="xml-urunler.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============================================
// POST /api/admin/webxml/scheduler/run
// Scheduler'ı manuel tetikle
// ============================================
router.post('/scheduler/run', async (req, res) => {
    try {
        const xmlSyncScheduler = require('../../../services/plugins/xml/XmlSyncScheduler');

        if (xmlSyncScheduler.isRunning) {
            return res.json({ success: false, message: 'Scheduler zaten çalışıyor, bekleyin...' });
        }

        xmlSyncScheduler.checkAndSync();

        res.json({
            success: true,
            message: 'Scheduler tetiklendi, arka planda çalışıyor. Loglardan takip edebilirsiniz.'
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET /api/admin/integration/xml/mapping/export
// Excel dışarı aktar
// ============================================
router.get('/mapping/export', async (req, res) => {
    try {
        const { source = '' } = req.query;

        const query = {};
        if (source) query.source = source;

        const items = await XmlProduct.find(query, {
            source: 1,
            sourceProductId: 1,
            rawData: 1,
            'mappedData.hedefStokKodu': 1
        }).lean();

        const integrations = await WebXml.find({}, { code: 1, rules: 1 }).lean();
        const intgMap = {};
        for (const i of integrations) intgMap[i.code] = i;

        const getNestedValue = (obj, path) => {
            if (!path) return '';
            return path.split('.').reduce((acc, key) => acc?.[key] ?? '', obj);
        };

        const rows = items.map(item => {
            const intg = intgMap[item.source];
            const fieldMappings = intg?.rules?.fieldMappings || [];
            const stokKoduField = fieldMappings.find(m => m.target === 'stokKodu')?.source;
            const stokKodu = getNestedValue(item.rawData, stokKoduField) || item.sourceProductId;

            return {
                'XML Stok Kodu': stokKodu,
                'Hedef Stok Kodu': item.mappedData?.hedefStokKodu || '',
                'Kaynak': item.source
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [{ wch: 30 }, { wch: 30 }, { wch: 20 }];
        XLSX.utils.book_append_sheet(wb, ws, 'Eslesme');

        const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', 'attachment; filename="xml-eslesme.xlsx"');
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// POST /api/admin/integration/xml/mapping/import
// Excel içeri aktar
// ============================================
router.post('/mapping/import', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Dosya bulunamadı' });
        }

        const wb = XLSX.read(req.file.buffer, { type: 'buffer' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws);

        if (!rows.length) {
            return res.status(400).json({ success: false, message: 'Excel boş' });
        }

        const integrations = await WebXml.find({}, { code: 1, rules: 1 }).lean();
        const intgMap = {};
        for (const i of integrations) intgMap[i.code] = i;

        const getNestedValue = (obj, path) => {
            if (!path) return '';
            return path.split('.').reduce((acc, key) => acc?.[key] ?? '', obj);
        };

        let guncellenen = 0, atilan = 0;

        for (const row of rows) {
            const xmlStokKodu = String(row['XML Stok Kodu'] || '').trim();
            const hedefStokKodu = String(row['Hedef Stok Kodu'] || '').trim();
            const kaynak = String(row['Kaynak'] || '').trim();

            if (!xmlStokKodu || !hedefStokKodu) { atilan++; continue; }

            const query = {};
            if (kaynak) query.source = kaynak;

            // Önce sourceProductId ile dene
            const byId = await XmlProduct.findOne({ ...query, sourceProductId: xmlStokKodu });
            if (byId) {
                await XmlProduct.updateOne(
                    { _id: byId._id },
                    { $set: { mappedData: { hedefStokKodu: hedefStokKodu }, status: 'mapped', lastMappedAt: new Date() } }
                );
                guncellenen++;
                continue;
            }

            // rawData içindeki stokKodu alanından bul
            const intg = kaynak ? intgMap[kaynak] : null;
            if (intg) {
                const fieldMappings = intg.rules?.fieldMappings || [];
                const stokKoduField = fieldMappings.find(m => m.target === 'stokKodu')?.source;
                if (stokKoduField) {
                    const byRaw = await XmlProduct.findOne({
                        source: kaynak,
                        [`rawData.${stokKoduField}`]: xmlStokKodu
                    });
                    if (byRaw) {
                        await XmlProduct.updateOne(
                            { _id: byRaw._id },
                            { $set: { mappedData: { hedefStokKodu: hedefStokKodu }, status: 'mapped', lastMappedAt: new Date() } }
                        );
                        guncellenen++;
                        continue;
                    }
                }
            }

            atilan++;
        }

        res.json({
            success: true,
            message: `${guncellenen} ürün güncellendi, ${atilan} satır atlandı`,
            data: { guncellenen, atilan }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET /api/admin/integration/xml/all-products
// Tüm kaynaklardan filtreli ürün listesi
// ============================================
router.get('/all-products', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = '',
            source = '',
            brand = '',
            status = ''
        } = req.query;

        // Tüm aktif entegrasyonları çek
        const integrations = await WebXml.find({ isActive: true }).lean();
        const integrationMap = {};
        for (const intg of integrations) {
            integrationMap[intg.code] = intg;
        }

        const query = {};
        if (source) query.source = source;
        if (status === 'eslesti') query['mappedData.hedefStokKodu'] = { $ne: null, $exists: true, $gt: '' };
        else if (status === 'eslestirilmedi') query.$or = [
            { mappedData: null },
            { 'mappedData.hedefStokKodu': null },
            { 'mappedData.hedefStokKodu': '' }
        ];

        if (search) {
            query.$or = [
                { sourceProductId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total] = await Promise.all([
            XmlProduct.find(query).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
            XmlProduct.countDocuments(query)
        ]);

        const getNestedValue = (obj, path) => {
            if (!path) return '';
            return path.split('.').reduce((acc, key) => {
                if (acc === null || acc === undefined) return '';
                return acc[key] ?? '';
            }, obj);
        };

        const getSourceField = (fieldMappings, target) => {
            const m = fieldMappings.find(m => m.target === target);
            return m ? m.source : null;
        };

        const formatted = items.map(item => {
            const intg = integrationMap[item.source];
            const fieldMappings = intg?.rules?.fieldMappings || [];
            const rd = item.rawData || {};

            const stokKoduField = getSourceField(fieldMappings, 'stokKodu');
            const urunAdiField = getSourceField(fieldMappings, 'urunAdi');
            const markaField = getSourceField(fieldMappings, 'marka');
            const kategoriField = getSourceField(fieldMappings, 'kategori');
            const hamFiyatField = getSourceField(fieldMappings, 'hamFiyat');
            const stokAdetiField = getSourceField(fieldMappings, 'stokAdeti');
            const yilField = getSourceField(fieldMappings, 'uretimYili');

            const stokKodu = getNestedValue(rd, stokKoduField);
            const hedefStokKodu = item.mappedData?.hedefStokKodu || null;

            return {
                id: item._id,
                source: item.source,
                sourceName: intg?.name || item.source,
                sourceProductId: item.sourceProductId,
                stokKodu,
                hedefStokKodu,
                urunAdi: getNestedValue(rd, urunAdiField),
                marka: getNestedValue(rd, markaField),
                kategori: getNestedValue(rd, kategoriField),
                hamFiyat: getNestedValue(rd, hamFiyatField),
                stokAdeti: getNestedValue(rd, stokAdetiField) || '0',
                uretimYili: getNestedValue(rd, yilField),
                eslesmeDurumu: hedefStokKodu ? 'eslesti' : 'eslestirilmedi'
            };
        });

        // Kaynak listesi
        const sources = integrations.map(i => ({ code: i.code, name: i.name }));

        res.json({
            success: true,
            data: formatted,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
                sources
            }
        });

    } catch (error) {
        console.error('All products hatası:', error);
        res.status(500).json({ success: false, message: 'Ürünler listelenirken hata oluştu', error: error.message });
    }
});

// ============================================
// GET /api/admin/integration/xml/products
// XML ürün listesi (source bazlı)
// ============================================
router.get('/products', async (req, res) => {
    try {
        const {
            source,
            page = 1,
            limit = 100,
            search = '',
            status = '',
            brand = '',
            year = ''
        } = req.query;

        if (!source) {
            return res.status(400).json({ success: false, message: 'source parametresi gerekli' });
        }

        const webXml = await WebXml.findOne({ code: source }).lean();
        const fieldMappings = webXml?.rules?.fieldMappings || [];

        const getSourceField = (target) => {
            const m = fieldMappings.find(m => m.target === target);
            return m ? m.source : null;
        };

        const getNestedValue = (obj, path) => {
            if (!path) return '';
            return path.split('.').reduce((acc, key) => {
                if (acc === null || acc === undefined) return '';
                return acc[key] ?? '';
            }, obj);
        };

        const brandField = getSourceField('marka');
        const yearField = getSourceField('uretimYili');
        const categoryField = getSourceField('kategori');
        const stokKoduField = getSourceField('stokKodu');
        const urunAdiField = getSourceField('urunAdi');
        const hamFiyatField = getSourceField('hamFiyat');
        const stokAdetiField = getSourceField('stokAdeti');
        const gorselField = getSourceField('gorselUrl');

        const query = { source };
        if (status) query.status = status;

        if (brand && brandField) query[`rawData.${brandField}`] = brand;
        if (year && yearField) query[`rawData.${yearField}`] = year;

        // Kuralları uygula
        const rules = webXml?.rules || {};

        if (rules.minStock > 0 && stokAdetiField) {
            query[`rawData.${stokAdetiField}`] = { $gte: String(rules.minStock) };
        }
        if (rules.filters?.onlyInStock && stokAdetiField) {
            query[`rawData.${stokAdetiField}`] = { $gt: '0', $exists: true };
        }
        if (rules.filters?.onlyWithImage && gorselField) {
            query[`rawData.${gorselField}`] = { $ne: '', $exists: true };
        }
        if (rules.filters?.onlyWithPrice && hamFiyatField) {
            query[`rawData.${hamFiyatField}`] = { $ne: '', $ne: '0', $exists: true };
        }
        if (rules.excludedBrands?.length > 0 && brandField) {
            query[`rawData.${brandField}`] = { $nin: rules.excludedBrands };
        }
        if (rules.excludedCategories?.length > 0 && categoryField) {
            query[`rawData.${categoryField}`] = { $nin: rules.excludedCategories };
        }
        if (rules.excludedYears?.length > 0 && yearField) {
            query[`rawData.${yearField}`] = { $nin: rules.excludedYears };
        }

        if (search) {
            const searchFields = [stokKoduField, urunAdiField, brandField].filter(Boolean);
            if (searchFields.length > 0) {
                query.$or = searchFields.map(f => ({
                    [`rawData.${f}`]: { $regex: search, $options: 'i' }
                }));
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const [items, total, statsAgg, diaKeyCount] = await Promise.all([
            XmlProduct.find(query).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
            XmlProduct.countDocuments(query),
            XmlProduct.aggregate([
                { $match: { source } },
                { $group: { _id: '$status', count: { $sum: 1 } } }
            ]),
            XmlProduct.countDocuments({ source, diaKey: { $ne: null } })
        ]);

        const totalProducts = statsAgg.reduce((sum, s) => sum + s.count, 0);
        const stats = { total: totalProducts, diaAktarilan: diaKeyCount, pending: 0, error: 0 };
        for (const s of statsAgg) {
            if (s._id === 'pending') stats.pending = s.count;
            else if (s._id === 'error') stats.error = s.count;
        }

        const brandList = brandField
            ? await XmlProduct.distinct(`rawData.${brandField}`, { source, [`rawData.${brandField}`]: { $nin: [null, ''] } })
            : [];

        const formatted = items.map(item => {
            const rd = item.rawData || {};
            return {
                id: item._id,
                sourceProductId: item.sourceProductId,
                source: item.source,
                status: item.status,
                errorMessage: item.errorMessage || null,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                lastFetchedAt: item.lastFetchedAt,
                lastSyncedToDiaAt: item.lastSyncedToDiaAt,
                diaKey: item.diaKey || null,
                // Mapping'e göre standart alanlar
                stokKodu: getNestedValue(rd, stokKoduField),
                urunAdi: getNestedValue(rd, urunAdiField),
                marka: getNestedValue(rd, brandField),
                hamFiyat: getNestedValue(rd, hamFiyatField),
                stokAdeti: getNestedValue(rd, stokAdetiField) || '0',
                gorselUrl: getNestedValue(rd, gorselField),
                uretimYili: getNestedValue(rd, yearField),
                kategori: getNestedValue(rd, categoryField),
                // Ham veri de gelsin
                rawData: rd
            };
        });

        res.json({
            success: true,
            data: formatted,
            meta: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
                brands: brandList.filter(Boolean).sort((a, b) => String(a).localeCompare(String(b), 'tr')),
                stats
            }
        });

    } catch (error) {
        console.error('XML products list hatası:', error);
        res.status(500).json({ success: false, message: 'XML ürünleri listelenirken hata oluştu', error: error.message });
    }
});


// ============================================
// DELETE /api/admin/integration/xml/mapping/:productId
// Eşleşmeyi kaldır
// ============================================
router.delete('/mapping/:productId', async (req, res) => {
    try {
        const result = await XmlProduct.updateOne(
            { _id: req.params.productId },
            { $set: { mappedData: null, status: 'pending', lastMappedAt: null } }
        );

        if (result.matchedCount === 0) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }

        res.json({ success: true, message: 'Eşleşme kaldırıldı' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET /api/admin/integration/xml/:id/source-fields
// XML URL'den ilk ürünü çekip alanları tespit et
// ============================================
router.get('/:id/source-fields', async (req, res) => {
    try {
        const integration = await WebXml.findById(req.params.id).lean();
        if (!integration) {
            return res.status(404).json({ success: false, message: 'Entegrasyon bulunamadı' });
        }

        const axios = require('axios');
        const { parseStringPromise } = require('xml2js');

        const headers = {};
        if (integration.credentials?.apiKey) headers['API-KEY'] = integration.credentials.apiKey;
        if (integration.credentials?.appKey) headers['APP-KEY'] = integration.credentials.appKey;
        if (integration.credentials?.secretKey) headers['SECRET-KEY'] = integration.credentials.secretKey;
        if (integration.credentials?.token) headers['TOKEN'] = integration.credentials.token;

        let url = integration.apiUrl;
        if (integration.credentials?.token && !url.includes('token=')) {
            url += (url.includes('?') ? '&' : '?') + `token=${integration.credentials.token}`;
        }

        // Önce xmlproducts'tan çek, varsa dışarıya istek atma
        const existingSample = await XmlProduct.findOne({ source: integration.code }).lean();

        let firstProduct = null;

        if (existingSample?.rawData) {
            firstProduct = existingSample.rawData;
        } else {
            const response = await axios.get(url, {
                headers,
                timeout: 30000,
                responseType: 'text'
            });

            if (integration.format === 'xml') {
                const findFirstArraySingle = (obj, depth = 0) => {
                    if (depth > 4) return null;
                    for (const key of Object.keys(obj)) {
                        const val = obj[key];
                        if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') return val[0];
                        if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                            const found = findFirstArraySingle(val, depth + 1);
                            if (found) return found;
                        }
                    }
                    return null;
                };

                const parsed1 = await parseStringPromise(response.data, { explicitArray: false, mergeAttrs: true });
                firstProduct = findFirstArraySingle(parsed1);

                if (!firstProduct) {
                    const parsed2 = await parseStringPromise(response.data, { explicitArray: true, mergeAttrs: true });
                    const raw = findFirstArraySingle(parsed2);
                    if (raw) {
                        firstProduct = {};
                        for (const key of Object.keys(raw)) {
                            const val = raw[key];
                            firstProduct[key] = Array.isArray(val) && val.length === 1 ? val[0] : val;
                        }
                    }
                }
            } else {
                const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                if (Array.isArray(data)) firstProduct = data[0];
                else {
                    const findFirstArray = (obj, depth = 0) => {
                        if (depth > 4) return null;
                        for (const key of Object.keys(obj)) {
                            const val = obj[key];
                            if (Array.isArray(val) && val.length > 0) return val[0];
                            if (typeof val === 'object' && val !== null) {
                                const found = findFirstArray(val, depth + 1);
                                if (found) return found;
                            }
                        }
                        return null;
                    };
                    firstProduct = findFirstArray(data);
                }
            }
        }

        if (!firstProduct) {
            return res.status(400).json({ success: false, message: 'Ürün verisi bulunamadı' });
        }

        // Alanları düzleştir (nested için nokta notasyonu)
        const flattenFields = (obj, prefix = '') => {
            const fields = [];
            for (const key of Object.keys(obj)) {
                const fullKey = prefix ? `${prefix}.${key}` : key;
                const val = obj[key];
                if (val !== null && typeof val === 'object' && !Array.isArray(val)) {
                    fields.push(...flattenFields(val, fullKey));
                } else if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
                    fields.push(...flattenFields(val[0], `${fullKey}[0]`));
                } else {
                    fields.push({
                        key: fullKey,
                        example: Array.isArray(val) ? JSON.stringify(val) : String(val ?? '')
                    });
                }
            }
            return fields;
        };

        const fields = flattenFields(firstProduct);

        res.json({ success: true, data: { fields, totalFields: fields.length } });

    } catch (error) {
        console.error('Source fields hatası:', error);
        res.status(500).json({ success: false, message: 'Kaynak alanları alınırken hata oluştu', error: error.message });
    }
});



/**
 * GET /api/admin/webxml/:id
 * Tek bir entegrasyon detayı
 */
router.get('/:id', async (req, res) => {
    try {
        const item = await WebXml.findById(req.params.id).lean();

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Entegrasyon bulunamadı'
            });
        }

        res.json({
            success: true,
            data: {
                id: item._id,
                name: item.name,
                code: item.code,
                description: item.description,
                apiUrl: item.apiUrl,
                format: item.format,
                credentials: item.credentials,
                isActive: item.isActive,
                syncInterval: item.syncInterval,
                dataPath: item.dataPath,
                syncInfo: item.syncInfo,
                rules: item.rules,
                notes: item.notes,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt
            }
        });

    } catch (error) {
        console.error('WebXml get error:', error);
        res.status(500).json({
            success: false,
            message: 'Entegrasyon bilgisi alınırken hata oluştu',
            error: error.message
        });
    }
});


/**
 * PUT /api/admin/webxml/:id
 * Entegrasyon güncelle
 */
router.put('/:id', async (req, res) => {
    try {
        const {
            name,
            description,
            apiUrl,
            format,
            credentials,
            isActive,
            syncInterval,
            dataPath,
            notes
        } = req.body;

        const updateData = {};

        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (apiUrl !== undefined) updateData.apiUrl = apiUrl;
        if (format !== undefined) updateData.format = format;
        if (credentials !== undefined) {
            for (const [key, value] of Object.entries(credentials)) {
                updateData[`credentials.${key}`] = value;
            }
        }
        if (isActive !== undefined) updateData.isActive = isActive;
        if (syncInterval !== undefined) updateData.syncInterval = syncInterval;
        if (dataPath !== undefined) updateData.dataPath = dataPath;
        if (notes !== undefined) updateData.notes = notes;

        const item = await WebXml.findByIdAndUpdate(
            req.params.id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).lean();

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Entegrasyon bulunamadı'
            });
        }

        res.json({
            success: true,
            message: 'Entegrasyon güncellendi',
            data: {
                id: item._id,
                name: item.name,
                code: item.code,
                isActive: item.isActive
            }
        });

    } catch (error) {
        console.error('WebXml update error:', error);
        res.status(500).json({
            success: false,
            message: 'Entegrasyon güncellenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * PATCH /api/admin/webxml/:id/status
 * Sadece aktif/pasif durumunu değiştir
 */
router.patch('/:id/status', async (req, res) => {
    try {
        const { isActive } = req.body;

        if (typeof isActive !== 'boolean') {
            return res.status(400).json({
                success: false,
                message: 'isActive alanı boolean olmalı'
            });
        }

        const item = await WebXml.findByIdAndUpdate(
            req.params.id,
            { $set: { isActive } },
            { new: true }
        ).lean();

        if (!item) {
            return res.status(404).json({
                success: false,
                message: 'Entegrasyon bulunamadı'
            });
        }

        res.json({
            success: true,
            message: isActive ? 'Entegrasyon aktif edildi' : 'Entegrasyon pasif edildi',
            data: {
                id: item._id,
                name: item.name,
                isActive: item.isActive
            }
        });

    } catch (error) {
        console.error('WebXml status update error:', error);
        res.status(500).json({
            success: false,
            message: 'Durum güncellenirken hata oluştu',
            error: error.message
        });
    }
});

/**
 * POST /api/admin/integration/xml/:id/sync
 * Manuel senkronizasyon başlat (Mollaoğlu Tatko)
 */
router.post('/:id/sync', async (req, res) => {
    try {
        const integration = await WebXml.findById(req.params.id);
        if (!integration) {
            return res.status(404).json({ success: false, message: 'Entegrasyon bulunamadı' });
        }

        const axios = require('axios');
        const { parseStringPromise } = require('xml2js');
        const crypto = require('crypto');

        const headers = {};
        if (integration.credentials?.apiKey) headers['API-KEY'] = integration.credentials.apiKey;
        if (integration.credentials?.appKey) headers['APP-KEY'] = integration.credentials.appKey;
        if (integration.credentials?.secretKey) headers['SECRET-KEY'] = integration.credentials.secretKey;

        let url = integration.apiUrl;
        if (integration.credentials?.token && !url.includes('token=')) {
            url += (url.includes('?') ? '&' : '?') + `token=${integration.credentials.token}`;
        }

        const response = await axios.get(url, {
            headers,
            timeout: 60000,
            responseType: 'text'
        });

        let products = [];

        if (integration.format === 'xml') {
            const findFirstArray = (obj, depth = 0) => {
                if (depth > 5) return null;
                for (const key of Object.keys(obj)) {
                    const val = obj[key];
                    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') return val;
                    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                        const found = findFirstArray(val, depth + 1);
                        if (found) return found;
                    }
                }
                return null;
            };

            // Önce explicitArray:false dene
            const parsed1 = await parseStringPromise(response.data, { explicitArray: false, mergeAttrs: true });
            products = findFirstArray(parsed1) || [];

            // Array bulunamadıysa veya tek eleman geldiyse explicitArray:true ile tekrar dene
            if (products.length === 0) {
                const parsed2 = await parseStringPromise(response.data, { explicitArray: true, mergeAttrs: true });
                const rawProducts = findFirstArray(parsed2) || [];
                // Değerleri düzleştir
                products = rawProducts.map(p => {
                    const flat = {};
                    for (const key of Object.keys(p)) {
                        const val = p[key];
                        flat[key] = Array.isArray(val) && val.length === 1 ? val[0] : val;
                    }
                    return flat;
                });
            }
        } else {
            const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
            if (Array.isArray(data)) {
                products = data;
            } else {
                const findFirstArray = (obj, depth = 0) => {
                    if (depth > 5) return null;
                    for (const key of Object.keys(obj)) {
                        const val = obj[key];
                        if (Array.isArray(val) && val.length > 0) return val;
                        if (typeof val === 'object' && val !== null) {
                            const found = findFirstArray(val, depth + 1);
                            if (found) return found;
                        }
                    }
                    return null;
                };
                products = findFirstArray(data) || [];
            }
        }

        console.log('[XML SYNC DEBUG] products length:', products.length);
        if (products.length > 0) console.log('[XML SYNC DEBUG] ilk ürün:', JSON.stringify(products[0]).slice(0, 300));

        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, message: 'Ürün listesi bulunamadı veya boş' });
        }

        const fieldMappings = integration.rules?.fieldMappings || [];
        const rules = integration.rules || {};

        const stokKoduMapping = fieldMappings.find(m => m.target === 'stokKodu');
        const stokAdetiM = fieldMappings.find(m => m.target === 'stokAdeti');
        const markaM = fieldMappings.find(m => m.target === 'marka');
        const kategoriM = fieldMappings.find(m => m.target === 'kategori');
        const yilM = fieldMappings.find(m => m.target === 'uretimYili');
        const gorselM = fieldMappings.find(m => m.target === 'gorselUrl');
        const fiyatM = fieldMappings.find(m => m.target === 'hamFiyat');

        const getVal = (p, mapping) => {
            if (!mapping?.source) return null;
            return mapping.source.split('.').reduce((acc, key) => acc?.[key], p) ?? null;
        };

        const isFiltered = (product) => {
            const stok = parseFloat(getVal(product, stokAdetiM) ?? 0);
            const marka = getVal(product, markaM);
            const kategori = getVal(product, kategoriM);
            const yil = String(getVal(product, yilM) ?? '');
            const gorsel = getVal(product, gorselM);
            const fiyat = parseFloat(getVal(product, fiyatM) ?? 0);

            if (rules.minStock > 0 && stok < rules.minStock) return true;
            if (rules.filters?.onlyInStock && stok <= 0) return true;
            if (rules.filters?.onlyWithImage && !gorsel) return true;
            if (rules.filters?.onlyWithPrice && !fiyat) return true;
            if (rules.excludedBrands?.length > 0 && marka && rules.excludedBrands.includes(marka)) return true;
            if (rules.excludedCategories?.length > 0 && kategori && rules.excludedCategories.includes(kategori)) return true;
            if (rules.excludedYears?.length > 0 && yil && rules.excludedYears.includes(yil)) return true;

            return false;
        };

        const getProductId = (p) => {
            if (stokKoduMapping?.source) {
                return String(p[stokKoduMapping.source] ?? '');
            }
            for (const key of Object.keys(p)) {
                if (typeof p[key] === 'string' || typeof p[key] === 'number') {
                    return String(p[key]);
                }
            }
            return String(Math.random());
        };

        const sourceProductIds = products.map(p => getProductId(p));
        const existingProducts = await XmlProduct.find(
            { source: integration.code, sourceProductId: { $in: sourceProductIds } },
            { sourceProductId: 1, syncHash: 1 }
        ).lean();

        const existingMap = {};
        for (const ep of existingProducts) {
            existingMap[ep.sourceProductId] = ep.syncHash;
        }

        let newCount = 0, changedCount = 0, unchangedCount = 0;
        const bulkOps = [];

        for (const product of products) {
            const pid = getProductId(product);
            if (!pid) continue;
            if (isFiltered(product)) continue;

            const newHash = crypto.createHash('md5').update(JSON.stringify(product)).digest('hex');
            const oldHash = existingMap[pid];

            const op = {
                updateOne: {
                    filter: { source: integration.code, sourceProductId: pid },
                    update: {
                        $set: {
                            rawData: product,
                            lastFetchedAt: new Date(),
                            syncHash: newHash,
                            ...((!oldHash || oldHash !== newHash) && { status: 'pending' })
                        }
                    },
                    upsert: true
                }
            };

            bulkOps.push(op);

            if (!oldHash) newCount++;
            else if (oldHash !== newHash) changedCount++;
            else unchangedCount++;
        }

        if (bulkOps.length > 0) {
            await XmlProduct.bulkWrite(bulkOps);
        }

        await WebXml.findByIdAndUpdate(req.params.id, {
            $set: {
                'syncInfo.lastSyncAt': new Date(),
                'syncInfo.lastSyncStatus': 'success',
                'syncInfo.lastSyncType': 'manual',
                'syncInfo.lastSyncMessage': `${products.length} ürün çekildi (${newCount} yeni, ${changedCount} değişmiş, ${unchangedCount} aynı)`,
                'syncInfo.productCount': products.length
            }
        });

        res.json({
            success: true,
            message: 'Senkronizasyon tamamlandı',
            data: { productCount: products.length, newCount, changedCount, unchangedCount }
        });

    } catch (error) {
        console.error('Sync error:', error);
        await WebXml.findByIdAndUpdate(req.params.id, {
            $set: {
                'syncInfo.lastSyncAt': new Date(),
                'syncInfo.lastSyncStatus': 'error',
                'syncInfo.lastSyncType': 'manual',
                'syncInfo.lastSyncMessage': error.message
            }
        }).catch(() => { });
        res.status(500).json({ success: false, message: error.message });
    }
});
// ============================================
// GET /api/admin/webxml/:id/filter-options
// XML kaynağına özel kategori ve marka listesi
// ============================================
router.get('/:id/filter-options', async (req, res) => {
    try {
        const { id } = req.params;

        const webXml = await WebXml.findById(id);
        if (!webXml) {
            return res.status(404).json({
                success: false,
                message: 'XML entegrasyonu bulunamadı'
            });
        }

        const sourceCode = webXml.code;

        // fieldMappings'ten ilgili alanları bul
        const fieldMappings = webXml.rules?.fieldMappings || [];
        const getSourceField = (target) => {
            const mapping = fieldMappings.find(m => m.target === target);
            return mapping ? `rawData.${mapping.source}` : null;
        };

        const brandField = getSourceField('marka');
        const yearField = getSourceField('uretimYili');
        const categoryField = getSourceField('kategori');

        const [categories, brands, years] = await Promise.all([
            categoryField
                ? XmlProduct.distinct(categoryField, { source: sourceCode, [categoryField]: { $nin: [null, ''] } })
                : Promise.resolve([]),
            brandField
                ? XmlProduct.distinct(brandField, { source: sourceCode, [brandField]: { $nin: [null, ''] } })
                : Promise.resolve([]),
            yearField
                ? XmlProduct.distinct(yearField, { source: sourceCode, [yearField]: { $nin: [null, ''] } })
                : Promise.resolve([])
        ]);

        // Alfabetik sırala
        const sortedCategories = categories.filter(Boolean).sort((a, b) =>
            a.localeCompare(b, 'tr', { sensitivity: 'base' })
        );

        const sortedBrands = brands.filter(Boolean).sort((a, b) =>
            a.localeCompare(b, 'tr', { sensitivity: 'base' })
        );

        // Yılları büyükten küçüğe sırala (YENİ)
        const sortedYears = years.filter(Boolean).sort((a, b) => b - a);

        res.json({
            success: true,
            data: {
                categories: sortedCategories,
                brands: sortedBrands,
                years: sortedYears,  // YENİ
                meta: {
                    source: sourceCode,
                    categoryCount: sortedCategories.length,
                    brandCount: sortedBrands.length,
                    yearCount: sortedYears.length  // YENİ
                }
            }
        });

    } catch (error) {
        console.error('Filter options hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Filtre seçenekleri yüklenirken hata oluştu',
            error: error.message
        });
    }
});

// ============================================
// PUT /api/admin/webxml/:id/rules
// XML kurallarını güncelle
// ============================================
router.put('/:id/rules', async (req, res) => {
    try {
        const { id } = req.params;
        const { rules } = req.body;

        const webXml = await WebXml.findById(id);
        if (!webXml) {
            return res.status(404).json({
                success: false,
                message: 'XML entegrasyonu bulunamadı'
            });
        }

        webXml.rules = {
            fieldMappings: rules.fieldMappings || [],
            excludedCategories: rules.excludedCategories || [],
            excludedBrands: rules.excludedBrands || [],
            excludedYears: rules.excludedYears || [],
            minStock: rules.minStock || 0,
            filters: {
                onlyInStock: rules.filters?.onlyInStock || false,
                onlyActive: rules.filters?.onlyActive || false,
                onlyWithImage: rules.filters?.onlyWithImage || false,
                onlyWithPrice: rules.filters?.onlyWithPrice || false
            }
        };

        await webXml.save();

        res.json({
            success: true,
            message: 'Kurallar başarıyla güncellendi',
            data: webXml
        });

    } catch (error) {
        console.error('Rules update hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kurallar güncellenirken hata oluştu',
            error: error.message
        });
    }
});


module.exports = router;