
const DEFAULT_SITE = 'alastik';

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
        orderPrefix: 'AL',
        cartRetentionDays: 2,
        clearCartOnPaymentResult: true,
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
        clearCartOnPaymentResult: true,
        xmlPricePlatform: 'b2c',
    },

    b2b: {
        slug: 'b2b',
        name: 'LastikJantAVM B2B',
        domains: [
            'b2b.lastikjantavm.com',
            'demo.lastikjantavm.com',
        ],
        theme: 'b2b',
        active: true,
        orderPrefix: 'B2B',
        xmlPricePlatform: 'b2b',
        sameOriginApi: true,
        diaOrderNoteField: 'aciklama1',
        trackVisits: false,
        diaTransferUnpaidPaymentMethods: ['cari', 'bank_transfer'],
    },
};

const SITE_SLUGS = Object.keys(SITES);

const DOMAIN_TO_SLUG = Object.values(SITES).reduce((acc, site) => {
    site.domains.forEach((domain) => {
        acc[domain.toLowerCase()] = site.slug;
    });
    return acc;
}, {});

function isValidSite(slug) {
    return Object.prototype.hasOwnProperty.call(SITES, slug);
}

function getSiteBySlug(slug) {
    return isValidSite(slug) ? SITES[slug] : null;
}

const DEFAULT_CART_RETENTION_DAYS = 7;

function getCartRetentionDays(slug) {
    const days = getSiteBySlug(slug)?.cartRetentionDays;
    return Number.isFinite(days) && days > 0 ? days : DEFAULT_CART_RETENTION_DAYS;
}

function shouldClearCartOnPaymentResult(slug) {
    return getSiteBySlug(slug)?.clearCartOnPaymentResult === true;
}

function getSiteUrl(slug) {
    const site = getSiteBySlug(slug);
    return site && site.domains[0] ? `https://${site.domains[0]}` : null;
}

module.exports = {
    SITES,
    SITE_SLUGS,
    DOMAIN_TO_SLUG,
    DEFAULT_SITE,
    isValidSite,
    getSiteBySlug,
    getSiteUrl,
    getCartRetentionDays,
    shouldClearCartOnPaymentResult,
};