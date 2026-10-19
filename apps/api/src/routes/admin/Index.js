const express = require('express');
const router = express.Router();
const { authenticateAdmin } = require('../../middleware/auth');

const PUBLIC_PREFIXES = [
    '/modules/akakce/feed',
    '/modules/merchant/feed',
    '/user/auth/login'
];
const PUBLIC_GET_PREFIXES = [
    '/design/settings/theme',
    '/settings/general',
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
        if (path.startsWith('/integration/xml/') && path.endsWith('/export.xml')) return next();
    }
    return maybeAuth(req, res, next);
});

const productsRouter = require('./catalog/products');
router.use('/products', productsRouter);

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

const dashboardRoutes = require('./dashboard/ecommerce');
router.use('/dashboard', dashboardRoutes);

const analyticsRoutes = require('./dashboard/analytics');
router.use('/analytics', analyticsRoutes);

const seoModuleRoutes = require('./seo');
router.use('/seo', seoModuleRoutes);

const orderRoutes = require('./orders/order');
router.use('/orders', orderRoutes);
router.use('/carts', require('./orders/carts'));
router.use('/b2b-payments', require('./orders/b2bPayments'));

const pageRoutes = require('./content/pages');
router.use('/pages', pageRoutes);

const redirectRoutes = require('./other/redirects');
router.use('/redirects', redirectRoutes);

const memberRoutes = require('./user/members');
router.use('/members', memberRoutes);

const salespersonRoutes = require('./user/salespersons');
router.use('/salespersons', salespersonRoutes);

const b2bApplicationRoutes = require('./user/b2bApplications');
router.use('/b2b-applications', b2bApplicationRoutes);

const blogRoutes = require('./content/blogs');
router.use('/blogs', blogRoutes);

const blogCategoryRoutes = require('./content/blogCategories');
router.use('/blog-kategoriler', blogCategoryRoutes);

const purchaseLimitsRoutes = require('./campaign/purchase-limits');
router.use('/campaign/purchase-limits', purchaseLimitsRoutes);

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

const cargoRoutes = require('./settings/cargo');
router.use('/cargo', cargoRoutes);

router.use('/financial-discounts', require('./settings/financialDiscounts'));

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

const designSettingsRouter = require('./design/settings');
router.use('/design/settings', designSettingsRouter);

const sliderRoutes = require('./design/slider');
router.use('/design/slider', sliderRoutes);

const menuRoutes = require('./design/menus');
router.use('/design/menu', menuRoutes);

const bannerRoutes = require('./design/banners');
router.use('/design/banners', bannerRoutes);

const webxmlRoutes = require('./integration/WebXml');
router.use('/integration/xml', webxmlRoutes);

const diaModuleRoutes = require('./../plugins/dia/settings');
router.use('/modules/dia', diaModuleRoutes);

const indexingRoutes = require('./catalog/indexing');
router.use('/indexing', indexingRoutes);

const merchantSettingsRoutes = require('../plugins/merchant/settings');
router.use('/modules/merchant', merchantSettingsRoutes);

const merchantFeedRoutes = require('../plugins/merchant/feed');
router.use('/modules/merchant/feed', merchantFeedRoutes);

const akakceFeedRoutes = require('../plugins/akakce/feed');
router.use('/modules/akakce/feed', akakceFeedRoutes);

const akakceSettingsRoutes = require('../plugins/akakce/settings');
router.use('/modules/akakce', akakceSettingsRoutes);

const tagSyncRouter = require('./catalog/tagSync');
router.use('/tags/sync', tagSyncRouter);

const montageRoutes = require('./montage/montage');
router.use('/montage', montageRoutes);

const mailManagementRoutes = require('./mail/management');
router.use('/mail-management', mailManagementRoutes);

const smtpSettingsRoutes = require('./mail/smtp');
router.use('/smtp-settings', smtpSettingsRoutes);

const mailTemplatesRoutes = require('./mail/templates');
router.use('/mail-templates', mailTemplatesRoutes);

module.exports = router;