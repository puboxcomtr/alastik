const mongoose = require('mongoose');
const WebAkakceSettings = require('../../../models/plugins/akakce/WebAkakceSettings');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');

function getSiteUrl(site) {
    const domain = SITES[site]?.domains?.[0] || SITES[DEFAULT_SITE].domains[0];
    return `https://${domain}`;
}

const CACHE_TTL_MS = 30 * 60 * 1000;
const cacheBySite = {};

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

function escapeXml(str) {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function getImages(product, imageSource) {
    const dia = (product.diaData?.m_resimler || [])
        .slice()
        .sort((a, b) => parseInt(a.order_id) - parseInt(b.order_id))
        .map(r => r.aws_url)
        .filter(Boolean);
    const custom = (product.customData?.customImages || []).map(i => i.url).filter(Boolean);
    if (product.customData?.featuredImage) custom.unshift(product.customData.featuredImage);

    const ordered = imageSource === 'dia_first' ? [...dia, ...custom] : [...custom, ...dia];
    return [...new Set(ordered)];
}

function getPrice(product, priceField, includeTax, taxRate) {
    const birim = product.diaData?.m_birimler?.[0];
    if (!birim) return null;

    let price = parseFloat(birim[priceField]) || 0;
    if (price <= 0) return null;

    if (!includeTax) {
        price = price / (1 + taxRate / 100);
    }

    return price;
}

function getCategoryPath(product) {
    const kategoriler = product.diaData?.m_kategoriler || [];
    let best = '';
    for (const k of kategoriler) {
        if (k.kategori_durum_1 !== 'A') continue;
        const parts = [];
        for (let i = 1; i <= 6; i++) {
            const name = (k[`kategori_aciklama_${i}`] || '').trim();
            if (name) parts.push(name);
        }
        const path = parts.join(' > ');
        if (path.length > best.length) best = path;
    }
    return best;
}

function resolveField(product, mappingPath, autoResolver) {
    if (!mappingPath || mappingPath === 'auto') return autoResolver(product);
    return getNestedValue(product, mappingPath) || '';
}

function buildSourceCondition(sourceKey, filter) {
    const base = sourceKey === 'stock'
        ? { 'syncInfo.xmlSource': null }
        : { 'syncInfo.xmlSource': { $ne: null } };

    if (!filter || filter.mode === 'all') return base;

    if (filter.mode === 'category') {
        const names = (filter.categories || []).map(c => c.name).filter(Boolean);
        if (!names.length) return base;
        return {
            ...base,
            $or: [
                { 'diaData.m_kategoriler.kategori_aciklama_1': { $in: names } },
                { 'diaData.m_kategoriler.kategori_aciklama_2': { $in: names } }
            ]
        };
    }

    const codes = (filter.products || []).map(p => p.id).filter(Boolean);
    if (!codes.length) return { _id: null };
    return { ...base, 'diaData.stokkartkodu': { $in: codes } };
}

function buildQuery(settings, site) {
    const query = {
        'diaData.durum': 'A',
        'customData.seoUrl': { $exists: true, $nin: [null, ''] },
        sites: site
    };

    if (settings.onlyInStock) {
        query['diaData.gercek_stok'] = { $gte: settings.minStock || 1 };
    }

    const sources = [];
    if (settings.productSources?.stock?.enabled) {
        sources.push(buildSourceCondition('stock', settings.productSources.stock));
    }
    if (settings.productSources?.xml?.enabled) {
        sources.push(buildSourceCondition('xml', settings.productSources.xml));
    }

    if (!sources.length) return null;
    query.$or = sources;

    return query;
}

function buildNameOverrides(settings) {
    const map = new Map();
    for (const src of ['stock', 'xml']) {
        const items = settings.productSources?.[src]?.products || [];
        for (const item of items) {
            if (item.xmlName) map.set(String(item.id), item.xmlName);
        }
    }
    return map;
}

function generateXml(settings, products, nameOverrides, siteUrl, site) {
    const lines = [
        '<?xml version="1.0" encoding="utf-8" standalone="yes"?>',
        '<products xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">'
    ];

    let count = 0;
    const mapping = settings.fieldMapping || {};

    for (const product of products) {
        const seoUrl = product.customData?.seoUrl;
        if (!seoUrl) continue;

        const price = getPrice(product, settings.priceField, settings.includeTax, settings.taxRate);
        if (!price || price < (settings.minPrice || 0)) continue;

        const images = getImages(product, settings.imageSource);
        if (!images.length) continue;

        const sku = resolveField(product, mapping.sku, p => p.diaData?.stokkartkodu) || product.diaData?.stokkartkodu;
        if (!sku) continue;

        const name = nameOverrides.get(String(sku))
            || resolveField(product, mapping.name, p => p.diaData?.aciklama)
            || product.diaData?.aciklama;
        if (!name) continue;

        const description = String(
            product.customData?.siteDescriptions?.[site]
            || resolveField(product, mapping.description, p => p.customData?.customDescription || p.diaData?.aciklama)
            || ''
        )
            .trim()
            .replace(/\]\]>/g, ']] >');
        const brand = resolveField(product, mapping.brand, p => p.diaData?.marka);
        const barcode = resolveField(product, mapping.barcode, p => p.diaData?.anabarkod);
        const quantity = mapping.quantity && mapping.quantity !== 'auto'
            ? (parseInt(getNestedValue(product, mapping.quantity)) || 0)
            : (parseInt(product.diaData?.gercek_stok) || 0);
        const category = mapping.category && mapping.category !== 'auto'
            ? (getNestedValue(product, mapping.category) || '')
            : getCategoryPath(product);

        const shipPrice = price >= (settings.freeShippingThreshold || 0) && (settings.freeShippingThreshold || 0) > 0
            ? 0
            : (settings.shippingPrice || 0);

        lines.push('  <product>');
        lines.push(`    <sku>${escapeXml(sku)}</sku>`);
        lines.push(`    <name>${escapeXml(name)}</name>`);
        lines.push(`    <url>${escapeXml(`${siteUrl}/urun/${seoUrl}`)}</url>`);
        lines.push(`    <imgUrl>${escapeXml(images[0])}</imgUrl>`);
        if (settings.includeAdditionalImages && images.length > 1) {
            lines.push('    <additionalimages>');
            for (const img of images.slice(1, 6)) {
                lines.push(`      <imgUrl>${escapeXml(img)}</imgUrl>`);
            }
            lines.push('    </additionalimages>');
        }
        lines.push(`    <description><![CDATA[${description}]]></description>`);
        lines.push(`    <distributor>${settings.distributor ? 'true' : 'false'}</distributor>`);
        lines.push(`    <price>${price.toFixed(2)}</price>`);
        lines.push(`    <shipPrice>${Number.isInteger(shipPrice) ? shipPrice : shipPrice.toFixed(2)}</shipPrice>`);
        lines.push(`    <dayOfDelivery>${settings.dayOfDelivery ?? 3}</dayOfDelivery>`);
        if (settings.expressDeliveryTime) {
            lines.push(`    <expressDeliveryTime>${escapeXml(settings.expressDeliveryTime)}</expressDeliveryTime>`);
        }
        lines.push(`    <quantity>${quantity}</quantity>`);
        lines.push(`    <productBrand>${escapeXml(brand)}</productBrand>`);
        lines.push(`    <productCategory>${escapeXml(category)}</productCategory>`);
        if (barcode) lines.push(`    <barcode>${escapeXml(barcode)}</barcode>`);
        if (settings.localDelivery) {
            lines.push(`    <localDelivery>${escapeXml(settings.localDelivery)}</localDelivery>`);
        }
        if (settings.campaignCode) {
            lines.push(`    <campaignCode>${escapeXml(settings.campaignCode)}</campaignCode>`);
        }
        lines.push('  </product>');
        count++;
    }

    lines.push('</products>');
    return { xml: lines.join('\n'), count };
}

