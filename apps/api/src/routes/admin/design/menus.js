const express = require('express');
const router = express.Router();
const Menu = require('../../../models/admin/design/Menu');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const Page = require('../../../models/admin/content/Page');

// Kategorileri getir (dropdown için)
router.get('/options/categories', async (req, res) => {
    try {
        const { level } = req.query;

        const filter = {
            [`siteSettings.${req.site}.webVisible`]: true
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
        const pages = await Page.find({ status: 'published', site: req.site })
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
// Blog yazılarını getir (dropdown için)
router.get('/options/blogs', async (req, res) => {
    try {
        const WebBlog = require('../../../models/web/content/WebBlog');
        const blogs = await WebBlog.find({ status: 'published' })
            .select('_id title slug')
            .sort({ publishedAt: -1, title: 1 })
            .lean();

        res.json({
            success: true,
            data: blogs
        });
    } catch (error) {
        console.error('Blog listele hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Blog yazıları listelenemedi',
            error: error.message
        });
    }
});
// Ürünleri ara (dropdown için — katalog büyük olduğundan sunucuda aranır)
router.get('/options/products', async (req, res) => {
    try {
        const WebProduct = require('../../../models/web/catalog/WebProduct');
        const { q } = req.query;
        const term = String(q || '').trim();

        const filter = { sites: req.site };
        if (term) {
            const rx = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ 'diaData.aciklama': rx }, { 'diaData.stokkartkodu': rx }];
        }

        const products = await WebProduct.find(filter)
            .select('_key diaData.aciklama diaData.stokkartkodu customData.seoUrl')
            .limit(30)
            .lean();

        res.json({
            success: true,
            data: products.map(p => ({
                _id: p._key,
                title: p.diaData?.aciklama || p.diaData?.stokkartkodu || p._key,
                sku: p.diaData?.stokkartkodu || '',
                slug: p.customData?.seoUrl || ''
            }))
        });
    } catch (error) {
        console.error('Ürün listele hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Ürünler listelenemedi',
            error: error.message
        });
    }
});
// Ana menüleri getir (alt menü eklerken kullanılacak)
router.get('/options/parent-menus', async (req, res) => {
    try {
        const { displayArea } = req.query;
        // Üst menü seçenekleri: menü grupları (1) ve üst bar öğeleri (2) — açılır öğe (3) üst olamaz
        const filter = {
            site: req.site,
            rowLevel: { $in: [1, 2] },
            isActive: true
        };

        if (displayArea) {
            filter.displayArea = displayArea;
        }

        const parentMenus = await Menu.find(filter)
            .select('_id name displayArea rowLevel menuType')
            .sort({ rowLevel: 1, order: 1 })
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

        const filter = { site: req.site };
        if (displayArea) filter.displayArea = displayArea;
        if (rowLevel) filter.rowLevel = parseInt(rowLevel);
        if (isActive !== undefined) filter.isActive = isActive === 'true';

        const menus = await Menu.find(filter)
            .populate('parentId', 'name')
            .sort({ order: 1, createdAt: 1 })
            .lean();

        // Model import'larını ekleyin (dosyanın en üstünde olmalı)
        const WebCategory = require('../../../models/web/catalog/WebCategory');
        const Page = require('../../../models/admin/content/Page');

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

            // Ürün menüsü ise
            if (menu.menuType === 'product' && menu.linkData?.productId) {
                try {
                    const WebProduct = require('../../../models/web/catalog/WebProduct');
                    const product = await WebProduct.findOne({ _key: menu.linkData.productId })
                        .select('diaData.aciklama customData.seoUrl')
                        .lean();

                    if (product) {
                        enriched.linkData = {
                            ...enriched.linkData,
                            productTitle: product.diaData?.aciklama,
                            productUrl: product.customData?.seoUrl
                        };
                    }
                } catch (err) {
                    console.error('Ürün bulunamadı:', menu.linkData.productId, err);
                }
            }

            // Blog menüsü ise
            if (menu.menuType === 'blog' && menu.linkData?.blogId) {
                try {
                    const WebBlog = require('../../../models/web/content/WebBlog');
                    const blog = await WebBlog.findById(menu.linkData.blogId)
                        .select('title slug')
                        .lean();

                    if (blog) {
                        enriched.linkData = {
                            ...enriched.linkData,
                            blogTitle: blog.title,
                            blogUrl: blog.slug
                        };
                    }
                } catch (err) {
                    console.error('Blog bulunamadı:', menu.linkData.blogId, err);
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
        const menu = await Menu.findOne({ _id: id, site: req.site })
            .populate('parentId', 'name')
            .lean();

        if (!menu) {
            return res.status(404).json({
                success: false,
                message: 'Menü bulunamadı'
            });
        }

        // Hedefin adını da döndür: düzenleme formunda seçili öğe görünsün
        try {
            if (menu.menuType === 'category' && menu.linkData?.categoryId) {
                const c = await WebCategory.findById(menu.linkData.categoryId).select('name seoUrl').lean();
                if (c) menu.linkData = { ...menu.linkData, categoryName: c.name, categoryUrl: c.seoUrl };
            } else if (menu.menuType === 'page' && menu.linkData?.pageId) {
                const pg = await Page.findById(menu.linkData.pageId).select('title slug').lean();
                if (pg) menu.linkData = { ...menu.linkData, pageTitle: pg.title, pageUrl: pg.slug };
            } else if (menu.menuType === 'blog' && menu.linkData?.blogId) {
                const WebBlog = require('../../../models/web/content/WebBlog');
                const bl = await WebBlog.findById(menu.linkData.blogId).select('title slug').lean();
                if (bl) menu.linkData = { ...menu.linkData, blogTitle: bl.title, blogUrl: bl.slug };
            } else if (menu.menuType === 'product' && menu.linkData?.productId) {
                const WebProduct = require('../../../models/web/catalog/WebProduct');
                const pr = await WebProduct.findOne({ _key: menu.linkData.productId })
                    .select('diaData.aciklama diaData.stokkartkodu customData.seoUrl').lean();
                if (pr) menu.linkData = {
                    ...menu.linkData,
                    productTitle: pr.diaData?.aciklama,
                    productSku: pr.diaData?.stokkartkodu,
                    productUrl: pr.customData?.seoUrl
                };
            }
        } catch (err) {
            console.error('Menü hedefi çözümlenemedi:', err.message);
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
        if (!menuType || !['link', 'category', 'page', 'blog', 'product', 'heading'].includes(menuType)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir menü tipi seçmelisiniz'
            });
        }

        if (!displayArea || !['header', 'footer', 'mobile', 'general'].includes(displayArea)) {
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

        if (menuType === 'product' && !linkData.productId) {
            return res.status(400).json({
                success: false,
                message: 'Ürün seçimi zorunludur'
            });
        }

        if (menuType === 'blog' && !linkData.blogId) {
            return res.status(400).json({
                success: false,
                message: 'Blog yazısı seçimi zorunludur'
            });
        }

        if (menuType === 'page' && !linkData.pageId) {
            return res.status(400).json({
                success: false,
                message: 'Sayfa seçimi zorunludur'
            });
        }
        // Seviye üst menüden türetilir: üst öğe seçildiyse onun bir altı olur (en fazla 3)
        let finalRowLevel = rowLevel || 1;
        let finalParentId = null;
        if (parentId) {
            const parentMenu = await Menu.findOne({ _id: parentId, site: req.site });
            if (!parentMenu) {
                return res.status(400).json({
                    success: false,
                    message: 'Seçilen üst menü bulunamadı'
                });
            }
            finalParentId = parentId;
            finalRowLevel = Math.min((parentMenu.rowLevel || 1) + 1, 3);
        } else {
            finalRowLevel = 1;
        }

        const newMenu = new Menu({
            name: name.trim(),
            menuType,
            linkData,
            openNewTab: openNewTab || false,
            displayArea,
            rowLevel: finalRowLevel,
            parentId: finalParentId,
            order: order || 0,
            isActive: isActive !== undefined ? isActive : true,
            site: req.site
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

        const menu = await Menu.findOne({ _id: id, site: req.site });
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
        if (!menuType || !['link', 'category', 'page', 'blog', 'product', 'heading'].includes(menuType)) {
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

        if (menuType === 'product' && !linkData.productId) {
            return res.status(400).json({
                success: false,
                message: 'Ürün seçimi zorunludur'
            });
        }

        if (menuType === 'blog' && !linkData.blogId) {
            return res.status(400).json({
                success: false,
                message: 'Blog yazısı seçimi zorunludur'
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
        // Seviye üst menüden türetilir; parentId gönderilmediyse mevcut hiyerarşi korunur
        if (parentId) {
            const parentMenu = await Menu.findOne({ _id: parentId, site: req.site });
            if (!parentMenu) {
                return res.status(400).json({
                    success: false,
                    message: 'Seçilen üst menü bulunamadı'
                });
            }
            menu.parentId = parentId;
            menu.rowLevel = Math.min((parentMenu.rowLevel || 1) + 1, 3);
        } else if (rowLevel === 1) {
            menu.parentId = null;
            menu.rowLevel = 1;
        }
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
/**
 * Sıralamayı toplu günceller (sürükle-bırak sonrası).
 * Gövde: { items: [{ id, order }] }
 */
router.patch('/order', async (req, res) => {
    try {
        const { items } = req.body;

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Sıralama listesi boş olamaz' });
        }

        const ops = items
            .filter(i => i && i.id)
            .map(i => ({
                updateOne: {
                    filter: { _id: i.id, site: req.site },
                    update: { $set: { order: Number(i.order) || 0 } }
                }
            }));

        if (ops.length === 0) {
            return res.status(400).json({ success: false, message: 'Geçerli kayıt bulunamadı' });
        }

        const sonuc = await Menu.bulkWrite(ops, { ordered: false });

        res.json({ success: true, message: 'Sıralama güncellendi', updated: sonuc.modifiedCount || 0 });
    } catch (error) {
        console.error('Menü sıralama hatası:', error);
        res.status(500).json({ success: false, message: 'Sıralama güncellenemedi' });
    }
});

// Menü grubunu (görüntüleme alanı) topluca sil — sitede kullanılıyorsa engellenir
router.delete('/area/:area', async (req, res) => {
    try {
        const { area } = req.params;

        if (!['header', 'footer', 'mobile', 'general'].includes(area)) {
            return res.status(400).json({
                success: false,
                message: 'Geçersiz menü alanı'
            });
        }

        const total = await Menu.countDocuments({ site: req.site, displayArea: area });
        if (total === 0) {
            return res.status(400).json({
                success: false,
                message: 'Bu menüde silinecek öğe yok'
            });
        }

        // Aktif öğesi olan menü sitede kullanılıyor demektir — silinemez
        const activeCount = await Menu.countDocuments({ site: req.site, displayArea: area, isActive: true });
        if (activeCount > 0) {
            return res.status(400).json({
                success: false,
                message: `Bu menü sitede kullanılıyor: ${activeCount} aktif öğe var. Silmek için önce öğeleri pasife alın.`
            });
        }

        const result = await Menu.deleteMany({ site: req.site, displayArea: area });

        res.json({
            success: true,
            message: `Menü silindi (${result.deletedCount} öğe kaldırıldı)`
        });
    } catch (error) {
        console.error('Menü grubu silme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Menü silinemedi',
            error: error.message
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const menu = await Menu.findOne({ _id: id, site: req.site });
        if (!menu) {
            return res.status(404).json({
                success: false,
                message: 'Menü bulunamadı'
            });
        }

        // Eğer ana menü ise, alt menüleri kontrol et
        if (menu.rowLevel === 1) {
            const childCount = await Menu.countDocuments({ parentId: id, site: req.site });
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