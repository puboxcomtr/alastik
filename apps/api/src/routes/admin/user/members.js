const router = require('express').Router();
const mongoose = require('mongoose');
const WebMember = require('../../../models/web/user/WebMember');
const WebOrder = require('../../../models/web/order/WebOrder');
const { revenueMatch, round2 } = require('../../../utils/dashboardMetrics');
const { assignMissingMemberNos } = require('../../../utils/memberNo');

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const HIDDEN_FIELDS = '-password -resetPasswordToken -resetPasswordExpire -activationToken -activationTokenExpire -activationCode -loginAttempts -lockedUntil';

router.get('/', async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const match = { site: req.site };

        if (req.query.status && ['pending', 'active', 'suspended', 'deleted'].includes(req.query.status)) {
            match.status = req.query.status;
        }

        if (req.query.search && req.query.search.trim()) {
            const regex = new RegExp(req.query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            match.$or = [
                { firstName: regex },
                { lastName: regex },
                { email: regex },
                { phone: regex },
                { diaCustomerCode: regex }
            ];
        }

        const dateRe = /^\d{4}-\d{2}-\d{2}$/;
        if (dateRe.test(req.query.from || '') || dateRe.test(req.query.to || '')) {
            match.createdAt = {};
            if (dateRe.test(req.query.from || '')) match.createdAt.$gte = new Date(`${req.query.from}T00:00:00+03:00`);
            if (dateRe.test(req.query.to || '')) match.createdAt.$lt = new Date(new Date(`${req.query.to}T00:00:00+03:00`).getTime() + 24 * 60 * 60 * 1000);
        }
        const fieldRegex = v => new RegExp(String(v).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (req.query.code?.trim()) match.diaCustomerCode = fieldRegex(req.query.code);
        if (req.query.email?.trim()) match.email = fieldRegex(req.query.email);
        if (req.query.phone?.trim()) match.phone = fieldRegex(req.query.phone);
        if (req.query.tier === 'premium') match['diaCari.premium'] = true;
        else if (req.query.tier === 'normal') match['diaCari.premium'] = { $ne: true };

        if (req.query.salesperson === UNASSIGNED_SALESPERSON) {
            match['diaCari.salespersonName'] = { $in: [null, ''] };
        } else if (req.query.salesperson?.trim()) {
            const wanted = normalizeSalespersonName(req.query.salesperson);
            const names = await WebMember.distinct('diaCari.salespersonName', { site: req.site });
            match['diaCari.salespersonName'] = { $in: names.filter(n => n && normalizeSalespersonName(n) === wanted) };
        }

        if (req.query.hasOrders === 'yes' || req.query.hasOrders === 'no') {
            const memberIds = await WebOrder.distinct('memberId', { site: req.site, isActive: true, memberId: { $ne: null } });
            match._id = req.query.hasOrders === 'yes' ? { $in: memberIds } : { $nin: memberIds };
        }

        const tableView = req.query.view === 'table';

        const tableStages = tableView ? [
            {
                $lookup: {
                    from: 'weborders',
                    let: { memberId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$memberId', '$$memberId'] }, isActive: true, ...revenueMatch } },
                        { $group: { _id: null, total: { $sum: '$pricing.total' }, lastAt: { $max: '$createdAt' } } }
                    ],
                    as: 'paidStats'
                }
            },
            {
                $lookup: {
                    from: 'carts',
                    let: { memberId: '$_id' },
                    pipeline: [
                        { $match: { $expr: { $eq: ['$userId', '$$memberId'] } } },
                        { $sort: { lastActivity: -1 } },
                        { $limit: 1 },
                        {
                            $project: {
                                itemCount: { $sum: '$items.quantity' },
                                total: { $sum: { $map: { input: '$items', as: 'i', in: { $multiply: ['$$i.unitPrice', '$$i.quantity'] } } } }
                            }
                        }
                    ],
                    as: 'carts'
                }
            }
        ] : [];

        const tableFields = tableView ? {
            adminTags: 1, adminNote: 1,
            totalSpend: { $ifNull: [{ $arrayElemAt: ['$paidStats.total', 0] }, 0] },
            lastOrderAt: { $arrayElemAt: ['$paidStats.lastAt', 0] },
            cart: {
                $cond: [
                    { $gt: [{ $size: '$carts' }, 0] },
                    { itemCount: { $arrayElemAt: ['$carts.itemCount', 0] }, total: { $arrayElemAt: ['$carts.total', 0] } },
                    null
                ]
            }
        } : {};

        const defaultSort = req.site === 'b2b'
            ? { 'diaCari.diaUpdatedAt': -1, createdAt: -1 }
            : { updatedAt: -1, createdAt: -1 };

        const SORT_FIELDS = {
            firstName: 'firstName', phone: 'phone', createdAt: 'createdAt', lastLoginAt: 'lastLoginAt',
            diaCreatedAt: 'diaCari.diaCreatedAt', invoiceCount12m: 'diaCari.invoiceCount12m',
            salespersonName: 'diaCari.salespersonName'
        };
        const COMPUTED_SORT = {
            orderCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.n', 0] }, 0] },
            ...(tableView ? { totalSpend: { $ifNull: [{ $arrayElemAt: ['$paidStats.total', 0] }, 0] } } : {})
        };
        const sortParam = String(req.query.sort || '');
        const sortDir = req.query.order === 'asc' ? 1 : -1;
        const computedSort = COMPUTED_SORT[sortParam];
        const fieldSort = SORT_FIELDS[sortParam];
        const textSort = ['firstName', 'salespersonName'].includes(sortParam);

        try { await assignMissingMemberNos(req.site); } catch (e) { console.error('Üye numarası atama hatası:', e.message); }

        const orderLookup = {
            $lookup: {
                from: 'weborders',
                let: { memberId: '$_id' },
                pipeline: [
                    { $match: { $expr: { $eq: ['$memberId', '$$memberId'] } } },
                    { $count: 'n' }
                ],
                as: 'orderStats'
            }
        };
        const paging = [{ $skip: (page - 1) * limit }, { $limit: limit }];
        const pipeline = computedSort
            ? [
                { $match: match },
                orderLookup,
                ...tableStages,
                { $addFields: { _sortValue: computedSort } },
                { $sort: { _sortValue: sortDir, _id: 1 } },
                ...paging
            ]
            : [
                { $match: match },
                { $sort: fieldSort ? { [fieldSort]: sortDir, _id: 1 } : defaultSort },
                ...paging,
                orderLookup,
                ...tableStages
            ];
        const aggregate = WebMember.aggregate(pipeline);
        if (textSort) aggregate.collation({ locale: 'tr' });

        const [rows, total] = await Promise.all([
            aggregate.append(
                {
                    $project: {
                        memberNo: 1,
                        firstName: 1, lastName: 1, email: 1, phone: 1,
                        status: 1, marketingConsent: 1,
                        diaCustomerCode: 1, diaCustomerKey: 1,
                        createdAt: 1, lastLoginAt: 1,
                        orderCount: { $ifNull: [{ $arrayElemAt: ['$orderStats.n', 0] }, 0] },
                        diaCreatedAt: '$diaCari.diaCreatedAt',
                        salespersonName: '$diaCari.salespersonName',
                        premium: { $eq: ['$diaCari.premium', true] },
                        invoiceCount12m: { $ifNull: ['$diaCari.invoiceCount12m', 0] },
                        ...tableFields
                    }
                }
            ),
            WebMember.countDocuments(match)
        ]);

        res.json({ success: true, data: rows, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Üyeler yüklenemedi', error: err.message });
    }
});

const SINGLE_SYNC_LOCK_WAIT_MS = 15000;
const SINGLE_SYNC_LOCK_TTL_MS = 180000;
const BULK_SYNC_LOCK_TTL_MS = 300000;
const B2B_THEME = 'b2b';
const B2B_CARI_QUEUE = 'b2b-cari-sync';
const MANUAL_B2B_JOBS = ['manual-b2b-address-sync', 'manual-b2b-finance-sync'];
const BACKGROUND_SYNC_TIMEOUT_MS = 3600000;

async function queueB2bBackgroundSyncs() {
    const Queue = require('bull');
    const workerConfig = require('../../../config/worker.config');
    const queue = new Queue(B2B_CARI_QUEUE, { redis: workerConfig.redis });
    try {
        const pending = await queue.getJobs(['waiting', 'active', 'delayed']);
        const added = [];
        for (const name of MANUAL_B2B_JOBS) {
            if (pending.some(job => job.name === name)) continue;
            await queue.add(name, { type: 'manual', triggeredBy: 'admin-member-sync', triggeredAt: new Date().toISOString(), onlyMissing: true }, { timeout: BACKGROUND_SYNC_TIMEOUT_MS });
            added.push(name);
        }
        return added;
    } finally {
        await queue.close().catch(() => {});
    }
}

const UNASSIGNED_SALESPERSON = '__unassigned__';

const normalizeSalespersonName = name => String(name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR');

router.get('/salespersons', async (req, res) => {
    try {
        const [rows, unassignedCount] = await Promise.all([
            WebMember.aggregate([
                { $match: { site: req.site, 'diaCari.salespersonName': { $nin: [null, ''] } } },
                { $group: { _id: '$diaCari.salespersonName', count: { $sum: 1 } } }
            ]),
            WebMember.countDocuments({ site: req.site, 'diaCari.salespersonName': { $in: [null, ''] } })
        ]);
        const merged = new Map();
        for (const r of rows.sort((x, y) => y.count - x.count)) {
            const key = normalizeSalespersonName(r._id);
            const current = merged.get(key);
            if (current) current.count += r.count;
            else merged.set(key, { name: String(r._id).trim(), count: r.count });
        }
        const data = [...merged.values()].sort((x, y) => x.name.localeCompare(y.name, 'tr'));
        res.json({ success: true, data, unassigned: { value: UNASSIGNED_SALESPERSON, count: unassignedCount } });
    } catch (error) {
        console.error('Member salespersons error:', error);
        res.status(500).json({ success: false, message: 'Plasiyer listesi alınamadı' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const idParam = String(req.params.id);
        let filter;
        if (/^\d{1,9}$/.test(idParam)) filter = { memberNo: Number(idParam), site: req.site };
        else if (isValidId(idParam)) filter = { _id: idParam, site: req.site };
        else return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const member = await WebMember.findOne(filter).select(HIDDEN_FIELDS).lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });

        const WebAddress = require('../../../models/web/address/WebAddress');
        const WebFavourite = require('../../../models/web/user/WebFavourite');
        const WebCart = require('../../../models/web/cart/WebCart');
        const WebVehicle = require('../../../models/web/user/WebVehicle');

        const [orders, [orderStats], addresses, favouriteCount, cartDoc, vehicles] = await Promise.all([
            WebOrder.find({ memberId: member._id, isActive: true })
                .sort({ createdAt: -1 }).limit(50)
                .select('orderNumber status payment.status payment.method pricing.total items.quantity createdAt').lean(),
            WebOrder.aggregate([
                { $match: { memberId: member._id, isActive: true } },
                {
                    $group: {
                        _id: null,
                        total: { $sum: 1 },
                        paid: { $sum: { $cond: [{ $and: [{ $eq: ['$payment.status', 'paid'] }, { $ne: ['$status', 'pending'] }] }, 1, 0] } },
                        paidTotal: { $sum: { $cond: [{ $and: [{ $eq: ['$payment.status', 'paid'] }, { $ne: ['$status', 'pending'] }] }, '$pricing.total', 0] } },
                        cancelled: { $sum: { $cond: [{ $eq: ['$status', 'cancelled'] }, 1, 0] } },
                        units: { $sum: { $sum: '$items.quantity' } },
                        firstAt: { $min: '$createdAt' },
                        lastAt: { $max: '$createdAt' }
                    }
                }
            ]),
            WebAddress.find({ userId: member._id })
                .select('addressName fullName phone cityName districtName addressDescription addressNote isDefault createdAt').lean(),
            WebFavourite.countDocuments({ memberId: member._id }),
            WebCart.findOne({ userId: member._id })
                .sort({ lastActivity: -1 })
                .select('items lastActivity updatedAt').lean(),
            WebVehicle.find({ memberId: member._id, isActive: true })
                .select('wheelSizeData userInputs.plateNumber image.url isPrimary createdAt').lean()
        ]);

        const stats = orderStats || { total: 0, paid: 0, paidTotal: 0, cancelled: 0, units: 0, firstAt: null, lastAt: null };

        let paymentSummary = null;
        if (member.diaCari?.financeSyncedAt || member.diaCari?.agingItems) {
            try {
                const B2bCariEkstre = require('../../../models/web/user/B2bCariEkstre');
                const { computePaymentPerformance } = require('../../../services/plugins/dia/b2bPaymentPerformance');
                const ekstre = await B2bCariEkstre.findOne({ memberId: member._id, site: req.site }).select('movements').lean();
                paymentSummary = computePaymentPerformance({
                    movements: ekstre?.movements,
                    balanceKurus: member.diaCari.bakiyeKurus
                });
            } catch (e) {
                console.error('Cari ödeme özeti hatası:', e.message);
            }
        }

        const cartItems = (cartDoc?.items || []).map(i => ({
            productName: i.productName || i.productKey,
            brandName: i.brandName || '',
            quantity: i.quantity,
            unitPrice: round2(i.unitPrice || 0),
            lineTotal: round2((i.unitPrice || 0) * (i.quantity || 0))
        }));
        const cart = cartItems.length ? {
            itemCount: cartItems.reduce((s, i) => s + i.quantity, 0),
            total: round2(cartItems.reduce((s, i) => s + i.lineTotal, 0)),
            updatedAt: cartDoc.lastActivity || cartDoc.updatedAt || null,
            items: cartItems
        } : null;

        const timeline = [
            { type: 'register', title: 'Üye oldu', at: member.createdAt },
            member.activatedAt ? { type: 'activate', title: 'Hesabını aktifleştirdi', at: member.activatedAt } : null,
            member.lastLoginAt ? { type: 'login', title: 'Son giriş', at: member.lastLoginAt } : null,
            ...orders.slice(0, 10).map(o => ({
                type: 'order', title: `Sipariş ${o.orderNumber}`,
                subtitle: `${round2(o.pricing?.total || 0)} TL`, orderId: String(o._id), status: o.status, at: o.createdAt
            }))
        ].filter(Boolean).sort((a, b) => new Date(b.at) - new Date(a.at));

        res.json({
            success: true,
            data: {
                member,
                orders,
                addresses,
                favouriteCount,
                cart,
                vehicles: (vehicles || []).map(v => ({
                    _id: String(v._id),
                    makeName: v.wheelSizeData?.makeName || v.wheelSizeData?.make || '',
                    modelName: v.wheelSizeData?.modelName || v.wheelSizeData?.model || '',
                    year: v.wheelSizeData?.year || null,
                    plateNumber: v.userInputs?.plateNumber || '',
                    imageUrl: v.image?.url || '',
                    isPrimary: !!v.isPrimary,
                    createdAt: v.createdAt
                })),
                stats: {
                    orders: stats.total,
                    paidOrders: stats.paid,
                    totalSpend: round2(stats.paidTotal),
                    cancelledOrders: stats.cancelled,
                    unitsBought: stats.units,
                    firstOrderAt: stats.firstAt,
                    lastOrderAt: stats.lastAt,
                    avgOrderValue: stats.paid ? round2(stats.paidTotal / stats.paid) : 0
                },
                timeline,
                paymentSummary
            }
        });
    } catch (err) {
        console.error('Üye detay hatası:', err);
        res.status(500).json({ success: false, message: 'Üye detayı yüklenemedi' });
    }
});

router.put('/:id/status', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const status = String(req.body.status || '');
        if (!['active', 'suspended'].includes(status)) return res.status(400).json({ success: false, message: 'Durum yalnızca active veya suspended olabilir' });

        const member = await WebMember.findOneAndUpdate({ _id: req.params.id, site: req.site }, { $set: { status } }, { new: true })
            .select('_id status').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
        res.json({ success: true, data: member, message: status === 'suspended' ? 'Üye askıya alındı' : 'Üye aktifleştirildi' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Durum güncellenemedi' });
    }
});

router.put('/:id/annotations', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const update = {};
        if (Array.isArray(req.body.adminTags)) {
            update.adminTags = [...new Set(req.body.adminTags.map(t => String(t).trim()).filter(Boolean))].slice(0, 20);
        }
        if (typeof req.body.adminNote === 'string') update.adminNote = req.body.adminNote.trim().slice(0, 1000);
        if (!Object.keys(update).length) return res.status(400).json({ success: false, message: 'Güncellenecek etiket veya not gönderilmedi' });

        const member = await WebMember.findOneAndUpdate({ _id: req.params.id, site: req.site }, { $set: update }, { new: true })
            .select('adminTags adminNote').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
        res.json({ success: true, data: member });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Etiket/not kaydedilemedi' });
    }
});

router.put('/:id/password', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const password = String(req.body.password || '');
        if (password.length < 4) return res.status(400).json({ success: false, message: 'Şifre en az 4 karakter olmalıdır.' });
        if (password === '12345') return res.status(400).json({ success: false, message: 'Şifre varsayılan şifre olamaz.' });

        const member = await WebMember.findOne({ _id: req.params.id, site: req.site });
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
        member.password = password;
        member.customPasswordSet = true;
        member.mustChangePassword = false;
        member.loginAttempts = 0;
        member.lockedUntil = undefined;
        await member.save();
        res.json({ success: true, message: 'Şifre güncellendi.' });
    } catch (err) {
        console.error('Üye şifre güncelleme hatası:', err.message);
        res.status(500).json({ success: false, message: 'Şifre güncellenemedi.' });
    }
});

