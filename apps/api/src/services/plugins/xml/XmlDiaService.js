/**
 * XML to DIA Sync Service
 * Dosya: apps/api/src/services/plugins/xml/XmlDiaService.js
 */

const axios = require('axios');
const logger = require('../../../utils/logger');
const WebXml = require('../../../models/plugins/xml/WebXml');
const XmlProduct = require('../../../models/plugins/xml/XmlProduct');

class XmlDiaService {
    constructor() {
        this.baseURL = process.env.DIA_BASE_URL;
        this.username = process.env.DIA_USERNAME;
        this.password = process.env.DIA_PASSWORD;
        this.apiKey = process.env.DIA_API_KEY;
        this.firmaKodu = parseInt(process.env.DIA_FIRMA_KODU) || 1;
        this.donemKodu = parseInt(process.env.DIA_DONEM_KODU) || 3;
        this.sessionId = null;
        this.isSyncingPriceAndStock = false;

        // DIA Sabit Degerler
        this.DIA_SUBE_KEY = 2033;
        this.DIA_DEPO_KEY = 7827691;
        this.DIA_DOVIZ_KEY = 2026;
    }

    // ===================== LOGIN & REQUEST =====================

    async login() {
        try {
            const response = await this.sendRequest('/api/v3/sis/json', {
                login: {
                    username: this.username,
                    password: this.password,
                    disconnect_same_user: "True",
                    params: { apikey: this.apiKey }
                }
            });

            if (response?.code === "200") {
                this.sessionId = response.msg;
                logger.info('[XmlDiaService] Login başarılı');
                return this.sessionId;
            }

            logger.error('[XmlDiaService] Login başarısız', { code: response?.code });
            return null;
        } catch (error) {
            logger.error('[XmlDiaService] Login hatası:', error.message);
            return null;
        }
    }

    async sendRequest(endpoint, data, retryCount = 0) {
        try {
            const url = `${this.baseURL}${endpoint}`;
            const response = await axios.post(url, data, {
                headers: { 'Content-Type': 'application/json' },
                timeout: 15000
            });

            if (response.data?.code === "401" || response.data?.code === "403") {
                if (retryCount < 2) {
                    logger.warn('[XmlDiaService] Session düşmüş, yenileniyor...');
                    await this.login();
                    const keys = Object.keys(data);
                    if (keys.length > 0 && data[keys[0]]?.session_id) {
                        data[keys[0]].session_id = this.sessionId;
                    }
                    return this.sendRequest(endpoint, data, retryCount + 1);
                }
            }

            return response.data;
        } catch (error) {
            if (retryCount < 2 && (error.code === 'ECONNABORTED' || error.message?.includes('timeout'))) {
                logger.warn('[XmlDiaService] Timeout, tekrar deneniyor...', { retry: retryCount + 1 });
                await this.login();
                const keys = Object.keys(data);
                if (keys.length > 0 && data[keys[0]]?.session_id) {
                    data[keys[0]].session_id = this.sessionId;
                }
                return this.sendRequest(endpoint, data, retryCount + 1);
            }
            throw error;
        }
    }

    // ===================== STOK KODU FORMATI =====================

    formatStokKodu(productCode, source) {
        if (source === 'tatko') return `${productCode}-XMLT`;
        return `${productCode}-XMLA`;
    }

    // ===================== DIA SORGULAMA =====================

    async checkStockExists(stokkartkodu) {
        try {
            const response = await this.sendRequest('/api/v3/scf/json', {
                scf_stokkart_listele: {
                    session_id: this.sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    filters: [
                        { field: "stokkartkodu", operator: "=", value: stokkartkodu }
                    ],
                    limit: 1,
                    offset: 0
                }
            });

            if (response?.code === "200" && response.result?.length > 0) {
                const r = response.result[0];
                return {
                    exists: true,
                    diaKey: r._key,
                    gercekStok: parseFloat(r.gercek_stok) || 0,
                    data: r
                };
            }

            return { exists: false };
        } catch (error) {
            logger.error('[XmlDiaService] Stok kontrol hatası:', error.message);
            return { exists: false, error: error.message };
        }
    }

