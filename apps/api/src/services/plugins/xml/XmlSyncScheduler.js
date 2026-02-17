/**
 * XML Sync Scheduler
 * Dosya: apps/api/src/services/plugins/xml/XmlSyncScheduler.js
 */

const cron = require('node-cron');
const crypto = require('crypto');
const https = require('https');
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
                    await this.syncToDia(integration);
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
        console.log(`[XmlSyncScheduler] ${integration.name} XML çekme başlıyor...`);

        try {
            let products = [];

            if (integration.code === 'tatko') {
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
                    throw new Error('Tatko API hatası: ' + (response.data?.Hatakodu || 'Bilinmeyen'));
                }

                const raw = response.data.Sonuc;
                products = typeof raw === 'string' ? JSON.parse(raw) : raw;
            } else {
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
                throw new Error('Ürün listesi bulunamadı');
            }

            const getProductId = (p) => {
                if (integration.code === 'tatko') return p.stokkodu;
                return String(p.ProductID);
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

            let changedCount = 0;
            let unchangedCount = 0;
            let newCount = 0;

            const bulkOps = [];

            for (const product of products) {
                const pid = getProductId(product);
                const newHash = this.generateSyncHash(product, integration.code);
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

            console.log(`[XmlSyncScheduler] ${integration.name} XML çekildi: ${products.length} urun (${newCount} yeni, ${changedCount} değişmiş, ${unchangedCount} aynı), ${duration}ms`);

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