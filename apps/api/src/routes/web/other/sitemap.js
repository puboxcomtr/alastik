const express = require('express');
const router = express.Router();
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const Page = require('../../../models/admin/content/Page');
const Blog = require('../../../models/admin/content/Blog');
const WebTag = require('../../../models/web/catalog/WebTag');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const WebRedirect = require('../../../models/web/other/WebRedirect');
const { getSiteVisibilityFilter } = require('../../../config/diaFilters');

// Sitemap üretimi için slug listeleri (site kapsamlı, hafif projeksiyonlar).
// 15 dakikalık süreçte bellek önbelleği — ürün sorgusu görece maliyetlidir.
const cache = new Map(); // `${site}:${type}` → { at, data }
const CACHE_TTL = 15 * 60 * 1000;

// Web tarafında her sitemap tipinin URL öneki (sayfa rotalarıyla aynı)
const PATH_PREFIX = {
    products: '/urun/',
    categories: '/kategori/',
    pages: '/sayfa/',
    blog: '/blog/',
    tags: '/etiket/',
    brands: '/marka/'
};

// Sitenin yönlendirme listesinde "eski adres" olan URL'ler sitemap'e girmez
// (ör. LJA'da ikinci el kategorileri ikinciellastik.com'a 301 ile gidiyor)
async function getRedirectedPaths(site) {
    const rows = await WebRedirect.find({ site, isActive: true }).select('source').lean();
    return new Set(rows.map(r => r.source));
}

router.get('/:type', async (req, res) => {
    try {
        const { type } = req.params;
        const site = req.site || 'alastik';
        const cacheKey = `${site}:${type}`;

        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.at < CACHE_TTL) {
            return res.json({ success: true, data: cached.data, cached: true });
        }

        let data;

        if (type === 'products') {
            const rows = await WebProduct.find({
                sites: site,
                'syncInfo.diaStatus': 'synced',
                $and: [getSiteVisibilityFilter(site)]
            }).select('customData.seoUrl _key updatedAt').lean();

            data = rows.map(r => ({
                slug: r.customData?.seoUrl || String(r._key),
                updatedAt: r.updatedAt
            }));
        } else if (type === 'categories') {
            // Kategori sayfası (/api/categories/slug/:slug) yalnızca görünür VE ürünlü kategoriyi açar;
            // sitemap de aynı koşulu kullanır, aksi halde boş kategoriler 404 olarak listelenir
            const rows = await WebCategory.find({
                [`siteSettings.${site}.webVisible`]: true,
                [`siteSettings.${site}.productCount`]: { $gt: 0 }
            }).select('seoUrl slug updatedAt').lean();

            data = rows
                .map(r => ({ slug: r.seoUrl || r.slug, updatedAt: r.updatedAt }))
                .filter(r => r.slug);
        } else if (type === 'pages') {
            const rows = await Page.find({ site, status: 'published' })
                .select('slug updatedAt').lean();

            data = rows.map(r => ({ slug: r.slug, updatedAt: r.updatedAt }));
        } else if (type === 'blog') {
            const rows = await Blog.find({ site, status: 'published' })
                .select('slug updatedAt publishedAt').sort({ publishedAt: -1 }).lean();

            data = rows
                .map(r => ({ slug: r.slug, updatedAt: r.updatedAt || r.publishedAt }))
                .filter(r => r.slug);
        } else if (type === 'tags') {
            // Yalnızca ürünü olan aktif etiketler — boş etiket sayfaları ince içerik sayılır
            const rows = await WebTag.find({ site, isActive: true, productCount: { $gt: 0 } })
                .select('seoUrl updatedAt').sort({ order: 1 }).lean();

            data = rows
                .map(r => ({ slug: r.seoUrl, updatedAt: r.updatedAt }))
                .filter(r => r.slug);
        } else if (type === 'brands') {
            // Marka sayfası (/api/brands/:slug) ile aynı koşul: sitede görünür ve ürünlü
            const rows = await WebBrand.find({
                [`siteSettings.${site}.webVisible`]: true,
                [`siteSettings.${site}.productCount`]: { $gt: 0 }
            }).select('seoUrl slug updatedAt').lean();

            // Yalnızca URL-güvenli slug'lar: Türkçe karakterli slug'larda (ör. "arızalı-lastik")
            // marka sayfası şu an 404 veriyor (web tarafında çift URL kodlama); düzeltilene kadar listelenmez
            data = rows
                .map(r => ({ slug: r.seoUrl || r.slug, updatedAt: r.updatedAt }))
                .filter(r => r.slug && /^[a-z0-9-]+$/.test(r.slug));
        } else {
            return res.status(400).json({ success: false, message: 'Geçersiz sitemap tipi' });
        }

        // Yönlendirilen (301/302) adresleri çıkar
        const redirected = await getRedirectedPaths(site);
        if (redirected.size) {
            const prefix = PATH_PREFIX[type];
            data = data.filter(r => !redirected.has(WebRedirect.normalizeSource(prefix + r.slug)));
        }

        cache.set(cacheKey, { at: Date.now(), data });
        res.json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Sitemap verisi üretilemedi', error: err.message });
    }
});

module.exports = router;