    async getBirimKey(stokkartKey) {
        try {
            const response = await this.sendRequest('/api/v3/scf/json', {
                scf_stokkart_birimleri_listele: {
                    session_id: this.sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    filters: [
                        { field: "_key_scf_stokkart", operator: "=", value: parseInt(stokkartKey) }
                    ],
                    limit: 1
                }
            });

            if (response?.code === "200" && response.result?.length > 0) {
                return response.result[0];
            }

            return null;
        } catch (error) {
            logger.error('[XmlDiaService] Birim key alma hatası:', error.message);
            return null;
        }
    }

    // ===================== MALZEME FISI =====================

    async createMalzemeFisi(stokkartKey, birimKey, miktar, fisno, turu = "8") {
        try {
            const response = await this.sendRequest('/api/v3/scf/json', {
                scf_malzeme_fisi_ekle: {
                    session_id: this.sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    kart: {
                        turu: turu,
                        tarih: new Date().toISOString().split('T')[0],
                        fisno: fisno,
                        durum: "T",
                        aciklama1: turu === "8" ? "XML Tedarikçi Stok Girişi" : "XML Tedarikçi Stok Çıkışı",
                        _key_sis_sube: this.DIA_SUBE_KEY,
                        _key_sis_depo: this.DIA_DEPO_KEY,
                        _key_sis_doviz: this.DIA_DOVIZ_KEY,
                        dovizkuru: 1,
                        m_kalemler: [{
                            kalemturu: "MLZM",
                            _key_scf_stokkart: parseInt(stokkartKey),
                            _key_scf_stokkart_birimleri: parseInt(birimKey),
                            _key_sis_depo: this.DIA_DEPO_KEY,
                            miktar: Math.abs(miktar),
                            anamiktar: Math.abs(miktar),
                            _key_sis_doviz: this.DIA_DOVIZ_KEY,
                            dovizkuru: 1
                        }]
                    }
                }
            });

            if (response?.code === "200") {
                logger.info('[XmlDiaService] Malzeme fişi oluşturuldu', { fisno, turu, miktar });
                return { success: true, fisKey: response.key };
            }

            return { success: false, message: response?.msg || 'Malzeme fişi hatası' };
        } catch (error) {
            logger.error('[XmlDiaService] Malzeme fişi hatası:', error.message);
            return { success: false, message: error.message };
        }
    }

    async adjustStock(diaKey, xmlStok, diaGercekStok) {
        const fark = xmlStok - diaGercekStok;

        if (fark === 0) {
            return { success: true, stockWritten: false, message: 'Stok degişiklik yok' };
        }

        const birimData = await this.getBirimKey(diaKey);
        if (!birimData) {
            logger.warn('[XmlDiaService] Birim key bulunamadı', { diaKey });
            return { success: true, stockWritten: false };
        }

        const fisno = `XMLS${Date.now().toString().slice(-10)}`;
        const turu = fark > 0 ? "8" : "9";
        const result = await this.createMalzemeFisi(diaKey, birimData._key, Math.abs(fark), fisno, turu);

        if (result.success) {
            logger.info('[XmlDiaService] Stok ayarlandı', {
                diaKey, onceki: diaGercekStok, yeni: xmlStok, fark, turu: turu === "8" ? "Giriş" : "Çıkış"
            });
            return { success: true, stockWritten: true, fisKey: result.fisKey };
        }

        return { success: true, stockWritten: false, stockError: result.message };
    }

    // ===================== STOK KARTI ISLEMLERI =====================

