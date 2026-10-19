
const mongoose = require('mongoose');
const { SITES, DEFAULT_SITE } = require('../../../config/sites');
const { applySitePricingMany } = require('../../../utils/sitePricing');

const FEED_VERSION = 1;
const CACHE_MS = 5 * 60 * 1000;
const DEFAULT_CITY = 'İstanbul';
const cache = new Map();

const TIRE_TYPE = 'LASTİK';
const RIM_TYPE = 'JANT';
const SEASON_MAP = { 'yaz': 'yaz', 'kış': 'kis', 'kis': 'kis', '4 mevsim': 'dort_mevsim', 'dört mevsim': 'dort_mevsim' };
const VEHICLE_MAP = { 'otolastik': 'oto', 'otomobil': 'oto', '4x4lastik': 'suv_4x4', '4x4': 'suv_4x4', 'ticarilastik': 'ticari_c', 'hafif ticari': 'ticari_c', 'elektrikliaraclastigi': 'oto', 'setlastikler': 'oto' };
const TIRE_SIZE_RE = /(\d{3})(?:\s*\/\s*(\d{2,3}))?\s*Z?R\s*(\d{2}(?:[.,]5)?)C?(?:\s+(\d{2,3}(?:\/\d{2,3})?)\s*([A-Z]{1,2})\b)?/i;
const RUNFLAT_RE = /\b(RFT|ROF|ZP|SSR|RUN\s*FLAT|RUNFLAT|DSST|HRS|MOE|EMT)\b/i;
const RIM_SIZE_RE = /(\d{1,2}(?:[.,]\d)?)\s*[xX]\s*(\d{2})\b/;

