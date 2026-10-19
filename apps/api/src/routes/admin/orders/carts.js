const router = require('express').Router();
const mongoose = require('mongoose');
const WebCart = require('../../../models/web/cart/WebCart');
const { CART_FOLLOW_UP_STATUSES } = WebCart;
const WebMember = require('../../../models/web/user/WebMember');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const { getCartRetentionDays } = require('../../../config/sites');

const DAY_MS = 24 * 60 * 60 * 1000;
const round2 = (v) => Math.round((Number(v) || 0) * 100) / 100;
const escapeRegex = (v) => String(v).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const cartTotalExpr = {
    $sum: { $map: { input: '$items', as: 'i', in: { $multiply: ['$$i.unitPrice', '$$i.quantity'] } } }
};

router.get('/', async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(Math.max(1, parseInt(req.query.limit) || 25), 200);
        const retentionDays = getCartRetentionDays(req.site);
        const since = new Date(Date.now() - retentionDays * DAY_MS);

        const baseMatch = { site: req.site, 'items.0': { $exists: true }, lastActivity: { $gte: since } };
        const match = { ...baseMatch };

        if (req.query.type === 'member') match.userId = { $ne: null };
        else if (req.query.type === 'guest') match.userId = null;

        const statusFilter = CART_FOLLOW_UP_STATUSES.includes(req.query.status) ? req.query.status : '';

        if (req.query.search && String(req.query.search).trim()) {
            const regex = new RegExp(escapeRegex(req.query.search), 'i');
            const memberIds = await WebMember.find(
                { site: req.site, $or: [{ firstName: regex }, { lastName: regex }, { email: regex }, { phone: regex }] },
                { _id: 1 }
            ).limit(500).lean();
            match.$or = [
                { 'items.productName': regex },
                { 'items.brandName': regex },
                { 'items.productKey': regex },
                ...(memberIds.length ? [{ userId: { $in: memberIds.map(m => m._id) } }] : [])
            ];
        }

        const contactedMatch = { ...match, followUpStatus: 'contacted' };
        const listMatch = statusFilter === 'contacted'
            ? contactedMatch
            : statusFilter === 'pending' ? { ...match, followUpStatus: { $ne: 'contacted' } } : match;

        const [carts, total, allCount, contactedCount, summaryRows] = await Promise.all([
            WebCart.find(listMatch).sort({ lastActivity: -1 }).skip((page - 1) * limit).limit(limit).lean(),
            WebCart.countDocuments(listMatch),
            WebCart.countDocuments(match),
            WebCart.countDocuments(contactedMatch),
            WebCart.aggregate([
                { $match: baseMatch },
                {
                    $group: {
                        _id: null,
                        carts: { $sum: 1 },
                        memberCarts: { $sum: { $cond: [{ $ifNull: ['$userId', false] }, 1, 0] } },
                        totalValue: { $sum: cartTotalExpr },
                        units: { $sum: { $sum: '$items.quantity' } }
                    }
                }
            ])
        ]);

        const memberIds = [...new Set(carts.filter(c => c.userId).map(c => String(c.userId)))]
            .filter(id => mongoose.Types.ObjectId.isValid(id));
        const members = memberIds.length
            ? await WebMember.find({ _id: { $in: memberIds } }, { firstName: 1, lastName: 1, email: 1, phone: 1, memberNo: 1 }).lean()
            : [];
        const memberMap = new Map(members.map(m => [String(m._id), m]));

        const productKeys = [...new Set(carts.flatMap(c => (c.items || []).map(i => i.productKey)).filter(Boolean))];
        const products = productKeys.length
            ? await WebProduct.find(
                { _key: { $in: productKeys } },
                { _key: 1, 'diaData.stokkartkodu': 1, 'diaData.ekalan5': 1, 'diaData.gercek_stok': 1, 'syncInfo.syncSource': 1 }
            ).lean()
            : [];
        const productMap = new Map(products.map(p => [String(p._key), p]));

        const data = carts.map(cart => {
            const member = cart.userId ? memberMap.get(String(cart.userId)) : null;
            const items = (cart.items || []).map(i => ({
                productKey: i.productKey,
                stockCode: productMap.get(String(i.productKey))?.diaData?.stokkartkodu || '',
                productionYear: String(productMap.get(String(i.productKey))?.diaData?.ekalan5 || '').trim(),
                stock: productMap.has(String(i.productKey)) ? Number(productMap.get(String(i.productKey)).diaData?.gercek_stok) || 0 : null,
                isXml: productMap.get(String(i.productKey))?.syncInfo?.syncSource === 'xml_integration',
                productName: i.productName || i.productKey,
                productImage: i.productImage || '',
                productSlug: i.productSlug || '',
                brandName: i.brandName || '',
                itemType: i.itemType || 'product',
                montagePointLabel: i.montagePointLabel || '',
                quantity: i.quantity || 0,
                unitPrice: round2(i.unitPrice),
                lineTotal: round2((i.unitPrice || 0) * (i.quantity || 0)),
                addedAt: i.addedAt || null
            }));
            return {
                _id: String(cart._id),
                isGuest: !member,
                member: member ? {
                    _id: String(member._id),
                    memberNo: member.memberNo ?? null,
                    firstName: member.firstName || '',
                    lastName: member.lastName || '',
                    email: member.email || '',
                    phone: member.phone || ''
                } : null,
                visitorCode: String(cart.sessionId || '').replace(/^cart_/, '').slice(0, 8).toUpperCase(),
                items,
                itemCount: items.reduce((s, i) => s + i.quantity, 0),
                total: round2(items.reduce((s, i) => s + i.lineTotal, 0)),
                followUpStatus: cart.followUpStatus === 'contacted' ? 'contacted' : 'pending',
                followUpAt: cart.followUpAt || null,
                followUpBy: cart.followUpBy || '',
                createdAt: cart.createdAt || null,
                lastActivity: cart.lastActivity || null,
                expiresAt: cart.lastActivity ? new Date(new Date(cart.lastActivity).getTime() + retentionDays * DAY_MS) : null
            };
        });

        const summary = summaryRows[0] || { carts: 0, memberCarts: 0, totalValue: 0, units: 0 };
        res.json({
            success: true,
            data,
            meta: { total, page, limit, totalPages: Math.ceil(total / limit), retentionDays },
            statusCounts: { all: allCount, pending: allCount - contactedCount, contacted: contactedCount },
            summary: {
                carts: summary.carts,
                memberCarts: summary.memberCarts,
                guestCarts: summary.carts - summary.memberCarts,
                units: summary.units,
                totalValue: round2(summary.totalValue)
            }
        });
    } catch (error) {
        console.error('Aktif sepet listesi hatası:', error);
        res.status(500).json({ success: false, message: 'Aktif sepetler yüklenemedi', error: error.message });
    }
});

router.patch('/:id/status', async (req, res) => {
    try {
        const status = String(req.body?.status || '');
        if (!CART_FOLLOW_UP_STATUSES.includes(status)) {
            return res.status(400).json({ success: false, message: 'Geçerli bir durum seçiniz' });
        }
        if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
            return res.status(404).json({ success: false, message: 'Sepet bulunamadı' });
        }
        const result = await WebCart.updateOne(
            { _id: req.params.id, site: req.site },
            { $set: { followUpStatus: status, followUpAt: new Date(), followUpBy: req.admin?.name || req.admin?.email || '' } },
            { timestamps: false }
        );
        if (!result.matchedCount) return res.status(404).json({ success: false, message: 'Sepet bulunamadı' });
        res.json({ success: true, message: 'Sepet durumu güncellendi' });
    } catch (error) {
        console.error('Aktif sepet durum hatası:', error);
        res.status(500).json({ success: false, message: 'Sepet durumu güncellenemedi' });
    }
});

module.exports = router;
