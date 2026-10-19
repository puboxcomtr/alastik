
const MODULE_DEFINITIONS = {
    'catalog.products': {
        name: 'Ürünler',
        category: 'Katalog',
        actions: ['view', 'edit', 'sync']
    },
    'catalog.categories': {
        name: 'Kategoriler',
        category: 'Katalog',
        actions: ['view', 'edit', 'sync']
    },
    'catalog.brands': {
        name: 'Markalar',
        category: 'Katalog',
        actions: ['view', 'edit', 'sync']
    },
    'catalog.tags': {
        name: 'Etiketler',
        category: 'Katalog',
        actions: ['view', 'create', 'edit', 'delete']
    },
    'catalog.features': {
        name: 'Özellikler',
        category: 'Katalog',
        actions: ['view', 'edit']
    },

    'orders': {
        name: 'Siparişler',
        category: 'Siparişler',
        actions: ['view', 'edit']
    },

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

    'campaigns': {
        name: 'Kampanya Yönetimi',
        category: 'Kampanya Yönetimi',
        actions: ['view', 'create', 'edit', 'delete']
    },

    'plugins': {
        name: 'Eklentiler',
        category: 'Eklentiler',
        actions: ['view', 'create', 'edit', 'delete']
    },

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
        actions: ['view']
    }
};

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

const getModuleDefinition = (moduleKey) => {
    return MODULE_DEFINITIONS[moduleKey] || null;
};

const getAllModuleKeys = () => {
    return Object.keys(MODULE_DEFINITIONS);
};

module.exports = {
    MODULE_DEFINITIONS,
    getModulesByCategory,
    getModuleDefinition,
    getAllModuleKeys
};