    async createStockCard(mappedData) {
        try {
            const response = await this.sendRequest('/api/v3/scf/json', {
                scf_stokkart_ekle: {
                    session_id: this.sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    kart: {
                        stokkartkodu: mappedData.stokkartkodu,
                        aciklama: mappedData.aciklama,
                        stokkartturu: "TCR",
                        durum: "A",
                        anabarkod: mappedData.anabarkod || "",
                        kdvalis: mappedData.kdvalis || 20,
                        kdvsatis: mappedData.kdvsatis || 20,
                        firmaadi: "ARTVİN OTOMOTİV",
                        doviz1: "TL", doviz2: "TL", doviz3: "TL", doviz4: "TL",
                        b2c_durum: "H",
                        b2c_gonder: "H",
                        b2c_depomiktari: mappedData.stokMiktari || 0,
                        m_birimler: [{
                            _key_sis_stok_birim_listesi: { birimkod: "AD" },
                            birimadi: "Adet",
                            carpan: 1,
                            fiyat1: mappedData.fiyat1 || 0,
                            fiyat2: mappedData.fiyat2 || 0,
                            kdvdurumu1: "D",
                            kdvdurumu2: "D"
                        }]
                    }
                }
            });

            if (response?.code === "200") {
                logger.info('[XmlDiaService] Stok kartı oluşturuldu', {
                    stokkartkodu: mappedData.stokkartkodu, diaKey: response.key
                });
                return { success: true, diaKey: response.key };
            }

            return { success: false, message: response?.msg || 'Stok kartı oluşturma hatası' };
        } catch (error) {
            logger.error('[XmlDiaService] Stok kartı oluşturma hatası:', error.message);
            return { success: false, message: error.message };
        }
    }

    /**
     * Sadece fiyat + stok guncelle
     */
    async updateStockAndPrice(diaKey, mappedData, diaGercekStok) {
        const results = { priceUpdated: false, stockUpdated: false };
        // Fiyat guncelle
        if (mappedData.fiyat1) {
            try {
                const birimData = await this.getBirimKey(diaKey);
                if (birimData) {
                    const updateKart = {
                        _key: parseInt(birimData._key),
                        _key_scf_stokkart: parseInt(diaKey),
                        anabirim: birimData.anabirim || '1',
                        fiyat1: mappedData.fiyat1
                    };
                    if (mappedData.fiyat2) updateKart.fiyat2 = mappedData.fiyat2;

                    const response = await this.sendRequest('/api/v3/scf/json', {
                        scf_stokkart_birimleri_guncelle: {
                            session_id: this.sessionId,
                            firma_kodu: this.firmaKodu,
                            donem_kodu: this.donemKodu,
                            kart: updateKart
                        }
                    });

                    if (response?.code === "200") {
                        results.priceUpdated = true;
                    }
                }
            } catch (err) {
                logger.error('[XmlDiaService] Fiyat güncelleme hatası:', err.message);
            }
        }

        // b2c_depomiktari guncelle
        try {
            await this.sendRequest('/api/v3/scf/json', {
                scf_stokkart_guncelle: {
                    session_id: this.sessionId,
                    firma_kodu: this.firmaKodu,
                    donem_kodu: this.donemKodu,
                    kart: {
                        _key: parseInt(diaKey),
                        b2c_depomiktari: mappedData.stokMiktari || 0
                    }
                }
            });
        } catch (err) {
            logger.error('[XmlDiaService] b2c güncelleme hatası:', err.message);
        }

        // Stok fark hesabi
        const xmlStok = mappedData.stokMiktari || 0;
        const stockResult = await this.adjustStock(diaKey, xmlStok, diaGercekStok);
        results.stockUpdated = stockResult.stockWritten || false;

        return results;
    }

    // ===================== TEK URUN SYNC =====================

