/**
 * XML Sync Scheduler Kullanılmayacak
 * Dosya: apps/api/src/services/plugins/xml/XmlSyncScheduler.js
 */

const cron = require('node-cron');
const https = require('https');
const crypto = require('crypto');
const WebXml = require('../../../models/plugins/xml/WebXml');
const XmlProduct = require('../../../models/plugins/xml/XmlProduct');

const XmlWebProductSyncService = require('./XmlWebProductSyncService');
const { DEFAULT_SITE } = require('../../../config/sites');
const { getXmlFieldValue } = require('../../../utils/xmlFieldPath');
const saatlikTekIstek = require('./xmlSaatlikTekIstek');

class XmlSyncScheduler {
    constructor() {
        this.isRunning = false;
        this.isQuickSyncRunning = false;
    }

    start() {
        // XML çekme — her 15dk
        cron.schedule('*/15 * * * *', async () => {
            console.log('[XmlSyncScheduler] Kontrol başlatıldı:', new Date().toISOString());
            await this.checkAndSync();
        });

        // Fiyat/stok hızlı sync — her 15dk (XML çekmeyle aynı anda değil, 7dk kaymalı)
        cron.schedule('7-59/15 * * * *', async () => {
            await this.runQuickSync();
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
            try {
                await XmlWebProductSyncService.cleanupInactiveSources();
            } catch (cleanupErr) {
                console.error('[XmlSyncScheduler] Pasif kaynak temizliği hatası:', cleanupErr.message);
            }

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

            // Saatte tek istek hakkı olan kaynaklar (Keskin): tek kayıt istek atar, diğeri onun verisini kullanır
            const tekIstek = saatlikTekIstek.grupOf(integration.code);
            let aynaKaynak = null;
            if (tekIstek) {
                const uyeler = await saatlikTekIstek.aktifUyeler(tekIstek, WebXml);
                const cekici = uyeler[0];
                if (cekici && cekici.code !== integration.code) {
                    aynaKaynak = cekici.code;
                    const satirlar = await XmlProduct.find({ source: cekici.code }, { rawData: 1 }).lean();
                    products = satirlar.map(r => r.rawData).filter(Boolean);
                    if (products.length === 0) {
                        const mesaj = `${integration.name}: ${cekici.code} verisi henüz yok; tedarikçiye istek atılmadı, mevcut veri korunuyor`;
                        console.log(`[XmlSyncScheduler] ${mesaj}`);
                        return { atlandi: true, mesaj };
                    }
                } else {
                    const hak = await saatlikTekIstek.istekHakkiAl(tekIstek);
                    if (!hak.izin) {
                        const mesaj = `${integration.name} saatte 1 kez çekilebilir; yaklaşık ${hak.kalanDk} dk sonra yeniden çekilecek. İstek atılmadı, son çekilen veri kullanılıyor.`;
                        console.log(`[XmlSyncScheduler] ${mesaj}`);
                        return { atlandi: true, mesaj };
                    }
                }
            }

            const headers = {};
            if (integration.credentials?.apiKey) headers['API-KEY'] = integration.credentials.apiKey;
            if (integration.credentials?.appKey) headers['APP-KEY'] = integration.credentials.appKey;
            if (integration.credentials?.secretKey) headers['SECRET-KEY'] = integration.credentials.secretKey;

            let url = integration.apiUrl;
            if (integration.credentials?.token && !url.includes('token=')) {
                url += (url.includes('?') ? '&' : '?') + `token=${integration.credentials.token}`;
            }

            const httpsAgent = new https.Agent({ rejectUnauthorized: false });

            let response;

            // LSTK-IST header desteği (Lastikistan)
            if (integration.credentials?.apiKey?.startsWith('lstk_')) {
                headers['LSTK-IST'] = integration.credentials.apiKey;
                delete headers['API-KEY'];
            }

            if (aynaKaynak) {
                // Veri grubun çekici kaydından alındı; tedarikçiye istek atılmaz
            } else if (['aslankardesler', 'aslankardesler_jant', 'aslan_kardesler_jant'].includes(integration.code)) {
                // Aslan Kardeşler — GET + query param + latin1
                const { parseStringPromise: psp } = require('xml2js');
                const markaKodu = ['aslankardesler_jant', 'aslan_kardesler_jant'].includes(integration.code) ? 'JANT' : 'LAST\u00ddK';
                const qs = new URLSearchParams({
                    Username: integration.credentials.userName,
                    Password: integration.credentials.password,
                    marka: markaKodu
                });
                const aslanUrl = `https://stockapi.afkyazilim.com.tr/api/Stock/GetStockXml?${qs}`;
                const apiRes = await axios.get(aslanUrl, { responseType: 'arraybuffer', timeout: 120000, httpsAgent });
                const xmlStr = Buffer.from(apiRes.data).toString('latin1');
                const parsed = await psp(xmlStr, { explicitArray: false, mergeAttrs: true });
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
                // Lastikistan — GET + LSTK-IST header + pagination
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
                // POST — Tatko tipi
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
                // GET — Mollaoğlu ve diğerleri
                response = await axios.get(url, {
                    headers,
                    timeout: 120000,
                    responseType: 'text',
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

            // Aslan Kardeşler ve Lastikistan için products zaten yukarıda dolduruldu, parse atla
            const skipParse = !!aynaKaynak ||
                ['aslankardesler', 'aslankardesler_jant', 'aslan_kardesler_jant'].includes(integration.code) ||
                integration.credentials?.apiKey?.startsWith('lstk_');

            if (skipParse) {
                // products zaten dolu, parse bloğu atlanır
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
                // String JSON olabilir (Tatko Sonuc string döner)
                if (typeof data === 'string') {
                    try { data = JSON.parse(data); } catch (e) { }
                }
                products = Array.isArray(data) ? data : (findFirstArray(data) || []);
            }

            if (!Array.isArray(products) || products.length === 0) {
                throw new Error('Ürün listesi bulunamadı veya boş');
            }

            // Silme koruması (yalnız saatte tek istek grubu, yalnız tedarikçiden gelen yanıt için): sayı aniden
            // düştüyse hiçbir şeye dokunma. Çekici kaydın verisini kopyalayan kayıtta uygulanmaz — o veri zaten doğrulanmıştır.
            if (tekIstek && !aynaKaynak) {
                const oncekiSayi = await XmlProduct.countDocuments({ source: integration.code });
                const suphe = await saatlikTekIstek.supheliYanit(tekIstek, integration.code, products.length, oncekiSayi);
                if (suphe) throw new Error(suphe);
            }

            // Unver: STOK.DEPO array'inde DEPOID=0 (Tüm Depolar) entry'sini başa al
            // (site kopyaları da kapsanır: unver, unver_lastikjantavm ...)
            if (/^unver/.test(integration.code)) {
                products = products.map(p => {
                    const depoList = p?.STOK?.DEPO;
                    if (Array.isArray(depoList) && depoList.length > 1) {
                        const tumDepolar = depoList.find(d => String(d?.DEPOID) === '0');
                        if (tumDepolar) {
                            const others = depoList.filter(d => String(d?.DEPOID) !== '0');
                            p.STOK.DEPO = [tumDepolar, ...others];
                        }
                    }
                    return p;
                });
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

            // Ghost cleanup — kaynakta artık olmayan ürünleri sil ve reconsolidate et
            let ghostDeleted = 0;
            let reconsolidateStats = null;
            try {
                const currentIdSet = new Set(sourceProductIds);
                const staleProducts = await XmlProduct.find(
                    {
                        source: integration.code,
                        sourceProductId: { $nin: sourceProductIds }
                    },
                    { sourceProductId: 1, mappedData: 1 }
                ).lean();

                if (staleProducts.length > 0) {
                    const staleIds = staleProducts.map(p => p.sourceProductId);
                    const affectedHedefKodlar = staleProducts
                        .map(p => p.mappedData?.hedefStokKodu)
                        .filter(Boolean);

                    const deleteResult = await XmlProduct.deleteMany({
                        source: integration.code,
                        sourceProductId: { $in: staleIds }
                    });
                    ghostDeleted = deleteResult.deletedCount || 0;

                    console.log(`[XmlSyncScheduler] ${integration.name} — ${ghostDeleted} ghost ürün silindi`);

                    if (affectedHedefKodlar.length > 0) {
                        reconsolidateStats = await XmlWebProductSyncService.reconsolidate(affectedHedefKodlar, integration.site || DEFAULT_SITE);
                    }
                }

                // Bu fetch'te gelen ürünlerden: fiyat=0 veya stok=0 olanların hedefStokKodu'larını topla → reconsolidate
                // Böylece başka kaynakta varsa o aktifleşir, yoksa webproducts'tan silinir
                try {
                    const zeroProducts = await XmlProduct.find(
                        {
                            source: integration.code,
                            sourceProductId: { $in: sourceProductIds }
                        },
                        { mappedData: 1, rawData: 1 }
                    ).lean();

                    const fm = integration.rules?.fieldMappings || [];
                    const getMapped = (rd, target) => {
                        const m = fm.find(f => f.target === target);
                        if (!m?.source) return null;
                        return getXmlFieldValue(rd, m.source);
                    };

                    const zeroHedefKodlar = zeroProducts
                        .filter(p => {
                            const rd = p.rawData || {};
                            const rawF = getMapped(rd, 'hamFiyat') ?? rd.pricePlusTax ?? rd.Price;
                            const rawS = getMapped(rd, 'stokAdeti') ?? rd.StockNumber ?? rd.Stok;
                            const fiyat = parseFloat(String(rawF || 0).replace(',', '.')) || 0;
                            const stok = parseInt(String(rawS || 0).replace(/[^0-9]/g, '')) || 0;
                            return fiyat <= 0 || stok <= 0;
                        })
                        .map(p => p.mappedData?.hedefStokKodu)
                        .filter(Boolean);

                    if (zeroHedefKodlar.length > 0) {
                        const zeroStats = await XmlWebProductSyncService.reconsolidate(zeroHedefKodlar, integration.site || DEFAULT_SITE);
                        if (reconsolidateStats) {
                            reconsolidateStats.updated += zeroStats.updated;
                            reconsolidateStats.disabled += zeroStats.disabled;
                        } else {
                            reconsolidateStats = zeroStats;
                        }
                    }
                } catch (zeroErr) {
                    console.error(`[XmlSyncScheduler] ${integration.name} zero-stock cleanup hatası:`, zeroErr.message);
                }
            } catch (cleanupErr) {
                console.error(`[XmlSyncScheduler] ${integration.name} ghost cleanup hatası:`, cleanupErr.message);
            }

            const duration = Date.now() - startTime;


            await WebXml.findByIdAndUpdate(integration._id, {
                $set: {
                    'syncInfo.lastSyncAt': new Date(),
                    'syncInfo.lastSyncStatus': 'success',
                    'syncInfo.lastSyncType': 'auto',
                    'syncInfo.lastSyncMessage': `${products.length} ürün çekildi (${newCount} yeni, ${changedCount} değişmiş, ${unchangedCount} aynı, ${ghostDeleted} silinen${reconsolidateStats ? `, ${reconsolidateStats.updated} yeniden seçildi, ${reconsolidateStats.disabled} satıştan çekildi` : ''})${aynaKaynak ? ` — ${aynaKaynak} verisinden, tedarikçiye istek atılmadı` : ''}`,
                    'syncInfo.lastSyncDuration': duration,
                    'syncInfo.productCount': products.length
                }
            });

            console.log(`[XmlSyncScheduler] ${integration.name} tamamlandı: ${products.length} ürün, ${duration}ms`);

            // Çekici kayıt başarıyla çekildiyse grubun diğer kayıtları aynı veriyle hemen güncellenir (istek atılmadan)
            if (tekIstek && !aynaKaynak) {
                const digerleri = (await saatlikTekIstek.aktifUyeler(tekIstek, WebXml)).filter(u => u.code !== integration.code);
                for (const uye of digerleri) {
                    try {
                        await this.syncIntegration(uye);
                    } catch (uyeErr) {
                        console.error(`[XmlSyncScheduler] ${uye.name} (aynı veriden güncelleme) hatası:`, uyeErr.message);
                    }
                }
            }
            return { atlandi: false, urunSayisi: products.length };

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


    async runQuickSync() {
        if (this.isQuickSyncRunning) {
            console.log('[XmlSyncScheduler] Hızlı sync zaten çalışıyor, atlanıyor...');
            return;
        }
        this.isQuickSyncRunning = true;
        try {
            await XmlWebProductSyncService.quickSync();
        } catch (err) {
            console.error('[XmlSyncScheduler] Hızlı sync hatası:', err.message);
        } finally {
            this.isQuickSyncRunning = false;
        }
    }

    async manualSync(integrationId) {
        const integration = await WebXml.findById(integrationId);
        if (!integration) {
            throw new Error('Entegrasyon bulunamadı');
        }
        await this.syncIntegration(integration);
        // DIA aktarımı kaldırıldı — XML→WebProduct sync (kaynağın sitesi kapsamında)
        await XmlWebProductSyncService.fullSync(integration.site || DEFAULT_SITE);
    }

    async manualFullSync() {
        return await XmlWebProductSyncService.fullSync();
    }
}
const xmlSyncScheduler = new XmlSyncScheduler();

module.exports = xmlSyncScheduler;