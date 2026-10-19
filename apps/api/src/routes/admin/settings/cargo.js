const express = require('express');
const router = express.Router();
const Cargo = require('../../../models/admin/settings/Cargo');
const WebCategory = require('../../../models/web/catalog/WebCategory');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebBrand = require('../../../models/web/catalog/WebBrand');
const { invalidateShippingRules } = require('../../../services/web/cargo/ShippingRuleService');
const { assignMissingCargoNos } = require('../../../utils/cargoNo');

const CARGO_NO_PATTERN = /^\d{1,9}$/;
const XmlShippingPriceUpdaterService = require('../../../services/web/cargo/XmlShippingPriceUpdaterService');

const triggerShippingUpdate = (cargo) => {
    if (cargo?.productType !== 'xml_integration') return;
    XmlShippingPriceUpdaterService.updateAll(cargo.site)
        .then(r => console.log('[Cargo] Kargo dahil fiyatlar güncellendi:', r.updated))
        .catch(e => console.error('[Cargo] Fiyat güncelleme hatası:', e.message));
};

function validateDesiRanges(ranges) {
    if (!Array.isArray(ranges)) return null;
    for (let i = 0; i < ranges.length; i++) {
        const r = ranges[i];
        if (typeof r.min !== 'number' || typeof r.max !== 'number' || typeof r.price !== 'number') {
            return 'Desi aralık verileri geçersiz';
        }
        if (r.max < r.min) return 'Desi aralığı bitiş değeri başlangıçtan küçük olamaz';
        if (i > 0 && r.min < ranges[i - 1].max) return 'Desi aralıkları birbiriyle çakışamaz';
    }
    return null;
}

const SCOPE_TYPES = ['', 'category', 'brand', 'product', 'size'];

function cleanScopedRules(input, idField, nameField, withDiaBrand = false) {
    if (!Array.isArray(input)) return { error: 'Kural listesi geçersiz' };
    const seen = new Set();
    const rules = [];
    for (const rule of input) {
        const id = String(rule?.[idField] || '');
        if (!id.match(/^[a-f0-9]{24}$/i)) return { error: 'Seçim geçersiz' };
        if (seen.has(id)) return { error: `Aynı kayıt birden fazla kez eklenemez: ${rule[nameField] || id}` };
        seen.add(id);
        const ranges = Array.isArray(rule.desiPricing?.ranges) ? rule.desiPricing.ranges : [];
        const rangeError = validateDesiRanges(ranges);
        if (rangeError) return { error: `${rule[nameField] || 'Kural'}: ${rangeError}` };
        const sizeRules = [];
        const seenSizes = new Set();
        for (const sr of Array.isArray(rule.sizeRules) ? rule.sizeRules : []) {
            const size = String(sr?.size || '').trim();
            const price = Number(sr?.price);
            if (!size || !Number.isFinite(price) || price < 0 || seenSizes.has(size)) continue;
            seenSizes.add(size);
            sizeRules.push({ size, price });
        }
        const cleaned = {
            [idField]: id,
            [nameField]: String(rule[nameField] || '').trim(),
            fixedPrice: Number(rule.fixedPrice) || 0,
            pricingMode: rule.pricingMode === 'size' ? 'size' : 'all',
            sizeRules,
            desiPricing: { ranges, extraPerDesi: Number(rule.desiPricing?.extraPerDesi) || 0 }
        };
        if (withDiaBrand) cleaned.diaBrand = String(rule.diaBrand || '').trim();
        rules.push(cleaned);
    }
    return { rules };
}

