const axios = require('axios');
const crypto = require('crypto');
const XmlProduct = require('../../../models/plugins/xml/XmlProduct');
const DiaSettings = require('../../../models/plugins/dia/DiaSettings');

class XmlDiaMatchService {

    constructor() {
        this.sessionId = null;
        this.sessionExpireTime = null;
        this.config = null;
    }

    async loadConfig() {
        if (this.config) return;
        const settings = await DiaSettings.getSettings();
        this.config = {
            baseURL: settings.baseURL || process.env.DIA_BASE_URL,
            apiKey: settings.apiKey || process.env.DIA_API_KEY,
            username: settings.username || process.env.DIA_USERNAME,
            password: settings.password || process.env.DIA_PASSWORD,
            firmaKodu: settings.firmaKodu || parseInt(process.env.DIA_FIRMA_KODU) || 1,
            donemKodu: settings.donemKodu || parseInt(process.env.DIA_DONEM_KODU) || 3
        };
    }

    async login() {
        await this.loadConfig();
        if (this.sessionId && this.sessionExpireTime && new Date() < this.sessionExpireTime) {
            return this.sessionId;
        }
        const response = await axios.post(`${this.config.baseURL}/api/v3/sis/json`, {
            login: {
                username: this.config.username,
                password: this.config.password,
                disconnect_same_user: "True",
                params: { apikey: this.config.apiKey }
            }
        }, { timeout: 30000 });

        if (response.data?.code === '200') {
            this.sessionId = response.data.msg;
            this.sessionExpireTime = new Date(Date.now() + 60 * 60 * 1000);
            console.log('[XmlDiaMatchService] DIA login başarılı');
            return this.sessionId;
        }
        throw new Error('DIA login başarısız');
    }

    async fetchByAnabarkod(anabarkod) {
        const sessionId = await this.login();
        const response = await axios.post(`${this.config.baseURL}/api/v3/scf/json`, {
            scf_stokkart_detay_listele: {
                session_id: sessionId,
                firma_kodu: this.config.firmaKodu,
                donem_kodu: this.config.donemKodu,
                filters: [{ field: 'anabarkod', operator: '=', value: anabarkod }],
                limit: 1,
                offset: 0
            }
        }, { timeout: 30000 });

        if (response.data?.code === '200') {
            return response.data.result?.[0] || null;
        }
        return null;
    }
    async fetchAllXmlProducts() {
        const sessionId = await this.login();
        const allProducts = [];
        let offset = 0;
        const limit = 1000;

        while (true) {
            const response = await axios.post(`${this.config.baseURL}/api/v3/scf/json`, {
                scf_stokkart_detay_listele: {
                    session_id: sessionId,
                    firma_kodu: this.config.firmaKodu,
                    donem_kodu: this.config.donemKodu,
                    filters: [{ field: 'ozelkod10', operator: '=', value: 'XML (XML)' }],
                    limit,
                    offset
                }
            }, { timeout: 60000 });

            const result = response.data?.result || [];
            console.log(`[XmlDiaMatchService] offset ${offset}: ${result.length} kayıt`);
            allProducts.push(...result);

            if (result.length < limit) break;
            offset += limit;
        }

        console.log('[XmlDiaMatchService] Toplam XML ürün:', allProducts.length);
        return allProducts;
    }
    generateDiaHash(diaData) {
        const hashData = {
            _key: diaData._key || '',
            aciklama: diaData.aciklama || '',
            marka: diaData.marka || '',
            anabarkod: diaData.anabarkod || '',
            anabirimdesi: diaData.anabirimdesi || '',
            ozelkod1kodu: diaData.ozelkod1kodu || '',
            ozelkod2kodu: diaData.ozelkod2kodu || '',
            ozelkod3kodu: diaData.ozelkod3kodu || '',
            ozelkod4kodu: diaData.ozelkod4kodu || '',
            ozelkod5kodu: diaData.ozelkod5kodu || '',
            ozelkod6kodu: diaData.ozelkod6kodu || '',
            ozelkod7kodu: diaData.ozelkod7kodu || '',
            ozelkod8kodu: diaData.ozelkod8kodu || '',
            ozelkod9kodu: diaData.ozelkod9kodu || '',
            ozelkod10kodu: diaData.ozelkod10kodu || '',
            ozelkod11kodu: diaData.ozelkod11kodu || '',
            m_kategoriler: JSON.stringify((diaData.m_kategoriler || []).map(k => ({
                k1: k.kategori_aciklama_1, k2: k.kategori_aciklama_2
            }))),
            m_urunOzellikleri: JSON.stringify((diaData.m_urunOzellikleri || []).map(o => ({
                ad: o.ozellikadi, deger: o.detayaciklama
            })))
        };
        return crypto.createHash('md5').update(JSON.stringify(hashData)).digest('hex');
    }