router.post('/:id/addresses', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const { baslik, il, ilce, adres, telefon } = req.body || {};
        if (!String(il || '').trim() || !String(ilce || '').trim() || !String(adres || '').trim()) {
            return res.status(400).json({ success: false, message: 'İl, ilçe ve adres zorunludur.' });
        }
        const member = await WebMember.findOne({ _id: req.params.id, site: req.site })
            .select('diaCustomerKey firstName lastName').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
        if (!member.diaCustomerKey) return res.status(400).json({ success: false, message: 'Carinin DIA eşleşmesi yok; adres DIA’ya yazılamaz.' });

        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        const { addDiaDeliveryAddress, fetchCariAddresses } = require('../../../services/plugins/dia/b2bAddress');
        const { withDiaLock, B2B_LOCK_KEY } = require('../../../services/plugins/dia/diaLock');

        const sonuc = await withDiaLock(async () => {
            const svc = new DiaOrderService(req.site);
            await svc.init().catch(() => {});
            await svc.login();
            const upd = await addDiaDeliveryAddress(svc, member.diaCustomerKey, {
                baslik, il, ilce, adres, telefon,
                adSoyad: `${member.firstName || ''} ${member.lastName || ''}`.replace(/ \.$/, '').trim()
            });
            if (String(upd?.code) !== '200') return { hata: upd?.msg || 'Adres DIA cariye eklenemedi.' };
            const F = { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu };
            return { addresses: await fetchCariAddresses(svc, F, member.diaCustomerKey) };
        }, { label: 'admin-cari-adres', key: B2B_LOCK_KEY, waitMs: 30000 });

        if (sonuc.hata) return res.status(502).json({ success: false, message: sonuc.hata });
        if (sonuc.addresses.length) {
            await WebMember.updateOne({ _id: member._id }, { $set: {
                'diaCari.addresses': sonuc.addresses, 'diaCari.addressesSyncedAt': new Date()
            } });
        }
        res.json({ success: true, data: sonuc.addresses, message: 'Adres DIA’ya eklendi.' });
    } catch (err) {
        console.error('Admin cari adres ekleme hatası:', err.message);
        res.status(500).json({ success: false, message: 'Adres eklenemedi.' });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        if (!isValidId(req.params.id)) return res.status(400).json({ success: false, message: 'Geçersiz üye kimliği' });
        const member = await WebMember.findOneAndUpdate({ _id: req.params.id, site: req.site }, { $set: { status: 'deleted' } }, { new: true })
            .select('_id status').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Üye bulunamadı' });
        res.json({ success: true, data: member, message: 'Üye silindi olarak işaretlendi' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Üye silinemedi' });
    }
});

