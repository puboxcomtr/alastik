const express = require('express');
const router = express.Router();
const Menu = require('../../../models/Menu');
const WebCategory = require('../../../models/WebCategory');
const Page = require('../../../models/Page');

// Kategorileri getir (dropdown için)
router.get('/options/categories', async (req, res) => {
    try {
        const { level } = req.query;

        const filter = {
            webVisible: true
        };

        if (level) {
            filter.level = parseInt(level);
        }

        const categories = await WebCategory.find(filter)
            .select('_id  name level')
            .sort({ name: 1 })
            .lean();

        const formattedCategories = categories.map(cat => ({
            _id: cat._id,
            name: cat.name,
            categoryLevel: cat.level
        }));

        res.json({
            success: true,
            data: formattedCategories
        });
    } catch (error) {
        console.error('Kategori listele hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Kategoriler listelenemedi',
            error: error.message
        });
    }
});

// Sayfaları getir (dropdown için)
router.get('/options/pages', async (req, res) => {
    try {
        const pages = await Page.find({ status: 'published' })
            .select('_id title slug')
            .sort({ title: 1 })
            .lean();

        res.json({
            success: true,
            data: pages
        });
    } catch (error) {
        console.error('Sayfa listele hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Sayfalar listelenemedi',
            error: error.message
        });
    }
});
// Ana menüleri getir (alt menü eklerken kullanılacak)
router.get('/options/parent-menus', async (req, res) => {
    try {
        const { displayArea } = req.query;
        const filter = {
            rowLevel: 1,
            isActive: true
        };

        if (displayArea) {
            filter.displayArea = displayArea;
        }

        const parentMenus = await Menu.find(filter)
            .select('_id name displayArea')
            .sort({ order: 1 })
            .lean();

        res.json({
            success: true,
            data: parentMenus
        });
    } catch (error) {
        console.error('Ana menü listele hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ana menüler listelenemedi',
            error: error.message
        });
    }
});
// Menüleri Listele
router.get('/', async (req, res) => {
    try {
        const { displayArea, rowLevel, isActive } = req.query;

        const filter = {};
        if (displayArea) filter.displayArea = displayArea;
        if (rowLevel) filter.rowLevel = parseInt(rowLevel);
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const menus = await Menu.find(filter)
            .populate('parentId', 'name')
            .sort({ order: 1, createdAt: 1 })
            .lean();

        // Model import'larını ekleyin (dosyanın en üstünde olmalı)
        const WebCategory = require('../../../models/WebCategory');
        const Page = require('../../../models/Page');

        // Her menü için kategori ve sayfa bilgilerini ekle
        const enrichedMenus = await Promise.all(menus.map(async (menu) => {
            const enriched = { ...menu };

            // Kategori menüsü ise
            if (menu.menuType === 'category' && menu.linkData?.categoryId) {
                try {
                    const category = await WebCategory.findById(menu.linkData.categoryId)
                        .select('name seoUrl')
                        .lean();

                    if (category) {
                        enriched.linkData = {
                            ...enriched.linkData,
                            categoryName: category.name,
                            categoryUrl: category.seoUrl
                        };
                    }
                } catch (err) {
                    console.error('Kategori bulunamadı:', menu.linkData.categoryId, err);
                }
            }

            // Sayfa menüsü ise
            if (menu.menuType === 'page' && menu.linkData?.pageId) {
                try {
                    const page = await Page.findById(menu.linkData.pageId)
                        .select('title slug')
                        .lean();

                    if (page) {
                        enriched.linkData = {
                            ...enriched.linkData,
                            pageTitle: page.title,
                            pageUrl: page.slug
                        };
                    }
                } catch (err) {
                    console.error('Sayfa bulunamadı:', menu.linkData.pageId, err);
                }
            }

            return enriched;
        }));

        // Hiyerarşik yapı oluştur (enrichedMenus kullan)
        const menuTree = [];
        const menuMap = {};

        enrichedMenus.forEach(menu => {
            menuMap[menu._id] = { ...menu, children: [] };
        });

        enrichedMenus.forEach(menu => {
            if (menu.rowLevel === 1) {
                menuTree.push(menuMap[menu._id]);
            } else if (menu.parentId) {
                const parent = menuMap[menu.parentId._id || menu.parentId];
                if (parent) {
                    parent.children.push(menuMap[menu._id]);
                }
            }
        });

        res.json({
            success: true,
            data: menuTree,
            flatData: enrichedMenus
        });
    } catch (error) {
        console.error('Menü listele hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Menüler listelenemedi',
            error: error.message
        });
    }
});
// Tek menü getir
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const menu = await Menu.findById(id)
            .populate('parentId', 'name')
            .lean();

        if (!menu) {
            return res.status(404).json({
                success: false,
                message: 'Menü bulunamadı'
            });
        }

        res.json({
            success: true,
            data: menu
        });
    } catch (error) {
        console.error('Menü getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Menü getirilemedi',
            error: error.message
        });
    }
});

