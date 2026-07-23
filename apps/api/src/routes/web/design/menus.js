// Express router
const express = require('express');
const router = express.Router();

// Models
const Menu = require('../../../models/admin/design/Menu');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const Page = require('../../../models/admin/content/Page');

router.get('/header', async (req, res) => {
    try {
        const menus = await Menu.find({
            site: req.site,
            displayArea: 'header',
            isActive: true
        })
            .populate('parentId', 'name')
            .sort({ order: 1, name: 1 })
            .lean();
        const enrichedMenus = await Promise.all(menus.map(async (menu) => {
            const enriched = { ...menu };

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
                    console.error('Kategori bulunamadı:', err);
                }
            }

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
                    console.error('Sayfa bulunamadı:', err);
                }
            }

            return enriched;
        }));

        const menuMap = new Map();
        const roots = [];

        enrichedMenus.forEach(menu => {
            menuMap.set(menu._id.toString(), {
                ...menu,
                children: []
            });
        });

        enrichedMenus.forEach(menu => {
            const menuObj = menuMap.get(menu._id.toString());

            if (menu.parentId) {
                const parentId = menu.parentId._id || menu.parentId;
                const parent = menuMap.get(parentId.toString());
                if (parent) {
                    parent.children.push(menuObj);
                }
            } else {
                roots.push(menuObj);
            }
        });

        res.json({
            success: true,
            data: roots
        });
    } catch (error) {
        console.error('Header menü hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Menü yüklenemedi'
        });
    }
});

module.exports = router;