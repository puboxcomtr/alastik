/**
 * WebXml API Routes
 * Dosya: apps/api/src/routes/admin/webxml.js
 */

const express = require('express');
const router = express.Router();
const https = require('https');
const WebXml = require('../../../models/plugins/xml/WebXml');
const XmlProduct = require('../../../models/plugins/xml/XmlProduct');
const XmlPricingRule = require('../../../models/plugins/xml/XmlPricingRule');
const WebProduct = require('../../../models/web/catalog/WebProduct');
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
                .sort({ format: -1, createdAt: -1 })
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
// POST /api/admin/integration/xml/sync-all
// Tüm XML sync — arka planda worker üzerinden
// ============================================
router.post('/sync-all', async (req, res) => {
    try {
        const Queue = require('bull');
        const workerConfig = require('../../../config/worker.config');

        const xmlSyncQueue = new Queue('xml-full-sync', {
            redis: workerConfig.redis
        });

        const activeCounts = await xmlSyncQueue.getJobCounts();
        if (activeCounts.active > 0 || activeCounts.waiting > 0) {
            return res.json({ success: false, message: 'XML sync zaten devam ediyor' });
        }

        const job = await xmlSyncQueue.add(
            'manual-xml-sync',
            { type: 'manual', triggeredBy: 'admin', triggeredAt: new Date().toISOString() },
            { timeout: 60 * 60 * 1000 } // 1 saat timeout
        );

        res.json({
            success: true,
            message: 'XML senkronizasyon başlatıldı',
            data: { jobId: job.id }
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// POST /api/admin/integration/xml/web-sync/full
// XML ürünlerini webproducts'a tam aktarım
// ============================================
router.post('/web-sync/full', async (req, res) => {
    try {
        const XmlWebProductSyncService = require('../../../services/plugins/xml/XmlWebProductSyncService');
        const result = await XmlWebProductSyncService.fullSync();
        res.json({
            success: true,
            message: `Tam aktarım tamamlandı — oluşturulan: ${result.created}, güncellenen: ${result.updated}, filtrelenen: ${result.filtered}, hata: ${result.errors}`,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// POST /api/admin/integration/xml/web-sync/quick
// Fiyat ve stok hızlı güncelleme
// ============================================
router.post('/web-sync/quick', async (req, res) => {
    try {
        const XmlWebProductSyncService = require('../../../services/plugins/xml/XmlWebProductSyncService');
        const result = await XmlWebProductSyncService.quickSync();
        res.json({
            success: true,
            message: `Hızlı sync tamamlandı — güncellenen: ${result.updated}, filtrelenen: ${result.filtered}, hata: ${result.errors}`,
            data: result
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// GET /api/admin/integration/xml/products/export
// Tüm XML ürünlerini Excel'e aktar
// ============================================
router.get('/products/export', async (req, res) => {
    try {
        const { source = '' } = req.query;

        const integrations = await WebXml.find({}, { code: 1, name: 1, format: 1, rules: 1 }).lean();
        const intgMap = {};
        for (const i of integrations) intgMap[i.code] = i;

        const getNestedValue = (obj, path) => {
            if (!path) return '';
            const parts = path.match(/[^.\[\]]+/g) || [];
            return parts.reduce((acc, key) => acc?.[key] ?? '', obj);
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

        const xmlOnly = integrations.filter(i => i.format === 'xml').map(i => i.code);
        const query = source ? { source } : { source: { $in: xmlOnly } };

        console.log('[EXPORT] integrations:', integrations.length, 'xmlOnly:', xmlOnly.length, 'query:', JSON.stringify(query));

        const items = await XmlProduct.find(query, {
            source: 1,
            sourceProductId: 1,
            rawData: 1,
            status: 1,
            'mappedData.hedefStokKodu': 1
        }).lean();

        console.log('[EXPORT] items found:', items.length);

        const rows = [];
        let skipFormat = 0, skipFilter = 0;
        for (const item of items) {
            const intg = intgMap[item.source];
            if (intg?.format !== 'xml') { skipFormat++; continue; }
            if (isFiltered(item, intg)) { skipFilter++; continue; }

            const fieldMappings = intg?.rules?.fieldMappings || [];
            const get = (target) => fieldMappings.find(m => m.target === target)?.source;
            const rd = item.rawData || {};

            rows.push({
                'Stok Kodu': getNestedValue(rd, get('stokKodu')) || item.sourceProductId,
                'Hedef Stok Kodu': item.mappedData?.hedefStokKodu || '',
                'Ürün Adı': getNestedValue(rd, get('urunAdi')),
                'Marka': getNestedValue(rd, get('marka')),
                'Kategori': getNestedValue(rd, get('kategori')),
                'Mevsim': getNestedValue(rd, get('mevsim')),
                'Fiyat': getNestedValue(rd, get('hamFiyat')),
                'Stok': getNestedValue(rd, get('stokAdeti')) || '0',
                'Yıl': getNestedValue(rd, get('uretimYili')),
                'Kaynak': intg?.name || item.source
            });
        }

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);
        ws['!cols'] = [
            { wch: 20 }, { wch: 20 }, { wch: 50 }, { wch: 20 }, { wch: 20 }, { wch: 15 },
            { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 20 }
        ];
        XLSX.utils.book_append_sheet(wb, ws, 'Urunler');

        console.log('[EXPORT] rows:', rows.length, 'skipFormat:', skipFormat, 'skipFilter:', skipFilter);
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
            const parts = path.match(/[^.\[\]]+/g) || [];
            return parts.reduce((acc, key) => acc?.[key] ?? '', obj);
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
            const parts = path.match(/[^.\[\]]+/g) || [];
            return parts.reduce((acc, key) => acc?.[key] ?? '', obj);
        };

        let guncellenen = 0, atilan = 0;

        for (const row of rows) {
            const xmlStokKodu = String(row['XML Stok Kodu'] || '').trim();
            const hedefStokKodu = String(row['Hedef Stok Kodu'] || '').trim();
            const kaynak = String(row['Kaynak'] || '').trim();

            if (!xmlStokKodu) { atilan++; continue; }
            const hedefBos = hedefStokKodu === '';

            const query = {};
            if (kaynak) query.source = kaynak;

            // Önce sourceProductId ile dene
            const byId = await XmlProduct.findOne({ ...query, sourceProductId: xmlStokKodu });
            if (byId) {
                let setData;
                if (hedefBos) {
                    // Hedef boş — eşleşmeyi tamamen sil
                    setData = {
                        mappedData: null,
                        status: 'pending',
                        lastMappedAt: null,
                        diaKey: null,
                        diaData: null,
                        diaDataHash: null
                    };
                } else {
                    const eskiHedef = byId.mappedData?.hedefStokKodu || '';
                    const degisti = eskiHedef !== hedefStokKodu;
                    setData = { mappedData: { hedefStokKodu: hedefStokKodu }, status: 'mapped', lastMappedAt: new Date() };
                    // Hedef değiştiyse (veya eski boşsa) DIA eşleşmesini sıfırla
                    if (degisti) {
                        setData.diaKey = null;
                        setData.diaData = null;
                        setData.diaDataHash = null;
                    }
                }
                await XmlProduct.updateOne(
                    { _id: byId._id },
                    { $set: setData }
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
                        let setData;
                        if (hedefBos) {
                            // Hedef boş — eşleşmeyi tamamen sil
                            setData = {
                                mappedData: null,
                                status: 'pending',
                                lastMappedAt: null,
                                diaKey: null,
                                diaData: null,
                                diaDataHash: null
                            };
                        } else {
                            const eskiHedef = byRaw.mappedData?.hedefStokKodu || '';
                            const degisti = eskiHedef !== hedefStokKodu;
                            setData = { mappedData: { hedefStokKodu: hedefStokKodu }, status: 'mapped', lastMappedAt: new Date() };
                            // Hedef değiştiyse (veya eski boşsa) DIA eşleşmesini sıfırla
                            if (degisti) {
                                setData.diaKey = null;
                                setData.diaData = null;
                                setData.diaDataHash = null;
                            }
                        }
                        await XmlProduct.updateOne(
                            { _id: byRaw._id },
                            { $set: setData }
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
            // Array index'leri (STOK.DEPO[0].X) parçalara ayır
            const parts = path.match(/[^.\[\]]+/g) || [];
            return parts.reduce((acc, key) => {
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
            // Array index'leri (STOK.DEPO[0].X) parçalara ayır
            const parts = path.match(/[^.\[\]]+/g) || [];
            return parts.reduce((acc, key) => {
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

        // [N] → .N dönüştür (MongoDB dot notation)
        const toMongoPath = (p) => p ? p.replace(/\[(\d+)\]/g, '.$1') : p;
        const stokAdetiMongoField = toMongoPath(stokAdetiField);
        const hamFiyatMongoField = toMongoPath(hamFiyatField);

        if (rules.minStock > 0 && stokAdetiMongoField) {
            query[`rawData.${stokAdetiMongoField}`] = { $gte: String(rules.minStock) };
        }
        if (rules.filters?.onlyInStock && stokAdetiMongoField) {
            query[`rawData.${stokAdetiMongoField}`] = { $gt: '0', $exists: true };
        }
        if (rules.filters?.onlyWithImage && gorselField) {
            query[`rawData.${gorselField}`] = { $ne: '', $exists: true };
        }
        if (rules.filters?.onlyWithPrice && hamFiyatMongoField) {
            query[`rawData.${hamFiyatMongoField}`] = { $ne: '', $ne: '0', $exists: true };
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
// GET /api/admin/integration/xml/webproducts/export.xml
// WebProducts XML dışa aktarım (XML kaynaklı ürünler)
// ============================================
router.get('/webproducts/export.xml', async (req, res) => {
    try {
        const WebProduct = require('../../../models/web/catalog/WebProduct');
        const { type } = req.query; // 'jant' | 'lastik' | undefined

        const integrations = await WebXml.find({}, { code: 1, name: 1 }).lean();
        const intgNameMap = {};
        for (const i of integrations) intgNameMap[i.code] = i.name;

        // Kod içinde "jant" geçen XML kaynakları
        const jantSources = integrations
            .filter(i => /jant/i.test(i.code))
            .map(i => i.code);

        const pricingRules = await XmlPricingRule.find().lean();

        const hesaplaPlatformFiyat = (hamFiyat, source, marka, platform) => {
            const kurallar = pricingRules.filter(r =>
                r.platform === platform &&
                (r.source === '' || r.source === source) &&
                (r.marka === '' || r.marka === marka)
            ).sort((a, b) => {
                // Önce kaynak+marka eşleşmesi, sonra sadece kaynak, en son genel
                const aScore = (a.source ? 1 : 0) + (a.marka ? 1 : 0);
                const bScore = (b.source ? 1 : 0) + (b.marka ? 1 : 0);
                return bScore - aScore;
            });

            if (!kurallar.length) return hamFiyat;

            const kural = kurallar[0];
            let fiyat = hamFiyat;

            if (kural.tip === 'yuzde_artis') {
                fiyat = hamFiyat * (1 + kural.deger / 100);
            } else if (kural.tip === 'yuzde_azalis') {
                fiyat = hamFiyat * (1 - kural.deger / 100);
            } else if (kural.tip === 'sabit_artis') {
                fiyat = hamFiyat + kural.deger;
            } else if (kural.tip === 'sabit_azalis') {
                fiyat = hamFiyat - kural.deger;
            }

            return Math.round(fiyat * 100) / 100;
        };

        // Site seçimi: ?site= parametresi > X-Site/Host (req.site)
        const { isValidSite } = require('../../../config/sites');
        const querySite = (req.query.site || '').toString().trim().toLowerCase();
        const feedSite = isValidSite(querySite) ? querySite : req.site;

        const productQuery = {
            'syncInfo.syncSource': 'xml_integration',
            'diaData.durum': 'A',
            'diaData.gercek_stok': { $gt: 0 },
            'diaData.m_birimler.0.fiyat1': { $gt: 0 },
            'customData.webVisible': true,
            sites: feedSite
        };

        if (type === 'jant') {
            productQuery['diaData.ozelkod7kodu'] = 'JANT';
        } else if (type !== 'all') {
            productQuery['diaData.ozelkod7kodu'] = { $ne: 'JANT' };
        }

        const products = await WebProduct.find(productQuery, {
            _key: 1,
            diaData: 1,
            syncInfo: 1,
            customData: 1,
            pricingData: 1
        }).lean();
        const escape = (val) => String(val || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');

        const getOzellik = (ozellikler, isim) => {
            const o = (ozellikler || []).find(x => x.ozellikadi === isim);
            const val = o?.detayaciklama;
            return (val === undefined || val === null || val === '') ? '-' : escape(val);
        };

        // Sabit özellik şemaları (lastik / jant)
        const LASTIK_OZELLIK_SEMASI = [
            'Genişlik',
            'Yanak',
            'Jant Çapı',
            'Mevsim',
            'Araç Tipi',
            'Ürün Tipi',
            'Yük Endeksi',
            'Hız Endeksi',
            'XL',
            'Run Flat',
            'Seal',
            'OEM',
            'Ücretsiz Kargo',
            'Durumu',
            'Üretim Tarihi',
            'Diş Derinliği',
            'Islak Zeminde Frenleme',
            'Yakıt Verimliliği',
            'Gürültü Seviyesi'
        ];

        const JANT_OZELLIK_SEMASI = [
            'Jant Genişliği',
            'Jant Çapı',
            'Bijon Sayısı',
            'Bijon Aralığı',
            'Göbek Çapı',
            'ET',
            'Renk',
            'Ürün Tipi',
            'Araç Tipi',
            'Durumu',
            'Üretim Tarihi'
        ];

        const renderOzellikler = (ozellikler, urunTipi) => {
            const isJant = String(urunTipi || '').toLowerCase() === 'jant';
            const sema = isJant ? JANT_OZELLIK_SEMASI : LASTIK_OZELLIK_SEMASI;
            let out = '';
            sema.forEach((isim, i) => {
                out += `    <Ozellik no="${i + 1}" isim="${escape(isim)}">${getOzellik(ozellikler, isim)}</Ozellik>\n`;
            });
            return out;
        };

        const now = new Date().toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' });

        let xml = `<?xml version="1.0" encoding="UTF-8"?>\n`;
        xml += `<!-- XML dosyası son güncellenme tarihi: ${now} -->\n`;
        xml += `<Urunler>\n`;
        xml += `<Metadata>\n`;
        xml += `  <SonGuncelleme>${escape(now)}</SonGuncelleme>\n`;
        xml += `  <ToplamUrunSayisi>${products.length}</ToplamUrunSayisi>\n`;
        xml += `  <OlusturmaTarihi>${new Date().toLocaleDateString('tr-TR')}</OlusturmaTarihi>\n`;
        xml += `  <OlusturmaSaati>${new Date().toLocaleTimeString('tr-TR')}</OlusturmaSaati>\n`;
        xml += `</Metadata>\n`;

        for (const p of products) {
            const d = p.diaData || {};
            const birim = d.m_birimler?.[0] || {};
            const resimler = d.m_resimler || [];
            const ozellikler = d.m_urunOzellikleri || [];

            const fiyat1 = birim.fiyat1 || 0;
            const xmlSource = p.syncInfo?.xmlSource || '';
            const alastikFiyat = p.pricingData?.alastikPrice ?? fiyat1;
            const toptanFiyat = p.pricingData?.b2bPrice ?? fiyat1;
            const perakendeFiyat = p.pricingData?.b2cPrice ?? Math.round(toptanFiyat * 1.08 * 100) / 100;
            const fiyat4 = birim.fiyat4 || fiyat1;
            const ebat = d.ozelkod3kodu || '';
            const jantCapi = d.ozelkod4kodu || '';

            const etiketDegerleri = `${getOzellik(ozellikler, 'Yakıt Verimliliği')} ${getOzellik(ozellikler, 'Islak Zeminde Frenleme')} ${getOzellik(ozellikler, 'Gürültü Seviyesi')}`.trim();

            xml += `<Urun>\n`;
            xml += `  <StokKodu>${escape(d.stokkartkodu)}</StokKodu>\n`;
            xml += `  <StokAdi>${escape(d.aciklama)}</StokAdi>\n`;
            xml += `  <Marka>${escape(d.marka)}</Marka>\n`;
            xml += `  <HamFiyat>${Math.ceil(fiyat1).toFixed(2)}</HamFiyat>\n`;
            xml += `  <ALastik>${Math.ceil(alastikFiyat).toFixed(2)}</ALastik>\n`;
            xml += `  <PerakendeFiyat>${Math.ceil(perakendeFiyat).toFixed(2)}</PerakendeFiyat>\n`;
            xml += `  <ToptanFiyat>${Math.ceil(toptanFiyat).toFixed(2)}</ToptanFiyat>\n`;
            xml += `  <StokAdet>${d.gercek_stok ?? 0}</StokAdet>\n`;
            xml += `  <Mevsim>${escape(d.ozelkod1kodu)}</Mevsim>\n`;
            xml += `  <Ebat>${escape(ebat)}</Ebat>\n`;
            xml += `  <JantCapi>${escape(jantCapi)}</JantCapi>\n`;
            xml += `  <JantGrubu>${escape(d.ozelkod8kodu)}</JantGrubu>\n`;
            xml += `  <Durumu>${escape(d.ozelkod6kodu)}</Durumu>\n`;
            xml += `  <UrunTipi>${escape(d.ozelkod7kodu)}</UrunTipi>\n`;
            xml += `  <IkOzelAlan>${escape(d.ozelkod9kodu)}</IkOzelAlan>\n`;
            xml += `  <Rft>${escape(getOzellik(ozellikler, 'Run Flat'))}</Rft>\n`;
            xml += `  <FiyatlandirmaTipi>XML</FiyatlandirmaTipi>\n`;
            xml += `  <OzelKod10>${escape(d.ozelkod11kodu)}</OzelKod10>\n`;
            xml += `  <Baslik>${escape(d.ekalan1)}</Baslik>\n`;
            xml += `  <MetaTitle>${escape(type === 'jant' ? (p.customData?.seoTitle || d.ekalan1 || d.aciklama || '') : d.ekalan2)}</MetaTitle>\n`;
            xml += `  <Tags>${escape(d.ekalan3)}</Tags>\n`;
            xml += `  <HizliAramaKelimeleri>${escape(d.ekalan4)}</HizliAramaKelimeleri>\n`;
            xml += `  <UretimTarihi>${escape(d.ekalan5)}</UretimTarihi>\n`;
            xml += `  <EtiketDegerleri>${etiketDegerleri}</EtiketDegerleri>\n`;
            xml += `  <FinansalIskonto>Yok</FinansalIskonto>\n`;
            xml += `  <KampanyaDurumu/>\n`;
            const xmlSourceName = intgNameMap[p.syncInfo?.xmlSource] || d.ekalan9 || '';
            xml += `  <StokKartiAciklamasi>${escape(xmlSourceName)}</StokKartiAciklamasi>\n`;
            xml += `  <PazaryeriBarkodu>${escape(d.ekalan10)}</PazaryeriBarkodu>\n`;
            xml += `  <KaynakDepo/>\n`;
            xml += `  <XmlTarih>${escape(d.ekalan5)}</XmlTarih>\n`;
            xml += `  <StokKaynak>${escape(xmlSourceName)}</StokKaynak>\n`;
            xml += `  <StokCikisTarihi/>\n`;
            xml += `  <KaldirilmaTarihi/>\n`;
            xml += `  <RetentionUrun>Hayir</RetentionUrun>\n`;

            // UrunAgaciDetay
            const kategoriler = d.m_kategoriler?.[0] || {};
            xml += `  <UrunAgaciDetay>\n`;
            xml += `    <Grup1>${escape(kategoriler.kategori_aciklama_1)}</Grup1>\n`;
            xml += `    <Grup2>${escape(kategoriler.kategori_aciklama_2)}</Grup2>\n`;
            xml += `    <Grup3>${escape(kategoriler.kategori_aciklama_3)}</Grup3>\n`;
            xml += `    <Grup4>${escape(kategoriler.kategori_aciklama_4)}</Grup4>\n`;
            xml += `    <Grup5>${escape(kategoriler.kategori_aciklama_5)}</Grup5>\n`;
            xml += `    <Grup6>${escape(kategoriler.kategori_aciklama_6)}</Grup6>\n`;
            xml += `  </UrunAgaciDetay>\n`;

            xml += `  <DiaKey>${escape(p._key)}</DiaKey>\n`;
            xml += `  <UrlList>\n`;
            for (let i = 0; i < 6; i++) {
                const r = resimler[i];
                const url = r ? escape(r.aws_url || r.localdata) : '';
                xml += `    <Url${i + 1}>${url}</Url${i + 1}>\n`;
            }
            xml += `  </UrlList>\n`;
            xml += `  <Ozellikler>\n`;
            xml += renderOzellikler(ozellikler, d.ozelkod7kodu);
            xml += `  </Ozellikler>\n`;
            xml += `  <Not>${p.customData?.customDescription || d.note || ''}</Not>\n`;
            xml += `</Urun>\n`;
        }

        xml += `</Urunler>`;

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);

    } catch (error) {
        console.error('WebProducts XML export hatası:', error);
        res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Hata oluştu</error>');
    }
});
// ============================================
// GET /api/admin/integration/xml/:source/export.xml
// xmlproducts'tan XML çıktısı üret
// ============================================
router.get('/:source/export.xml', async (req, res) => {
    try {
        const { source } = req.params;

        const webXml = await WebXml.findOne({ code: source }).lean();
        if (!webXml) {
            return res.status(404).send('<?xml version="1.0" encoding="UTF-8"?><error>Entegrasyon bulunamadı</error>');
        }

        const fieldMappings = webXml.rules?.fieldMappings || [];
        const getSourceField = (target) => fieldMappings.find(m => m.target === target)?.source;

        const stokKoduField = getSourceField('stokKodu');
        const urunAdiField = getSourceField('urunAdi');
        const markaField = getSourceField('marka');
        const hamFiyatField = getSourceField('hamFiyat');
        const stokAdetiField = getSourceField('stokAdeti');
        const kategoriField = getSourceField('kategori');
        const uretimYiliField = getSourceField('uretimYili');
        const gorselField = getSourceField('gorselUrl');
        const mevsimField = getSourceField('mevsim');

        const getVal = (obj, field) => {
            if (!field) return '';
            const val = field.split('.').reduce((acc, key) => acc?.[key] ?? '', obj) ?? '';
            return typeof val === 'object' ? '' : String(val);
        };

        const httpsAgent = new https.Agent({ rejectUnauthorized: false });
        const axios = require('axios');

        let items = [];

        if (source === 'aslankardesler' || source === 'aslan_kardesler_jant') {
            const markaKodu = source === 'aslan_kardesler_jant' ? 'JANT' : 'LAST\u00ddK';
            const { parseStringPromise } = require('xml2js');
            const qs = new URLSearchParams({
                Username: webXml.credentials.userName,
                Password: webXml.credentials.password,
                marka: markaKodu
            });
            const aslanUrl = `https://stockapi.afkyazilim.com.tr/api/Stock/GetStockXml?${qs}`;
            const apiRes = await axios.get(aslanUrl, { responseType: 'arraybuffer', timeout: 120000, httpsAgent });
            const xmlStr = Buffer.from(apiRes.data).toString('latin1');
            const parsed = await parseStringPromise(xmlStr, { explicitArray: false, mergeAttrs: true });
            const stoklar = parsed?.Stoklar?.Stok;
            const arr = Array.isArray(stoklar) ? stoklar : (stoklar ? [stoklar] : []);
            items = arr.map(p => {
                const converted = {};
                for (const key of Object.keys(p)) {
                    converted[key] = typeof p[key] === 'string'
                        ? Buffer.from(p[key], 'latin1').toString('utf8')
                        : p[key];
                }
                return { rawData: converted };
            });
        } else if (webXml.credentials?.userName) {
            const apiRes = await axios.post(webXml.apiUrl, {
                UserName: webXml.credentials.userName,
                Password: webXml.credentials.password,
                CompanyCode: webXml.credentials.companyCode,
                stokCode: ''
            }, { headers: { 'Content-Type': 'application/json' }, timeout: 120000, httpsAgent });
            let data = apiRes.data;
            if (webXml.dataPath) {
                data = webXml.dataPath.split('.').reduce((acc, key) => acc?.[key], data) ?? data;
            }
            if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { } }
            items = Array.isArray(data) ? data.map(r => ({ rawData: r })) : [];
        } else {
            const headers = {};
            if (webXml.credentials?.apiKey) {
                headers[webXml.credentials.apiKey.startsWith('lstk_') ? 'LSTK-IST' : 'API-KEY'] = webXml.credentials.apiKey;
            }
            if (webXml.credentials?.appKey) headers['APP-KEY'] = webXml.credentials.appKey;
            if (webXml.credentials?.secretKey) headers['SECRET-KEY'] = webXml.credentials.secretKey;
            let url = webXml.apiUrl;
            if (webXml.credentials?.token && !url.includes('token=')) {
                url += (url.includes('?') ? '&' : '?') + `token=${webXml.credentials.token}`;
            }

            // Pagination destekli API (totalPages varsa)
            if (webXml.credentials?.apiKey?.startsWith('lstk_')) {
                const allProducts = [];
                let pageNumber = 1;
                let totalPages = 1;
                do {
                    const sep = url.includes('?') ? '&' : '?';
                    const pageUrl = `${url}${sep}pageNumber=${pageNumber}&pageSize=100`;
                    const apiRes = await axios.get(pageUrl, { headers, timeout: 120000, httpsAgent });
                    const pdata = apiRes.data;
                    allProducts.push(...(pdata.products || []));
                    totalPages = pdata.totalPages || 1;
                    pageNumber++;
                } while (pageNumber <= totalPages);
                items = allProducts.map(r => ({ rawData: r }));
            } else {
                const apiRes = await axios.get(url, { headers, timeout: 120000, httpsAgent });
                let data = apiRes.data;
                if (webXml.dataPath) {
                    data = webXml.dataPath.split('.').reduce((acc, key) => acc?.[key], data) ?? data;
                }
                if (typeof data === 'string') { try { data = JSON.parse(data); } catch (e) { } }
                items = Array.isArray(data) ? data.map(r => ({ rawData: r })) : [];
            }
        }

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<Products>\n';

        for (const item of items) {
            const rd = item.rawData || {};
            const stok = parseFloat(getVal(rd, stokAdetiField)) || 0;
            const fiyat = parseFloat(getVal(rd, hamFiyatField)) || 0;

            // Kuralları uygula
            const rules = webXml.rules || {};
            if (rules.filters?.onlyInStock && stok <= 0) continue;
            if (rules.filters?.onlyWithPrice && !fiyat) continue;

            const escape = (val) => String(val || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');

            xml += '  <Product>\n';
            xml += `    <StokKodu>${escape(getVal(rd, stokKoduField))}</StokKodu>\n`;
            xml += `    <UrunAdi>${escape(getVal(rd, urunAdiField))}</UrunAdi>\n`;
            xml += `    <Marka>${escape(getVal(rd, markaField))}</Marka>\n`;
            xml += `    <Fiyat>${fiyat}</Fiyat>\n`;
            xml += `    <Stok>${stok}</Stok>\n`;
            xml += `    <Kategori>${escape(getVal(rd, kategoriField))}</Kategori>\n`;
            xml += `    <Mevsim>${escape(getVal(rd, mevsimField))}</Mevsim>\n`;
            xml += `    <UretimYili>${escape(getVal(rd, uretimYiliField))}</UretimYili>\n`;
            xml += `    <Gorsel>${escape(getVal(rd, gorselField))}</Gorsel>\n`;
            xml += '  </Product>\n';
        }

        xml += '</Products>';

        res.setHeader('Content-Type', 'application/xml; charset=utf-8');
        res.send(xml);

    } catch (error) {
        console.error('XML export hatası:', error);
        res.status(500).send('<?xml version="1.0" encoding="UTF-8"?><error>Hata oluştu</error>');
    }
});



// ============================================
// GET /api/admin/integration/xml/pricing/rules
// Tüm fiyatlandırma kurallarını listele
// ============================================
router.get('/pricing/rules', async (req, res) => {
    try {
        const kurallar = await XmlPricingRule.find().sort({ platform: 1, sira: 1, createdAt: 1 }).lean();
        res.json({ success: true, data: kurallar.map(k => ({ ...k, id: k._id })) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// POST /api/admin/integration/xml/pricing/rules
// Yeni fiyatlandırma kuralı ekle
// ============================================
router.post('/pricing/rules', async (req, res) => {
    try {
        const { platform, source, marka, tip, deger, aciklama } = req.body;

        if (!platform || !tip || deger === undefined) {
            return res.status(400).json({ success: false, message: 'Platform, tip ve değer zorunludur' });
        }

        if (deger <= 0) {
            return res.status(400).json({ success: false, message: 'Değer 0\'dan büyük olmalı' });
        }

        const kural = await XmlPricingRule.create({
            platform,
            source: source || '',
            marka: marka || '',
            tip,
            deger,
            aciklama: aciklama || ''
        });

        res.status(201).json({
            success: true,
            message: 'Kural eklendi',
            data: { ...kural.toObject(), id: kural._id }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// DELETE /api/admin/integration/xml/pricing/rules/:id
// Fiyatlandırma kuralı sil
// ============================================
router.delete('/pricing/rules/:id', async (req, res) => {
    try {
        const result = await XmlPricingRule.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, message: 'Kural bulunamadı' });
        }
        res.json({ success: true, message: 'Kural silindi' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============================================
// DELETE /api/admin/integration/xml/mapping/:productId
// Eşleşmeyi kaldır
// ============================================
router.delete('/mapping/:productId', async (req, res) => {
    try {
        const xmlProduct = await XmlProduct.findById(req.params.productId, { diaKey: 1 }).lean();

        if (!xmlProduct) {
            return res.status(404).json({ success: false, message: 'Ürün bulunamadı' });
        }

        await XmlProduct.updateOne(
            { _id: xmlProduct._id },
            { $set: { mappedData: null, status: 'pending', lastMappedAt: null, diaKey: null, diaData: null, diaDataHash: null } }
        );

        // Aynı DIA kartını kullanan başka XML kaynağı kalmadıysa web ürününü sil
        let webDeleted = 0;
        if (xmlProduct.diaKey) {
            const otherSource = await XmlProduct.exists({ _id: { $ne: xmlProduct._id }, diaKey: xmlProduct.diaKey });
            if (!otherSource) {
                const keyVariants = [String(xmlProduct.diaKey)];
                const numKey = Number(xmlProduct.diaKey);
                if (!Number.isNaN(numKey)) keyVariants.push(numKey);
                const delResult = await WebProduct.deleteMany({
                    _key: { $in: keyVariants },
                    'syncInfo.syncSource': 'xml_integration'
                });
                webDeleted = delResult.deletedCount;
            }
        }

        res.json({
            success: true,
            message: webDeleted > 0 ? 'Eşleşme kaldırıldı, ürün siteden silindi' : 'Eşleşme kaldırıldı'
        });
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
        if (integration.credentials?.apiKey) {
            headers[integration.credentials.apiKey.startsWith('lstk_') ? 'LSTK-IST' : 'API-KEY'] = integration.credentials.apiKey;
        }
        if (integration.credentials?.appKey) headers['APP-KEY'] = integration.credentials.appKey;
        if (integration.credentials?.secretKey) headers['SECRET-KEY'] = integration.credentials.secretKey;
        if (integration.credentials?.token) headers['TOKEN'] = integration.credentials.token;

        let url = integration.apiUrl;
        if (integration.credentials?.token && !url.includes('token=')) {
            url += (url.includes('?') ? '&' : '?') + `token=${integration.credentials.token}`;
        }

        const existingSample = await XmlProduct.findOne({ source: integration.code }).lean();
        let firstProduct = null;

        if (existingSample?.rawData) {
            firstProduct = existingSample.rawData;
        } else {
            const httpsAgent = new https.Agent({ rejectUnauthorized: false });

            let response;
            let products = [];

            if (['aslankardesler', 'aslankardesler_jant', 'aslan_kardesler_jant'].includes(integration.code)) {
                const markaKodu = ['aslankardesler_jant', 'aslan_kardesler_jant'].includes(integration.code) ? 'JANT' : 'LAST\u00ddK';
                const { parseStringPromise } = require('xml2js');
                const qs = new URLSearchParams({
                    Username: integration.credentials.userName,
                    Password: integration.credentials.password,
                    marka: markaKodu
                });
                const aslanUrl = `https://stockapi.afkyazilim.com.tr/api/Stock/GetStockXml?${qs}`;
                const apiRes = await axios.get(aslanUrl, { responseType: 'arraybuffer', timeout: 120000, httpsAgent });
                const xmlStr = Buffer.from(apiRes.data).toString('latin1');
                const parsed = await parseStringPromise(xmlStr, { explicitArray: false, mergeAttrs: true });
                const stoklar = parsed?.Stoklar?.Stok;
                const arr = Array.isArray(stoklar) ? stoklar : (stoklar ? [stoklar] : []);
                products = arr.map(p => {
                    const converted = {};
                    for (const key of Object.keys(p)) {
                        converted[key] = typeof p[key] === 'string'
                            ? Buffer.from(p[key], 'latin1').toString('utf8')
                            : p[key];
                    }
                    return converted;
                });
            } else if (integration.credentials?.userName) {
                response = await axios.post(url, {
                    UserName: integration.credentials.userName,
                    Password: integration.credentials.password,
                    CompanyCode: integration.credentials.companyCode,
                    stokCode: ''
                }, {
                    headers: { 'Content-Type': 'application/json' },
                    timeout: 120000,
                    httpsAgent
                });
            } else {
                response = await axios.get(url, {
                    headers,
                    timeout: 120000,
                    httpsAgent
                });
            }

            const findFirstArray = (obj, depth = 0) => {
                if (depth > 5) return null;
                for (const key of Object.keys(obj)) {
                    if (key === '$id') continue;
                    const val = obj[key];
                    if (key === '$values' && Array.isArray(val) && val.length > 0) return val[0];
                    if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') return val[0];
                    if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                        const found = findFirstArraySingle(val, depth + 1);
                        if (found) return found;
                    }
                }
                return null;
            };

            if (integration.format === 'xml') {
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
                let data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

                if (integration.dataPath) {
                    data = integration.dataPath.split('.').reduce((acc, key) => acc?.[key], data) ?? data;
                }

                if (typeof data === 'string') {
                    try { data = JSON.parse(data); } catch (e) { }
                }

                firstProduct = Array.isArray(data) ? data[0] : findFirstArraySingle(data);
            }
        }

        if (!firstProduct) {
            return res.status(400).json({ success: false, message: 'Ürün verisi bulunamadı' });
        }

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
        let integration = await WebXml.findById(req.params.id);
        if (!integration) {
            return res.status(404).json({ success: false, message: 'Entegrasyon bulunamadı' });
        }

        if (integration.format === 'json' && !['aslankardesler', 'aslankardesler_jant', 'aslan_kardesler_jant', 'lastikistan'].includes(integration.code)) {
            const xmlCode = integration.code + '_xml';
            const xmlIntegration = await WebXml.findOne({ code: xmlCode, format: 'xml' });
            if (!xmlIntegration) {
                return res.status(200).json({
                    success: false,
                    message: `${integration.name} için XML entegrasyonu (${xmlCode}) bulunamadı.`
                });
            }
            integration = xmlIntegration;
            req.params.id = xmlIntegration._id.toString();
        }

        const axios = require('axios');
        const { parseStringPromise } = require('xml2js');
        const crypto = require('crypto');

        const headers = {};
        if (integration.credentials?.apiKey) {
            headers[integration.credentials.apiKey.startsWith('lstk_') ? 'LSTK-IST' : 'API-KEY'] = integration.credentials.apiKey;
        }
        if (integration.credentials?.appKey) headers['APP-KEY'] = integration.credentials.appKey;
        if (integration.credentials?.secretKey) headers['SECRET-KEY'] = integration.credentials.secretKey;


        let url = integration.apiUrl;
        if (integration.credentials?.token && !url.includes('token=')) {
            url += (url.includes('?') ? '&' : '?') + `token=${integration.credentials.token}`;
        }

        const httpsAgent = new https.Agent({ rejectUnauthorized: false });

        let response;
        let products = [];

        if (['aslankardesler', 'aslankardesler_jant', 'aslan_kardesler_jant'].includes(integration.code)) {
            const markaKodu = ['aslankardesler_jant', 'aslan_kardesler_jant'].includes(integration.code) ? 'JANT' : 'LAST\u00ddK';
            const { parseStringPromise } = require('xml2js');
            const qs = new URLSearchParams({
                Username: integration.credentials.userName,
                Password: integration.credentials.password,
                marka: markaKodu
            });
            const aslanUrl = `https://stockapi.afkyazilim.com.tr/api/Stock/GetStockXml?${qs}`;
            const apiRes = await axios.get(aslanUrl, { responseType: 'arraybuffer', timeout: 120000, httpsAgent });
            const xmlStr = Buffer.from(apiRes.data).toString('latin1');
            const parsed = await parseStringPromise(xmlStr, { explicitArray: false, mergeAttrs: true });
            const stoklar = parsed?.Stoklar?.Stok;
            const arr = Array.isArray(stoklar) ? stoklar : (stoklar ? [stoklar] : []);
            products = arr.map(p => {
                const converted = {};
                for (const key of Object.keys(p)) {
                    converted[key] = typeof p[key] === 'string'
                        ? Buffer.from(p[key], 'latin1').toString('utf8')
                        : p[key];
                }
                return converted;
            });
        } else if (integration.credentials?.apiKey?.startsWith('lstk_')) {
            // Lastikistan — pagination destekli
            const allProducts = [];
            let pageNumber = 1;
            let totalPages = 1;
            do {
                const sep = url.includes('?') ? '&' : '?';
                const pageUrl = `${url}${sep}pageNumber=${pageNumber}&pageSize=100`;
                const apiRes = await axios.get(pageUrl, { headers, timeout: 120000, httpsAgent });
                const pdata = apiRes.data;
                allProducts.push(...(pdata.products || []));
                totalPages = pdata.totalPages || 1;
                pageNumber++;
            } while (pageNumber <= totalPages);
            products = allProducts;
        } else if (integration.credentials?.userName) {
            response = await axios.post(url, {
                UserName: integration.credentials.userName,
                Password: integration.credentials.password,
                CompanyCode: integration.credentials.companyCode,
                stokCode: ''
            }, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 120000,
                httpsAgent
            });
        } else {
            response = await axios.get(url, {
                headers,
                timeout: 120000,
                httpsAgent
            });
        }

        const findFirstArray = (obj, depth = 0) => {
            if (depth > 5) return null;
            for (const key of Object.keys(obj)) {
                if (key === '$id') continue;
                const val = obj[key];
                if (key === '$values' && Array.isArray(val)) return val;
                if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') return val;
                if (typeof val === 'object' && val !== null && !Array.isArray(val)) {
                    const found = findFirstArray(val, depth + 1);
                    if (found) return found;
                }
            }
            return null;
        };

        if (['aslankardesler', 'aslankardesler_jant', 'aslan_kardesler_jant'].includes(integration.code) || integration.credentials?.apiKey?.startsWith('lstk_')) {
        } else if (integration.format === 'xml') {
            const parsed1 = await parseStringPromise(response.data, { explicitArray: false, mergeAttrs: true });
            products = findFirstArray(parsed1) || [];

            if (products.length === 0) {
                const parsed2 = await parseStringPromise(response.data, { explicitArray: true, mergeAttrs: true });
                const rawProducts = findFirstArray(parsed2) || [];
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
            let data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

            if (integration.dataPath) {
                data = integration.dataPath.split('.').reduce((acc, key) => acc?.[key], data) ?? data;
            }

            if (typeof data === 'string') {
                try { data = JSON.parse(data); } catch (e) { }
            }

            products = Array.isArray(data) ? data : (findFirstArray(data) || []);
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