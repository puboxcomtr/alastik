const mongoose = require('mongoose');
const WebMerchantSettings = require('../../../models/plugins/merchant/WebMerchantSettings');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');
const { applySitePricingMany } = require('../../../utils/sitePricing');

// Site başına ürün URL tabanı (config/sites.js'teki ilk domain)
function getSiteUrl(site) {
    const domain = SITES[site]?.domains?.[0] || SITES[DEFAULT_SITE].domains[0];
    return `https://${domain}`;
}

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
}

// Göreli görsel yolları (/urun/... gibi) sitenin alan adıyla mutlak hale getirilir —
// Google Merchant mutlak URL ister; nginx her sitede /urun'u kendi alan adından servis eder
function absoluteImageUrl(image, siteUrl) {
    if (!image) return '';
    if (/^https?:\/\//i.test(image)) return image;
    return `${siteUrl}${image.startsWith('/') ? '' : '/'}${image}`;
}

function getImage(product, imageSource) {
    if (imageSource === 'custom_first') {
        if (product.customData?.customImages?.length > 0) {
            return product.customData.customImages[0].url;
        }
        if (product.customData?.featuredImage) {
            return product.customData.featuredImage;
        }
    }
    if (product.diaData?.m_resimler?.length > 0) {
        const sorted = [...product.diaData.m_resimler].sort((a, b) => parseInt(a.order_id) - parseInt(b.order_id));
        return sorted[0]?.aws_url || '';
    }
    if (product.customData?.featuredImage) {
        return product.customData.featuredImage;
    }
    return '';
}

function getPrice(product, priceField, includeTax, taxRate) {
    const birim = product.diaData?.m_birimler?.[0];
    if (!birim) return null;

    let price = birim[priceField] || 0;
    if (price <= 0) return null;

    if (!includeTax) {
        price = price / (1 + taxRate / 100);
    }

    return price.toFixed(2);
}

function buildProductUrl(product, siteUrl) {
    const seoUrl = product.customData?.seoUrl;
    if (!seoUrl) return null;
    return `${siteUrl}/urun/${seoUrl}`;
}

function stripHtml(html) {
    if (!html) return '';
    return String(html).replace(/<[^>]*>/g, '').trim();
}

function escapeXml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

async function buildQuery(settings, site) {
    const query = {
        'syncInfo.diaStatus': 'synced',
        'diaData.durum': 'A',
        'customData.seoUrl': { $exists: true, $ne: null },
        sites: site
    };

    if (settings.onlyInStock) {
        query['diaData.gercek_stok'] = { $gte: settings.minStock || 1 };
    }

    // Eşleşmemiş XML ürünleri (DIA'da otomatik açılan -XML kartları) feed'e alınmaz
    if (settings.excludeUnmatchedXml) {
        query['diaData.ozelkod10kodu'] = { $ne: 'XML' };
    }

    // Hariç tutulan üst kategorilerdeki ürünler (ör. hizmetler) feed'e alınmaz
    if (settings.excludedCategories?.length) {
        query['diaData.m_kategoriler.kategori_aciklama_1'] = { $nin: settings.excludedCategories };
    }

    return query;
}

async function generateXml(settings, products, siteUrl) {
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
        '  <channel>',
        `    <title>${escapeXml(siteUrl)}</title>`,
        `    <link>${siteUrl}</link>`,
        `    <description>Google Merchant Feed</description>`,
    ];

    for (const product of products) {
        const url = buildProductUrl(product, siteUrl);
        if (!url) continue;

        const price = getPrice(product, settings.priceField, settings.includeTax, settings.taxRate);
        if (!price || parseFloat(price) < settings.minPrice) continue;

        const image = absoluteImageUrl(getImage(product, settings.imageSource), siteUrl);
        if (!image) continue;

        const title = escapeXml(getNestedValue(product, settings.fieldMapping.title) || product.diaData?.aciklama || '');
        // Açıklama: sitenin kendi açıklaması > eşleştirilen alan > ürün adı
        const descRaw = product.customData?.siteDescriptions?.[settings.site]
            || getNestedValue(product, settings.fieldMapping.description)
            || product.diaData?.aciklama || '';
        const description = escapeXml(stripHtml(descRaw));
        const brand = escapeXml(product.diaData?.marka || '');
        const gtin = escapeXml(product.diaData?.anabarkod || '');
        const id = escapeXml(product.diaData?.stokkartkodu || product._key);
        const condition = settings.fieldMapping.condition || 'new';
        const availability = product.diaData?.gercek_stok > 0 ? 'in_stock' : 'out_of_stock';

        lines.push('    <item>');
        lines.push(`      <g:id>${id}</g:id>`);
        lines.push(`      <g:title>${title}</g:title>`);
        lines.push(`      <g:description>${description}</g:description>`);
        lines.push(`      <g:link>${url}</g:link>`);
        lines.push(`      <g:image_link>${escapeXml(image)}</g:image_link>`);
        lines.push(`      <g:availability>${availability}</g:availability>`);
        lines.push(`      <g:price>${price} ${settings.currency}</g:price>`);
        lines.push(`      <g:condition>${condition}</g:condition>`);
        if (brand) lines.push(`      <g:brand>${brand}</g:brand>`);
        if (gtin) lines.push(`      <g:gtin>${gtin}</g:gtin>`);
        if (!gtin) lines.push(`      <g:identifier_exists>false</g:identifier_exists>`);

        if (settings.shippingEnabled) {
            lines.push('      <g:shipping>');
            lines.push(`        <g:country>${settings.shippingCountry}</g:country>`);
            lines.push(`        <g:price>${settings.shippingPrice} ${settings.currency}</g:price>`);
            lines.push('      </g:shipping>');
        }

        lines.push('    </item>');
    }

    lines.push('  </channel>');
    lines.push('</rss>');

    return lines.join('\n');
}