    async syncProductWithStock(mappedData, existingDiaKey = null) {
        let checkResult;

        if (existingDiaKey) {
            try {
                const response = await this.sendRequest('/api/v3/scf/json', {
                    scf_stokkart_listele: {
                        session_id: this.sessionId,
                        firma_kodu: this.firmaKodu,
                        donem_kodu: this.donemKodu,
                        filters: [{ field: "_key", operator: "=", value: parseInt(existingDiaKey) }],
                        limit: 1
                    }
                });
                if (response?.code === "200" && response.result?.length > 0) {
                    const r = response.result[0];
                    checkResult = { exists: true, diaKey: r._key, gercekStok: parseFloat(r.gercek_stok) || 0, data: r };
                } else {
                    checkResult = await this.checkStockExists(mappedData.stokkartkodu);
                }
            } catch {
                checkResult = await this.checkStockExists(mappedData.stokkartkodu);
            }
        } else {
            checkResult = await this.checkStockExists(mappedData.stokkartkodu);
        }

        let diaKey = checkResult?.diaKey;
        let action, stockWritten = false, priceUpdated = false;

        if (!checkResult.exists) {
            // Yeni kart oluştur
            const createResult = await this.createStockCard(mappedData);
            if (!createResult.success) {
                return { success: false, message: createResult.message, action: 'create_failed' };
            }
            diaKey = createResult.diaKey;
            action = 'created';

            if (!diaKey) {
                const recheck = await this.checkStockExists(mappedData.stokkartkodu);
                diaKey = recheck?.diaKey;
            }

            if (diaKey && (mappedData.stokMiktari || 0) > 0) {
                const birimData = await this.getBirimKey(diaKey);
                if (birimData) {
                    const fisno = `XMLS${Date.now().toString().slice(-10)}`;
                    const fisResult = await this.createMalzemeFisi(diaKey, birimData._key, mappedData.stokMiktari, fisno);
                    stockWritten = fisResult.success;
                }
            }
        } else {
            // Sadece fiyat + stok guncelle
            action = 'updated';
            const updateResult = await this.updateStockAndPrice(diaKey, mappedData, checkResult.gercekStok);
            stockWritten = updateResult.stockUpdated;
            priceUpdated = updateResult.priceUpdated;
        }

        return { success: true, diaKey, action, stockWritten, priceUpdated };
    }

    // ===================== MAPPING =====================

    mapXmlToDia(xmlProduct, fieldMappings, source) {
        const rawData = xmlProduct.rawData;
        const mapped = {};

        for (const mapping of fieldMappings) {
            const sourceValue = this.getNestedValue(rawData, mapping.source);
            if (sourceValue === undefined || sourceValue === null || sourceValue === '') continue;

            if (['fiyat1', 'fiyat2', 'fiyat3', 'fiyat4', 'fiyat10'].includes(mapping.target)) {
                mapped[mapping.target] = this.parsePrice(sourceValue);
            } else if (['gercek_stok', 'fiili_stok', 'b2c_depomiktari'].includes(mapping.target)) {
                mapped.stokMiktari = parseInt(sourceValue) || 0;
            } else if (['kdvalis', 'kdvsatis'].includes(mapping.target)) {
                mapped[mapping.target] = parseInt(sourceValue) || 20;
            } else if (mapping.target === '_key') {
                mapped.xmlProductId = sourceValue;
            } else {
                mapped[mapping.target] = sourceValue;
            }
        }

        if (source === 'tatko') {
            // DOT kontrolu
            const dot = rawData.dot;
            if (!dot || dot === '0' || String(dot).trim() === '') {
                mapped._skipSync = true;
                return mapped;
            }

            if (mapped.stokkartkodu) {
                if (!mapped.stokkartkodu.endsWith('-XMLT')) {
                    mapped.stokkartkodu = this.formatStokKodu(mapped.stokkartkodu, 'tatko');
                }
            } else {
                const stokkodu = rawData.stokkodu;
                if (!stokkodu) {
                    mapped._skipSync = true;
                    return mapped;
                }
                mapped.stokkartkodu = this.formatStokKodu(stokkodu, 'tatko');
            }

            if (!mapped.aciklama) mapped.aciklama = rawData.desen || '';
            if (!mapped.fiyat1 && rawData.kdvdahilfiyat) mapped.fiyat1 = this.parsePrice(rawData.kdvdahilfiyat);
            if (!mapped.stokMiktari && rawData.miktar) mapped.stokMiktari = parseInt(rawData.miktar) || 0;
            if (!mapped.kdvalis) mapped.kdvalis = 20;
            if (!mapped.kdvsatis) mapped.kdvsatis = 20;
            if (!mapped.marka && rawData.markaismi) mapped.marka = rawData.markaismi;
            if (!mapped.anabarkod && rawData.stokkodu) mapped.anabarkod = rawData.stokkodu;
        } else {
            // Mollaoğlu
            const productionDate = rawData.ProductionDate;
            if (!productionDate || productionDate === '0' || productionDate.trim() === '') {
                mapped._skipSync = true;
                return mapped;
            }

            if (mapped.stokkartkodu) {
                if (!mapped.stokkartkodu.endsWith('-XMLA')) {
                    mapped.stokkartkodu = this.formatStokKodu(mapped.stokkartkodu, 'mollaoglu');
                }
            } else {
                const productCode = rawData.ProductCode;
                if (!productCode) {
                    mapped._skipSync = true;
                    return mapped;
                }
                mapped.stokkartkodu = this.formatStokKodu(productCode, 'mollaoglu');
            }

            if (!mapped.aciklama) mapped.aciklama = rawData.ProductName || rawData.ProductDescription || '';
            if (!mapped.fiyat1 && rawData.Price) mapped.fiyat1 = this.parsePrice(rawData.Price);
            if (!mapped.fiyat1 && rawData.RetailPrice) mapped.fiyat1 = this.parsePrice(rawData.RetailPrice);
            if (!mapped.stokMiktari && rawData.StockNumberSort) mapped.stokMiktari = parseInt(rawData.StockNumberSort) || 0;
            if (!mapped.kdvalis) mapped.kdvalis = parseInt(rawData.TaxRatio) || 20;
            if (!mapped.kdvsatis) mapped.kdvsatis = parseInt(rawData.TaxRatio) || 20;
            if (!mapped.marka && rawData.BrandName) mapped.marka = rawData.BrandName;
            if (!mapped.anabarkod && rawData.ProductCode) mapped.anabarkod = rawData.ProductCode;
        }

        return mapped;
    }

