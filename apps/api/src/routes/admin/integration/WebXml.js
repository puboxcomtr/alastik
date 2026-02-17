/**
 * WebXml API Routes
 * Dosya: apps/api/src/routes/admin/webxml.js
 */

const express = require('express');
const router = express.Router();
const WebXml = require('../../../models/plugins/xml/WebXml');
const XmlProduct = require('../../../models/plugins/xml/XmlProduct');

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

// ============================================
// POST /api/admin/webxml/export-excel
// synced_to_dia olan ürünleri Excel'e aktar
// ============================================
router.post('/export-excel', async (req, res) => {
    try {
        const XLSX = require('xlsx');
        const path = require('path');
        const fs = require('fs');
        const { source } = req.body;

        const filter = { status: 'synced_to_dia' };
        if (source) filter.source = source;

        const products = await XmlProduct.find(filter).lean();

        if (!products || products.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Dışa aktarılacak ürün bulunamadı'
            });
        }

        const rows = products.map(p => {
            const raw = p.rawData || {};
            return {
                'Kaynak': p.source || '',
                'Kaynak Ürün ID': p.sourceProductId || '',
                'Ürün Adı': raw.ProductName || '',
                'Stok Kodu': raw.ProductCode || '',
                'Kısa Kod': raw.ProductShortCode || '',
                'Marka': raw.BrandName || '',
                'Fiyat (KDV Dahil)': raw.Price || '',
                'Fiyat (KDV Hariç)': raw.RetailPriceWithOrWithoutTax || '',
                'KDV Oranı': raw.TaxRatio || '',
                'Para Birimi': raw.CurrencyToken || '',
                'Stok Adedi': raw.StockNumberSort || '0',
                'Üretim Yılı (DOT)': raw.ProductionDate || '',
                'Kategori ID': raw.CategoryID || '',
                'Görsel URL': raw.ImageUrl || '',
                'Açıklama': raw.ProductDescription || '',
                'Son Çekilme': p.lastFetchedAt ? new Date(p.lastFetchedAt).toLocaleString('tr-TR') : '',
                'DIA Aktarım': p.lastSyncedToDiaAt ? new Date(p.lastSyncedToDiaAt).toLocaleString('tr-TR') : ''
            };
        });

        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(rows);

        ws['!cols'] = [
            { wch: 12 }, { wch: 14 }, { wch: 50 }, { wch: 18 },
            { wch: 18 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
            { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 12 },
            { wch: 14 }, { wch: 60 }, { wch: 60 }, { wch: 20 }, { wch: 20 }
        ];

        XLSX.utils.book_append_sheet(wb, ws, 'Ürünler');

        const exportDir = path.join(__dirname, '../../../../exports/xml');
        if (!fs.existsSync(exportDir)) {
            fs.mkdirSync(exportDir, { recursive: true });
        }

        const fileName = `xml-urunler-${source || 'tumu'}-${Date.now()}.xlsx`;
        const filePath = path.join(exportDir, fileName);
        XLSX.writeFile(wb, filePath);

        return res.json({
            success: true,
            message: `${rows.length} ürün Excel dosyasına aktarıldı`,
            data: { fileName, totalExported: rows.length }
        });
    } catch (error) {
        console.error('Excel export hatası:', error);
        return res.status(500).json({
            success: false,
            message: 'Excel dışa aktarma sırasında hata oluştu',
            error: error.message
        });
    }
});

