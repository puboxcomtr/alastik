// apps/api/src/services/plugins/xml/XmlWebProductSyncService.js

const crypto = require('crypto');
const XmlProduct = require('../../../models/plugins/xml/XmlProduct');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebXml = require('../../../models/plugins/xml/WebXml');
const { getSyncRules } = require('../../../config/diaFilters');
const { SITES, DEFAULT_SITE, SITE_SLUGS } = require('../../../config/sites');
const { getXmlFieldValue } = require('../../../utils/xmlFieldPath');

// XML ürünleri web listelerinde görünsün diye aktif ozelkod11 koduyla damgalanır
function getAktifOzelkod() {
    const kod = getSyncRules().ozelkod11Kodu || 'E';
    return { kod, raw: `${kod} (${kod})` };
}

class XmlWebProductSyncService {

    generateSeoUrl(text) {
        if (!text) return null;
        return text
            .toLowerCase()
            .replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i')
            .replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u')
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '')
            .substring(0, 100);
    }

    generateSeoDescription(diaData, marka) {
        const parts = [];
        if (marka) parts.push(marka);
        if (diaData?.aciklama) parts.push(diaData.aciklama);
        return parts.join(' - ').substring(0, 160);
    }

    generateWebTags(diaData) {
        const tags = [];
        if (diaData?.marka) tags.push(diaData.marka.toLowerCase());
        if (diaData?.ozelkod3kodu) tags.push(diaData.ozelkod3kodu.toLowerCase());
        if (diaData?.m_kategoriler?.[0]) {
            const kat = diaData.m_kategoriler[0];
            if (kat.kategori_aciklama_1) tags.push(kat.kategori_aciklama_1.toLowerCase());
            if (kat.kategori_aciklama_2) tags.push(kat.kategori_aciklama_2.toLowerCase());
        }
        return [...new Set(tags)];
    }

    async generateUniqueSeoUrl(text, productKey, usedUrls = new Set()) {
        let seoUrl = this.generateSeoUrl(text);
        if (!seoUrl) seoUrl = 'urun-' + productKey;

        // DB'de çakışma var mı?
        const existing = await WebProduct.findOne({
            'customData.seoUrl': seoUrl,
            '_key': { $ne: productKey }
        }).lean();

        if (existing || usedUrls.has(seoUrl)) {
            let counter = 1;
            let candidate = `${seoUrl}-${counter}`;
            while (
                usedUrls.has(candidate) ||
                await WebProduct.findOne({ 'customData.seoUrl': candidate, '_key': { $ne: productKey } }).lean()
            ) {
                counter++;
                candidate = `${seoUrl}-${counter}`;
            }
            seoUrl = candidate;
        }

        return seoUrl;
    }

    // Entegrasyon kurallarına göre xmlproduct'ı filtrele
    parseStok(val) {
        if (!val) return 0;
        return parseInt(parseFloat(String(val).replace(/,/g, '.'))) || 0;
    }

    parseFiyat(val) {
        if (!val) return 0;
        const str = String(val).trim();
        let sayi = 0;
        if (str.includes(',') && str.includes('.')) {
            sayi = parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
        } else if (str.includes(',')) {
            sayi = parseFloat(str.replace(',', '.')) || 0;
        } else if (/^\d{1,3}(\.\d{3})+$/.test(str)) {
            sayi = parseFloat(str.replace(/\./g, '')) || 0;
        } else {
            sayi = parseFloat(str.replace(/[^0-9.]/g, '')) || 0;
        }
        return Math.ceil(sayi);
    }
    // Kaynaklar arasından geçerli olanlardan en ucuzunu seç
    // Geçerli kaynak: aktif entegrasyon + fiyat>0 + stok>0 + applyRules geçiyor
    selectBestSource(candidates, integrationMap) {
        let secilen = null;
        let secilenFiyat = Infinity;

        for (const xp of candidates) {
            const intg = integrationMap[xp.source];
            if (!intg || intg.isActive === false) continue;
            if (intg.excludeFromWebSync === true) continue;

            const fm = intg?.rules?.fieldMappings || [];
            const rd = xp.rawData || {};
            const getMapped = (target) => {
                const m = fm.find(f => f.target === target);
                if (!m?.source) return null;
                return getXmlFieldValue(rd, m.source);
            };

            const rawFiyat = getMapped('hamFiyat') ?? rd.pricePlusTax ?? rd.Price ?? rd.LISTE ?? rd.BAYI;
            const rawStok = getMapped('stokAdeti') ?? rd.StockNumber ?? rd.ADET ?? rd.MERKEZ_ADET;
            const fiyat = this.parseFiyat(rawFiyat);
            const stok = this.parseStok(rawStok);

            if (fiyat <= 0 || stok <= 0) continue;
            if (!this.applyRules(xp, intg)) continue;

            if (fiyat < secilenFiyat) {
                secilen = xp;
                secilenFiyat = fiyat;
            }
        }

        return secilen;
    }

    applyRules(xmlProduct, integration) {
        const rules = integration?.rules || {};
        const fieldMappings = rules.fieldMappings || [];
        const rd = xmlProduct.rawData || {};
        const getVal = (target) => {
            const m = fieldMappings.find(fm => fm.target === target);
            if (!m?.source) return null;
            return getXmlFieldValue(rd, m.source);
        };

        const stok = parseFloat(getVal('stokAdeti') ?? rd.StockNumber ?? 0);
        const fiyat = parseFloat(getVal('hamFiyat') ?? rd.Price ?? 0);
        const marka = getVal('marka') ?? rd.Brand;
        const kategori = getVal('kategori') ?? rd.Category3;
        const yil = String(getVal('uretimYili') ?? rd.Field1 ?? '');
        const gorsel = getVal('gorselUrl') ?? rd.ImageUrl ?? rd['Images.ProductImages.ImageUrl'];

        if (rules.minStock > 0 && stok < rules.minStock) return false;
        if (rules.filters?.onlyInStock && stok <= 0) return false;
        if (rules.filters?.onlyWithPrice && !fiyat) return false;
        if (rules.filters?.onlyWithImage && !gorsel) return false;
        if (rules.excludedBrands?.length > 0 && marka && rules.excludedBrands.includes(marka)) return false;
        if (rules.excludedCategories?.length > 0 && kategori && rules.excludedCategories.includes(kategori)) return false;
        if (rules.excludedYears?.length > 0 && yil && rules.excludedYears.includes(yil)) return false;

        return true;
    }

    // Tüm sitelerin XML→web aktarımı (site verilmezse hepsi sırayla, kendi kapsamında)
    async fullSync(site = null) {
        if (!site) {
            const totals = { success: true, created: 0, updated: 0, filtered: 0, errors: 0 };
            for (const s of SITE_SLUGS) {
                const r = await this.fullSyncForSite(s);
                totals.created += r.created; totals.updated += r.updated;
                totals.filtered += r.filtered; totals.errors += r.errors;
            }
            await this.updateShippingPrices();
            return totals;
        }
        const result = await this.fullSyncForSite(site);
        await this.updateShippingPrices();
        return result;
    }

    // Kargo dahil fiyatlar her site için ayrı hesaplanır (site fiyatı + sitenin XML kargosu)
    async updateShippingPrices() {
        const XmlShippingPriceUpdaterService = require('../../web/cargo/XmlShippingPriceUpdaterService');
        for (const s of SITE_SLUGS) {
            try {
                const shippingResult = await XmlShippingPriceUpdaterService.updateAll(s);
                console.log(`[XmlWebProductSync] Kargo dahil fiyatlar güncellendi (${s}): ${shippingResult.updated} ürün`);
            } catch (shipErr) {
                console.error(`[XmlWebProductSync] Kargo fiyat güncelleme hatası (${s}):`, shipErr.message);
            }
        }
    }

    // xmlproduct'tan webproducts'a tam aktarım — SADECE verilen sitenin kaynakları kapsamında
    async fullSyncForSite(site) {
        const operationId = `xml_web_full_sync_${site}_${Date.now()}`;
        console.log(`[XmlWebProductSync] Tam aktarım başladı (${site}): ${operationId}`);

        const siteCodes = await WebXml.getSiteCodes(site);
        if (siteCodes.length === 0) {
            console.log(`[XmlWebProductSync] ${site} için XML kaynağı yok, aktarım atlandı`);
            return { success: true, created: 0, updated: 0, filtered: 0, errors: 0 };
        }

        const integrations = await WebXml.find({ isActive: true, site }).lean();
        const integrationMap = {};
        for (const intg of integrations) {
            integrationMap[intg.code] = intg;
        }

        const xmlProducts = await XmlProduct.find(
            { diaKey: { $ne: null, $gt: '' }, source: { $in: siteCodes } },
            { diaKey: 1, diaData: 1, rawData: 1, source: 1, status: 1 }
        ).lean();

        console.log(`[XmlWebProductSync] ${xmlProducts.length} diaKey'li ürün bulundu`);

        // Aynı diaKey için en ucuz fiyatlı kaynağı seç
        // Aynı diaKey için kaynakları grupla, en ucuz geçerliyi seç
        const diaKeyCandidates = {};
        for (const xmlProduct of xmlProducts) {
            const diaKey = String(xmlProduct.diaKey);
            if (!diaKeyCandidates[diaKey]) diaKeyCandidates[diaKey] = [];
            diaKeyCandidates[diaKey].push(xmlProduct);
        }

        // Bu sitenin hiçbir XML kaynağında kaydı kalmayan (eşleştirmesi kaldırılmış) web ürünlerini sil
        const knownDiaKeys = Object.keys(diaKeyCandidates);
        if (knownDiaKeys.length > 0) {
            const keyVariants = [...knownDiaKeys, ...knownDiaKeys.map(Number).filter(n => !Number.isNaN(n))];
            const orphanResult = await WebProduct.deleteMany({
                'syncInfo.syncSource': 'xml_integration',
                'syncInfo.xmlSource': { $in: siteCodes },
                _key: { $nin: keyVariants }
            });
            if (orphanResult.deletedCount > 0) {
                console.log(`[XmlWebProductSync] fullSync — ${orphanResult.deletedCount} sahipsiz ürün silindi (XML kaynağında kaydı yok)`);
            }
        }

        const diaKeyMap = {};
        const invalidDiaKeys = [];
        for (const [diaKey, candidates] of Object.entries(diaKeyCandidates)) {
            const secilen = this.selectBestSource(candidates, integrationMap);
            if (secilen) {
                diaKeyMap[diaKey] = secilen;
            } else {
                invalidDiaKeys.push(diaKey);
            }
        }

        // Hiçbir geçerli kaynak kalmayan ürünleri webproducts'tan sil
        if (invalidDiaKeys.length > 0) {
            const hideResult = await WebProduct.updateMany(
                {
                    _key: { $in: invalidDiaKeys },
                    'syncInfo.syncSource': 'xml_integration',
                    'syncInfo.xmlSource': { $in: siteCodes }
                },
                {
                    $set: {
                        'diaData.gercek_stok': 0,
                        'diaData.m_birimler.0.miktar': 0,
                        'customData.webVisible': false,
                        'syncInfo.lastXmlSync': new Date()
                    }
                }
            );
            console.log(`[XmlWebProductSync] fullSync — ${hideResult.modifiedCount} geçersiz ürün gizlendi (stok 0)`);
        }

        const filteredXmlProducts = Object.values(diaKeyMap);

        // Mevcut webproducts _key listesi
        const existingKeys = await WebProduct.distinct('_key');
        const existingKeySet = new Set(existingKeys);

        const usedSeoUrls = new Set();
        const bulkOps = [];
        let created = 0, updated = 0, filtered = 0, errors = 0;

        const XmlPricingRule = require('../../../models/plugins/xml/XmlPricingRule');
        const allPricingRules = await XmlPricingRule.find({ site }).lean();

        // applyPricingRules yerine cache kullanan fonksiyon
        const applyPricingRulesFromCache = (hamFiyat, source, marka) => {
            const hesapla = (fiyat, rule) => {
                switch (rule.tip) {
                    case 'yuzde_artis': return fiyat * (1 + rule.deger / 100);
                    case 'yuzde_azalis': return fiyat * (1 - rule.deger / 100);
                    case 'sabit_artis': return fiyat + rule.deger;
                    case 'sabit_azalis': return Math.max(0, fiyat - rule.deger);
                    default: return fiyat;
                }
            };
            const applyPlatform = (platform) => {
                const rules = allPricingRules.filter(r => r.platform === platform &&
                    (r.source === '' || r.source === source) &&
                    (r.marka === '' || r.marka === marka));
                const markaRules = rules.filter(r => r.marka === marka && r.marka !== '');
                const genelRules = rules.filter(r => r.marka === '');
                const aktif = markaRules.length > 0 ? markaRules : genelRules;
                return aktif.reduce((f, r) => hesapla(f, r), hamFiyat);
            };
            return {
                alastikPrice: Math.round(applyPlatform('alastik') * 100) / 100,
                b2bPrice: Math.round(applyPlatform('b2b') * 100) / 100,
                b2cPrice: Math.round(applyPlatform('b2c') * 100) / 100,
                // Vitrine yazılan satış fiyatı sitenin fiyat platformundan hesaplanır (config/sites.js → xmlPricePlatform)
                sitePrice: Math.round(applyPlatform(SITES[site]?.xmlPricePlatform || 'alastik') * 100) / 100
            };
        };
        for (const xmlProduct of filteredXmlProducts) {
            try {
                const integration = integrationMap[xmlProduct.source];

                if (!this.applyRules(xmlProduct, integration)) {
                    filtered++;
                    continue;
                }

                const diaKey = String(xmlProduct.diaKey);
                const diaData = xmlProduct.diaData || {};
                const rd = xmlProduct.rawData || {};
                const fieldMappings = integration?.rules?.fieldMappings || [];

                const getMappedVal = (target) => {
                    const m = fieldMappings.find(fm => fm.target === target);
                    if (!m?.source) return null;
                    return getXmlFieldValue(rd, m.source);
                };

                const rawFiyat = getMappedVal('hamFiyat') ?? rd.pricePlusTax ?? rd.Price ?? rd.LISTE ?? rd.BAYI;
                const rawStok = getMappedVal('stokAdeti') ?? rd.StockNumber ?? rd.ADET ?? rd.MERKEZ_ADET;
                const rawFiyatKdvli = getMappedVal('hamFiyat') ?? rd.pricePlusTax ?? rd.Price;

                const hamFiyat = this.parseFiyat(rawFiyatKdvli) || 0;
                const gercekStok = this.parseStok(rawStok);
                const marka = getMappedVal('marka') ?? diaData.marka ?? '';

                const pricing = applyPricingRulesFromCache(hamFiyat, xmlProduct.source, marka);
                const webPrice = pricing.sitePrice || hamFiyat || null;

                const isNew = !existingKeySet.has(diaKey);
                const hamFiyatUpd = this.parseFiyat(rawFiyat);



                if (isNew) {
                    const seoUrl = await this.generateUniqueSeoUrl(
                        diaData.aciklama || diaData.stokkartkodu || diaKey,
                        diaKey,
                        usedSeoUrls
                    );
                    usedSeoUrls.add(seoUrl);

                    // Dış (tedarikçi) görseller kendi sunucumuza aynalanır — vitrin ve
                    // Merchant feed görselleri her zaman kendi alan adımızdan servis edilir
                    let mirroredImages = diaData.m_resimler;
                    try {
                        const ImageMirrorService = require('../../media/ImageMirrorService');
                        mirroredImages = await ImageMirrorService.mirrorProductImages(
                            diaData.m_resimler || [],
                            diaData.aciklama || diaData.stokkartkodu || diaKey
                        );
                    } catch (imgErr) {
                        console.warn(`[XmlWebProductSync] Görsel aynalama hatası (${diaKey}):`, imgErr.message);
                    }

                    const transformedDiaData = {
                        ...diaData,
                        m_resimler: mirroredImages,
                        gercek_stok: gercekStok,
                        anabirimdesi: parseFloat(diaData.anabirimdesi) || 0,
                        ozelkod11: getAktifOzelkod().raw,
                        ozelkod11kodu: getAktifOzelkod().kod,
                        m_birimler: diaData.m_birimler?.length > 0 ? [{
                            ...diaData.m_birimler[0],
                            fiyat1: hamFiyat,
                            fiyat4: pricing.sitePrice,
                            miktar: gercekStok
                        }] : [{
                            birimadi: 'Adet',
                            birimkod: 'AD',
                            carpan: 1,
                            fiyat1: hamFiyat,
                            fiyat4: pricing.sitePrice,
                            miktar: gercekStok
                        }]
                    };

                    const customData = {
                        seoUrl,
                        seoTitle: diaData.aciklama || '',
                        seoDescription: this.generateSeoDescription(diaData, diaData.marka),
                        seoKeywords: this.generateWebTags(diaData),
                        webOrder: 0,
                        webVisible: true,
                        webPrice,
                        originalPrice: webPrice,
                        webDiscount: 0,
                        discountType: 'percentage',
                        customDescription: null,
                        shortDescription: null,
                        webTags: null,
                        webCategory: null,
                        webSubCategory: null,
                        customImages: [],
                        featuredImage: null,
                        minOrderQuantity: 1,
                        maxOrderQuantity: null,
                        stockAlert: 5,
                        isNew: false,
                        isBestSeller: false,
                        isFeatured: false
                    };

                    bulkOps.push({
                        updateOne: {
                            filter: { _key: diaKey },
                            update: {
                                // sites yalnızca ilk eklemede atanır; sonradan yapılan
                                // site atamaları sync ile ezilmez
                                $setOnInsert: {
                                    sites: [site]
                                },
                                $set: {
                                    _key: diaKey,
                                    diaData: transformedDiaData,
                                    customData,
                                    pricingData: {
                                        hamFiyat: hamFiyat,
                                        alastikPrice: pricing.alastikPrice,
                                        b2bPrice: pricing.b2bPrice,
                                        b2cPrice: pricing.b2cPrice,
                                        lastPricingAt: new Date()
                                    },
                                    syncInfo: {
                                        lastDiaSync: new Date(),
                                        diaStatus: 'synced',
                                        webStatus: 'active',
                                        syncSource: 'xml_integration',
                                        xmlSource: xmlProduct.source,
                                        lastXmlSync: new Date()
                                    }
                                }
                            },
                            upsert: true
                        }
                    });
                    created++;
                } else {
                    // Mevcut ürün — m_birimler'i çekip güncelle
                    const existingProduct = await WebProduct.findOne(
                        { _key: diaKey },
                        { 'diaData.m_birimler': 1, 'syncInfo.xmlSource': 1 }
                    ).lean();

                    // Ürün başka sitenin kaynağından oluşmuşsa: siteyi ekle ve bu sitenin
                    // satış fiyatını siteData'ya yaz (sahibin fiyat/stok alanlarına dokunulmaz)
                    const ownedBySite = siteCodes.includes(existingProduct?.syncInfo?.xmlSource);
                    if (!ownedBySite) {
                        bulkOps.push({
                            updateOne: {
                                filter: { _key: diaKey },
                                update: {
                                    $addToSet: { sites: site },
                                    $set: {
                                        [`customData.siteData.${site}.xmlPrice`]: pricing.sitePrice,
                                        'syncInfo.lastXmlSync': new Date()
                                    }
                                }
                            }
                        });
                        updated++;
                        if (bulkOps.length >= 500) {
                            const opsToWrite = [...bulkOps];
                            bulkOps.length = 0;
                            await WebProduct.bulkWrite(opsToWrite, { ordered: false });
                        }
                        continue;
                    }

                    const mevcutBirimler = existingProduct?.diaData?.m_birimler || [];
                    const guncelBirimler = mevcutBirimler.length > 0
                        ? mevcutBirimler.map((b, i) => i === 0
                            ? { ...b, fiyat1: hamFiyatUpd, fiyat4: hamFiyatUpd, miktar: gercekStok }
                            : b
                        )
                        : [{ birimadi: 'Adet', birimkod: 'AD', carpan: 1, fiyat1: hamFiyatUpd, fiyat4: hamFiyatUpd, miktar: gercekStok }];

                    bulkOps.push({
                        updateOne: {
                            // Başka sitenin kaynağından oluşmuş ürün ezilmez (xmlSource site kapsamı)
                            filter: { _key: diaKey, 'syncInfo.xmlSource': { $in: siteCodes } },
                            update: {
                                $set: {
                                    'diaData.gercek_stok': gercekStok,
                                    'diaData.anabirimdesi': parseFloat(diaData.anabirimdesi) || 0,
                                    'diaData.ozelkod5': diaData.ozelkod5 || '',
                                    'diaData.ozelkod5kodu': diaData.ozelkod5kodu || '',
                                    'diaData.ozelkod11': getAktifOzelkod().raw,
                                    'diaData.ozelkod11kodu': getAktifOzelkod().kod,
                                    'diaData.m_birimler': guncelBirimler.map((b, i) => i === 0 ? { ...b, fiyat1: hamFiyat, fiyat4: pricing.sitePrice } : b),
                                    'customData.webPrice': webPrice,
                                    'customData.webVisible': true,
                                    'pricingData.hamFiyat': hamFiyat,
                                    'pricingData.alastikPrice': pricing.alastikPrice,
                                    'pricingData.b2bPrice': pricing.b2bPrice,
                                    'pricingData.b2cPrice': pricing.b2cPrice,
                                    'pricingData.lastPricingAt': new Date(),
                                    'syncInfo.lastXmlSync': new Date(),
                                    'syncInfo.syncSource': 'xml_integration',
                                    'syncInfo.xmlSource': xmlProduct.source
                                }
                            }
                        }
                    });
                    updated++;
                }

                if (bulkOps.length >= 500) {
                    const opsToWrite = [...bulkOps];
                    bulkOps.length = 0;
                    await WebProduct.bulkWrite(opsToWrite, { ordered: false });
                }

            } catch (err) {
                errors++;
                console.error(`[XmlWebProductSync] Ürün hatası (diaKey: ${xmlProduct.diaKey}):`, err.message);
            }
        }

        if (bulkOps.length > 0) {
            await WebProduct.bulkWrite(bulkOps, { ordered: false });
        }

        console.log(`[XmlWebProductSync] Tam aktarım tamamlandı (${site}) — oluşturulan: ${created}, güncellenen: ${updated}, filtrelenen: ${filtered}, hata: ${errors}`);

        return { success: true, created, updated, filtered, errors };
    }

    // 15 dakikada bir — sadece fiyat ve stok güncelle (site verilmezse tüm siteler)
    async quickSync(site = null) {
        if (!site) {
            const totals = { success: true, updated: 0, filtered: 0, errors: 0 };
            for (const s of SITE_SLUGS) {
                const r = await this.quickSyncForSite(s);
                totals.updated += r.updated; totals.filtered += r.filtered; totals.errors += r.errors;
            }
            await this.updateShippingPrices();
            return totals;
        }
        const result = await this.quickSyncForSite(site);
        await this.updateShippingPrices();
        return result;
    }

    async quickSyncForSite(site) {
        const operationId = `xml_web_quick_sync_${site}_${Date.now()}`;
        console.log(`[XmlWebProductSync] Hızlı sync başladı (${site}): ${operationId}`);

        const siteCodes = await WebXml.getSiteCodes(site);
        if (siteCodes.length === 0) {
            return { success: true, updated: 0, filtered: 0, errors: 0 };
        }

        const integrations = await WebXml.find({ isActive: true, site }).lean();
        const integrationMap = {};
        for (const intg of integrations) {
            integrationMap[intg.code] = intg;
        }

        const xmlProducts = await XmlProduct.find(
            {
                diaKey: { $ne: null, $gt: '' },
                source: { $in: siteCodes },
                lastFetchedAt: { $gte: new Date(Date.now() - 20 * 60 * 1000) }
            },
            { diaKey: 1, rawData: 1, source: 1, status: 1 }
        ).lean();

        console.log(`[XmlWebProductSync] ${xmlProducts.length} ürün hızlı sync edilecek`);

        // Aynı diaKey için en ucuz fiyatlı kaynağı seç
        // Aynı diaKey için kaynakları grupla, en ucuz geçerliyi seç
        // Quick sync için: pencereye giren diaKey'lerin TÜM kaynakları DB'den çek
        const windowDiaKeys = [...new Set(xmlProducts.map(p => String(p.diaKey)))];
        const allCandidates = await XmlProduct.find(
            {
                diaKey: { $in: windowDiaKeys },
                source: { $in: siteCodes }
            },
            { diaKey: 1, rawData: 1, source: 1, status: 1 }
        ).lean();

        const diaKeyCandidates = {};
        for (const xp of allCandidates) {
            const diaKey = String(xp.diaKey);
            if (!diaKeyCandidates[diaKey]) diaKeyCandidates[diaKey] = [];
            diaKeyCandidates[diaKey].push(xp);
        }

        const diaKeyMapQuick = {};
        const invalidQuickDiaKeys = [];
        for (const [diaKey, candidates] of Object.entries(diaKeyCandidates)) {
            const secilen = this.selectBestSource(candidates, integrationMap);
            if (secilen) {
                diaKeyMapQuick[diaKey] = secilen;
            } else {
                invalidQuickDiaKeys.push(diaKey);
            }
        }

        if (invalidQuickDiaKeys.length > 0) {
            const hideResult = await WebProduct.updateMany(
                {
                    _key: { $in: invalidQuickDiaKeys },
                    'syncInfo.syncSource': 'xml_integration',
                    'syncInfo.xmlSource': { $in: siteCodes }
                },
                {
                    $set: {
                        'diaData.gercek_stok': 0,
                        'diaData.m_birimler.0.miktar': 0,
                        'customData.webVisible': false,
                        'syncInfo.lastXmlSync': new Date()
                    }
                }
            );
            console.log(`[XmlWebProductSync] quickSync — ${hideResult.modifiedCount} geçersiz ürün gizlendi (stok 0)`);
        }

        const filteredQuickProducts = Object.values(diaKeyMapQuick);
        console.log(`[XmlWebProductSync] quickSync: ${filteredQuickProducts.length} unique ürün işlenecek`);

        const XmlPricingRuleQ = require('../../../models/plugins/xml/XmlPricingRule');
        const allPricingRulesQ = await XmlPricingRuleQ.find({ site }).lean();
        const applyPricingRulesFromCache = (hamFiyat, source, marka) => {
            const hesapla = (fiyat, rule) => {
                switch (rule.tip) {
                    case 'yuzde_artis': return fiyat * (1 + rule.deger / 100);
                    case 'yuzde_azalis': return fiyat * (1 - rule.deger / 100);
                    case 'sabit_artis': return fiyat + rule.deger;
                    case 'sabit_azalis': return Math.max(0, fiyat - rule.deger);
                    default: return fiyat;
                }
            };
            const applyPlatform = (platform) => {
                const rules = allPricingRulesQ.filter(r =>
                    r.platform === platform &&
                    (r.source === '' || r.source === source) &&
                    (r.marka === '' || r.marka === marka)
                );
                const markaRules = rules.filter(r => r.marka === marka && r.marka !== '');
                const genelRules = rules.filter(r => r.marka === '');
                const aktif = markaRules.length > 0 ? markaRules : genelRules;
                return aktif.reduce((f, r) => hesapla(f, r), hamFiyat);
            };
            return {
                alastikPrice: Math.round(applyPlatform('alastik') * 100) / 100,
                b2bPrice: Math.round(applyPlatform('b2b') * 100) / 100,
                b2cPrice: Math.round(applyPlatform('b2c') * 100) / 100,
                // Vitrine yazılan satış fiyatı sitenin fiyat platformundan hesaplanır (config/sites.js → xmlPricePlatform)
                sitePrice: Math.round(applyPlatform(SITES[site]?.xmlPricePlatform || 'alastik') * 100) / 100
            };
        };

        const bulkOps = [];
        let updated = 0, filtered = 0, errors = 0;

        for (const xmlProduct of filteredQuickProducts) {
            try {
                const integration = integrationMap[xmlProduct.source];

                if (!this.applyRules(xmlProduct, integration)) {
                    filtered++;
                    continue;
                }

                const diaKey = String(xmlProduct.diaKey);
                const rd = xmlProduct.rawData || {};
                const fieldMappings = integration?.rules?.fieldMappings || [];

                const getMappedVal = (target) => {
                    const m = fieldMappings.find(fm => fm.target === target);
                    if (!m?.source) return null;
                    return getXmlFieldValue(rd, m.source);
                };

                const rawFiyat = getMappedVal('hamFiyat') ?? rd.pricePlusTax ?? rd.Price ?? rd.LISTE ?? rd.BAYI;
                const rawStok = getMappedVal('stokAdeti') ?? rd.StockNumber ?? rd.ADET ?? rd.MERKEZ_ADET;
                const marka = getMappedVal('marka') ?? '';

                const hamFiyat = this.parseFiyat(rawFiyat) || 0;
                const gercekStok = this.parseStok(rawStok);

                const pricing = applyPricingRulesFromCache(hamFiyat, xmlProduct.source, marka);
                const webPrice = pricing.sitePrice || hamFiyat || null;

                // Başka sitenin kaynağından oluşmuş üründe yalnızca bu sitenin fiyatı güncellenir
                bulkOps.push({
                    updateOne: {
                        filter: { _key: diaKey, 'syncInfo.xmlSource': { $nin: siteCodes } },
                        update: {
                            $addToSet: { sites: site },
                            $set: {
                                [`customData.siteData.${site}.xmlPrice`]: pricing.sitePrice,
                                'syncInfo.lastXmlSync': new Date()
                            }
                        }
                    }
                });

                bulkOps.push({
                    updateOne: {
                        // Sahip site: fiyat/stok alanları tam güncellenir (xmlSource site kapsamı)
                        filter: { _key: diaKey, 'syncInfo.xmlSource': { $in: siteCodes } },
                        update: {
                            $set: {
                                'diaData.gercek_stok': gercekStok,
                                'diaData.m_birimler.0.fiyat1': hamFiyat,
                                'diaData.m_birimler.0.fiyat4': pricing.sitePrice,
                                'customData.webPrice': webPrice,
                                'customData.webVisible': true,
                                'pricingData.hamFiyat': hamFiyat,
                                'pricingData.alastikPrice': pricing.alastikPrice,
                                'pricingData.b2bPrice': pricing.b2bPrice,
                                'pricingData.b2cPrice': pricing.b2cPrice,
                                'pricingData.lastPricingAt': new Date(),
                                'syncInfo.lastXmlSync': new Date()
                            }
                        }
                    }
                });
                updated++;

                if (bulkOps.length >= 500) {
                    const opsToWrite = [...bulkOps];
                    bulkOps.length = 0;
                    await WebProduct.bulkWrite(opsToWrite, { ordered: false });
                }

            } catch (err) {
                errors++;
                console.error(`[XmlWebProductSync] Hızlı sync hatası (diaKey: ${xmlProduct.diaKey}):`, err.message);
            }
        }

        if (bulkOps.length > 0) {
            await WebProduct.bulkWrite(bulkOps, { ordered: false });
        }

        console.log(`[XmlWebProductSync] Hızlı sync tamamlandı — güncellenen: ${updated}, filtrelenen: ${filtered}, hata: ${errors}`);

        // Kargo dahil fiyatlar quickSync sarmalayıcısında (tüm siteler için bir kez) güncellenir

        return { success: true, updated, filtered, errors };
    }
    // Silinen xmlproduct'ların hedefStokKodu'larını yeniden değerlendir
    // - Başka kaynakta kaydı varsa en ucuzu seçip webproducts'ı günceller
    // - Hiç kaynak kalmadıysa webproducts'ta stok 0 + gizli yapar
    // Pasif entegrasyonların xmlproducts kayıtlarını sil ve webproducts'tan yeniden değerlendir
    async cleanupInactiveSources() {
        console.log('[XmlWebProductSync] Pasif kaynak temizliği başladı');

        // Pasif olan VEYA excludeFromWebSync olan kaynakları topla
        const inactiveIntegrations = await WebXml.find(
            { $or: [{ isActive: false }, { excludeFromWebSync: true }] },
            { code: 1, name: 1, excludeFromWebSync: 1, isActive: 1, site: 1 }
        ).lean();
        if (inactiveIntegrations.length === 0) {
            console.log('[XmlWebProductSync] Pasif/dışlanan entegrasyon yok');
            return { inactiveCount: 0, deletedXmlProducts: 0, reconsolidateStats: null };
        }

        // Pasif olanların xmlproducts'ları silinmeli, excludeFromWebSync'lerin xmlproducts'ı korunur (XML export için lazım)
        const trulyInactive = inactiveIntegrations.filter(i => i.isActive === false).map(i => i.code);
        const excludedCodes = inactiveIntegrations.map(i => i.code);

        console.log(`[XmlWebProductSync] Tamamen pasif: ${trulyInactive.join(', ') || 'yok'}`);
        console.log(`[XmlWebProductSync] Web sync'ten dışlanan: ${excludedCodes.join(', ')}`);

        // Dışlanan kaynaklardaki ürünlerin hedefStokKodu'larını SİLMEDEN ÖNCE topla (reconsolidate için)
        const staleProducts = await XmlProduct.find(
            { source: { $in: excludedCodes } },
            { mappedData: 1, source: 1 }
        ).lean();

        // Sadece tamamen pasif olanların xmlproducts kayıtlarını sil
        let deletedCount = 0;
        if (trulyInactive.length > 0) {
            const deleteResult = await XmlProduct.deleteMany({ source: { $in: trulyInactive } });
            deletedCount = deleteResult.deletedCount;
            console.log(`[XmlWebProductSync] ${deletedCount} pasif kaynak xmlproduct silindi`);
        }

        // Reconsolidate site bazlı yapılır — her sitenin kaynakları kendi kapsamında değerlendirilir
        let reconsolidateStats = null;
        for (const s of SITE_SLUGS) {
            const siteExcludedCodes = inactiveIntegrations
                .filter(i => (i.site || DEFAULT_SITE) === s)
                .map(i => i.code);
            if (siteExcludedCodes.length === 0) continue;

            const affectedHedefKodlar = staleProducts
                .filter(p => siteExcludedCodes.includes(p.source))
                .map(p => p.mappedData?.hedefStokKodu)
                .filter(Boolean);

            // Ayrıca webproducts'ta pasif xmlSource'lu ürünlerin hedefStokKodu'larını da topla
            const orphanWebProducts = await WebProduct.find(
                {
                    'syncInfo.syncSource': 'xml_integration',
                    'syncInfo.xmlSource': { $in: siteExcludedCodes }
                },
                { 'diaData.anabarkod': 1 }
            ).lean();

            const orphanHedefKodlar = orphanWebProducts
                .map(p => p.diaData?.anabarkod)
                .filter(Boolean);

            const allAffected = [...new Set([...affectedHedefKodlar, ...orphanHedefKodlar])];
            if (allAffected.length === 0) continue;

            const stats = await this.reconsolidate(allAffected, s);
            if (reconsolidateStats) {
                reconsolidateStats.updated += stats.updated;
                reconsolidateStats.disabled += stats.disabled;
                reconsolidateStats.errors += stats.errors;
                reconsolidateStats.reCandidates += stats.reCandidates;
            } else {
                reconsolidateStats = stats;
            }
        }

        console.log(`[XmlWebProductSync] Pasif kaynak temizliği tamamlandı`);
        return {
            inactiveCount: inactiveIntegrations.length,
            deletedXmlProducts: deletedCount,
            reconsolidateStats
        };
    }
    async reconsolidate(hedefStokKoduList, site = DEFAULT_SITE) {
        if (!Array.isArray(hedefStokKoduList) || hedefStokKoduList.length === 0) {
            return { reCandidates: 0, updated: 0, disabled: 0, errors: 0 };
        }

        const uniqueList = [...new Set(hedefStokKoduList.filter(Boolean))];
        console.log(`[XmlWebProductSync] reconsolidate başladı (${site}) — ${uniqueList.length} hedefStokKodu`);

        const siteCodes = await WebXml.getSiteCodes(site);
        const integrations = await WebXml.find({ isActive: true, site }).lean();
        const integrationMap = {};
        for (const intg of integrations) integrationMap[intg.code] = intg;

        const XmlPricingRule = require('../../../models/plugins/xml/XmlPricingRule');
        const allPricingRules = await XmlPricingRule.find({ site }).lean();

        const applyPricingRulesFromCache = (hamFiyat, source, marka) => {
            const hesapla = (fiyat, rule) => {
                switch (rule.tip) {
                    case 'yuzde_artis': return fiyat * (1 + rule.deger / 100);
                    case 'yuzde_azalis': return fiyat * (1 - rule.deger / 100);
                    case 'sabit_artis': return fiyat + rule.deger;
                    case 'sabit_azalis': return Math.max(0, fiyat - rule.deger);
                    default: return fiyat;
                }
            };
            const applyPlatform = (platform) => {
                const rules = allPricingRules.filter(r =>
                    r.platform === platform &&
                    (r.source === '' || r.source === source) &&
                    (r.marka === '' || r.marka === marka)
                );
                const markaRules = rules.filter(r => r.marka === marka && r.marka !== '');
                const genelRules = rules.filter(r => r.marka === '');
                const aktif = markaRules.length > 0 ? markaRules : genelRules;
                return aktif.reduce((f, r) => hesapla(f, r), hamFiyat);
            };
            return {
                alastikPrice: Math.round(applyPlatform('alastik') * 100) / 100,
                b2bPrice: Math.round(applyPlatform('b2b') * 100) / 100,
                b2cPrice: Math.round(applyPlatform('b2c') * 100) / 100,
                // Vitrine yazılan satış fiyatı sitenin fiyat platformundan hesaplanır (config/sites.js → xmlPricePlatform)
                sitePrice: Math.round(applyPlatform(SITES[site]?.xmlPricePlatform || 'alastik') * 100) / 100
            };
        };

        // Kalan xmlproducts kayıtlarını toplu çek (sadece bu sitenin kaynakları)
        const remaining = await XmlProduct.find(
            {
                diaKey: { $ne: null, $gt: '' },
                source: { $in: siteCodes },
                'mappedData.hedefStokKodu': { $in: uniqueList }
            },
            { diaKey: 1, rawData: 1, source: 1, mappedData: 1, status: 1 }
        ).lean();

        // hedefStokKodu -> xmlproducts[]
        const grouped = {};
        for (const xp of remaining) {
            const hsk = xp.mappedData?.hedefStokKodu;
            if (!hsk) continue;
            if (!grouped[hsk]) grouped[hsk] = [];
            grouped[hsk].push(xp);
        }

        const bulkOps = [];
        let updated = 0, disabled = 0, errors = 0;

        for (const hsk of uniqueList) {
            try {

                const candidates = grouped[hsk] || [];
                if (candidates.length === 0) {
                    // Hiç kaynak kalmadı — gizle (stok 0 + webVisible false)
                    bulkOps.push({
                        updateOne: {
                            filter: { 'diaData.anabarkod': hsk, 'syncInfo.syncSource': 'xml_integration', 'syncInfo.xmlSource': { $in: siteCodes } },
                            update: {
                                $set: {
                                    'diaData.gercek_stok': 0,
                                    'diaData.m_birimler.0.miktar': 0,
                                    'customData.webVisible': false,
                                    'syncInfo.lastXmlSync': new Date()
                                }
                            }
                        }
                    });
                    disabled++;
                    continue;
                }

                // En ucuz kaynağı seç (fullSync ile aynı mantık)
                const secilen = this.selectBestSource(candidates, integrationMap);

                if (!secilen) {
                    // Geçerli kaynak yok — gizle (stok 0 + webVisible false)
                    bulkOps.push({
                        updateOne: {
                            filter: { 'diaData.anabarkod': hsk, 'syncInfo.syncSource': 'xml_integration', 'syncInfo.xmlSource': { $in: siteCodes } },
                            update: {
                                $set: {
                                    'diaData.gercek_stok': 0,
                                    'diaData.m_birimler.0.miktar': 0,
                                    'customData.webVisible': false,
                                    'syncInfo.lastXmlSync': new Date()
                                }
                            }
                        }
                    });
                    disabled++;
                    continue;
                }

                const intg = integrationMap[secilen.source];

                const fm = intg?.rules?.fieldMappings || [];
                const rd = secilen.rawData || {};
                const getMappedVal = (target) => {
                    const m = fm.find(f => f.target === target);
                    if (!m?.source) return null;
                    return getXmlFieldValue(rd, m.source);
                };

                const rawFiyat = getMappedVal('hamFiyat') ?? rd.pricePlusTax ?? rd.Price ?? rd.LISTE ?? rd.BAYI;
                const rawStok = getMappedVal('stokAdeti') ?? rd.StockNumber ?? rd.ADET ?? rd.MERKEZ_ADET;
                const marka = getMappedVal('marka') ?? '';

                const hamFiyat = this.parseFiyat(rawFiyat) || 0;
                const gercekStok = this.parseStok(rawStok);
                const pricing = applyPricingRulesFromCache(hamFiyat, secilen.source, marka);
                const webPrice = pricing.sitePrice || hamFiyat || null;

                bulkOps.push({
                    updateOne: {
                        filter: { 'diaData.anabarkod': hsk, 'syncInfo.syncSource': 'xml_integration', 'syncInfo.xmlSource': { $in: siteCodes } },
                        update: {
                            $set: {
                                'diaData.gercek_stok': gercekStok,
                                'diaData.m_birimler.0.fiyat1': hamFiyat,
                                'diaData.m_birimler.0.fiyat4': pricing.sitePrice,
                                'diaData.m_birimler.0.miktar': gercekStok,
                                'customData.webPrice': webPrice,
                                'customData.webVisible': true,
                                'pricingData.hamFiyat': hamFiyat,
                                'pricingData.alastikPrice': pricing.alastikPrice,
                                'pricingData.b2bPrice': pricing.b2bPrice,
                                'pricingData.b2cPrice': pricing.b2cPrice,
                                'pricingData.lastPricingAt': new Date(),
                                'syncInfo.lastXmlSync': new Date(),
                                'syncInfo.syncSource': 'xml_integration',
                                'syncInfo.xmlSource': secilen.source
                            }
                        }
                    }
                });
                updated++;

                if (bulkOps.length >= 500) {
                    const opsToWrite = [...bulkOps];
                    bulkOps.length = 0;
                    await WebProduct.bulkWrite(opsToWrite, { ordered: false });
                }
            } catch (err) {
                errors++;
                console.error(`[XmlWebProductSync] reconsolidate hatası (${hsk}):`, err.message);
            }
        }

        if (bulkOps.length > 0) {
            await WebProduct.bulkWrite(bulkOps, { ordered: false });
        }

        console.log(`[XmlWebProductSync] reconsolidate tamamlandı — güncellenen: ${updated}, satıştan çekilen: ${disabled}, hata: ${errors}`);
        return { reCandidates: uniqueList.length, updated, disabled, errors };
    }

    async applyPricingRules(hamFiyat, source, marka) {
        const XmlPricingRule = require('../../../models/plugins/xml/XmlPricingRule');

        const rules = await XmlPricingRule.find({
            $or: [
                { source: source, marka: marka },
                { source: source, marka: '' },
                { source: '', marka: marka },
                { source: '', marka: '' }
            ]
        }).sort({ sira: 1 }).lean();

        const hesapla = (fiyat, rule) => {
            switch (rule.tip) {
                case 'yuzde_artis': return fiyat * (1 + rule.deger / 100);
                case 'yuzde_azalis': return fiyat * (1 - rule.deger / 100);
                case 'sabit_artis': return fiyat + rule.deger;
                case 'sabit_azalis': return Math.max(0, fiyat - rule.deger);
                default: return fiyat;
            }
        };

        const applyPlatformRules = (platform) => {
            const platformRules = rules.filter(r => r.platform === platform);
            const markaRules = platformRules.filter(r => r.marka === marka && r.marka !== '');
            const genelRules = platformRules.filter(r => r.marka === '');

            // Markaya özel kural varsa sadece onu uygula, genel kuralı atlat
            const aktifRules = markaRules.length > 0 ? markaRules : genelRules;
            return aktifRules.reduce((f, r) => hesapla(f, r), hamFiyat);
        };

        const alastikFiyat = applyPlatformRules('alastik');
        const b2bFiyat = applyPlatformRules('b2b');
        const b2cFiyat = applyPlatformRules('b2c');

        return {
            alastikPrice: Math.round(alastikFiyat * 100) / 100,
            b2bPrice: Math.round(b2bFiyat * 100) / 100,
            b2cPrice: Math.round(b2cFiyat * 100) / 100
        };
    }
}

module.exports = new XmlWebProductSyncService();