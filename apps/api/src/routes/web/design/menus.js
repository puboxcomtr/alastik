const express = require('express');
const router = express.Router();

const Menu = require('../../../models/admin/design/Menu');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const Page = require('../../../models/admin/content/Page');

async function enrichMenus(menus) {
    return Promise.all(menus.map(async (menu) => {
        const enriched = { ...menu };

        if (menu.menuType === 'category' && menu.linkData?.categoryId) {
            const category = await WebCategory.findById(menu.linkData.categoryId)
                .select('name seoUrl')
                .lean()
                .catch(() => null);
            if (category) {
                enriched.linkData = { ...enriched.linkData, categoryName: category.name, categoryUrl: category.seoUrl };
            }
        }

        if (menu.menuType === 'blogCategory' && menu.linkData?.blogCategoryId) {
            const BlogCategory = require('../../../models/admin/content/BlogCategory');
            const bc = await BlogCategory.findOne({ _id: menu.linkData.blogCategoryId, site: menu.site })
                .select('name slug')
                .lean()
                .catch(() => null);
            if (bc) {
                enriched.linkData = { ...enriched.linkData, blogCategoryName: bc.name, blogCategoryUrl: bc.slug };
            }
        }

        if (menu.menuType === 'page' && menu.linkData?.pageId) {
            const page = await Page.findById(menu.linkData.pageId)
                .select('title slug')
                .lean()
                .catch(() => null);
            if (page) {
                enriched.linkData = { ...enriched.linkData, pageTitle: page.title, pageUrl: page.slug };
            }
        }

        if (menu.menuType === 'product' && menu.linkData?.productId) {
            const WebProduct = require('../../../models/web/catalog/WebProduct');
            const product = await WebProduct.findOne({ _key: menu.linkData.productId, sites: menu.site })
                .select('diaData.aciklama customData.seoUrl')
                .lean()
                .catch(() => null);
            if (product) {
                enriched.linkData = { ...enriched.linkData, productTitle: product.diaData?.aciklama, productUrl: product.customData?.seoUrl };
            }
        }

        if (menu.menuType === 'brand' && menu.linkData?.brandId) {
            const WebBrand = require('../../../models/web/catalog/WebBrand');
            const brand = await WebBrand.findById(menu.linkData.brandId)
                .select('name slug seoUrl')
                .lean()
                .catch(() => null);
            if (brand) {
                enriched.linkData = { ...enriched.linkData, brandTitle: brand.name, brandUrl: brand.seoUrl || brand.slug };
            }
        }

        if (menu.menuType === 'tag' && menu.linkData?.tagId) {
            const WebTag = require('../../../models/web/catalog/WebTag');
            const tag = await WebTag.findById(menu.linkData.tagId)
                .select('title seoUrl')
                .lean()
                .catch(() => null);
            if (tag) {
                enriched.linkData = { ...enriched.linkData, tagTitle: tag.title, tagUrl: tag.seoUrl };
            }
        }

        if (menu.menuType === 'blog' && menu.linkData?.blogId) {
            const WebBlog = require('../../../models/web/content/WebBlog');
            const blog = await WebBlog.findById(menu.linkData.blogId)
                .select('title slug')
                .lean()
                .catch(() => null);
            if (blog) {
                enriched.linkData = { ...enriched.linkData, blogTitle: blog.title, blogUrl: blog.slug };
            }
        }

        return enriched;
    }));
}

router.get('/group/:id', async (req, res) => {
    try {
        const group = await Menu.findOne({ _id: req.params.id, site: req.site, isActive: true }).lean();
        if (!group) {
            return res.status(404).json({ success: false, message: 'Menü bulunamadı' });
        }

        const members = await Menu.find({ site: req.site, isActive: true })
            .sort({ order: 1, createdAt: 1 })
            .lean();
        const enriched = await enrichMenus(members);

        const byParent = new Map();
        enriched.forEach(m => {
            const pid = m.parentId ? String(m.parentId) : 'root';
            if (!byParent.has(pid)) byParent.set(pid, []);
            byParent.get(pid).push(m);
        });

        const buildChildren = (parentId, depth = 0) => {
            if (depth > 2) return [];
            return (byParent.get(String(parentId)) || []).map(item => ({
                ...item,
                children: buildChildren(item._id, depth + 1)
            }));
        };

        const [enrichedGroup] = await enrichMenus([group]);

        res.json({
            success: true,
            data: {
                _id: group._id,
                name: group.name,
                menuType: enrichedGroup.menuType,
                linkData: enrichedGroup.linkData,
                items: buildChildren(group._id)
            }
        });
    } catch (error) {
        console.error('Menü grubu hatası:', error);
        res.status(500).json({ success: false, message: 'Menü yüklenemedi' });
    }
});

router.get('/area/:area', async (req, res) => {
    try {
        const { area } = req.params;

        const menus = await Menu.find({ site: req.site, displayArea: area, isActive: true })
            .sort({ order: 1, createdAt: 1 })
            .lean();

        if (!menus.length) {
            return res.json({ success: true, data: [] });
        }

        const enriched = await enrichMenus(menus);

        const byParent = new Map();

        enriched.forEach(item => {
            const pid = item.parentId ? String(item.parentId) : 'root';

            if (!byParent.has(pid)) byParent.set(pid, []);
            byParent.get(pid).push(item);
        });

        const groups = (byParent.get('root') || []).map(group => ({
            _id: group._id,
            name: group.name,
            items: (byParent.get(String(group._id)) || []).flatMap(item => [
                item,
                ...(byParent.get(String(item._id)) || [])
            ])
        })).filter(group => group.items.length > 0);

        res.json({ success: true, data: groups });
    } catch (error) {
        console.error('Alan menüsü hatası:', error);
        res.status(500).json({ success: false, message: 'Menü yüklenemedi' });
    }
});

router.get('/ustlink', async (req, res) => {
    try {
        const menus = await Menu.find({ site: req.site, displayArea: 'ustlink', isActive: true })
            .sort({ order: 1, createdAt: 1 })
            .lean();
        const enriched = await enrichMenus(menus);
        res.json({ success: true, data: enriched });
    } catch (error) {
        console.error('Üst link menüsü hatası:', error);
        res.status(500).json({ success: false, message: 'Üst linkler yüklenemedi' });
    }
});

router.get('/header', async (req, res) => {
    try {
        const menus = await Menu.find({
            site: req.site,
            displayArea: 'header',
            isActive: true
        })
            .populate('parentId', 'name')
            .sort({ order: 1, createdAt: 1 })
            .lean();
        const enrichedMenus = await enrichMenus(menus);

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

        const finalRoots = [];
        roots.forEach(node => {
            if (node.menuType === 'heading' && node.children.length > 0) {
                finalRoots.push(...node.children);
            } else {
                finalRoots.push(node);
            }
        });

        res.json({
            success: true,
            data: finalRoots
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