/**
 * XML Sync Scheduler
 * Dosya: apps/api/src/services/plugins/xml/XmlSyncScheduler.js
 */

const cron = require('node-cron');
const https = require('https');
const crypto = require('crypto');
const WebXml = require('../../../models/plugins/xml/WebXml');
const XmlProduct = require('../../../models/plugins/xml/XmlProduct');
const XmlDiaService = require('./XmlDiaService');

class XmlSyncScheduler {
    constructor() {
        this.isRunning = false;
    }

    start() {
        cron.schedule('*/15 * * * *', async () => {
            console.log('[XmlSyncScheduler] Kontrol başlatıldı:', new Date().toISOString());
            await this.checkAndSync();
        });

        console.log('[XmlSyncScheduler] Scheduler başlatıldı - Her 15 dakikada bir kontrol edilecek');
    }

    // ===================== XML CEK + PENDING DIA AKTAR =====================

    async checkAndSync() {
        if (this.isRunning) {
            console.log('[XmlSyncScheduler] Zaten çalışıyor, atlanıyor...');
            return;
        }

        this.isRunning = true;

        try {
            const dueIntegrations = await this.getDueIntegrations();

            if (dueIntegrations.length === 0) {
                console.log('[XmlSyncScheduler] Sync zamanı gelmiş entegrasyon yok');
                return;
            }

            console.log(`[XmlSyncScheduler] ${dueIntegrations.length} entegrasyon sync edilecek`);

            for (const integration of dueIntegrations) {
                try {
                    await this.syncIntegration(integration);
                } catch (err) {
                    console.error(`[XmlSyncScheduler] ${integration.name} sync hatası:`, err.message);
                }
            }

        } catch (error) {
            console.error('[XmlSyncScheduler] Genel hata:', error);
        } finally {
            this.isRunning = false;
        }
    }

    // ===================== YARDIMCI FONKSIYONLAR =====================

    async getDueIntegrations() {
        const now = new Date();

        return await WebXml.find({
            isActive: true,
            $or: [
                { 'syncInfo.lastSyncAt': null },
                {
                    $expr: {
                        $lt: [
                            { $add: ['$syncInfo.lastSyncAt', { $multiply: ['$syncInterval', 60000] }] },
                            now
                        ]
                    }
                }
            ]
        });
    }

    generateSyncHash(rawData) {
        const relevant = {
            Price: rawData.Price || '',
            RetailPrice: rawData.RetailPrice || '',
            StockNumberSort: rawData.StockNumberSort || '',
            ProductionDate: rawData.ProductionDate || '',
            ProductCode: rawData.ProductCode || '',
            ProductName: rawData.ProductName || ''
        };
        return crypto.createHash('md5').update(JSON.stringify(relevant)).digest('hex');
    }

    // XML kaynagindan urunleri cek - sadece degisenleri pending yap
    async syncIntegration(integration) {
        const startTime = Date.now();
        const axios = require('axios');
        const { parseStringPromise } = require('xml2js');
        console.log(`[XmlSyncScheduler] ${integration.name} XML çekme başlıyor...`);

        try {
            let products = [];

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

            if (integration.format === 'xml') {
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
                const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
                products = Array.isArray(data) ? data : (findFirstArray(data) || []);
            }

            if (!Array.isArray(products) || products.length === 0) {
                throw new Error('Ürün listesi bulunamadı veya boş');
            }

            // stokKodu mapping'inden ID tespiti
            const fieldMappings = integration.rules?.fieldMappings || [];
            const stokKoduMapping = fieldMappings.find(m => m.target === 'stokKodu');
            const getProductId = (p) => {
                if (stokKoduMapping?.source) return String(p[stokKoduMapping.source] ?? '');
                return String(Object.values(p)[0] ?? Math.random());
            };

            const sourceProductIds = products.map(p => getProductId(p));
            const existingProducts = await XmlProduct.find(
                { source: integration.code, sourceProductId: { $in: sourceProductIds } },
                { sourceProductId: 1, syncHash: 1 }
            ).lean();

            const existingMap = {};
            for (const ep of existingProducts) {
                existingMap[ep.sourceProductId] = ep.syncHash || null;
            }

            let changedCount = 0, unchangedCount = 0, newCount = 0;
            const bulkOps = [];

            for (const product of products) {
                const pid = getProductId(product);
                if (!pid) continue;
                const newHash = crypto.createHash('md5').update(JSON.stringify(product)).digest('hex');
                const oldHash = existingMap[pid];

                bulkOps.push({
                    updateOne: {
                        filter: { source: integration.code, sourceProductId: pid },
                        update: {
                            $set: {
                                rawData: product,
                                lastFetchedAt: new Date(),
                                syncHash: newHash,
                                ...(!oldHash || oldHash !== newHash ? { status: 'pending' } : {})
                            }
                        },
                        upsert: true
                    }
                });

                if (!oldHash) newCount++;
                else if (oldHash !== newHash) changedCount++;
                else unchangedCount++;
            }

            if (bulkOps.length > 0) await XmlProduct.bulkWrite(bulkOps);

            const duration = Date.now() - startTime;

            await WebXml.findByIdAndUpdate(integration._id, {
                $set: {
                    'syncInfo.lastSyncAt': new Date(),
                    'syncInfo.lastSyncStatus': 'success',
                    'syncInfo.lastSyncType': 'auto',
                    'syncInfo.lastSyncMessage': `${products.length} ürün çekildi (${newCount} yeni, ${changedCount} değişmiş, ${unchangedCount} aynı)`,
                    'syncInfo.lastSyncDuration': duration,
                    'syncInfo.productCount': products.length
                }
            });

            console.log(`[XmlSyncScheduler] ${integration.name} tamamlandı: ${products.length} ürün, ${duration}ms`);

        } catch (error) {
            const duration = Date.now() - startTime;
            await WebXml.findByIdAndUpdate(integration._id, {
                $set: {
                    'syncInfo.lastSyncAt': new Date(),
                    'syncInfo.lastSyncStatus': 'error',
                    'syncInfo.lastSyncType': 'auto',
                    'syncInfo.lastSyncMessage': error.message,
                    'syncInfo.lastSyncDuration': duration
                }
            });
            throw error;
        }
    }

    // DIA'ya sadece pending urunleri aktar
    async syncToDia(integration) {
        try {
            console.log(`[XmlSyncScheduler] ${integration.name} DIA aktarımı başlıyor...`);

            const result = await XmlDiaService.syncToDia(integration._id);

            if (result.success) {
                const r = result.results;
                console.log(`[XmlSyncScheduler] ${integration.name} DIA aktarım tamamlandı:`, {
                    toplam: r.total,
                    olusturulan: r.created,
                    guncellenen: r.updated,
                    stokYazilan: r.stockWritten,
                    fiyatGuncellenen: r.priceUpdated,
                    hatali: r.failed
                });
            } else {
                console.error(`[XmlSyncScheduler] ${integration.name} DIA aktarım hatası:`, result.message);
            }
        } catch (error) {
            console.error(`[XmlSyncScheduler] ${integration.name} DIA sync hatası:`, error.message);
        }
    }

    async manualSync(integrationId) {
        const integration = await WebXml.findById(integrationId);
        if (!integration) {
            throw new Error('Entegrasyon bulunamadı');
        }
        await this.syncIntegration(integration);
        await this.syncToDia(integration);
    }
}

const xmlSyncScheduler = new XmlSyncScheduler();

module.exports = xmlSyncScheduler;