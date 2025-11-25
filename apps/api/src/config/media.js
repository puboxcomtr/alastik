const path = require('path');

// Base paths
const PUBLIC_DIR = path.join(__dirname, '../../public');

// Media kategorileri ve ayarları
const MEDIA_CONFIG = {
    brand: {
        folder: 'marka',
        basePath: PUBLIC_DIR,
        urlPrefix: '/marka',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
        maxSize: 5 * 1024 * 1024 // 5MB
    },

    category: {
        folder: 'kategori',
        basePath: PUBLIC_DIR,
        urlPrefix: '/kategori',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
        maxSize: 5 * 1024 * 1024
    },

    product: {
        folder: 'urun',
        basePath: PUBLIC_DIR,
        urlPrefix: '/urun',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp'],
        maxSize: 10 * 1024 * 1024 // 10MB
    },

    slider: {
        folder: 'sliders',
        basePath: PUBLIC_DIR,
        urlPrefix: '/sliders',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
        maxSize: 10 * 1024 * 1024
    },

    banner: {
        folder: 'banners',
        basePath: PUBLIC_DIR,
        urlPrefix: '/banners',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
        maxSize: 10 * 1024 * 1024
    },

    theme: {
        folder: 'theme',
        basePath: PUBLIC_DIR,
        urlPrefix: '/theme',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/x-icon'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg', '.ico'],
        maxSize: 5 * 1024 * 1024
    },

    general: {
        folder: 'general',
        basePath: PUBLIC_DIR,
        urlPrefix: '/general',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'],
        maxSize: 5 * 1024 * 1024
    },

    blog: {
        folder: 'blog',
        basePath: PUBLIC_DIR,
        urlPrefix: '/blog',
        allowedTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        allowedExtensions: ['.jpg', '.jpeg', '.png', '.webp'],
        maxSize: 5 * 1024 * 1024
    }
};

/**
 * Kategori için upload dizinini al
 */
function getUploadDir(category) {
    const config = MEDIA_CONFIG[category];
    if (!config) {
        throw new Error(`Gecersiz media kategorisi: ${category}`);
    }
    return path.join(config.basePath, config.folder);
}

/**
 * Kategori için URL prefix'ini al
 */
function getUrlPrefix(category) {
    const config = MEDIA_CONFIG[category];
    if (!config) {
        throw new Error(`Gecersiz media kategorisi: ${category}`);
    }
    return config.urlPrefix;
}

/**
 * URL'den tam sistem yolunu al
 */
function getFullPath(urlPath) {
    if (!urlPath) return null;

    for (const [category, config] of Object.entries(MEDIA_CONFIG)) {
        if (urlPath.startsWith(config.urlPrefix + '/')) {
            const fileName = urlPath.replace(config.urlPrefix + '/', '');
            return path.join(config.basePath, config.folder, fileName);
        }
    }

    if (urlPath.startsWith('/uploads/')) {
        const relativePath = urlPath.replace('/uploads/', '');
        return path.join(PUBLIC_DIR, 'uploads', relativePath);
    }

    // Doğrudan public altında
    return path.join(PUBLIC_DIR, urlPath.replace(/^\//, ''));
}

/**
 * Kategori ayarlarını al
 */
function getConfig(category) {
    const config = MEDIA_CONFIG[category];
    if (!config) {
        throw new Error(`Gecersiz media kategorisi: ${category}`);
    }
    return config;
}

/**
 * Tüm kategorileri al
 */
function getAllCategories() {
    return Object.keys(MEDIA_CONFIG);
}

/**
 * URL'den kategori belirle
 */
function getCategoryFromUrl(url) {
    if (!url) return null;

    for (const [category, config] of Object.entries(MEDIA_CONFIG)) {
        if (url.startsWith(config.urlPrefix + '/')) {
            return category;
        }
    }

    return null;
}

module.exports = {
    MEDIA_CONFIG,
    PUBLIC_DIR,
    getUploadDir,
    getUrlPrefix,
    getFullPath,
    getConfig,
    getAllCategories,
    getCategoryFromUrl
};