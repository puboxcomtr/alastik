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
    },

    lastikjantavm: {
        slug: 'lastikjantavm',
        name: 'LastikJantAVM',
        domains: [
            'lastikjantavm.com',
            'www.lastikjantavm.com',
            'demo.lastikjantavm.com',
        ],
        theme: 'lastikjantavm',
        active: true,
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