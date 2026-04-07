const mongoose = require('mongoose');
const WebMerchantSettings = require('../../../models/plugins/merchant/WebMerchantSettings');

const SITE_URL = process.env.SITE_URL || 'https://alastik.com';

function getNestedValue(obj, path) {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
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

function buildProductUrl(product) {
    const seoUrl = product.customData?.seoUrl;
    if (!seoUrl) return null;
    return `${SITE_URL}/urun/${seoUrl}`;
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

async function buildQuery(settings) {
    const query = {
        'syncInfo.diaStatus': 'synced',
        'diaData.durum': 'A',
        'customData.seoUrl': { $exists: true, $ne: null }
    };

    if (settings.onlyInStock) {
        query['diaData.gercek_stok'] = { $gte: settings.minStock || 1 };
    }

    return query;
}

async function generateXml(settings, products) {
    const lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
        '  <channel>',
        `    <title>${escapeXml(SITE_URL)}</title>`,
        `    <link>${SITE_URL}</link>`,
        `    <description>Google Merchant Feed</description>`,
    ];

    for (const product of products) {
        const url = buildProductUrl(product);
        if (!url) continue;

        const price = getPrice(product, settings.priceField, settings.includeTax, settings.taxRate);
        if (!price || parseFloat(price) < settings.minPrice) continue;

        const image = getImage(product, settings.imageSource);
        if (!image) continue;

        const title = escapeXml(getNestedValue(product, settings.fieldMapping.title) || product.diaData?.aciklama || '');
        const descRaw = getNestedValue(product, settings.fieldMapping.description) || product.diaData?.aciklama || '';
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

async function generateFeed() {
    const db = mongoose.connection.db;
    const settings = await WebMerchantSettings.findOne();
    if (!settings || !settings.isActive) {
        throw new Error('Feed aktif değil');
    }

    const query = await buildQuery(settings);
    const products = await db.collection('webproducts').find(query).toArray();

    let feed;
    if (settings.feedFormat === 'csv') {
        feed = await generateCsv(settings, products);
    } else {
        feed = await generateXml(settings, products);
    }

    await WebMerchantSettings.updateOne({}, {
        $set: {
            lastGenerated: new Date(),
            productCount: products.length
        }
    });

    return { feed, format: settings.feedFormat, count: products.length };
}

async function generateCsv(settings, products) {
    const headers = ['id', 'title', 'description', 'link', 'image_link', 'availability', 'price', 'condition', 'brand', 'gtin'];
    const rows = [headers.join('\t')];

    for (const product of products) {
        const url = buildProductUrl(product);
        if (!url) continue;

        const price = getPrice(product, settings.priceField, settings.includeTax, settings.taxRate);
        if (!price || parseFloat(price) < settings.minPrice) continue;

        const image = getImage(product, settings.imageSource);
        if (!image) continue;

        const title = getNestedValue(product, settings.fieldMapping.title) || product.diaData?.aciklama || '';
        const descRaw = getNestedValue(product, settings.fieldMapping.description) || product.diaData?.aciklama || '';
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