// GET /api/admin/webxml/export-excel/download/:fileName
router.get('/export-excel/download/:fileName', async (req, res) => {
    try {
        const path = require('path');
        const fs = require('fs');
        const filePath = path.join(__dirname, '../../../../exports/xml', req.params.fileName);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, message: 'Dosya bulunamadı' });
        }

        res.download(filePath, req.params.fileName);
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Dosya indirme hatası' });
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
// GET /api/admin/integration/xml/dia-fields
// diastocks collection'daki alanları listele
// ============================================
router.get('/dia-fields', async (req, res) => {
    try {
        const db = require('mongoose').connection.db;
        const diastocksCollection = db.collection('diastocks');

        // Örnek bir doküman al
        const sampleDoc = await diastocksCollection.findOne({ durum: 'A' });

        if (!sampleDoc) {
            return res.status(404).json({
                success: false,
                message: 'diastocks collection boş'
            });
        }

        // Hariç tutulacak sistem alanları
        const excludeFields = [
            '_id', '__v', 'createdAt', 'updatedAt', 'syncInfo',
            '_cdate', '_date', 'm_kategoriler', 'm_urunOzellikleri'
        ];

        const fields = [];

        // Boş seçenek
        fields.push({ key: '', label: '-- Eşleştirme Yok --' });

        // Ana alanları ekle
        for (const key of Object.keys(sampleDoc)) {
            if (excludeFields.includes(key)) continue;

            const value = sampleDoc[key];
            const type = Array.isArray(value) ? 'array' : typeof value;

            // Array ve object olmayan alanları ekle
            if (type !== 'array' && type !== 'object') {
                fields.push({ key: key, label: key });
            }
        }

        // m_birimler içindeki fiyat alanlarını ekle
        if (sampleDoc.m_birimler && sampleDoc.m_birimler[0]) {
            const birim = sampleDoc.m_birimler[0];
            for (const key of Object.keys(birim)) {
                if (key.startsWith('fiyat') || key.startsWith('kdv')) {
                    fields.push({ key: `m_birimler.${key}`, label: `m_birimler.${key}` });
                }
            }
        }

        // m_resimler için görsel URL ekle
        fields.push({ key: 'm_resimler.aws_url', label: 'm_resimler.aws_url' });

        const sortedFields = [
            fields[0],
            ...fields.slice(1).sort((a, b) => a.label.localeCompare(b.label, 'tr'))
        ];

        res.json({
            success: true,
            data: {
                fields: sortedFields,
                totalFields: sortedFields.length - 1
            }
        });

    } catch (error) {
        console.error('DIA fields hatası:', error);
        res.status(500).json({
            success: false,
            message: 'DIA alanları yüklenirken hata oluştu',
            error: error.message
        });
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
            season = ''
        } = req.query;

        if (!source) {
            return res.status(400).json({
                success: false,
                message: 'source parametresi gerekli'
            });
        }

        const query = { source };

        // Durum filtresi
        if (status) {
            query.status = status;
        }

        // Marka filtresi
        if (brand) {
            if (source === 'tatko') {
                query['rawData.markaismi'] = brand;
            } else {
                query['rawData.BrandName'] = brand;
            }
        }

        // Mevsim filtresi
        if (season) {
            query['rawData.Season'] = season;
        }

        // Arama filtresi
        if (search) {
            query.$or = [
                { 'rawData.ProductName': { $regex: search, $options: 'i' } },
                { 'rawData.ProductCode': { $regex: search, $options: 'i' } },
                { 'rawData.BrandName': { $regex: search, $options: 'i' } },
                { sourceProductId: { $regex: search, $options: 'i' } }
            ];
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Filtre kurallarını çek
        const webXml = await WebXml.findOne({ code: source }).lean();
        const rules = webXml?.rules || {};

        // Filtre dışı sayısını hesapla (canlı, status değiştirmeden)
        const filteredOutConditions = [];

        if (rules.excludedBrands?.length > 0) {
            filteredOutConditions.push({ 'rawData.BrandName': { $in: rules.excludedBrands } });
        }
        if (rules.excludedYears?.length > 0) {
            filteredOutConditions.push({ 'rawData.ProductionDate': { $in: rules.excludedYears } });
        }
        if (rules.excludedCategories?.length > 0) {
            filteredOutConditions.push({ 'rawData.CategoryCode': { $in: rules.excludedCategories } });
        }
        if (rules.minStock > 0) {
            filteredOutConditions.push({
                $or: [
                    { 'rawData.StockNumberSort': '0' },
                    { 'rawData.StockNumberSort': { $exists: false } }
                ]
            });
        }

        let filteredOutCount = 0;
        if (filteredOutConditions.length > 0) {
            filteredOutCount = await XmlProduct.countDocuments({
                source,
                $or: filteredOutConditions
            });
        }

        const [items, total, brandList, statsAgg, diaKeyCount] = await Promise.all([
            XmlProduct.find(query)
                .sort({ updatedAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            XmlProduct.countDocuments(query),
            XmlProduct.distinct(
                source === 'tatko' ? 'rawData.markaismi' : 'rawData.BrandName',
                { source, [source === 'tatko' ? 'rawData.markaismi' : 'rawData.BrandName']: { $ne: null } }
            ),
            XmlProduct.aggregate([
                { $match: { source } },
                {
                    $group: {
                        _id: '$status',
                        count: { $sum: 1 }
                    }
                }
            ])
            ,
            XmlProduct.countDocuments({ source, diaKey: { $ne: null } })
        ]);

        // İstatistikleri düzenle
        const totalProducts = statsAgg.reduce((sum, s) => sum + s.count, 0);
        const stats = { total: totalProducts, diaAktarilan: diaKeyCount, filtered: filteredOutCount, pending: 0, error: 0 };
        for (const s of statsAgg) {
            if (s._id === 'pending') stats.pending = s.count;
            else if (s._id === 'error') stats.error = s.count;
        }

        // Verileri formatla
        const formatted = items.map(item => {
            const rd = item.rawData || {};
            const base = {
                id: item._id,
                sourceProductId: item.sourceProductId,
                source: item.source,
                status: item.status,
                errorMessage: item.errorMessage || null,
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
                lastFetchedAt: item.lastFetchedAt,
                lastSyncedToDiaAt: item.lastSyncedToDiaAt,
                syncHash: item.syncHash,
                diaKey: item.diaKey || null
            };

            if (source === 'tatko') {
                return {
                    ...base,
                    productName: rd.desen || '',
                    productCode: rd.stokkodu || '',
                    brandName: rd.markaismi || '',
                    categoryCode: rd.stokanagrup || '',
                    imageUrl: rd.desenresim || '',
                    retailPrice: '',
                    price: rd.kdvdahilfiyat || '',
                    taxRatio: '',
                    stockNumber: String(rd.miktar || '0'),
                    productionDate: rd.dot || '',
                    season: rd.mevsim || '',
                    runFlat: '',
                    oem: rd.Oem || '',
                    width: '',
                    profile: '',
                    rim: '',
                    loadIndex: '',
                    speedIndex: '',
                    kampanya: rd.kampanya || '',
                    depoAdi: rd.depoAdi || ''
                };
            }

            return {
                ...base,
                productName: rd.ProductName || '',
                productCode: rd.ProductCode || '',
                brandName: rd.BrandName || '',
                categoryCode: rd.CategoryCode || '',
                imageUrl: rd.ImageUrl || '',
                retailPrice: rd.RetailPrice || '',
                price: rd.Price || '',
                taxRatio: rd.TaxRatio || '',
                stockNumber: rd.StockNumberSort || '0',
                productionDate: rd.ProductionDate || '',
                season: rd.Season || '0',
                runFlat: rd.RunFlat || '0',
                oem: rd.OEM || '',
                width: rd.Field4 || '',
                profile: rd.Field5 || '',
                rim: rd.Field6 || '',
                loadIndex: rd.Field2 || '',
                speedIndex: rd.Field3 || ''
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
                brands: brandList.filter(Boolean).sort((a, b) => a.localeCompare(b, 'tr')),
                stats
            }
        });

    } catch (error) {
        console.error('XML products list hatası:', error);
        res.status(500).json({
            success: false,
            message: 'XML ürünleri listelenirken hata oluştu',
            error: error.message
        });
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

        const crypto = require('crypto');
        let products = [];

        // ========== KAYNAĞA GÖRE VERİ ÇEK ==========
        if (integration.code === 'tatko') {
            // TATKO: POST request, body credentials, Sonuc string olarak dönüyor
            const axios = require('axios');
            const response = await axios.post(integration.apiUrl, {
                UserName: integration.credentials.userName,
                Password: integration.credentials.password,
                CompanyCode: integration.credentials.companyCode,
                stokCode: ''
            }, {
                timeout: 60000,
                headers: { 'Content-Type': 'application/json' }
            });

            if (!response.data?.Basarili) {
                return res.status(400).json({ success: false, message: 'Tatko API hatası: ' + (response.data?.Hatakodu || 'Bilinmeyen') });
            }

            const raw = response.data.Sonuc;
            products = typeof raw === 'string' ? JSON.parse(raw) : raw;

        } else {
            // MOLLAOĞLU: GET request, header credentials
            const https = require('https');
            const url = new URL(`${integration.apiUrl}?token=${integration.credentials.token}`);

            const options = {
                hostname: url.hostname,
                port: url.port || 443,
                path: url.pathname + url.search,
                method: 'GET',
                headers: {
                    'API-KEY': integration.credentials.apiKey,
                    'APP-KEY': integration.credentials.appKey,
                    'SECRET-KEY': integration.credentials.secretKey,
                    'Content-Type': 'application/json'
                },
                rejectUnauthorized: false
            };

            const apiResponse = await new Promise((resolve, reject) => {
                const req = https.request(options, (response) => {
                    let data = '';
                    response.on('data', chunk => data += chunk);
                    response.on('end', () => {
                        try {
                            resolve(JSON.parse(data));
                        } catch (e) {
                            reject(new Error('JSON parse hatası'));
                        }
                    });
                });
                req.on('error', reject);
                req.setTimeout(120000, () => reject(new Error('Timeout')));
                req.end();
            });

            products = apiResponse;
            if (integration.dataPath) {
                const paths = integration.dataPath.split('.');
                for (const p of paths) {
                    products = products?.[p];
                }
            }
        }

        if (!Array.isArray(products)) {
            return res.status(400).json({ success: false, message: 'Ürün listesi bulunamadı' });
        }

        // ========== ÜRÜN ID VE HASH ALANLARI (KAYNAĞA GÖRE) ==========
        const getProductId = (p) => {
            if (integration.code === 'tatko') return p.stokkodu;
            return String(p.ProductID);
        };

        const getHashData = (p) => {
            if (integration.code === 'tatko') {
                return {
                    kdvdahilfiyat: p.kdvdahilfiyat || '',
                    miktar: p.miktar || '',
                    dot: p.dot || '',
                    stokkodu: p.stokkodu || '',
                    desen: p.desen || ''
                };
            }
            return {
                Price: p.Price || '',
                RetailPrice: p.RetailPrice || '',
                StockNumberSort: p.StockNumberSort || '',
                ProductionDate: p.ProductionDate || '',
                ProductCode: p.ProductCode || '',
                ProductName: p.ProductName || ''
            };
        };

        // ========== HASH KARŞILAŞTIRMA VE KAYIT ==========
        const sourceProductIds = products.map(p => getProductId(p));
        const existingProducts = await XmlProduct.find(
            { source: integration.code, sourceProductId: { $in: sourceProductIds } },
            { sourceProductId: 1, syncHash: 1 }
        ).lean();

        const existingMap = {};
        for (const ep of existingProducts) {
            existingMap[ep.sourceProductId] = ep.syncHash || null;
        }

        let newCount = 0, changedCount = 0, unchangedCount = 0;
        const bulkOps = [];

        for (const product of products) {
            const pid = getProductId(product);
            const hashStr = JSON.stringify(getHashData(product));
            const newHash = crypto.createHash('md5').update(hashStr).digest('hex');
            const oldHash = existingMap[pid];

            if (!oldHash) {
                bulkOps.push({
                    updateOne: {
                        filter: { source: integration.code, sourceProductId: pid },
                        update: {
                            $set: {
                                rawData: product,
                                lastFetchedAt: new Date(),
                                syncHash: newHash,
                                status: 'pending'
                            }
                        },
                        upsert: true
                    }
                });
                newCount++;
            } else if (oldHash !== newHash) {
                bulkOps.push({
                    updateOne: {
                        filter: { source: integration.code, sourceProductId: pid },
                        update: {
                            $set: {
                                rawData: product,
                                lastFetchedAt: new Date(),
                                syncHash: newHash,
                                status: 'pending'
                            }
                        }
                    }
                });
                changedCount++;
            } else {
                bulkOps.push({
                    updateOne: {
                        filter: { source: integration.code, sourceProductId: pid },
                        update: {
                            $set: {
                                rawData: product,
                                lastFetchedAt: new Date()
                            }
                        }
                    }
                });
                unchangedCount++;
            }
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
            data: {
                productCount: products.length,
                newCount,
                changedCount,
                unchangedCount
            }
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
        });

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

        const fieldMap = {
            mollaoglu: { brand: 'rawData.BrandName', year: 'rawData.ProductionDate', category: 'rawData.CategoryCode' },
            tatko: { brand: 'rawData.markaismi', year: 'rawData.dot', category: 'rawData.stokanagrup' }
        };
        const fields = fieldMap[sourceCode] || fieldMap.mollaoglu;

        // Kategoriler
        const categories = await XmlProduct.distinct(fields.category, {
            source: sourceCode,
            [fields.category]: { $ne: null, $ne: '' }
        });

        // Markalar
        const brands = await XmlProduct.distinct(fields.brand, {
            source: sourceCode,
            [fields.brand]: { $ne: null, $ne: '' }
        });

        // Yıllar
        const years = await XmlProduct.distinct(fields.year, {
            source: sourceCode,
            [fields.year]: { $ne: null, $ne: '' }
        });

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

// ============================================
// POST /api/admin/integration/xml/:id/sync-to-dia
// XML ürünlerini DIA'ya aktar
// ============================================
router.post('/:id/sync-to-dia', async (req, res) => {
    try {
        const { id } = req.params;
        const { testMode, productId } = req.body; // testMode: true ise tek ürün

        const XmlDiaService = require('../../../services/plugins/xml/XmlDiaService');

        let result;

        if (testMode && productId) {
            // Tek ürün test
            result = await XmlDiaService.syncSingleProduct(productId);
        } else {
            // Toplu sync
            const options = {};
            if (req.body.limit) options.limit = parseInt(req.body.limit);
            result = await XmlDiaService.syncToDia(id, options);
        }

        if (result.success) {
            res.json({
                success: true,
                message: 'DIA aktarımı tamamlandı',
                data: result.results || result
            });
        } else {
            res.status(400).json({
                success: false,
                message: result.message
            });
        }

    } catch (error) {
        console.error('DIA sync hatası:', error);
        res.status(500).json({
            success: false,
            message: 'DIA aktarımı sırasında hata oluştu',
            error: error.message
        });
    }
});

module.exports = router;