    getNestedValue(obj, path) {
        return path.split('.').reduce((current, key) => {
            if (key === '$values' && Array.isArray(current)) return current;
            return current?.[key];
        }, obj);
    }

    parsePrice(priceStr) {
        if (typeof priceStr === 'number') return priceStr;
        if (!priceStr) return 0;
        return parseFloat(priceStr.toString().replace(/\./g, '').replace(',', '.')) || 0;
    }

    // ===================== TEK URUN SYNC =====================

    async syncSingleProduct(xmlProductId) {
        try {
            if (!await this.login()) return { success: false, message: 'DIA login başarısız' };
            const xmlProduct = await XmlProduct.findById(xmlProductId);
            if (!xmlProduct) return { success: false, message: 'XML ürünü bulunamadı' };

            const webXml = await WebXml.findOne({ code: xmlProduct.source });
            const mappedData = this.mapXmlToDia(xmlProduct, webXml?.rules?.fieldMappings || [], xmlProduct.source);
            if (mappedData._skipSync) {
                return { success: false, message: 'ProductionDate boş veya geçersiz, aktarım yapılmadı' };
            }
            const result = await this.syncProductWithStock(mappedData, xmlProduct.diaKey || null);

            if (result.success) {
                await XmlProduct.findByIdAndUpdate(xmlProductId, {
                    $set: {
                        mappedData,
                        diaKey: result.diaKey,
                        status: 'synced_to_dia',
                        lastSyncedToDiaAt: new Date()
                    }
                });
            }

            return result;
        } catch (error) {
            logger.error('[XmlDiaService] Sync hatası:', error.message);
            return { success: false, message: error.message };
        }
    }

    // ===================== TOPLU SYNC - SADECE PENDING =====================

