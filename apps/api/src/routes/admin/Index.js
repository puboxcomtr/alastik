const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../../middleware/auth');

// ============================================
// GÜVENLİK KAPISI
// ============================================
// Tüm /api/admin/* uçları admin kimlik doğrulaması ister.
// İstisnalar (kasıtlı public):
//  - Akakçe / Google Merchant XML feed'leri (dış botlar okur)
//  - Vitrinin okuduğu GET uçları (tema ve genel ayarlar)
const PUBLIC_PREFIXES = [
    '/modules/akakce/feed',
    '/modules/merchant/feed',
    // Giriş ucu — token bu uçtan alınır, kapıya takılmamalıdır
    '/user/auth/login'
];
const PUBLIC_GET_PREFIXES = [
    '/design/settings/theme',
    '/settings/general',
    // Vitrin anasayfa slider'ı buradan okur (yalnızca GET; ekleme/silme kapı arkasında kalır)
    '/design/slider'
];

const maybeAuth = process.env.DISABLE_AUTH === 'true'
    ? (req, res, next) => next()
    : authenticateAdmin;

router.use((req, res, next) => {
    const path = req.path;
    if (PUBLIC_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return next();
    if (req.method === 'GET') {
        if (PUBLIC_GET_PREFIXES.some(p => path === p || path.startsWith(p + '/'))) return next();
        // XML ürün çıktıları dış sistemler tarafından okunur (örn. /integration/xml/webproducts/export.xml)
        if (path.startsWith('/integration/xml/') && path.endsWith('/export.xml')) return next();
    }
    return maybeAuth(req, res, next);
});

// ============================================
// CATALOG ROUTES
// ============================================
const productsRouter = require('./catalog/products');
router.use('/products', productsRouter);

// Ürün Butonları (ürün başına açılıp kapatılan etiketler)
router.use('/product-buttons', require('./catalog/productButtons'));

const categoriesRouter = require('./catalog/categories');
router.use('/categories', categoriesRouter);

const brandsRouter = require('./catalog/brands');
router.use('/brands', brandsRouter);

const tagsRouter = require('./catalog/tags');
router.use('/tags', tagsRouter);

const championshipsRouter = require('./catalog/championships');
router.use('/championships', championshipsRouter);

const featuresRouter = require('./catalog/features');
router.use('/features', featuresRouter);

const filtersRouter = require('./catalog/filters');
router.use('/filters', filtersRouter);

const descriptionTemplatesRouter = require('./catalog/descriptionTemplates');
router.use('/description-templates', descriptionTemplatesRouter);

const showcaseRouter = require('./catalog/showcase');
router.use('/showcases', showcaseRouter);

const mediaRouter = require('./catalog/media');
router.use('/media', mediaRouter);


// ============================================
// DASHBOARD ROUTES
// ============================================
const dashboardRoutes = require('./dashboard/ecommerce');
router.use('/dashboard', dashboardRoutes);

// Analizler: anasayfa ek widget'ları, Raporlar ve Canlı İzleme (site bazlı, kapı arkasında)
const analyticsRoutes = require('./dashboard/analytics');
router.use('/analytics', analyticsRoutes);

// SEO modülü (rapor, anahtar kelimeler, içerik analizi)
const seoModuleRoutes = require('./seo');
router.use('/seo', seoModuleRoutes);

// ============================================
// ORDERS ROUTES
// ============================================
const orderRoutes = require('./orders/order');
router.use('/orders', orderRoutes);
// Aktif Sepetler (sepetinde ürün olan üyeler / ziyaretçiler)
router.use('/carts', require('./orders/carts'));
// Ödemeler: bayi sitesindeki "Ödeme Yap" sayfasından başlatılan cari borç ödemeleri
router.use('/b2b-payments', require('./orders/b2bPayments'));

// ============================================
// CONTENT ROUTES
// ============================================
const pageRoutes = require('./content/pages');
router.use('/pages', pageRoutes);

// Link yönlendirmeleri (eski URL -> yeni URL, 301)
const redirectRoutes = require('./other/redirects');
router.use('/redirects', redirectRoutes);

// Site üyeleri (webmembers) listesi
const memberRoutes = require('./user/members');
router.use('/members', memberRoutes);

// Plasiyerler (satış personeli — DIA sis_kullanici kaynaklı)
const salespersonRoutes = require('./user/salespersons');
router.use('/salespersons', salespersonRoutes);

// B2B bayi başvuruları (login sayfasındaki başvuru formu kayıtları)
const b2bApplicationRoutes = require('./user/b2bApplications');
router.use('/b2b-applications', b2bApplicationRoutes);

const blogRoutes = require('./content/blogs');
router.use('/blogs', blogRoutes);

const blogCategoryRoutes = require('./content/blogCategories');
router.use('/blog-kategoriler', blogCategoryRoutes);

// ============================================
// CAMPAIGN ROUTES
// ============================================
const purchaseLimitsRoutes = require('./campaign/purchase-limits');
router.use('/campaign/purchase-limits', purchaseLimitsRoutes);

// ============================================
// SETTINGS ROUTES
// ============================================
const paymentRoutes = require('./settings/payment');
router.use('/settings/payment', paymentRoutes);

const translationsRoutes = require('./settings/translations');
router.use('/settings/translations', translationsRoutes);

const generalSettingsRoutes = require('./settings/general');
router.use('/settings/general', generalSettingsRoutes);

const seoRoutes = require('./settings/seo');
router.use('/settings/seo', seoRoutes);

const settingRoutes = require('./settings/settings');
router.use('/settings', settingRoutes);


// ============================================
// SETTINGS CARGO ROUTES
// ============================================
const cargoRoutes = require('./settings/cargo');
router.use('/cargo', cargoRoutes);

// Finansal İskontolar (cari tipi × marka × ödeme yöntemi → iskonto oranı)
router.use('/financial-discounts', require('./settings/financialDiscounts'));

// ============================================
// USER ROUTES
// ============================================
const authRoutes = require('./user/auth');
router.use('/user/auth', authRoutes);

const adminsRoutes = require('./user/admins');
router.use('/user/admins', adminsRoutes);

const rolesRoutes = require('./user/roles');
router.use('/user/roles', rolesRoutes);

const blockedIPsRoutes = require('./user/blocked-ips');
router.use('/user/blocked-ips', blockedIPsRoutes);

const activityLogsRoutes = require('./user/activity-logs');
router.use('/user/activity-logs', activityLogsRoutes);

// ============================================
// DESIGN ROUTES
// ============================================
const designSettingsRouter = require('./design/settings');
router.use('/design/settings', designSettingsRouter);

const sliderRoutes = require('./design/slider');
router.use('/design/slider', sliderRoutes);

const menuRoutes = require('./design/menus');
router.use('/design/menu', menuRoutes);

const bannerRoutes = require('./design/banners');
router.use('/design/banners', bannerRoutes);

// ============================================
// XML ROUTES
// ============================================
const webxmlRoutes = require('./integration/WebXml');
router.use('/integration/xml', webxmlRoutes);

// ============================================
// DIA ROUTES
// ============================================
const diaModuleRoutes = require('./../plugins/dia/settings');
router.use('/modules/dia', diaModuleRoutes);

// ============================================
// INDEXING ROUTES
// ============================================
const indexingRoutes = require('./catalog/indexing');
router.use('/indexing', indexingRoutes);

// ============================================
// MERCHANT ROUTES
// ============================================
const merchantSettingsRoutes = require('../plugins/merchant/settings');
router.use('/modules/merchant', merchantSettingsRoutes);

const merchantFeedRoutes = require('../plugins/merchant/feed');
router.use('/modules/merchant/feed', merchantFeedRoutes);

// ============================================
// AKAKCE ROUTES
// ============================================
const akakceFeedRoutes = require('../plugins/akakce/feed');
router.use('/modules/akakce/feed', akakceFeedRoutes);

const akakceSettingsRoutes = require('../plugins/akakce/settings');
router.use('/modules/akakce', akakceSettingsRoutes);

// ============================================
// TIRE Tag SYNC ROUTES
// ============================================
const tagSyncRouter = require('./catalog/tagSync');
router.use('/tags/sync', tagSyncRouter);

// ============================================
// MONTAJ NOKTALARI ROUTES
// ============================================
const montageRoutes = require('./montage/montage');
router.use('/montage', montageRoutes);

// ============================================
// MAIL ROUTES
// ============================================
const mailManagementRoutes = require('./mail/management');
router.use('/mail-management', mailManagementRoutes);

const smtpSettingsRoutes = require('./mail/smtp');
router.use('/smtp-settings', smtpSettingsRoutes);

const mailTemplatesRoutes = require('./mail/templates');
router.use('/mail-templates', mailTemplatesRoutes);

module.exports = router;