router.post('/:id/sync-dia', async (req, res) => {
    const { acquire, release, B2B_LOCK_KEY } = require('../../../services/plugins/dia/diaLock');
    let token = null;
    try {
        const member = await WebMember.findOne({ _id: req.params.id, site: req.site }).select('diaCustomerKey').lean();
        if (!member) return res.status(404).json({ success: false, message: 'Cari bulunamadı' });
        if (!member.diaCustomerKey) return res.status(400).json({ success: false, message: 'Carinin DIA eşleşmesi yok; güncellenemez.' });

        token = await acquire({ key: B2B_LOCK_KEY, ttlMs: SINGLE_SYNC_LOCK_TTL_MS, waitMs: SINGLE_SYNC_LOCK_WAIT_MS });
        if (!token) {
            return res.status(409).json({ success: false, message: 'Şu anda toplu DIA senkronu çalışıyor. Lütfen birkaç dakika sonra tekrar deneyin.' });
        }

        const { syncB2bCari } = require('../../../services/plugins/dia/b2bCariSync');
        const { syncB2bFinance } = require('../../../services/plugins/dia/b2bFinanceSync');
        const quiet = { warn: (...args) => console.warn(...args) };

        const cari = await syncB2bCari(quiet, { memberId: member._id });
        if (!cari.total) return res.status(400).json({ success: false, message: 'Bu cari için DIA senkronu tanımlı değil.' });
        if (!cari.eslesen) return res.status(502).json({ success: false, message: 'Cari DIA’dan okunamadı. Lütfen tekrar deneyin.' });

        const finance = await syncB2bFinance(quiet, { memberId: member._id });
        const financeOk = !finance.skipped;
        const ekstreOk = !finance.ekstreSkipped;

        const eksik = [!financeOk && 'fatura/vade', !ekstreOk && 'ekstre'].filter(Boolean);
        res.json({
            success: true,
            message: eksik.length
                ? `Bakiye güncellendi; ${eksik.join(' ve ')} bilgisi DIA’dan alınamadı, eski veri korundu.`
                : 'Cari DIA’dan güncellendi.',
            data: { balance: true, finance: financeOk, statement: ekstreOk }
        });
    } catch (error) {
        console.error('Tek cari senkron hatası:', error);
        res.status(500).json({ success: false, message: `Cari güncellenemedi: ${error.message}` });
    } finally {
        await release(token, B2B_LOCK_KEY);
    }
});

