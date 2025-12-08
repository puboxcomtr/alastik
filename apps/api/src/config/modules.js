/**
 * Sistem Modül Tanımları
 * Her modül için hangi yetkilerin olabileceğini tanımlar
 */

const MODULE_DEFINITIONS = {
    // KATALOG
    'catalog.products': {
        name: 'Ürünler',
        category: 'Katalog',
        actions: ['view', 'edit', 'sync'] // Ekleme ve Silme yok
    },
    'catalog.categories': {
        name: 'Kategoriler',
        category: 'Katalog',
        actions: ['view', 'edit', 'sync'] // Ekleme ve Silme yok
    },
    'catalog.brands': {
        name: 'Markalar',
        category: 'Katalog',
        actions: ['view', 'edit', 'sync'] // Ekleme ve Silme yok
    },
    'catalog.tags': {
        name: 'Etiketler',
        category: 'Katalog',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'catalog.features': {
        name: 'Özellikler',
        category: 'Katalog',
        actions: ['view', 'edit'] // Ekleme ve Silme yok
    },

    // SİPARİŞLER
    'orders': {
        name: 'Siparişler',
        category: 'Siparişler',
        actions: ['view', 'edit'] // Sadece görüntüleme ve güncelleme
    },

    // İÇERİK
    'content.pages': {
        name: 'Sayfalar',
        category: 'İçerik',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'content.blogs': {
        name: 'Bloglar',
        category: 'İçerik',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'content.forms': {
        name: 'Formlar',
        category: 'İçerik',
        actions: ['view', 'create', 'edit', 'delete']
    },

    // ÜYELER
    'members.users': {
        name: 'Üyeler',
        category: 'Üyeler',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'members.support': {
        name: 'Destek Talepleri',
        category: 'Üyeler',
        actions: ['view', 'create', 'edit', 'delete']
    },

    // KAMPANYA YÖNETİMİ
    'campaigns': {
        name: 'Kampanya Yönetimi',
        category: 'Kampanya Yönetimi',
        actions: ['view', 'create', 'edit', 'delete']
    },

    // EKLENTİLER
    'plugins': {
        name: 'Eklentiler',
        category: 'Eklentiler',
        actions: ['view', 'create', 'edit', 'delete']
    },

    // AYARLAR
    'settings.general': {
        name: 'Genel Ayarlar',
        category: 'Ayarlar',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'settings.users': {
        name: 'Kullanıcılar',
        category: 'Ayarlar',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'settings.design': {
        name: 'Tasarım Ayarları',
        category: 'Ayarlar',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'settings.shipping': {
        name: 'Kargo Ayarları',
        category: 'Ayarlar',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'settings.mail': {
        name: 'Mail Ayarları',
        category: 'Ayarlar',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'settings.queue': {
        name: 'İşlem Kuyruğu',
        category: 'Ayarlar',
        actions: ['view'] // Sadece görüntüleme
    }
};

/**
 * Tüm modülleri kategorilere göre grupla
 */
const getModulesByCategory = () => {
    const grouped = {};

    Object.entries(MODULE_DEFINITIONS).forEach(([key, module]) => {
        if (!grouped[module.category]) {
            grouped[module.category] = [];
        }
        grouped[module.category].push({
            key,
            ...module
        });
    });

    return grouped;
};

/**
 * Modül anahtarına göre tanımı getir
 */
const getModuleDefinition = (moduleKey) => {
    return MODULE_DEFINITIONS[moduleKey] || null;
};

/**
 * Tüm modül anahtarlarını listele
 */
const getAllModuleKeys = () => {
    return Object.keys(MODULE_DEFINITIONS);
};

module.exports = {
    MODULE_DEFINITIONS,
    getModulesByCategory,
    getModuleDefinition,
    getAllModuleKeys
};