async function generateFeed({ site = DEFAULT_SITE } = {}) {
    const feedSite = SITES[site] ? site : DEFAULT_SITE;
    const db = mongoose.connection.db;
    const settings = await WebMerchantSettings.findOne({ site: feedSite });
    if (!settings || !settings.isActive) {
        throw new Error('Feed bu site için aktif değil');
    }

    const siteUrl = getSiteUrl(feedSite);
    const query = await buildQuery(settings, feedSite);
    const products = await db.collection('webproducts').find(query).toArray();

    // Varsayılan site dışındaki sitelerde vitrindeki satış fiyatı kuralı feed'e de uygulanır
    // (fiyat1 × B2C oranı, XML siteData fiyatı, hizmet istisnası) — fiyat4 yerinde güncellenir.
    // ALastik feed'i eski davranışıyla birebir kalır.
    if (feedSite !== DEFAULT_SITE) {
        applySitePricingMany(products, feedSite);
    }

    let feed;
    if (settings.feedFormat === 'csv') {
        feed = await generateCsv(settings, products, siteUrl);
    } else {
        feed = await generateXml(settings, products, siteUrl);
    }

    await WebMerchantSettings.updateOne({ site: feedSite }, {
        $set: {
            lastGenerated: new Date(),
            productCount: products.length
        }
    });

    return { feed, format: settings.feedFormat, count: products.length };
}

async function generateCsv(settings, products, siteUrl) {
    const headers = ['id', 'title', 'description', 'link', 'image_link', 'availability', 'price', 'condition', 'brand', 'gtin'];
    const rows = [headers.join('\t')];

    for (const product of products) {
        const url = buildProductUrl(product, siteUrl);
        if (!url) continue;

        const price = getPrice(product, settings.priceField, settings.includeTax, settings.taxRate);
        if (!price || parseFloat(price) < settings.minPrice) continue;

        const image = absoluteImageUrl(getImage(product, settings.imageSource), siteUrl);
        if (!image) continue;

        const title = getNestedValue(product, settings.fieldMapping.title) || product.diaData?.aciklama || '';
        const descRaw = product.customData?.siteDescriptions?.[settings.site]
            || getNestedValue(product, settings.fieldMapping.description)
            || product.diaData?.aciklama || '';
        const description = stripHtml(descRaw);
        const brand = product.diaData?.marka || '';
        const gtin = product.diaData?.anabarkod || '';
        const id = product.diaData?.stokkartkodu || product._key;
        const condition = settings.fieldMapping.condition || 'new';
        const availability = product.diaData?.gercek_stok > 0 ? 'in_stock' : 'out_of_stock';

        rows.push([id, title, description, url, image, availability, `${price} ${settings.currency}`, condition, brand, gtin].join('\t'));
    }

    return rows.join('\n');
}

module.exports = { generateFeed };