    async syncToDia(integrationId, options = {}) {
        try {
            if (!await this.login()) return { success: false, message: 'DIA login başarısız' };

            const webXml = await WebXml.findById(integrationId);
            if (!webXml) return { success: false, message: 'Entegrasyon bulunamadı' };

            const rules = webXml.rules || {};
            const fieldMappings = rules.fieldMappings || [];
            const limit = options.limit || 0;
            const BATCH_SIZE = 50;

            // Sadece pending urunleri cek
            const filter = {
                source: webXml.code,
                status: 'pending'
            };

            const isTatko = webXml.code === 'tatko';

            if (rules.excludedCategories?.length > 0) {
                filter[isTatko ? 'rawData.stokanagrup' : 'rawData.CategoryCode'] = { $nin: rules.excludedCategories };
            }
            if (rules.excludedBrands?.length > 0) {
                filter[isTatko ? 'rawData.markaismi' : 'rawData.BrandName'] = { $nin: rules.excludedBrands };
            }
            if (rules.excludedYears?.length > 0) {
                filter[isTatko ? 'rawData.dot' : 'rawData.ProductionDate'] = { $nin: rules.excludedYears };
            }
            if (rules.minStock > 0) {
                if (isTatko) {
                    filter['rawData.miktar'] = { $gte: rules.minStock };
                } else {
                    filter['$expr'] = {
                        $gte: [
                            { $toInt: { $replaceAll: { input: '$rawData.StockNumberSort', find: '+', replacement: '' } } },
                            rules.minStock
                        ]
                    };
                }
            }
            if (rules.filters?.onlyInStock) {
                if (isTatko) {
                    filter['rawData.miktar'] = { ...filter['rawData.miktar'], $gt: 0 };
                } else {
                    filter['rawData.StockNumberSort'] = { $ne: '0', $exists: true };
                }
            }
            if (rules.filters?.onlyWithImage) {
                filter[isTatko ? 'rawData.desenresim' : 'rawData.ImageUrl'] = { $ne: '', $exists: true };
            }
            if (rules.filters?.onlyWithPrice) {
                if (isTatko) {
                    filter['rawData.kdvdahilfiyat'] = { $gt: 0, $exists: true };
                } else {
                    filter['rawData.Price'] = { $ne: '', $exists: true };
                }
            }

            // diaKey olan pending ürünleri ayrıca çek (stok sıfırlama için)
            const diaKeyFilter = {
                source: webXml.code,
                status: 'pending',
                diaKey: { $ne: null, $exists: true }
            };

            const [filteredProducts, diaKeyProducts] = await Promise.all([
                XmlProduct.find(filter).select('_id sourceProductId rawData diaKey').limit(limit > 0 ? limit : 0),
                XmlProduct.find(diaKeyFilter).select('_id sourceProductId rawData diaKey')
            ]);

            // Tekrarları önle — filteredProducts zaten varsa diaKeyProducts'tan çıkar
            const filteredIds = new Set(filteredProducts.map(p => p._id.toString()));
            const extraProducts = diaKeyProducts.filter(p => !filteredIds.has(p._id.toString()));
            const products = [...filteredProducts, ...extraProducts];

            const results = {
                total: products.length,
                created: 0,
                updated: 0,
                failed: 0,
                skipped: 0,
                stockWritten: 0,
                priceUpdated: 0,
                errors: []
            };

            if (products.length === 0) {
                logger.info('[XmlDiaService] Pending ürün yok, fiyat/stok kontrolü yapılıyor');
                await this.syncPriceAndStockForSynced(integrationId);
                return { success: true, results };
            }

            logger.info('[XmlDiaService] Toplu sync başladı', { pending: products.length });

            for (let i = 0; i < products.length; i++) {
                if (i > 0 && i % BATCH_SIZE === 0) {
                    logger.info('[XmlDiaService] Session yenileniyor', { islenen: i, toplam: products.length });
                    await this.login();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                const product = products[i];

                try {
                    const mappedData = this.mapXmlToDia(product, fieldMappings, webXml.code);

                    if (mappedData._skipSync) {
                        if (product.diaKey) {
                            const source = webXml.code;
                            const rawCode = source === 'tatko' ? product.rawData?.stokkodu : product.rawData?.ProductCode;
                            const stokkartkodu = rawCode ? this.formatStokKodu(rawCode, source) : null;
                            if (stokkartkodu) {
                                const checkResult = await this.checkStockExists(stokkartkodu);
                                if (checkResult.exists && checkResult.gercekStok > 0) {
                                    await this.adjustStock(product.diaKey, 0, checkResult.gercekStok);
                                    logger.info('[XmlDiaService] Eşik altı ürün stoku sıfırlandı', { diaKey: product.diaKey, stokkartkodu });
                                }
                            }
                        }
                        results.skipped++;
                        continue;
                    }

                    const syncResult = await this.syncProductWithStock(mappedData, product.diaKey || null);

                    if (syncResult.success) {
                        if (syncResult.action === 'created') results.created++;
                        else results.updated++;
                        if (syncResult.stockWritten) results.stockWritten++;
                        if (syncResult.priceUpdated) results.priceUpdated++;

                        await XmlProduct.findByIdAndUpdate(product._id, {
                            $set: {
                                mappedData,
                                diaKey: syncResult.diaKey,
                                status: 'synced_to_dia',
                                lastSyncedToDiaAt: new Date()
                            }
                        });
                    } else {
                        results.failed++;
                        if (results.errors.length < 50) {
                            results.errors.push({
                                productId: product.sourceProductId,
                                error: syncResult.message
                            });
                        }
                    }

                    await new Promise(resolve => setTimeout(resolve, 300));

                } catch (err) {
                    results.failed++;
                    if (results.errors.length < 50) {
                        results.errors.push({
                            productId: product.sourceProductId,
                            error: err.message
                        });
                    }
                    if (err.message?.includes('timeout') || err.message?.includes('session')) {
                        await this.login();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }

            logger.info('[XmlDiaService] Toplu sync tamamlandı', results);
            await this.syncPriceAndStockForSynced(integrationId);
            return { success: true, results };
        } catch (error) {
            logger.error('[XmlDiaService] Toplu sync hatası:', error.message);
            return { success: false, message: error.message };
        }
    }

    // =====================================================================
    // SYNCED URUNLER ICIN FIYAT & STOK GUNCELLEME
    // synced_to_dia olan urunlerin XML fiyat/stok degerlerini
    // DIA'daki degerlerle karsilastirir, farklilarsa gunceller
    // =====================================================================

    async syncPriceAndStockForSynced(integrationId) {
        if (this.isSyncingPriceAndStock) {
            logger.warn('[XmlDiaService] Fiyat/Stok sync zaten çalışıyor, atlanıyor...');
            return { success: false, message: 'Zaten çalışıyor' };
        }
        this.isSyncingPriceAndStock = true;
        try {
            if (!await this.login()) {
                this.isSyncingPriceAndStock = false;
                return { success: false, message: 'DIA login başarısız' };
            }
            const webXml = await WebXml.findById(integrationId);
            if (!webXml) return { success: false, message: 'Entegrasyon bulunamadı' };

            const fieldMappings = webXml.rules?.fieldMappings || [];
            const BATCH_SIZE = 50;

            // synced_to_dia olup diaKey'i olan urunleri cek
            const products = await XmlProduct.find({
                source: webXml.code,
                status: 'synced_to_dia',
                diaKey: { $ne: null, $exists: true },
                $expr: { $gt: ['$lastFetchedAt', '$lastSyncedToDiaAt'] }
            }).select('_id sourceProductId rawData diaKey mappedData').lean();

            const results = {
                total: products.length,
                checked: 0,
                priceUpdated: 0,
                stockUpdated: 0,
                skipped: 0,
                failed: 0,
                errors: []
            };

            if (products.length === 0) {
                logger.info('[XmlDiaService] Synced ürün yok, fiyat/stok kontrolü gerekmiyor');
                return { success: true, results };
            }

            logger.info('[XmlDiaService] Fiyat/Stok kontrolü başladı', { toplam: products.length, source: webXml.code });

            for (let i = 0; i < products.length; i++) {
                if (i > 0 && i % BATCH_SIZE === 0) {
                    logger.info('[XmlDiaService] Fiyat/Stok kontrol - session yenileniyor', { islenen: i, toplam: products.length });
                    await this.login();
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                const product = products[i];

                try {
                    // XML verisinden guncel fiyat ve stok al
                    const mappedData = this.mapXmlToDia(product, fieldMappings, webXml.code);

                    if (mappedData._skipSync) {
                        results.skipped++;
                        continue;
                    }

                    const xmlFiyat = mappedData.fiyat1 || 0;
                    const xmlStok = mappedData.stokMiktari || 0;

                    // DIA'dan guncel veriyi cek
                    let diaResponse;
                    try {
                        diaResponse = await this.sendRequest('/api/v3/scf/json', {
                            scf_stokkart_listele: {
                                session_id: this.sessionId,
                                firma_kodu: this.firmaKodu,
                                donem_kodu: this.donemKodu,
                                filters: [{ field: "_key", operator: "=", value: parseInt(product.diaKey) }],
                                limit: 1
                            }
                        });
                    } catch (err) {
                        results.failed++;
                        if (results.errors.length < 30) {
                            results.errors.push({ productId: product.sourceProductId, error: 'DIA sorgu hatası: ' + err.message });
                        }
                        continue;
                    }

                    if (diaResponse?.code !== "200" || !diaResponse.result?.length) {
                        results.skipped++;
                        continue;
                    }

                    const diaData = diaResponse.result[0];
                    const diaGercekStok = parseFloat(diaData.gercek_stok) || 0;

                    // DIA'daki fiyati al (birim uzerinden)
                    let diaFiyat = 0;
                    const birimData = await this.getBirimKey(product.diaKey);
                    if (birimData) {
                        diaFiyat = parseFloat(birimData.fiyat1) || 0;
                    }

                    // Fiyat farki kontrolu (kurus bazinda karsilastir)
                    const fiyatFarki = Math.abs(xmlFiyat - diaFiyat) > 0.01;
                    const stokFarki = xmlStok !== diaGercekStok;

                    if (!fiyatFarki && !stokFarki) {
                        results.checked++;
                        continue;
                    }

                    // Fark varsa guncelle
                    let priceOk = false;
                    let stockOk = false;

                    if (fiyatFarki && birimData) {
                        try {
                            const updateKart = {
                                _key: parseInt(birimData._key),
                                _key_scf_stokkart: parseInt(product.diaKey),
                                anabirim: birimData.anabirim || '1',
                                fiyat1: xmlFiyat
                            };
                            const priceResp = await this.sendRequest('/api/v3/scf/json', {
                                scf_stokkart_birimleri_guncelle: {
                                    session_id: this.sessionId,
                                    firma_kodu: this.firmaKodu,
                                    donem_kodu: this.donemKodu,
                                    kart: updateKart
                                }
                            });

                            if (priceResp?.code === "200") {
                                priceOk = true;
                                results.priceUpdated++;
                                logger.info('[XmlDiaService] Fiyat güncellendi', {
                                    stokkartkodu: diaData.stokkartkodu,
                                    eskiFiyat: diaFiyat,
                                    yeniFiyat: xmlFiyat
                                });
                            }
                        } catch (err) {
                            logger.error('[XmlDiaService] Fiyat güncelleme hatası:', { diaKey: product.diaKey, error: err.message });
                        }
                    }

                    if (stokFarki) {
                        const stockResult = await this.adjustStock(product.diaKey, xmlStok, diaGercekStok);
                        if (stockResult.stockWritten) {
                            stockOk = true;
                            results.stockUpdated++;
                        }
                    }

                    // b2c_depomiktari da guncelle
                    try {
                        await this.sendRequest('/api/v3/scf/json', {
                            scf_stokkart_guncelle: {
                                session_id: this.sessionId,
                                firma_kodu: this.firmaKodu,
                                donem_kodu: this.donemKodu,
                                kart: {
                                    _key: parseInt(product.diaKey),
                                    b2c_depomiktari: xmlStok
                                }
                            }
                        });
                    } catch (err) {
                        // sessiz hata
                    }

                    // mappedData guncelle
                    if (priceOk || stockOk) {
                        await XmlProduct.findByIdAndUpdate(product._id, {
                            $set: {
                                mappedData,
                                lastSyncedToDiaAt: new Date()
                            }
                        });
                    }

                    results.checked++;
                    await new Promise(resolve => setTimeout(resolve, 200));

                } catch (err) {
                    results.failed++;
                    if (results.errors.length < 30) {
                        results.errors.push({ productId: product.sourceProductId, error: err.message });
                    }
                    if (err.message?.includes('timeout') || err.message?.includes('session')) {
                        await this.login();
                        await new Promise(resolve => setTimeout(resolve, 2000));
                    }
                }
            }
            logger.info('[XmlDiaService] Fiyat/Stok kontrolü tamamlandı', results);
            this.isSyncingPriceAndStock = false;
            return { success: true, results };
        } catch (error) {
            logger.error('[XmlDiaService] Fiyat/Stok kontrol hatası:', error.message);
            this.isSyncingPriceAndStock = false;
            return { success: false, message: error.message };
        }
    }
}

module.exports = new XmlDiaService();