router.post('/sync-dia', async (req, res) => {
    const { SITES } = require('../../../config/sites');
    const { acquire, release, B2B_LOCK_KEY } = require('../../../services/plugins/dia/diaLock');
    const isB2bSite = SITES[req.site]?.theme === B2B_THEME;
    let token = null;
    try {
        if (isB2bSite) {
            token = await acquire({ key: B2B_LOCK_KEY, ttlMs: BULK_SYNC_LOCK_TTL_MS, waitMs: SINGLE_SYNC_LOCK_WAIT_MS });
            if (!token) {
                return res.status(409).json({ success: false, message: 'Şu anda başka bir DIA senkronu çalışıyor. Lütfen birkaç dakika sonra tekrar deneyin.' });
            }
        }
        const crypto = require('crypto');
        const { DiaOrderService } = require('../../../services/plugins/dia/DiaOrderService');
        const WebDia = require('../../../models/plugins/dia/DiaSettings');

        const settings = await WebDia.getSettings(req.site);
        if (!settings?.baseURL || !settings?.username) {
            return res.status(400).json({ success: false, message: 'Bu site için DIA bağlantı ayarları eksik' });
        }
        const segmentKodu = String(settings.sync?.cariOzelKod2Filtre || '').trim().toUpperCase();

        const svc = new DiaOrderService(req.site);
        svc.settings = settings;
        svc.firmaKodu = settings.firmaKodu || 1;
        svc.donemKodu = settings.donemKodu || 1;
        await svc.login();

        const fetchPage = async (offset) => {
            for (let attempt = 0; attempt < 3; attempt++) {
                const resp = await svc.sendRequest('/api/v3/scf/json', {
                    scf_carikart_listele: {
                        session_id: svc.sessionId,
                        firma_kodu: svc.firmaKodu,
                        donem_kodu: svc.donemKodu,
                        filters: [],
                        sorts: '',
                        params: { selectedcolumns: ['_key', 'carikartkodu', 'unvan', 'eposta', 'ceptel', 'telefon1', 'durum', 'ozelkod2kod', 'carikayitturu', 'verginumarasi', 'vergidairesi', 'tckimlikno'] },
                        limit: 500,
                        offset
                    }
                });
                if (Array.isArray(resp?.result)) return resp.result;
                svc.sessionId = null;
                await svc.login();
            }
            return null;
        };

        const cariler = [];
        let taranan = 0;
        for (let offset = 0; offset < 50000; offset += 500) {
            const rows = await fetchPage(offset);
            if (rows === null) {
                return res.status(502).json({ success: false, message: 'DIA cari listesi alınamadı, lütfen tekrar deneyin' });
            }
            taranan += rows.length;
            for (const r of rows) {
                if (r.durum !== 'A') continue;
                const kod = String(r.ozelkod2kod || '').trim().toUpperCase();
                if (segmentKodu && kod !== segmentKodu) continue;
                const unvan = String(r.unvan || '').trim();
                if (new RegExp(`^${segmentKodu || 'F\\d+'} CARİLER$`, 'i').test(unvan)) continue;
                cariler.push(r);
            }
            if (rows.length < 500) break;
        }

        const seen = new Set();
        const ops = cariler.map(c => {
            let email = String(c.eposta || '').trim().toLowerCase();
            if (!email || !email.includes('@')) {
                email = `${String(c.carikartkodu).toLowerCase()}@eposta-tanimsiz.b2b`;
            } else if (seen.has(email)) {
                const [local, domain] = email.split('@');
                email = `${local}+${String(c.carikartkodu).toLowerCase().replace(/[^a-z0-9]/g, '')}@${domain}`;
            }
            seen.add(email);

            const unvan = String(c.unvan || '').trim();
            const words = unvan.split(/\s+/);
            const firstName = words.length > 1 ? words.slice(0, -1).join(' ') : unvan;
            const lastName = words.length > 1 ? words[words.length - 1] : '.';

            return {
                updateOne: {
                    filter: { site: req.site, diaCustomerCode: c.carikartkodu },
                    update: {
                        $set: {
                            diaCustomerKey: String(c._key),
                            diaCustomerCode: c.carikartkodu
                        },
                        $setOnInsert: {
                            site: req.site,
                            firstName, lastName, email,
                            phone: String(c.ceptel || '').trim() || String(c.telefon1 || '').trim() || '-',
                            status: 'active',
                            updatedAt: new Date(),
                            'diaCari.firmaTuru': String(c.carikayitturu || '').trim().toUpperCase() === 'SHS' ? 'bireysel' : 'kurumsal',
                            'diaCari.vergiNo': String(c.verginumarasi || '').trim(),
                            'diaCari.vergiDairesi': String(c.vergidairesi || '').trim(),
                            'diaCari.tcKimlikNo': String(c.tckimlikno || '').trim(),
                            password: crypto.randomBytes(32).toString('hex'),
                            marketingConsent: false,
                            termsAccepted: false,
                            createdAt: new Date()
                        }
                    },
                    upsert: true
                }
            };
        });

        let yeni = 0, guncellenen = 0, hata = 0;
        const db = mongoose.connection.db;
        for (let i = 0; i < ops.length; i += 500) {
            try {
                const r = await db.collection('webmembers').bulkWrite(ops.slice(i, i + 500), { ordered: false });
                yeni += r.upsertedCount; guncellenen += r.modifiedCount;
            } catch (e) {
                const r = e.result || {};
                yeni += r.upsertedCount || 0; guncellenen += r.modifiedCount || 0;
                hata += (e.writeErrors || []).length;
            }
        }

        let cariSync = null;
        if (isB2bSite) {
            const { syncB2bCari } = require('../../../services/plugins/dia/b2bCariSync');
            cariSync = await syncB2bCari({ warn: (...args) => console.warn(...args) });
        }
        const premiumCount = isB2bSite ? await WebMember.countDocuments({ site: req.site, 'diaCari.premium': true }) : null;
        let backgroundQueued = false;
        if (isB2bSite) {
            try {
                await queueB2bBackgroundSyncs();
                backgroundQueued = true;
            } catch (e) {
                console.error('Cari arka plan senkronu kuyruğa eklenemedi:', e.message);
            }
        }

        res.json({
            success: true,
            message: `Cari senkronu tamamlandı: ${yeni} yeni, ${guncellenen} güncellendi${hata ? `, ${hata} hata` : ''}`
                + (cariSync ? `. ${cariSync.updated} carinin bakiye, limit ve Premium bilgisi güncellendi (Premium cari: ${premiumCount})` : '')
                + (backgroundQueued ? '. Yeni carilerin fatura, vade, ciro, ekstre ve adres bilgileri arka planda alınıyor (cari başına birkaç saniye)' : ''),
            data: { taranan, eslesen: cariler.length, yeni, guncellenen, hata, segment: segmentKodu || 'tümü', cariSync, premiumCount, backgroundQueued }
        });
    } catch (error) {
        console.error('Cari senkron hatası:', error);
        res.status(500).json({ success: false, message: `Cari senkronu başarısız: ${error.message}` });
    } finally {
        if (token) await release(token, B2B_LOCK_KEY);
    }
});

module.exports = router;