const lower = (s) => String(s || '').toLocaleLowerCase('tr').trim();
const ACIKLAMA_MAX = 6000;
const HTML_VARLIK = { '&nbsp;': ' ', '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'" };
const TR_VARLIK = { '&ccedil;': 'ç', '&uuml;': 'ü', '&ouml;': 'ö', '&rsquo;': '’', '&lsquo;': '‘', '&rdquo;': '”', '&ldquo;': '“', '&ndash;': '–', '&mdash;': '—', '&hellip;': '…', '&deg;': '°', '&reg;': '®', '&trade;': '™', '&bull;': '•' };
const feedKey = (site) => String(process.env[`MARKETPLACE_FEED_KEY_${String(site || '').toUpperCase()}`] || (site === 'lastikjantavm' ? process.env.MARKETPLACE_FEED_KEY : '') || '').trim();

function getSiteUrl(site) {
    const domain = SITES[site]?.domains?.[0] || SITES[DEFAULT_SITE].domains[0];
    return `https://${domain}`;
}

function absoluteUrl(path, siteUrl) {
    if (!path) return '';
    if (/^https?:\/\//i.test(path)) return path;
    return `${siteUrl}${path.startsWith('/') ? '' : '/'}${path}`;
}

function attrMap(product) {
    const map = {};
    for (const a of product.diaData?.m_urunOzellikleri || []) {
        const key = lower(a.ozellikadi);
        const value = String(a.detayaciklama ?? '').trim();
        if (key && value && !map[key]) map[key] = value;
    }
    return map;
}

const num = (value) => {
    const n = parseFloat(String(value ?? '').replace(',', '.').replace(/[^\d.-]/g, ''));
    return Number.isFinite(n) ? n : null;
};
const round2 = (n) => Math.round(n * 100) / 100;
function aciklama(product, site) {
    const html = product.customData?.siteDescriptions?.[site] || product.customData?.customDescription || '';
    let t = String(html)
        .replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<li[^>]*>/gi, '\n- ')
        .replace(/<\/(p|div|ul|ol|h[1-6]|tr|table|section)>/gi, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&(nbsp|amp|lt|gt|quot|apos|#39);/gi, m => HTML_VARLIK[m.toLowerCase()] ?? ' ')
        .replace(/&#(x[0-9a-f]+|\d+);/gi, (m, n) => { const c = n[0].toLowerCase() === 'x' ? parseInt(n.slice(1), 16) : parseInt(n, 10); return c > 0 && c <= 0x10ffff ? String.fromCodePoint(c) : ' '; })
        .replace(/&[a-z]+;/gi, m => HTML_VARLIK[m.toLowerCase()] ?? TR_VARLIK[m.toLowerCase()] ?? ' ')
        .replace(/[ \t\u00a0]+/g, ' ')
        .replace(/ *\n */g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    if (t.length > ACIKLAMA_MAX) {
        const kes = t.slice(0, ACIKLAMA_MAX - 1);
        const bosluk = Math.max(kes.lastIndexOf(' '), kes.lastIndexOf('\n'));
        t = (bosluk > ACIKLAMA_MAX * 0.8 ? kes.slice(0, bosluk) : kes).trim() + '…';
    }
    return t;
}

const yesNo = (value) => /^(evet|var|yes|true)$/i.test(String(value || '').trim());

function isNew(attrs) {
    const durum = lower(attrs['durumu'] || attrs['durum']);
    return !durum || durum === 'sıfır' || durum === 'sifir';
}

function images(product, siteUrl) {
    const custom = (product.customData?.customImages || [])
        .slice().sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(i => i.url).filter(Boolean);
    const dia = (product.diaData?.m_resimler || [])
        .slice().sort((a, b) => parseInt(a.order_id || 0, 10) - parseInt(b.order_id || 0, 10))
        .map(i => i.aws_url).filter(Boolean);
    return [...new Set([...custom, ...dia])].map(u => absoluteUrl(u, siteUrl));
}

function price(product) {
    const cd = product.customData || {};
    const shipped = num(cd.shippingIncludedPrice);
    if (shipped > 0) return round2(shipped);
    const web = num(cd.webPrice);
    if (web > 0) return round2(web);
    const birim = product.diaData?.m_birimler?.[0] || {};
    const sale = num(birim.fiyat4) || num(product.diaData?.fiyat4);
    return sale > 0 ? round2(sale) : null;
}

function oldPrice(product, current) {
    const birim = product.diaData?.m_birimler?.[0] || {};
    const list = num(birim.fiyat1) || num(product.customData?.originalPrice);
    return list && current && list > current ? round2(list) : null;
}

function mapProduct(product, siteUrl, site = null) {
    const dia = product.diaData || {};
    const attrs = attrMap(product);
    const type = dia.ozelkod7kodu === RIM_TYPE ? 'jant' : 'lastik';
    const current = price(product);
    if (!current) return null;

    const base = {
        stokKodu: dia.stokkartkodu || product._key,
        tur: type,
        durum: 'sifir',
        baslik: dia.aciklama || '',
        aciklama: aciklama(product, site),
        marka: dia.marka || null,
        model: null,
        ebat: null,
        genislik: null,
        yukseklik: null,
        jantCapi: num(attrs['jant çapı']),
        adet: Number(dia.gercek_stok) || 0,
        fiyat: current,
        eskiFiyat: oldPrice(product, current),
        paraBirimi: 'TRY',
        fiyatTuru: 'adet',
        kondisyon: 'sifir',
        kondisyonNotu: null,
        aracSinifi: VEHICLE_MAP[lower(dia.ozelkod2kodu)] || null,
        gorseller: images(product, siteUrl),
        gorselTemsili: (product.customData?.customImages || []).some(i => i.temsiliYedek === true),
        url: product.customData?.seoUrl ? `${siteUrl}/urun/${product.customData.seoUrl}` : null,
        sehir: DEFAULT_CITY,
        ilce: null,
        guncellenme: product.updatedAt ? new Date(product.updatedAt).toISOString() : null
    };

    if (type === 'lastik') {
        const title = dia.aciklama || '';
        const m = title.match(TIRE_SIZE_RE);
        const w = m ? num(m[1]) : num(attrs['genişlik']);
        const h = m ? (m[2] ? num(m[2]) : null) : num(attrs['yanak']);
        const rAttr = num(attrs['jant çapı']);
        const r = m ? num(m[3]) : (rAttr >= 10 && rAttr <= 26 ? rAttr : null);
        return {
            ...base,
            ebat: m ? (h ? `${w}/${h}R${r}` : `${w}R${r}`) : (w && h && r ? `${w}/${h}R${r}` : null),
            genislik: w,
            yukseklik: h,
            jantCapi: r,
            mevsim: SEASON_MAP[lower(dia.ozelkod1kodu)] || SEASON_MAP[lower(attrs['mevsim'])] || null,
            dotYili: num(dia.ekalan5) || num(attrs['üretim tarihi']),
            uretimTarihi: dia.ekalan5 || attrs['üretim tarihi'] || null,
            disDerinligiMm: null,
            yukEndeksi: (m && m[4]) || attrs['yük endeksi'] || null,
            hizEndeksi: (m && m[5]) ? m[5].toUpperCase() : (attrs['hız endeksi'] || null),
            runflat: RUNFLAT_RE.test(title) || yesNo(attrs['run flat']),
            xl: /\bXL\b/i.test(title) || yesNo(attrs['xl']),
            yamaSayisi: null,
            onarimVar: false
        };
    }

    const bolt = num(attrs['bijon aralığı']);
    const boltCount = num(attrs['bijon sayısı']);
    const rimMatch = (dia.aciklama || '').match(RIM_SIZE_RE);
    const rimCap = num(attrs['jant çapı']) || (rimMatch ? num(rimMatch[2]) : null);
    return {
        ...base,
        jantCapi: rimCap,
        jantGenisligiInch: num(attrs['jant genişliği']) || (rimMatch ? num(rimMatch[1]) : null),
        bijonDuzeni: bolt && boltCount ? `${boltCount}x${bolt}` : null,
        bijonSayisi: boltCount,
        offsetEt: num(attrs['et']),
        gobekCapiMm: num(attrs['göbek çapı']),
        malzeme: /çelik|celik/i.test(dia.aciklama || '') ? 'celik' : 'alasim',
        renk: attrs['renk'] || null,
        onarimVar: false
    };
}

function buildQuery(site, tip) {
    const types = tip === 'jant' ? [RIM_TYPE] : tip === 'lastik' ? [TIRE_TYPE] : [TIRE_TYPE, RIM_TYPE];
    return {
        'syncInfo.diaStatus': 'synced',
        'diaData.durum': 'A',
        sites: site,
        'diaData.ozelkod7kodu': { $in: types },
        'diaData.gercek_stok': { $gte: 1 },
        'customData.seoUrl': { $exists: true, $ne: null }
    };
}

async function generateFeed({ site, tip = null, force = false }) {
    if (!feedKey(site)) {
        const err = new Error('Feed kapalı');
        err.status = 503;
        throw err;
    }

    const cacheKey = `${site}:${tip || 'all'}`;
    const hit = cache.get(cacheKey);
    if (!force && hit && Date.now() - hit.at < CACHE_MS) return { payload: hit.payload, cached: true };

    const siteUrl = getSiteUrl(site);
    const products = await mongoose.connection.db.collection('webproducts').find(buildQuery(site, tip), {
        projection: {
            _key: 1, updatedAt: 1, syncInfo: 1,
            'diaData.stokkartkodu': 1, 'diaData.aciklama': 1, 'diaData.marka': 1, 'diaData.gercek_stok': 1,
            'diaData.ozelkod1kodu': 1, 'diaData.ozelkod2kodu': 1, 'diaData.ozelkod7kodu': 1, 'diaData.ekalan5': 1, 'diaData.fiyat4': 1,
            'diaData.birimindirimorani': 1, 'diaData.b2c_indirimorani': 1, 'diaData.ozelkod10kodu': 1,
            'diaData.durum': 1, 'diaData.kdv': 1, 'diaData.agirlik': 1, 'diaData.desi': 1,
            'diaData.m_birimler': 1, 'diaData.m_urunOzellikleri': 1, 'diaData.m_resimler': 1, 'diaData.m_kategoriler': 1,
            'customData.seoUrl': 1, 'customData.customImages': 1, 'customData.siteData': 1,
            'customData.siteDescriptions': 1, 'customData.customDescription': 1,
            'customData.shippingIncludedPrice': 1, 'customData.shippingPerUnit': 1, 'customData.webPrice': 1, 'customData.originalPrice': 1
        }
    }).toArray();

    applySitePricingMany(products, site);

    const items = [];
    for (const product of products) {
        if (!isNew(attrMap(product))) continue;
        const mapped = mapProduct(product, siteUrl, site);
        if (!mapped || mapped.gorseller.length === 0) continue;
        items.push(mapped);
    }

    const payload = {
        kaynak: SITES[site]?.domains?.[0] || site,
        surum: FEED_VERSION,
        uretildi: new Date().toISOString(),
        adet: items.length,
        urunler: items
    };
    cache.set(cacheKey, { at: Date.now(), payload });
    return { payload, cached: false };
}

function isAuthorized(req, site) {
    const key = feedKey(site);
    if (!key) return false;
    const given = String(req.headers['x-feed-key'] || req.query.key || '').trim();
    return given.length === key.length && require('crypto').timingSafeEqual(Buffer.from(given), Buffer.from(key));
}

module.exports = { generateFeed, isAuthorized, feedKey, mapProduct, attrMap, isNew, buildQuery, aciklama };