async function findScopedProducts(site, { categoryId, brandId }, projection) {
    const base = { sites: site, 'syncInfo.diaStatus': 'synced' };
    if (categoryId) {
        const category = await WebCategory.findById(categoryId).select('name diaCategory diaLevel').lean();
        if (!category || !category.diaCategory) return { error: 'Kategori bulunamadı veya DIA eşleşmesi yok' };
        const diaLevel = category.diaLevel || 'kategori_aciklama_2';
        const products = await WebProduct.find({ ...base, 'diaData.m_kategoriler': { $elemMatch: { [diaLevel]: category.diaCategory } } }, projection).lean();
        return { products, label: category.name };
    }
    if (brandId) {
        const brand = await WebBrand.findById(brandId).select('name diaBrand customName').lean();
        if (!brand || !brand.diaBrand) return { error: 'Marka bulunamadı veya DIA eşleşmesi yok' };
        const products = await WebProduct.find({ ...base, 'diaData.marka': { $regex: new RegExp(`^${brand.diaBrand.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') } }, projection).lean();
        return { products, label: brand.customName || brand.name || brand.diaBrand };
    }
    const products = await WebProduct.find(base, projection).lean();
    return { products, label: 'Tüm Ürünler' };
}

function extractProductSize(dia) {
    const props = {};
    for (const o of dia.m_urunOzellikleri || []) {
        if (o?.ozellikadi) props[o.ozellikadi] = String(o.detayaciklama || '').trim();
    }
    const tip = String(dia.ozelkod7kodu || '').toUpperCase();
    if (tip === 'JANT' || props['Jant Genişliği']) {
        const w = props['Jant Genişliği'];
        const d = (props['Jant Çapı'] || '').replace(/[^0-9.]/g, '');
        if (w && d) return `${w}x${d}`;
    } else {
        const w = props['Genişlik'];
        const a = props['Yanak'];
        const d = (props['Jant Çapı'] || '').replace(/^R/i, '').toUpperCase();
        if (w && d) return a ? `${w}/${a}R${d}` : `${w}R${d}`;
    }
    const name = String(dia.aciklama || '');
    const tire = name.match(/(\d{1,3}(?:\.\d{1,2})?)(?:\/(\d{2,3})?)?\s*Z?R\s*(\d{2}(?:\.5)?)\s*(C)?(?![0-9])/i);
    if (tire) return `${tire[1]}${tire[2] ? `/${tire[2]}` : ''}R${tire[3]}${tire[4] ? 'C' : ''}`;
    const rim = name.match(/(\d{1,2}(?:\.\d)?)\s*x\s*(\d{2})/i);
    if (rim) return `${rim[1]}x${rim[2]}`;
    return null;
}

router.get('/', async (req, res) => {
    try {
        const {
            page = 1,
            limit = 50,
            search = '',
            isActive,
            sortBy = 'webOrder',
            sortOrder = 'desc'
        } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;

        await assignMissingCargoNos(req.site);

        const filter = { site: req.site };

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { code: { $regex: search, $options: 'i' } }
            ];
        }

        if (isActive !== undefined && isActive !== '') {
            filter.isActive = isActive === 'true';
        }

        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

        const [cargos, total] = await Promise.all([
            Cargo.find(filter).sort(sort).skip(skip).limit(limitNum).lean(),
            Cargo.countDocuments(filter)
        ]);

        res.json({
            success: true,
            data: cargos,
            meta: {
                total,
                page: pageNum,
                limit: limitNum,
                totalPages: Math.ceil(total / limitNum)
            }
        });
    } catch (error) {
        console.error('Cargo list error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo listesi alınırken hata oluştu'
        });
    }
});

async function resolveServiceAreas(input) {
    if (!Array.isArray(input)) return null;
    const AddressCity = require('../../../models/web/address/AddressCity');
    const AddressDistrict = require('../../../models/web/address/AddressDistrict');
    const result = [];
    for (const item of input) {
        const cityId = String(item?.cityId || '').trim();
        const districtId = String(item?.districtId || '').trim();
        const city = cityId ? await AddressCity.findOne({ cityId }).lean() : null;
        if (!city) return null;
        let districtName = '';
        if (districtId) {
            const district = await AddressDistrict.findOne({ districtId, cityId }).lean();
            if (!district) return null;
            districtName = district.districtName;
        }
        if (result.some(a => a.cityId === cityId && a.districtId === districtId)) continue;
        result.push({ cityId, cityName: city.cityName, districtId, districtName });
    }
    const wholeCities = new Set(result.filter(a => !a.districtId).map(a => a.cityId));
    return result.filter(a => !a.districtId || !wholeCities.has(a.cityId));
}

router.get('/locations/cities', async (req, res) => {
    try {
        const AddressCity = require('../../../models/web/address/AddressCity');
        const cities = await AddressCity.find().sort({ cityName: 1 }).select('cityId cityName -_id').lean();
        res.json({ success: true, data: cities });
    } catch (error) {
        res.status(500).json({ success: false, message: 'İller alınamadı' });
    }
});

router.get('/locations/districts/:cityId', async (req, res) => {
    try {
        const AddressDistrict = require('../../../models/web/address/AddressDistrict');
        const districts = await AddressDistrict.find({ cityId: req.params.cityId }).sort({ districtName: 1 }).select('districtId districtName -_id').lean();
        res.json({ success: true, data: districts });
    } catch (error) {
        res.status(500).json({ success: false, message: 'İlçeler alınamadı' });
    }
});

router.get('/sizes', async (req, res) => {
    try {
        const { categoryId, brandId } = req.query;
        const idOk = v => !v || String(v).match(/^[a-f0-9]{24}$/i);
        if (!idOk(categoryId) || !idOk(brandId)) {
            return res.status(400).json({ success: false, message: 'Seçim geçersiz' });
        }
        const found = await findScopedProducts(req.site, { categoryId, brandId }, { 'diaData.aciklama': 1, 'diaData.ozelkod7kodu': 1, 'diaData.m_urunOzellikleri': 1 });
        if (found.error) return res.status(404).json({ success: false, message: found.error });

        const counts = new Map();
        for (const p of found.products) {
            const size = extractProductSize(p.diaData || {});
            if (!size) continue;
            counts.set(size, (counts.get(size) || 0) + 1);
        }
        const sizes = [...counts.entries()]
            .map(([size, count]) => ({ size, count }))
            .sort((a, b) => a.size.localeCompare(b.size, 'tr', { numeric: true }));

        res.json({ success: true, data: sizes, meta: { scope: found.label, productCount: found.products.length, unsized: found.products.length - sizes.reduce((t, x) => t + x.count, 0) } });
    } catch (error) {
        console.error('Cargo sizes error:', error);
        res.status(500).json({ success: false, message: 'Ebatlar alınırken hata oluştu' });
    }
});

router.get('/brands', async (req, res) => {
    try {
        const visibleField = `siteSettings.${req.site}.webVisible`;
        const countField = `siteSettings.${req.site}.productCount`;
        const brands = await WebBrand.find(
            { diaBrand: { $nin: [null, ''] }, $or: [{ [visibleField]: true }, { [visibleField]: { $exists: false }, webVisible: true }] },
            { name: 1, customName: 1, diaBrand: 1, siteContent: 1, [countField]: 1, productCount: 1 }
        ).lean();
        const data = brands
            .map(b => ({
                id: String(b._id),
                name: b.siteContent?.[req.site]?.displayName || b.customName || b.name || b.diaBrand,
                diaBrand: b.diaBrand,
                productCount: b.siteSettings?.[req.site]?.productCount ?? b.productCount ?? 0
            }))
            .filter(b => b.productCount > 0)
            .sort((a, b) => a.name.localeCompare(b.name, 'tr'));
        res.json({ success: true, data });
    } catch (error) {
        console.error('Cargo brands error:', error);
        res.status(500).json({ success: false, message: 'Markalar alınırken hata oluştu' });
    }
});

router.get('/products', async (req, res) => {
    try {
        const search = String(req.query.search || '').trim();
        if (search.length < 2) return res.json({ success: true, data: [] });
        const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const rx = new RegExp(escaped, 'i');
        const products = await WebProduct.find(
            { sites: req.site, 'syncInfo.diaStatus': 'synced', $or: [{ 'diaData.stokkartkodu': rx }, { 'diaData.aciklama': rx }] },
            { _key: 1, 'diaData.stokkartkodu': 1, 'diaData.aciklama': 1, 'diaData.marka': 1 }
        ).limit(30).lean();
        res.json({
            success: true,
            data: products.map(p => ({ productKey: String(p._key), stockCode: p.diaData?.stokkartkodu || '', productName: p.diaData?.aciklama || '', brand: p.diaData?.marka || '' }))
        });
    } catch (error) {
        console.error('Cargo products error:', error);
        res.status(500).json({ success: false, message: 'Ürünler alınırken hata oluştu' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const idParam = String(req.params.id || '');
        const filter = CARGO_NO_PATTERN.test(idParam)
            ? { cargoNo: Number(idParam), site: req.site }
            : { _id: idParam, site: req.site };
        const cargo = await Cargo.findOne(filter).lean();

        if (!cargo) {
            return res.status(404).json({
                success: false,
                message: 'Kargo firması bulunamadı'
            });
        }

        res.json({ success: true, data: cargo });
    } catch (error) {
        console.error('Cargo detail error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo detayı alınırken hata oluştu'
        });
    }
});

router.post('/', async (req, res) => {
    try {
        const {
            name,
            code,
            logo,
            isActive,
            webOrder,
            memberGroups,
            productType,
            paymentType,
            fixedPrice,
            freeShippingThreshold,
            freeShippingDesiLimit
        } = req.body;

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Kargo adı zorunludur'
            });
        }

        if (!code || !code.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Kargo kodu zorunludur'
            });
        }

        if (!Array.isArray(memberGroups) || memberGroups.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'En az bir üye grubu seçilmelidir'
            });
        }

        if (!Cargo.schema.path('productType').enumValues.includes(productType)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir ürün tipi seçiniz'
            });
        }

        if (!['sender', 'receiver'].includes(paymentType)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir ödeme tipi seçiniz'
            });
        }

        if (fixedPrice === undefined || Number(fixedPrice) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Sabit fiyat zorunludur'
            });
        }

        if (freeShippingThreshold === undefined || Number(freeShippingThreshold) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Ücretsiz kargo tutarı zorunludur'
            });
        }

        if (freeShippingDesiLimit === undefined || Number(freeShippingDesiLimit) < 0) {
            return res.status(400).json({
                success: false,
                message: 'Ücretsiz kargo desi limiti zorunludur'
            });
        }

        const existing = await Cargo.findOne({ code: code.toLowerCase(), site: req.site });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Bu kargo kodu zaten kullanılıyor'
            });
        }

        const cargo = await Cargo.create({
            site: req.site,
            name: name.trim(),
            code: code.toLowerCase().trim(),
            logo: logo || '',
            isActive: isActive !== false,
            webOrder: Number(webOrder) || 0,
            memberGroups,
            productType,
            paymentType,
            fixedPrice: Number(fixedPrice) || 0,
            freeShippingThreshold: Number(freeShippingThreshold) || 0,
            freeShippingDesiLimit: Number(freeShippingDesiLimit) || 0
        });

        triggerShippingUpdate(cargo);
        res.status(201).json({
            success: true,
            message: 'Kargo firması başarıyla eklendi',
            data: cargo
        });
    } catch (error) {
        console.error('Cargo create error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo firması eklenirken hata oluştu'
        });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const {
            name,
            code,
            logo,
            isActive,
            webOrder,
            memberGroups,
            productType,
            paymentType,
            fixedPrice,
            freeShippingThreshold,
            freeShippingDesiLimit
        } = req.body;

        const cargo = await Cargo.findOne({ _id: req.params.id, site: req.site });
        if (!cargo) {
            return res.status(404).json({
                success: false,
                message: 'Kargo firması bulunamadı'
            });
        }

        if (code && code.toLowerCase() !== cargo.code) {
            const existing = await Cargo.findOne({
                code: code.toLowerCase(),
                site: req.site,
                _id: { $ne: cargo._id }
            });
            if (existing) {
                return res.status(400).json({
                    success: false,
                    message: 'Bu kargo kodu zaten kullanılıyor'
                });
            }
            cargo.code = code.toLowerCase().trim();
        }

        if (name !== undefined) cargo.name = name.trim();
        if (logo !== undefined) cargo.logo = logo;
        if (isActive !== undefined) cargo.isActive = Boolean(isActive);
        if (webOrder !== undefined) cargo.webOrder = Number(webOrder) || 0;
        if (Array.isArray(memberGroups)) cargo.memberGroups = memberGroups;

        if (productType !== undefined) {
            if (!Cargo.schema.path('productType').enumValues.includes(productType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçerli bir ürün tipi seçiniz'
                });
            }
            cargo.productType = productType;
        }

        if (paymentType !== undefined) {
            if (!['sender', 'receiver'].includes(paymentType)) {
                return res.status(400).json({
                    success: false,
                    message: 'Geçerli bir ödeme tipi seçiniz'
                });
            }
            cargo.paymentType = paymentType;
        }

        if (fixedPrice !== undefined) cargo.fixedPrice = Number(fixedPrice) || 0;
        if (freeShippingThreshold !== undefined) cargo.freeShippingThreshold = Number(freeShippingThreshold) || 0;
        if (freeShippingDesiLimit !== undefined) cargo.freeShippingDesiLimit = Number(freeShippingDesiLimit) || 0;

        if (req.body.scopeType !== undefined) {
            const scopeType = String(req.body.scopeType || '');
            if (!SCOPE_TYPES.includes(scopeType)) {
                return res.status(400).json({ success: false, message: 'Geçerli bir kural kapsamı seçiniz' });
            }
            cargo.scopeType = scopeType;
        }

        if (req.body.categoryRules !== undefined) {
            const out = cleanScopedRules(req.body.categoryRules, 'categoryId', 'categoryName');
            if (out.error) return res.status(400).json({ success: false, message: out.error });
            cargo.categoryRules = out.rules;
        }
        if (req.body.brandRules !== undefined) {
            const out = cleanScopedRules(req.body.brandRules, 'brandId', 'brandName', true);
            if (out.error) return res.status(400).json({ success: false, message: out.error });
            cargo.brandRules = out.rules;
        }
        if (req.body.sizeRules !== undefined) {
            if (!Array.isArray(req.body.sizeRules)) {
                return res.status(400).json({ success: false, message: 'Ebat kuralları geçersiz' });
            }
            const seenSizes = new Set();
            const sizeRules = [];
            for (const sr of req.body.sizeRules) {
                const size = String(sr?.size || '').trim();
                const price = Number(sr?.price);
                if (!size || !Number.isFinite(price) || price < 0 || seenSizes.has(size)) continue;
                seenSizes.add(size);
                sizeRules.push({ size, price });
            }
            cargo.sizeRules = sizeRules;
        }
        if (req.body.productRules !== undefined) {
            if (!Array.isArray(req.body.productRules)) {
                return res.status(400).json({ success: false, message: 'Ürün kuralları geçersiz' });
            }
            const seen = new Set();
            const rules = [];
            for (const r of req.body.productRules) {
                const productKey = String(r?.productKey || '').trim();
                const price = Number(r?.price);
                if (!productKey) return res.status(400).json({ success: false, message: 'Ürün seçimi geçersiz' });
                if (!Number.isFinite(price) || price < 0) return res.status(400).json({ success: false, message: `${r.stockCode || productKey}: geçerli bir kargo ücreti giriniz` });
                if (seen.has(productKey)) continue;
                seen.add(productKey);
                rules.push({
                    productKey,
                    stockCode: String(r.stockCode || '').trim(),
                    productName: String(r.productName || '').trim(),
                    price
                });
            }
            cargo.productRules = rules;
        }

        if (req.body.desiPricing !== undefined) {
            const { ranges, extraPerDesi } = req.body.desiPricing || {};

            if (Array.isArray(ranges)) {
                for (let i = 0; i < ranges.length; i++) {
                    const r = ranges[i];
                    if (typeof r.min !== 'number' || typeof r.max !== 'number' || typeof r.price !== 'number') {
                        return res.status(400).json({
                            success: false,
                            message: 'Desi aralık verileri geçersiz'
                        });
                    }
                    if (r.max < r.min) {
                        return res.status(400).json({
                            success: false,
                            message: 'Desi aralığı bitiş değeri başlangıçtan küçük olamaz'
                        });
                    }
                    if (i > 0 && r.min < ranges[i - 1].max) {
                        return res.status(400).json({
                            success: false,
                            message: 'Desi aralıkları birbiriyle çakışamaz'
                        });
                    }
                }
                if (!cargo.desiPricing) cargo.desiPricing = { ranges: [], extraPerDesi: 0 };
                cargo.desiPricing.ranges = ranges;
            }

            if (extraPerDesi !== undefined) {
                if (!cargo.desiPricing) cargo.desiPricing = { ranges: [], extraPerDesi: 0 };
                cargo.desiPricing.extraPerDesi = Number(extraPerDesi) || 0;
            }
        }

        for (const field of ['stockFixedPrice', 'stockFreeShippingThreshold', 'stockFreeShippingDesiLimit']) {
            if (req.body[field] !== undefined) cargo[field] = Math.max(0, Number(req.body[field]) || 0);
        }

        if (req.body.stockShippingPriceMode !== undefined) {
            if (!Cargo.SHIPPING_PRICE_MODES.includes(req.body.stockShippingPriceMode)) {
                return res.status(400).json({ success: false, message: 'Geçerli bir kargo ücreti gösterimi seçiniz' });
            }
            cargo.stockShippingPriceMode = req.body.stockShippingPriceMode;
        }

        if (req.body.stockDesiPricing !== undefined) {
            const { ranges, extraPerDesi } = req.body.stockDesiPricing || {};
            if (Array.isArray(ranges)) {
                const rangeError = validateDesiRanges(ranges);
                if (rangeError) return res.status(400).json({ success: false, message: `Stoktaki ürünler: ${rangeError}` });
                if (!cargo.stockDesiPricing) cargo.stockDesiPricing = { ranges: [], extraPerDesi: 0 };
                cargo.stockDesiPricing.ranges = ranges;
            }
            if (extraPerDesi !== undefined) {
                if (!cargo.stockDesiPricing) cargo.stockDesiPricing = { ranges: [], extraPerDesi: 0 };
                cargo.stockDesiPricing.extraPerDesi = Number(extraPerDesi) || 0;
            }
        }

        if (req.body.serviceAreas !== undefined) {
            const areas = await resolveServiceAreas(req.body.serviceAreas);
            if (!areas) return res.status(400).json({ success: false, message: 'Hizmet bölgesinde geçersiz il veya ilçe var' });
            cargo.serviceAreas = areas;
        }

        await cargo.save();
        invalidateShippingRules();

        triggerShippingUpdate(cargo);

        res.json({
            success: true,
            message: 'Kargo firması güncellendi',
            data: cargo
        });
    } catch (error) {
        console.error('Cargo update error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo firması güncellenirken hata oluştu'
        });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const cargo = await Cargo.findOne({ _id: req.params.id, site: req.site });
        if (!cargo) {
            return res.status(404).json({
                success: false,
                message: 'Kargo firması bulunamadı'
            });
        }

        cargo.isActive = !cargo.isActive;
        await cargo.save();
        invalidateShippingRules();

        triggerShippingUpdate(cargo);

        res.json({
            success: true,
            message: cargo.isActive ? 'Kargo firması aktifleştirildi' : 'Kargo firması pasifleştirildi',
            data: cargo
        });
    } catch (error) {
        console.error('Cargo status toggle error:', error);
        res.status(500).json({
            success: false,
            message: 'Durum güncellenirken hata oluştu'
        });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const cargo = await Cargo.findOneAndDelete({ _id: req.params.id, site: req.site });
        invalidateShippingRules();

        if (!cargo) {
            return res.status(404).json({
                success: false,
                message: 'Kargo firması bulunamadı'
            });
        }
        triggerShippingUpdate(cargo);
        res.json({
            success: true,
            message: 'Kargo firması silindi'
        });
    } catch (error) {
        console.error('Cargo delete error:', error);
        res.status(500).json({
            success: false,
            message: 'Kargo firması silinirken hata oluştu'
        });
    }
});

module.exports = router;