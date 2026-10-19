const { SITE_SLUGS, isValidSite } = require('../config/sites');

const CACHE_TTL_MS = 60 * 1000;
const MAX_DEPTH = 6;

let bySite = {};
let loadedAt = 0;
let loading = null;

async function loadProductButtons() {
    if (loading) return loading;
    loading = (async () => {
        const WebProduct = require('../models/web/catalog/WebProduct');
        const WebProductButton = require('../models/web/catalog/WebProductButton');
        const next = {};

        const defs = await WebProductButton.find({ isActive: true }, { site: 1, key: 1, label: 1, order: 1, colorFrom: 1, colorTo: 1, textColor: 1, icon: 1 })
            .sort({ order: 1, label: 1 }).lean();

        for (const site of SITE_SLUGS) {
            const siteDefs = defs.filter(d => d.site === site);
            const map = new Map();
            if (siteDefs.length) {
                const field = `customData.siteData.${site}.buttons`;
                const products = await WebProduct.find({ sites: site, [`${field}.0`]: { $exists: true } }, { _key: 1, [field]: 1 }).lean();
                for (const p of products) {
                    const active = new Set(p.customData?.siteData?.[site]?.buttons || []);
                    const buttons = siteDefs.filter(d => active.has(d.key))
                        .map(d => ({
                            key: d.key,
                            label: d.label,
                            colorFrom: d.colorFrom || '',
                            colorTo: d.colorTo || '',
                            textColor: d.textColor || '',
                            icon: d.icon || ''
                        }));
                    if (buttons.length) map.set(String(p._key), buttons);
                }
            }
            next[site] = map;
        }
        bySite = next;
        loadedAt = Date.now();
    })().catch((error) => {
        console.error('[productButtons] yüklenemedi:', error.message);
    }).finally(() => { loading = null; });
    return loading;
}

function invalidateProductButtons() {
    loadedAt = 0;
}

function getButtonMap(site) {
    if (Date.now() - loadedAt > CACHE_TTL_MS) loadProductButtons();
    return bySite[site] || null;
}

function attachDeep(node, map, depth) {
    if (!node || typeof node !== 'object' || depth > MAX_DEPTH) return;
    if (Array.isArray(node)) { for (const item of node) attachDeep(item, map, depth + 1); return; }
    if (node._key && (node.diaData || node.customData)) {
        const buttons = map.get(String(node._key));
        if (buttons) {
            if (!node.customData || typeof node.customData !== 'object') node.customData = {};
            node.customData.buttons = buttons;
        }
        return;
    }
    for (const key of Object.keys(node)) {
        const value = node[key];
        if (value && typeof value === 'object') attachDeep(value, map, depth + 1);
    }
}

function productButtonsMiddleware(req, res, next) {
    const send = res.json.bind(res);
    res.json = (body) => {
        try {
            const map = isValidSite(req.site) ? getButtonMap(req.site) : null;
            if (map && map.size && body && typeof body === 'object') attachDeep(body, map, 0);
        } catch (error) {
            console.error('[productButtons] hata:', error.message);
        }
        return send(body);
    };
    next();
}

module.exports = { loadProductButtons, invalidateProductButtons, productButtonsMiddleware };
