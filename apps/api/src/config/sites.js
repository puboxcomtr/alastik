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
        // Sepetin son hareketten sonra saklandığı gün sayısı (panel "Aktif Sepet" listesi + silinme)
        cartRetentionDays: 2,
        // Ödeme sonucu (başarılı ya da başarısız) geldiği anda müşterinin sepeti sunucuda silinir;
        // panel "Aktif Sepet" listesinden de düşer
        clearCartOnPaymentResult: true,
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
        // Ödeme sonucu (başarılı ya da başarısız) geldiği anda müşterinin sepeti sunucuda silinir
        clearCartOnPaymentResult: true,
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
        // Tarayıcı API'yi sitenin kendi adresinden (/api) çağırır; banka 3D dönüşleri de bu adrese bağlanır.
        // Ayrı API alan adı bayi bilgisayarlarında firma ağlarınca engellenebiliyor (15 Eki 2026).
        // Web tarafında aynı ayar: web/src/config/siteConfig.ts sameOriginApi
        sameOriginApi: true,
        // Bayinin sipariş açıklaması DIA siparişinde bu açıklama satırına yazılır (açıklama yoksa satırın
        // olağan değeri kalır). Tanımsız sitede sipariş açıklaması DIA'ya gönderilmez.
        diaOrderNoteField: 'aciklama1',
        // Bayi paneli istekleri ziyaret (oturum) kaydı açmaz; panodaki ziyaret istatistikleri vitrin siteleri içindir
        trackVisits: false,
        // Ödeme beklemeden DIA'ya hemen aktarılan ödeme yöntemleri (Cari Sipariş, Havale). Diğerleri ödeme alınınca aktarılır;
        // otomatik aktarım tekrarı (orderTransferRetry) da bu kurala göre hangi siparişlerin DIA'da olması gerektiğini bilir.
        diaTransferUnpaidPaymentMethods: ['cari', 'bank_transfer'],
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

// Sitede cartRetentionDays tanımlı değilse kullanılan sepet saklama süresi (gün)
const DEFAULT_CART_RETENTION_DAYS = 7;

/**
 * Sitenin sepet saklama süresi (gün): son hareketten bu kadar gün sonra sepet silinmeye adaydır.
 * @param {string} slug
 * @returns {number}
 */
function getCartRetentionDays(slug) {
    const days = getSiteBySlug(slug)?.cartRetentionDays;
    return Number.isFinite(days) && days > 0 ? days : DEFAULT_CART_RETENTION_DAYS;
}

/**
 * Ödeme sonucu geldiğinde sepet sunucuda silinsin mi? (site tanımındaki clearCartOnPaymentResult)
 * @param {string} slug
 * @returns {boolean}
 */
function shouldClearCartOnPaymentResult(slug) {
    return getSiteBySlug(slug)?.clearCartOnPaymentResult === true;
}

/**
 * Sitenin vitrin kök adresi (ana alan adı = domains[0]). Geçersiz slug'da null.
 * Ödeme dönüşü gibi "müşteriyi kendi sitesine geri gönder" yönlendirmelerinde kullanılır.
 * @param {string} slug
 * @returns {string|null}
 */
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