async function generateFeed({ force = false, site = DEFAULT_SITE } = {}) {
    const feedSite = SITES[site] ? site : DEFAULT_SITE;
    const settings = await WebAkakceSettings.findOne({ site: feedSite });
    if (!settings || !settings.isActive) {
        throw new Error('Akakçe XML bu site için aktif değil');
    }

    const settingsVersion = settings.updatedAt ? settings.updatedAt.toISOString() : '';
    const cache = cacheBySite[feedSite] || { xml: null, generatedAt: 0, count: 0, settingsVersion: '' };
    const cacheFresh = cache.xml
        && (Date.now() - cache.generatedAt) < CACHE_TTL_MS
        && cache.settingsVersion === settingsVersion;
    if (!force && cacheFresh) {
        return { xml: cache.xml, count: cache.count, cached: true, generatedAt: new Date(cache.generatedAt) };
    }

    const query = buildQuery(settings, feedSite);
    if (!query) {
        throw new Error('Hiçbir ürün kaynağı aktif değil');
    }

    const db = mongoose.connection.db;
    const products = await db.collection('webproducts').find(query, {
        projection: {
            diaData: 1,
            customData: 1,
            syncInfo: 1
        }
    }).toArray();

    const nameOverrides = buildNameOverrides(settings);
    const { xml, count } = generateXml(settings, products, nameOverrides, getSiteUrl(feedSite), feedSite);

    cacheBySite[feedSite] = { xml, generatedAt: Date.now(), count, settingsVersion };

    await WebAkakceSettings.updateOne({ site: feedSite }, {
        $set: { lastGenerated: new Date(), productCount: count }
    }, { timestamps: false });

    return { xml, count, cached: false, generatedAt: new Date(cacheBySite[feedSite].generatedAt) };
}

module.exports = { generateFeed };
