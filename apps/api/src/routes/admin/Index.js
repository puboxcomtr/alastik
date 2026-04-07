const express = require('express');
const router = express.Router();


// ============================================
// CATALOG ROUTES
// ============================================
const productsRouter = require('./catalog/products');
router.use('/products', productsRouter);

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

const showcaseRouter = require('./catalog/showcase');
router.use('/showcases', showcaseRouter);

const mediaRouter = require('./catalog/media');
router.use('/media', mediaRouter);


// ============================================
// ORDERS ROUTES
// ============================================
const orderRoutes = require('./orders/order');
router.use('/orders', orderRoutes);

// ============================================
// CONTENT ROUTES
// ============================================
const pageRoutes = require('./content/pages');
router.use('/pages', pageRoutes);

const blogRoutes = require('./content/blogs');
router.use('/blogs', blogRoutes);

// ============================================
// SETTINGS ROUTES
// ============================================
const paymentRoutes = require('./settings/payment');
router.use('/settings/payment', paymentRoutes);

const translationsRoutes = require('./settings/translations');
router.use('/settings/translations', translationsRoutes);

const generalSettingsRoutes = require('./settings/general');
router.use('/settings/general', generalSettingsRoutes);

const settingRoutes = require('./settings/settings');
router.use('/settings', settingRoutes);

const seoRoutes = require('./settings/seo');
router.use('/settings/seo', seoRoutes);

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

module.exports = router;