    async matchAll() {
        const operationId = `xml_dia_match_${Date.now()}`;
        console.log(`[XmlDiaMatchService] Eşleştirme başladı: ${operationId}`);

        try {
            // Tüm entegrasyon kurallarını çek
            const WebXml = require('../../../models/plugins/xml/WebXml');
            const integrations = await WebXml.find({ isActive: true }).lean();
            const integrationMap = {};
            for (const intg of integrations) {
                integrationMap[intg.code] = intg;
            }

            const mappedProducts = await XmlProduct.find(
                {
                    status: { $in: ['mapped', 'pending', 'dia_matched'] },
                    'mappedData.hedefStokKodu': { $ne: null, $gt: '' }
                },
                { _id: 1, 'mappedData.hedefStokKodu': 1, diaDataHash: 1, source: 1, rawData: 1 }
            ).lean();

            if (mappedProducts.length === 0) {
                console.log('[XmlDiaMatchService] Eşleştirilecek ürün yok');
                return { success: true, matched: 0, skipped: 0, notFound: 0, filtered: 0, errors: 0 };
            }

            console.log(`[XmlDiaMatchService] ${mappedProducts.length} ürün bulundu`);

            await this.login();

            let matched = 0, skipped = 0, notFound = 0, filtered = 0, errors = 0;
            const CONCURRENCY = 10;
            const bulkOps = [];

            for (let i = 0; i < mappedProducts.length; i += CONCURRENCY) {
                const batch = mappedProducts.slice(i, i + CONCURRENCY);

                // Kural filtresi uygula
                const filteredBatch = batch.filter(xmlProduct => {
                    const intg = integrationMap[xmlProduct.source];
                    if (!intg) return true;

                    // excludeFromWebSync kaynakları DIA match'e tabi tutma
                    if (intg.excludeFromWebSync === true) { filtered++; return false; }

                    const rules = intg.rules || {};
                    const fieldMappings = rules.fieldMappings || [];
                    const rd = xmlProduct.rawData || {};

                    const getVal = (target) => {
                        const m = fieldMappings.find(m => m.target === target);
                        if (!m?.source) return null;
                        return m.source.split('.').reduce((acc, key) => acc?.[key], rd) ?? null;
                    };

                    const stok = parseFloat(getVal('stokAdeti') || 0);
                    const fiyat = parseFloat(getVal('hamFiyat') || 0);
                    const marka = getVal('marka');
                    const kategori = getVal('kategori');
                    const yil = String(getVal('uretimYili') || '');
                    const gorsel = getVal('gorselUrl');

                    if (rules.minStock > 0 && stok < rules.minStock) { filtered++; return false; }
                    if (rules.filters?.onlyInStock && stok <= 0) { filtered++; return false; }
                    if (rules.filters?.onlyWithPrice && !fiyat) { filtered++; return false; }
                    if (rules.filters?.onlyWithImage && !gorsel) { filtered++; return false; }
                    if (rules.excludedBrands?.length > 0 && marka && rules.excludedBrands.includes(marka)) { filtered++; return false; }
                    if (rules.excludedCategories?.length > 0 && kategori && rules.excludedCategories.includes(kategori)) { filtered++; return false; }
                    if (rules.excludedYears?.length > 0 && yil && rules.excludedYears.includes(yil)) { filtered++; return false; }

                    return true;
                });

                const results = await Promise.allSettled(
                    filteredBatch.map(xmlProduct => this.fetchByAnabarkod(xmlProduct.mappedData.hedefStokKodu))
                );

                for (let j = 0; j < filteredBatch.length; j++) {
                    const xmlProduct = filteredBatch[j];
                    const result = results[j];

                    if (result.status === 'rejected') {
                        errors++;
                        continue;
                    }

                    const diaData = result.value;
                    if (!diaData) {
                        notFound++;
                        continue;
                    }

                    const newHash = this.generateDiaHash(diaData);
                    if (xmlProduct.diaDataHash && xmlProduct.diaDataHash === newHash) {
                        // Hash aynı ama status dia_matched değilse düzelt
                        if (xmlProduct.status !== 'dia_matched') {
                            await XmlProduct.updateOne(
                                { _id: xmlProduct._id },
                                { $set: { diaKey: diaData._key, status: 'dia_matched' } }
                            );
                            matched++;
                        } else {
                            skipped++;
                        }
                        continue;
                    }

                    bulkOps.push({
                        updateOne: {
                            filter: { _id: xmlProduct._id },
                            update: {
                                $set: {
                                    diaKey: diaData._key,
                                    diaData: diaData,
                                    diaDataHash: newHash,
                                    status: 'dia_matched',
                                    lastMappedAt: new Date()
                                }
                            }
                        }
                    });
                    matched++;
                }

                if (bulkOps.length >= 500) {
                    await XmlProduct.bulkWrite(bulkOps.splice(0), { ordered: false });
                }

                if (i > 0 && i % 100 === 0) {
                    console.log(`[XmlDiaMatchService] ${i}/${mappedProducts.length} işlendi`);
                    this.sessionId = null;
                    await this.login();
                }
            }

            if (bulkOps.length > 0) {
                await XmlProduct.bulkWrite(bulkOps, { ordered: false });
            }

            console.log(`[XmlDiaMatchService] Tamamlandı — eşleşti: ${matched}, atlandı: ${skipped}, filtre dışı: ${filtered}, bulunamadı: ${notFound}, hata: ${errors}`);
            return { success: true, matched, skipped, filtered, notFound, errors };

        } catch (error) {
            console.error('[XmlDiaMatchService] Genel hata:', error.message);
            throw error;
        }
    }
}

module.exports = new XmlDiaMatchService();