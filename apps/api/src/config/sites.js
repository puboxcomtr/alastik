/**
 * SITES — Multi-tenant tek doğruluk kaynağı.
 * Tüm site tanımları (slug, domain, tema) BURADAN yönetilir.
 * Hiçbir yere site bilgisi hardcode EDİLMEZ; her katman bu dosyadan okur.
 */

// Varsayılan site: Host eşleşmezse veya bilinmeyen bir kaynaktan gelirse buraya düşer.
// Mevcut tüm veri 'alastik' olduğu için varsayılan budur.
const DEFAULT_SITE = 'alastik';

/**
 * Her site bir kayıt.
 *  - slug    : kodda/DB'de kullanılan sabit anahtar (DEĞİŞMEZ)
 *  - name    : insan-okur ad
 *  - domains : bu siteye ait tüm hostname'ler (www, demo, çıplak domain dahil)
 *              Host header bunlarla eşleştirilir. KÜÇÜK HARF yazılır.
 *  - theme   : ön yüz tema anahtarı (Faz 4'te kullanılacak)
 *  - active  : site yayında mı
 */
const SITES = {
    alastik: {
        slug: 'alastik',
        name: 'ALastik',
        domains: [
            'alastik.com',
            'www.alastik.com',
            'dev.alastik.com',
        ],
        theme: 'alastik',
        active: true,
        // Sipariş numarası öneki (orderNumber üretiminde kullanılır)
        orderPrefix: 'AL',
        // XML fiyat kurallarında bu sitenin vitrin satış fiyatını süren platform
        xmlPricePlatform: 'alastik',
    },

    lastikjantavm: {
        slug: 'lastikjantavm',
        name: 'LastikJantAVM',
        domains: [
            'lastikjantavm.com',
            'www.lastikjantavm.com',
        ],
        theme: 'lastikjantavm',
        active: true,
        orderPrefix: 'LJA',
        // LJA vitrin fiyatı B2C (panelde "LastikJantAVM" olarak görünür) kurallarından hesaplanır
        xmlPricePlatform: 'b2c',
    },

    b2b: {
        slug: 'b2b',
        name: 'LastikJantAVM B2B',
        // Kalıcı adres b2b.lastikjantavm.com (eski DIA portalının DNS'i bize çevrilince);
        // demo.lastikjantavm.com geçiş dönemi adresidir (7-8 Eyl 2026 kararları)
        domains: [
            'b2b.lastikjantavm.com',
            'demo.lastikjantavm.com',
        ],
        theme: 'b2b',
        active: true,
        orderPrefix: 'B2B',
        xmlPricePlatform: 'b2b',
    },
};

// Geçerli slug listesi (şema enum + doğrulama için kullanılacak)
const SITE_SLUGS = Object.keys(SITES);

// Host → slug hızlı arama tablosu (her domain hangi slug'a ait)
const DOMAIN_TO_SLUG = Object.values(SITES).reduce((acc, site) => {
    site.domains.forEach((domain) => {
        acc[domain.toLowerCase()] = site.slug;
    });
    return acc;
}, {});

/**
 * Slug geçerli mi?
 * @param {string} slug
 * @returns {boolean}
 */
function isValidSite(slug) {
    return Object.prototype.hasOwnProperty.call(SITES, slug);
}

/**
 * Slug'dan site kaydını döner. Geçersizse null.
 * @param {string} slug
 * @returns {object|null}
 */
function getSiteBySlug(slug) {
    return isValidSite(slug) ? SITES[slug] : null;
}

module.exports = {
    SITES,
    SITE_SLUGS,
    DOMAIN_TO_SLUG,
    DEFAULT_SITE,
    isValidSite,
    getSiteBySlug,
};