// Yeni menü oluştur
router.post('/', async (req, res) => {
    try {
        const { name, menuType, linkData, openNewTab, displayArea, rowLevel, parentId, order, isActive } = req.body;

        // Validasyon
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Menü adı zorunludur'
            });
        }

        // 'heading' eklendi
        if (!menuType || !['link', 'category', 'page', 'heading'].includes(menuType)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir menü tipi seçmelisiniz'
            });
        }

        if (!displayArea || !['header', 'footer', 'mobile'].includes(displayArea)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir gösterilecek alan seçmelisiniz'
            });
        }

        if (rowLevel === 2 && !parentId) {
            return res.status(400).json({
                success: false,
                message: 'Alt menü için ana menü seçmelisiniz'
            });
        }

        // linkData validasyonu
        if (menuType === 'link' && (!linkData.url || !linkData.url.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Link URL adresi zorunludur'
            });
        }

        if (menuType === 'category' && !linkData.categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Kategori seçimi zorunludur'
            });
        }

        if (menuType === 'page' && !linkData.pageId) {
            return res.status(400).json({
                success: false,
                message: 'Sayfa seçimi zorunludur'
            });
        }
        const newMenu = new Menu({
            name: name.trim(),
            menuType,
            linkData,
            openNewTab: openNewTab || false,
            displayArea,
            rowLevel: rowLevel || 1,
            parentId: rowLevel === 2 ? parentId : null,
            order: order || 0,
            isActive: isActive !== undefined ? isActive : true
        });

        await newMenu.save();

        res.status(201).json({
            success: true,
            message: 'Menü başarıyla oluşturuldu',
            data: newMenu
        });
    } catch (error) {
        console.error('Menü oluşturma hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Menü oluşturulamadı',
            error: error.message
        });
    }
});
// Menü güncelle
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, menuType, linkData, openNewTab, displayArea, rowLevel, parentId, order, isActive } = req.body;

        const menu = await Menu.findById(id);
        if (!menu) {
            return res.status(404).json({
                success: false,
                message: 'Menü bulunamadı'
            });
        }

        // Validasyonlar
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Menü adı zorunludur'
            });
        }

        // 'heading' eklendi
        if (!menuType || !['link', 'category', 'page', 'heading'].includes(menuType)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir menü tipi seçmelisiniz'
            });
        }

        if (rowLevel === 2 && !parentId) {
            return res.status(400).json({
                success: false,
                message: 'Alt menü için ana menü seçmelisiniz'
            });
        }

        // linkData validasyonu
        if (menuType === 'link' && (!linkData.url || !linkData.url.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Link URL adresi zorunludur'
            });
        }

        if (menuType === 'category' && !linkData.categoryId) {
            return res.status(400).json({
                success: false,
                message: 'Kategori seçimi zorunludur'
            });
        }

        if (menuType === 'page' && !linkData.pageId) {
            return res.status(400).json({
                success: false,
                message: 'Sayfa seçimi zorunludur'
            });
        }

        menu.name = name.trim();
        menu.menuType = menuType;
        menu.linkData = linkData;
        menu.openNewTab = openNewTab;
        menu.displayArea = displayArea;
        menu.rowLevel = rowLevel;
        menu.parentId = rowLevel === 2 ? parentId : null;
        menu.order = order;
        menu.isActive = isActive;

        await menu.save();

        res.json({
            success: true,
            message: 'Menü başarıyla güncellendi',
            data: menu
        });
    } catch (error) {
        console.error('Menü güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Menü güncellenemedi',
            error: error.message
        });
    }
});
// Menü sil
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const menu = await Menu.findById(id);
        if (!menu) {
            return res.status(404).json({
                success: false,
                message: 'Menü bulunamadı'
            });
        }

        // Eğer ana menü ise, alt menüleri kontrol et
        if (menu.rowLevel === 1) {
            const childCount = await Menu.countDocuments({ parentId: id });
            if (childCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu menüye bağlı alt menüler var. Önce alt menüleri silmelisiniz.'
                });
            }
        }

        await Menu.findByIdAndDelete(id);

        res.json({
            success: true,
            message: 'Menü başarıyla silindi'
        });
    } catch (error) {
        console.error('Menü silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Menü silinemedi',
            error: error.message
        });
    }
});

module.exports = router;