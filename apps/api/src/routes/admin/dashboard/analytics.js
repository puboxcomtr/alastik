const express = require('express');
const router = express.Router();

const WebOrder = require('../../../models/web/order/WebOrder');
const WebProduct = require('../../../models/web/catalog/WebProduct');
const WebMember = require('../../../models/web/user/WebMember');
const Session = require('../../../models/Session');
const FrondSearchTerm = require('../../../models/web/catalog/FrondSearchTerm');
const WebCallbackRequest = require('../../../models/web/content/WebCallbackRequest');
const WebContact = require('../../../models/web/content/WebContact');
const WebPage = require('../../../models/web/content/WebPage');
const WebBlog = require('../../../models/web/content/WebBlog');
const WebTag = require('../../../models/web/catalog/WebTag');
const WebRedirect = require('../../../models/web/other/WebRedirect');
const Menu = require('../../../models/admin/design/Menu');
const path = require('path');

const { DOMAIN_TO_SLUG, SITES } = require('../../../config/sites');
const {
    TZ, revenueMatch, ORDER_ACTIVITY_GROUPS, DEVICE_LABELS,
    pctChange, daysAgo, minutesAgo, round2
} = require('../../../utils/dashboardMetrics');
const { parseTireSpec, SEASON_LABELS } = require('../../../utils/tireSpec');
const { BOT_UA_RE } = require('../../../utils/requestOrigin');
const { isAvailable: geoAvailable } = require('../../../utils/geoLookup');

const IST_OFFSET_MS = 3 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const toWall = (d) => new Date(d.getTime() + IST_OFFSET_MS);
const fromWall = (w) => new Date(w.getTime() - IST_OFFSET_MS);

const istStartOfDay = (d) => { const w = toWall(d); return fromWall(new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate()))); };
const istStartOfMonth = (d) => { const w = toWall(d); return fromWall(new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), 1))); };
const istStartOfYear = (d) => { const w = toWall(d); return fromWall(new Date(Date.UTC(w.getUTCFullYear(), 0, 1))); };
const istStartOfWeek = (d) => {
    const w = toWall(d);
    const dow = (w.getUTCDay() + 6) % 7;
    return fromWall(new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth(), w.getUTCDate() - dow)));
};
const addDays = (d, n) => new Date(d.getTime() + n * DAY_MS);
const addMonths = (d, n) => { const w = toWall(d); return fromWall(new Date(Date.UTC(w.getUTCFullYear(), w.getUTCMonth() + n, 1))); };

const fmtHour = (key) => `${key.slice(11, 13)}:00`;
const fmtDay = (key) => new Date(`${key}T12:00:00+03:00`).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', timeZone: TZ });
const fmtMonth = (key) => new Date(`${key}-15T12:00:00+03:00`).toLocaleDateString('tr-TR', { month: 'short', year: 'numeric', timeZone: TZ });

const GRANULARITY = {
    hour: { format: '%Y-%m-%dT%H', label: fmtHour, step: (d) => new Date(d.getTime() + 60 * 60 * 1000), floor: (d) => new Date(Math.floor(d.getTime() / 3600000) * 3600000), key: (d) => toWall(d).toISOString().slice(0, 13) },
    day: { format: '%Y-%m-%d', label: fmtDay, step: (d) => addDays(d, 1), floor: istStartOfDay, key: (d) => toWall(d).toISOString().slice(0, 10) },
    month: { format: '%Y-%m', label: fmtMonth, step: (d) => addMonths(d, 1), floor: istStartOfMonth, key: (d) => toWall(d).toISOString().slice(0, 7) }
};

const PERIOD_LABELS = {
    today: 'Bugün', week: 'Bu Hafta', month: 'Bu Ay', last_month: 'Geçen Ay', year: 'Bu Yıl', custom: 'Seçili Tarihler'
};

function resolvePeriod(query) {
    const now = new Date();
    const key = String(query.period || 'month');
    let start; let end = now; let granularity;

    switch (key) {
        case 'today': start = istStartOfDay(now); granularity = 'hour'; break;
        case 'week': start = istStartOfWeek(now); granularity = 'day'; break;
        case 'month': start = istStartOfMonth(now); granularity = 'day'; break;
        case 'last_month': end = istStartOfMonth(now); start = addMonths(end, -1); granularity = 'day'; break;
        case 'year': start = istStartOfYear(now); granularity = 'month'; break;
        case 'custom': {
            const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from || '') ? new Date(`${query.from}T00:00:00+03:00`) : null;
            const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to || '') ? new Date(`${query.to}T00:00:00+03:00`) : null;
            if (!from || !to || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return null;
            start = from; end = addDays(to, 1);
            const days = (end - start) / DAY_MS;
            granularity = days <= 2 ? 'hour' : days <= 92 ? 'day' : 'month';
            break;
        }
        default: return null;
    }

    const length = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - length);
    return { key, label: PERIOD_LABELS[key], start, end, prevStart, prevEnd: start, granularity, days: Math.max(1, length / DAY_MS) };
}

function fillSeries(rows, period, valueField) {
    const g = GRANULARITY[period.granularity];
    const map = Object.fromEntries(rows.map(r => [r._id, r[valueField]]));
    const series = [];
    let cursor = g.floor(period.start);
    let guard = 0;
    while (cursor < period.end && guard++ < 800) {
        const key = g.key(cursor);
        series.push({ key, label: g.label(key), value: round2(map[key] || 0) });
        cursor = g.step(cursor);
    }
    return series;
}

const notBot = { 'metadata.userAgent': { $not: BOT_UA_RE } };
const sessionMatch = (site, extra = {}) => ({ site, ...notBot, ...extra });

const saleableFilter = (site) => ({
    sites: site,
    'diaData.durum': 'A',
    'diaData.gercek_stok': { $gt: 0 },
    'customData.webVisible': { $ne: false },
    [`customData.siteData.${site}.webVisible`]: { $ne: false }
});

const imagesMissing = {
    $and: [
        { $or: [{ 'customData.customImages': { $exists: false } }, { 'customData.customImages': { $size: 0 } }] },
        { $or: [{ 'customData.featuredImage': { $exists: false } }, { 'customData.featuredImage': { $in: [null, ''] } }] },
        { $or: [{ 'diaData.m_resimler': { $exists: false } }, { 'diaData.m_resimler': { $size: 0 } }] }
    ]
};
const descriptionMissing = (site) => ({
    $and: [
        { $or: [{ 'customData.customDescription': { $exists: false } }, { 'customData.customDescription': { $in: [null, ''] } }] },
        { $or: [{ [`customData.siteDescriptions.${site}`]: { $exists: false } }, { [`customData.siteDescriptions.${site}`]: { $in: [null, ''] } }] }
    ]
});

const lowStockFilter = (site) => ({
    sites: site,
    'diaData.durum': 'A',
    'customData.webVisible': { $ne: false },
    $expr: {
        $and: [
            { $gt: ['$diaData.gercek_stok', 0] },
            { $lte: ['$diaData.gercek_stok', { $ifNull: ['$customData.stockAlert', 5] }] }
        ]
    }
});

const CHECKOUT_URL_RE = '^/api/(order|payment-methods|web/payments|cargo/calculate)';

const cityExpr = { $trim: { input: { $ifNull: ['$billingSnapshot.cityName', { $ifNull: ['$guestBillingAddress.cityName', ''] }] } } };

async function attachStock(rows) {
    const keys = rows.map(r => r.productKey).filter(Boolean);
    if (!keys.length) return rows.map(r => ({ ...r, stock: null, stockStatus: 'unknown' }));
    const products = await WebProduct.find({ _key: { $in: keys } })
        .select('_key diaData.gercek_stok customData.stockAlert diaData.stokkartkodu')
        .lean();
    const byKey = Object.fromEntries(products.map(p => [p._key, p]));
    return rows.map(r => {
        const p = byKey[r.productKey];
        if (!p) return { ...r, stock: null, stockStatus: 'unknown' };
        const stock = Number(p.diaData?.gercek_stok || 0);
        const alert = Number(p.customData?.stockAlert ?? 5);
        return {
            ...r,
            stockCode: r.stockCode || p.diaData?.stokkartkodu || '',
            stock,
            stockStatus: stock <= 0 ? 'out' : stock <= alert ? 'low' : 'in_stock'
        };
    });
}

async function topProductsFor(site, start, end, limit = 10) {
    const rows = await WebOrder.aggregate([
        { $match: { site, isActive: true, ...revenueMatch, createdAt: { $gte: start, $lt: end } } },
        { $unwind: '$items' },
        {
            $group: {
                _id: { $ifNull: ['$items.productKey', { $ifNull: ['$items.stockCode', '$items.name'] }] },
                productKey: { $first: '$items.productKey' },
                stockCode: { $first: '$items.stockCode' },
                name: { $first: '$items.name' },
                units: { $sum: '$items.quantity' },
                revenue: { $sum: '$items.totalPrice' },
                orders: { $sum: 1 }
            }
        },
        { $sort: { units: -1, revenue: -1 } },
        { $limit: limit }
    ]);
    return attachStock(rows.map(r => ({
        productKey: r.productKey || '', stockCode: r.stockCode || '', name: r.name || '',
        units: r.units, revenue: round2(r.revenue), orders: r.orders
    })));
}

async function buildNotifications(site, limit = 20) {
    const [searchRows, callbackRows, contactRows, searchCount7d, newCallbacks, unreadContacts] = await Promise.all([
        FrondSearchTerm.find({ isActive: { $ne: false } }).sort({ lastSearched: -1 }).limit(limit).select('term searchCount lastSearched isMatched').lean(),
        WebCallbackRequest.find({ site }).sort({ createdAt: -1 }).limit(limit).select('name phone topic status createdAt').lean(),
        WebContact.find({ site }).sort({ createdAt: -1 }).limit(limit).select('name surname subject isRead createdAt').lean(),
        FrondSearchTerm.countDocuments({ isActive: { $ne: false }, lastSearched: { $gte: daysAgo(7) } }),
        WebCallbackRequest.countDocuments({ site, status: 'new' }),
        WebContact.countDocuments({ site, isRead: false })
    ]);

    const items = [
        ...searchRows.map(s => ({ type: 'search', title: 'Aranan ürün', subtitle: s.term, meta: s.searchCount > 1 ? `${s.searchCount} kez` : '', at: s.lastSearched, read: true })),
        ...callbackRows.map(c => ({ type: 'callback', title: `Geri arama talebi — ${c.name}`, subtitle: [c.phone, c.topic].filter(Boolean).join(' · '), meta: c.status, at: c.createdAt, read: c.status !== 'new' })),
        ...contactRows.map(c => ({ type: 'contact', title: `İletişim — ${[c.name, c.surname].filter(Boolean).join(' ')}`, subtitle: c.subject, meta: '', at: c.createdAt, read: Boolean(c.isRead) }))
    ].filter(n => n.at).sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, limit);

    return {
        counts: { searches: searchCount7d, callbacks: newCallbacks, contacts: unreadContacts },
        unread: newCallbacks + unreadContacts,
        items
    };
}

const CARD_RANGE_LABELS = { today: 'Bugün', '7d': 'Son 7 Gün', '30d': 'Son 30 Gün' };

router.get('/cards', async (req, res) => {
    try {
        const site = req.site;
        const range = CARD_RANGE_LABELS[req.query.range] ? String(req.query.range) : '30d';
        const now = new Date();
        let start; let prevStart;
        if (range === 'today') {
            start = istStartOfDay(now);
            prevStart = addDays(start, -1);
        } else {
            const days = range === '7d' ? 7 : 30;
            start = daysAgo(days);
            prevStart = daysAgo(days * 2);
        }
        const current = { createdAt: { $gte: start, $lt: now } };
        const previous = { createdAt: { $gte: prevStart, $lt: start } };
        const orderBase = { site, isActive: true };
        const sumOrders = (window) => WebOrder.aggregate([
            { $match: { ...orderBase, ...revenueMatch, ...window } },
            { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } }
        ]);

        const [[sales], [salesPrev], pendingCount, members, membersPrev] = await Promise.all([
            sumOrders(current),
            sumOrders(previous),
            WebOrder.countDocuments({ ...orderBase, status: 'pending', 'payment.status': 'paid' }),
            WebMember.countDocuments({ site, ...current }),
            WebMember.countDocuments({ site, ...previous })
        ]);
        const cur = sales || { total: 0, count: 0 };
        const prev = salesPrev || { total: 0, count: 0 };

        res.json({
            success: true,
            data: {
                range,
                label: CARD_RANGE_LABELS[range],
                cards: {
                    totalSales: { value: round2(cur.total), trend: Math.round(pctChange(cur.total, prev.total)) },
                    totalOrders: { value: cur.count, trend: Math.round(pctChange(cur.count, prev.count)) },
                    pendingOrders: { value: pendingCount },
                    newMembers: { value: members, trend: Math.round(pctChange(members, membersPrev)) }
                }
            }
        });
    } catch (err) {
        console.error('Analytics cards hatası:', err);
        res.status(500).json({ success: false, message: 'Kart verileri yüklenemedi' });
    }
});

router.get('/notifications', async (req, res) => {
    try {
        res.json({ success: true, data: await buildNotifications(req.site, 20) });
    } catch (err) {
        console.error('Analytics notifications hatası:', err);
        res.status(500).json({ success: false, message: 'Bildirimler yüklenemedi' });
    }
});

router.get('/overview', async (req, res) => {
    try {
        const site = req.site;
        const now = new Date();
        const startOfMonth = istStartOfMonth(now);
        const startOfLastMonth = addMonths(startOfMonth, -1);
        const startOfWeek = istStartOfWeek(now);
        const d365 = daysAgo(365);
        const orderBase = { site, isActive: true };

        const [
            totalOrders, cancelledOrders, awaitingApproval, awaitingPayment,
            activityRows,
            activeProducts, incompleteProducts, lowStockProducts,
            membersThisMonth, membersLastMonth, membersTotal,
            cityRows, itemRows,
            topAll, topMonth, topWeek
        ] = await Promise.all([
            WebOrder.countDocuments(orderBase),
            WebOrder.countDocuments({ ...orderBase, status: 'cancelled' }),
            WebOrder.countDocuments({ ...orderBase, status: 'pending', 'payment.status': 'paid' }),
            WebOrder.countDocuments({ ...orderBase, 'payment.status': 'pending', status: { $nin: ['cancelled', 'payment_failed', 'awaiting_payment'] } }),
            WebOrder.aggregate([{ $match: { ...orderBase, 'payment.status': 'paid' } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
            WebProduct.countDocuments(saleableFilter(site)),
            WebProduct.countDocuments({ ...saleableFilter(site), $or: [imagesMissing, descriptionMissing(site)] }),
            WebProduct.countDocuments(lowStockFilter(site)),
            WebMember.countDocuments({ site, createdAt: { $gte: startOfMonth } }),
            WebMember.countDocuments({ site, createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }),
            WebMember.countDocuments({ site }),
            WebOrder.aggregate([
                { $match: { ...orderBase, ...revenueMatch, createdAt: { $gte: d365 } } },
                { $project: { city: cityExpr, total: '$pricing.total' } },
                { $match: { city: { $ne: '' } } },
                { $group: { _id: { $toLower: '$city' }, city: { $first: '$city' }, total: { $sum: '$total' }, count: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: 12 }
            ]),
            WebOrder.aggregate([
                { $match: { ...orderBase, ...revenueMatch, createdAt: { $gte: d365 } } },
                { $unwind: '$items' },
                { $project: { name: '$items.name', quantity: '$items.quantity', total: '$items.totalPrice' } }
            ]),
            topProductsFor(site, new Date(0), now, 5),
            topProductsFor(site, startOfMonth, now, 5),
            topProductsFor(site, startOfWeek, now, 5)
        ]);

        const statusCounts = Object.fromEntries(activityRows.map(r => [r._id, r.count]));
        const orderActivity = Object.fromEntries(
            Object.entries(ORDER_ACTIVITY_GROUPS).map(([group, statuses]) => [group, statuses.reduce((s, st) => s + (statusCounts[st] || 0), 0)])
        );

        const seasonAcc = {}; const rimAcc = {}; let seasonUnits = 0; let rimUnits = 0;
        for (const it of itemRows) {
            const spec = parseTireSpec(it.name);
            const qty = Number(it.quantity) || 0;
            if (spec.season) {
                const s = seasonAcc[spec.season] || (seasonAcc[spec.season] = { units: 0, revenue: 0 });
                s.units += qty; s.revenue += Number(it.total) || 0; seasonUnits += qty;
            }
            if (spec.rimInch) {
                rimAcc[spec.rimInch] = (rimAcc[spec.rimInch] || 0) + qty; rimUnits += qty;
            }
        }
        const seasonSplit = Object.entries(seasonAcc)
            .map(([key, v]) => ({ key, label: SEASON_LABELS[key] || key, units: v.units, revenue: round2(v.revenue), share: seasonUnits ? Math.round((v.units / seasonUnits) * 100) : 0 }))
            .sort((a, b) => b.units - a.units);
        const rimSplit = Object.entries(rimAcc)
            .map(([inch, units]) => ({ inch: Number(inch), units, share: rimUnits ? Math.round((units / rimUnits) * 100) : 0 }))
            .sort((a, b) => b.units - a.units);

        res.json({
            success: true,
            data: {
                stats: { totalOrders, cancelledOrders, awaitingApproval, awaitingPayment, activeProducts, incompleteProducts, lowStockProducts },
                orderActivity,
                customerGrowth: { thisMonth: membersThisMonth, lastMonth: membersLastMonth, total: membersTotal, trend: pctChange(membersThisMonth, membersLastMonth) },
                window: '12ay',
                salesMap: cityRows.map(c => ({ city: c.city, total: round2(c.total), count: c.count })),
                seasonSplit: { totalUnits: seasonUnits, items: seasonSplit },
                rimSplit: { totalUnits: rimUnits, items: rimSplit },
                notifications: await buildNotifications(site, 25),
                topProducts: { all: topAll, month: topMonth, week: topWeek }
            }
        });
    } catch (err) {
        console.error('Analytics overview hatası:', err);
        res.status(500).json({ success: false, message: 'Analiz verileri yüklenemedi' });
    }
});

router.get('/reports', async (req, res) => {
    try {
        const site = req.site;
        const period = resolvePeriod(req.query);
        if (!period) {
            return res.status(400).json({ success: false, message: 'Geçersiz dönem. period=today|week|month|last_month|year veya custom&from=YYYY-MM-DD&to=YYYY-MM-DD' });
        }
        const { start, end, prevStart, prevEnd } = period;
        const g = GRANULARITY[period.granularity];
        const orderBase = { site, isActive: true };
        const inPeriod = { createdAt: { $gte: start, $lt: end } };
        const inPrev = { createdAt: { $gte: prevStart, $lt: prevEnd } };
        const twelveMonthsAgo = addMonths(istStartOfMonth(new Date()), -11);

        const [
            [orderFacet], [prevPaid],
            sessionCount, prevSessionCount,
            [sessionFacet],
            referrerRows,
            monthlyRows,
            topProducts,
            firstSession
        ] = await Promise.all([
            WebOrder.aggregate([
                { $match: { ...orderBase, ...inPeriod } },
                {
                    $facet: {
                        paid: [
                            { $match: revenueMatch },
                            { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 }, shipping: { $sum: '$pricing.shippingCost' }, units: { $sum: { $sum: '$items.quantity' } } } }
                        ],
                        gross: [
                            { $match: { status: { $ne: 'cancelled' } } },
                            { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } }
                        ],
                        refunds: [
                            { $match: { $or: [{ 'payment.status': 'refunded' }, { status: 'returned' }] } },
                            { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } }
                        ],
                        cancelled: [{ $match: { status: 'cancelled' } }, { $count: 'count' }],
                        shipped: [{ $match: { status: { $in: ['shipped', 'delivered'] } } }, { $count: 'count' }],
                        collectedSeries: [
                            { $match: revenueMatch },
                            { $group: { _id: { $dateToString: { format: g.format, date: '$createdAt', timezone: TZ } }, total: { $sum: '$pricing.total' } } }
                        ],
                        customers: [
                            { $match: { ...revenueMatch, customerEmail: { $nin: [null, ''] } } },
                            { $group: { _id: { $toLower: '$customerEmail' } } }
                        ]
                    }
                }
            ]),
            WebOrder.aggregate([
                { $match: { ...orderBase, ...revenueMatch, ...inPrev } },
                { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } }
            ]),
            Session.countDocuments(sessionMatch(site, inPeriod)),
            Session.countDocuments(sessionMatch(site, inPrev)),
            Session.aggregate([
                { $match: sessionMatch(site, inPeriod) },
                {
                    $facet: {
                        series: [
                            { $group: { _id: { $dateToString: { format: g.format, date: '$createdAt', timezone: TZ } }, count: { $sum: 1 } } }
                        ],
                        hours: [
                            { $group: { _id: { $hour: { date: '$createdAt', timezone: TZ } }, count: { $sum: 1 } } }
                        ],
                        devices: [
                            { $group: { _id: '$metadata.device', count: { $sum: 1 } } }, { $sort: { count: -1 } }
                        ],
                        cities: [
                            { $match: { 'metadata.location.city': { $nin: [null, ''] } } },
                            { $group: { _id: '$metadata.location.city', count: { $sum: 1 } } },
                            { $sort: { count: -1 } }, { $limit: 10 }
                        ],
                        funnel: [
                            {
                                $project: {
                                    addedToCart: { $gt: [{ $size: { $filter: { input: { $ifNull: ['$activity.actions', []] }, as: 'a', cond: { $eq: ['$$a.type', 'cart_add'] } } } }, 0] },
                                    reachedCheckout: {
                                        $gt: [{
                                            $size: {
                                                $filter: {
                                                    input: { $ifNull: ['$activity.actions', []] }, as: 'a',
                                                    cond: { $regexMatch: { input: { $ifNull: ['$$a.details.url', ''] }, regex: CHECKOUT_URL_RE } }
                                                }
                                            }
                                        }, 0]
                                    },
                                    ordered: { $eq: ['$conversion.hasConverted', true] }
                                }
                            },
                            {
                                $group: {
                                    _id: null,
                                    addedToCart: { $sum: { $cond: ['$addedToCart', 1, 0] } },
                                    reachedCheckout: { $sum: { $cond: ['$reachedCheckout', 1, 0] } },
                                    ordered: { $sum: { $cond: ['$ordered', 1, 0] } }
                                }
                            }
                        ]
                    }
                }
            ]),
            Session.aggregate([
                { $match: sessionMatch(site, inPeriod) },
                { $group: { _id: { $ifNull: ['$metadata.referrer', ''] }, count: { $sum: 1 } } },
                { $sort: { count: -1 } }, { $limit: 400 }
            ]),
            WebOrder.aggregate([
                { $match: { ...orderBase, ...revenueMatch, createdAt: { $gte: twelveMonthsAgo } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt', timezone: TZ } }, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } }
            ]),
            topProductsFor(site, start, end, 10),
            Session.findOne({ site }).sort({ createdAt: 1 }).select('createdAt').lean()
        ]);

        const paid = orderFacet.paid[0] || { total: 0, count: 0, shipping: 0, units: 0 };
        const gross = orderFacet.gross[0] || { total: 0, count: 0 };
        const refunds = orderFacet.refunds[0] || { total: 0, count: 0 };
        const prev = prevPaid || { total: 0, count: 0 };
        const cancelledCount = orderFacet.cancelled[0]?.count || 0;
        const shippedCount = orderFacet.shipped[0]?.count || 0;

        const emails = orderFacet.customers.map(c => c._id);
        let returningCount = 0;
        if (emails.length) {
            const earlier = await WebOrder.aggregate([
                { $match: { ...orderBase, ...revenueMatch, createdAt: { $lt: start }, customerEmail: { $nin: [null, ''] } } },
                { $project: { email: { $toLower: '$customerEmail' } } },
                { $match: { email: { $in: emails } } },
                { $group: { _id: '$email' } }
            ]);
            returningCount = earlier.length;
        }

        const ownHosts = new Set(Object.keys(DOMAIN_TO_SLUG));
        const referrers = {}; const landings = {};
        for (const r of referrerRows) {
            const raw = String(r._id || '');
            if (!raw) { referrers['Doğrudan / Yer imi'] = (referrers['Doğrudan / Yer imi'] || 0) + r.count; continue; }
            let host = ''; let path = '';
            try { const u = new URL(raw); host = u.hostname.toLowerCase(); path = u.pathname || '/'; } catch (e) { continue; }
            if (ownHosts.has(host)) {
                landings[path] = (landings[path] || 0) + r.count;
                referrers['Doğrudan / Yer imi'] = (referrers['Doğrudan / Yer imi'] || 0) + r.count;
            } else {
                referrers[host] = (referrers[host] || 0) + r.count;
            }
        }
        const toRows = (obj, limit = 10) => Object.entries(obj).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, limit);

        const hourMap = Object.fromEntries(sessionFacet.hours.map(h => [h._id, h.count]));
        const hourDensity = Array.from({ length: 24 }, (_, h) => ({ hour: h, avg: round2((hourMap[h] || 0) / period.days) }));
        const peak = hourDensity.reduce((best, h) => (h.avg > best.avg ? h : best), hourDensity[0]);

        const funnelRaw = sessionFacet.funnel[0] || { addedToCart: 0, reachedCheckout: 0, ordered: 0 };
        const pct = (n) => (sessionCount ? Math.round((n / sessionCount) * 1000) / 10 : 0);

        const monthlyMap = Object.fromEntries(monthlyRows.map(m => [m._id, m]));
        const monthlyTrend = [];
        for (let i = 0; i < 12; i++) {
            const d = addMonths(twelveMonthsAgo, i);
            const key = GRANULARITY.month.key(d);
            monthlyTrend.push({ key, label: fmtMonth(key), collected: round2(monthlyMap[key]?.total || 0), orders: monthlyMap[key]?.count || 0 });
        }

        res.json({
            success: true,
            data: {
                period: {
                    key: period.key, label: period.label, start, end, granularity: period.granularity,
                    sessionsSince: firstSession?.createdAt || null
                },
                kpis: {
                    collected: round2(paid.total),
                    collectedTrend: pctChange(paid.total, prev.total),
                    orders: paid.count,
                    ordersTrend: pctChange(paid.count, prev.count),
                    avgBasket: paid.count ? round2(paid.total / paid.count) : 0,
                    cancelled: cancelledCount,
                    unitsSold: paid.units || 0,
                    sessions: sessionCount,
                    sessionsTrend: pctChange(sessionCount, prevSessionCount),
                    conversionRate: sessionCount ? Math.round((paid.count / sessionCount) * 1000) / 10 : 0,
                    returningCustomerRate: emails.length ? Math.round((returningCount / emails.length) * 1000) / 10 : 0,
                    shippedOrders: shippedCount
                },
                collectedOverTime: fillSeries(orderFacet.collectedSeries, period, 'total'),
                salesBreakdown: {
                    gross: round2(gross.total),
                    refunds: round2(refunds.total),
                    net: round2(gross.total - refunds.total),
                    shippingCollected: round2(paid.shipping),
                    collected: round2(paid.total - refunds.total),
                    avgOrderValue: gross.count ? round2(gross.total / gross.count) : 0
                },
                sessionsOverTime: fillSeries(sessionFacet.series, period, 'count'),
                funnel: {
                    sessions: sessionCount,
                    addedToCart: funnelRaw.addedToCart, addedToCartPct: pct(funnelRaw.addedToCart),
                    reachedCheckout: funnelRaw.reachedCheckout, reachedCheckoutPct: pct(funnelRaw.reachedCheckout),
                    ordered: funnelRaw.ordered, orderedPct: pct(funnelRaw.ordered)
                },
                hourDensity: { hours: hourDensity, peakHour: peak.hour, avgPerDay: round2(sessionCount / period.days) },
                byDevice: sessionFacet.devices.map(d => ({ label: DEVICE_LABELS[d._id] || 'Bilinmiyor', count: d.count })),
                byCity: sessionFacet.cities.map(c => ({ label: c._id, count: c.count })),
                byReferrer: toRows(referrers),
                byLandingPage: toRows(landings),
                monthlyTrend,
                topProducts,
                geoAvailable: geoAvailable()
            }
        });
    } catch (err) {
        console.error('Analytics reports hatası:', err);
        res.status(500).json({ success: false, message: 'Rapor verileri yüklenemedi' });
    }
});

router.get('/live', async (req, res) => {
    try {
        const site = req.site;
        const now = new Date();
        const startOfToday = istStartOfDay(now);
        const orderBase = { site, isActive: true };

        const [activeVisitors, sessions30m, ordersToday, [collectedToday], [behavior], recentSales, locationRows] = await Promise.all([
            Session.countDocuments(sessionMatch(site, { 'activity.lastActivity': { $gte: minutesAgo(2) } })),
            Session.countDocuments(sessionMatch(site, { createdAt: { $gte: minutesAgo(30) } })),
            WebOrder.countDocuments({ ...orderBase, 'payment.status': 'paid', createdAt: { $gte: startOfToday } }),
            WebOrder.aggregate([
                { $match: { ...orderBase, ...revenueMatch, createdAt: { $gte: startOfToday } } },
                { $group: { _id: null, total: { $sum: '$pricing.total' } } }
            ]),
            Session.aggregate([
                { $match: sessionMatch(site, { 'activity.lastActivity': { $gte: minutesAgo(15) } }) },
                {
                    $project: {
                        recent: { $filter: { input: { $ifNull: ['$activity.actions', []] }, as: 'a', cond: { $gte: ['$$a.timestamp', minutesAgo(15)] } } }
                    }
                },
                {
                    $project: {
                        addedToCart: { $gt: [{ $size: { $filter: { input: '$recent', as: 'a', cond: { $eq: ['$$a.type', 'cart_add'] } } } }, 0] },
                        reachedCheckout: { $gt: [{ $size: { $filter: { input: '$recent', as: 'a', cond: { $regexMatch: { input: { $ifNull: ['$$a.details.url', ''] }, regex: CHECKOUT_URL_RE } } } } }, 0] },
                        ordered: { $gt: [{ $size: { $filter: { input: '$recent', as: 'a', cond: { $eq: ['$$a.type', 'conversion'] } } } }, 0] }
                    }
                },
                {
                    $group: {
                        _id: null,
                        addedToCart: { $sum: { $cond: ['$addedToCart', 1, 0] } },
                        reachedCheckout: { $sum: { $cond: ['$reachedCheckout', 1, 0] } },
                        ordered: { $sum: { $cond: ['$ordered', 1, 0] } }
                    }
                }
            ]),
            WebOrder.find({ ...orderBase, 'payment.status': 'paid' }).sort({ createdAt: -1 }).limit(5).select('orderNumber pricing.total createdAt').lean(),
            Session.aggregate([
                { $match: sessionMatch(site, { 'activity.lastActivity': { $gte: minutesAgo(30) }, 'metadata.location.city': { $nin: [null, ''] } }) },
                { $group: { _id: '$metadata.location.city', count: { $sum: 1 } } },
                { $sort: { count: -1 } }, { $limit: 20 }
            ])
        ]);

        res.json({
            success: true,
            data: {
                updatedAt: now,
                activeVisitors,
                sessions30m,
                ordersToday,
                collectedToday: round2(collectedToday?.total || 0),
                behavior15m: behavior || { addedToCart: 0, reachedCheckout: 0, ordered: 0 },
                recentSales: recentSales.map(o => ({ orderNumber: o.orderNumber, total: round2(o.pricing?.total), createdAt: o.createdAt })),
                visitorLocations: locationRows.map(l => ({ city: l._id, count: l.count })),
                geoAvailable: geoAvailable()
            }
        });
    } catch (err) {
        console.error('Analytics live hatası:', err);
        res.status(500).json({ success: false, message: 'Canlı izleme verileri yüklenemedi' });
    }
});

const SEO_LINK_CACHE_MS = 10 * 60 * 1000;
const seoLinkCache = new Map();
const HREF_RE = /<a\b[^>]*?\bhref\s*=\s*["']([^"'#][^"']*)["'][^>]*>/gi;
const OWN_HOSTS = new Set(Object.keys(DOMAIN_TO_SLUG));

function countLinks(html, acc) {
    if (!html || typeof html !== 'string') return;
    HREF_RE.lastIndex = 0;
    let m;
    while ((m = HREF_RE.exec(html)) !== null) {
        const href = m[1].trim();
        if (/^(mailto:|tel:|javascript:|data:)/i.test(href)) continue;
        if (/\brel\s*=\s*["'][^"']*nofollow/i.test(m[0])) acc.nofollow++;
        let host = '';
        if (/^https?:\/\//i.test(href)) {
            try { host = new URL(href).hostname.toLowerCase().replace(/^www\./, ''); } catch (e) { host = ''; }
        }
        if (!host || OWN_HOSTS.has(host) || OWN_HOSTS.has(`www.${host}`)) {
            acc.internal++;
        } else {
            acc.external++;
            acc.hosts[host] = (acc.hosts[host] || 0) + 1;
        }
        acc.total++;
    }
}

async function scanSiteLinks(site) {
    const cached = seoLinkCache.get(site);
    if (cached && Date.now() - cached.at < SEO_LINK_CACHE_MS) return cached.data;

    const acc = { total: 0, internal: 0, external: 0, nofollow: 0, hosts: {} };
    const sources = { pages: 0, blogs: 0, products: 0 };

    const pages = await WebPage.find({ site, status: 'published' }).select('content').lean();
    for (const p of pages) { sources.pages++; countLinks(p.content, acc); }

    const blogs = await WebBlog.find({ site, status: 'published' }).select('content').lean();
    for (const b of blogs) { sources.blogs++; countLinks(b.content, acc); }

    const productCursor = WebProduct.find(saleableFilter(site))
        .select(`customData.customDescription customData.siteDescriptions.${site}`).lean().cursor();
    for await (const p of productCursor) {
        sources.products++;
        countLinks(p.customData?.customDescription, acc);
        countLinks(p.customData?.siteDescriptions?.[site], acc);
    }

    const [menuLinks, redirects] = await Promise.all([
        Menu.countDocuments({ site, isActive: { $ne: false }, 'linkData.url': { $nin: [null, ''] } }),
        WebRedirect.countDocuments({ site, isActive: true })
    ]);

    const data = {
        total: acc.total,
        internal: acc.internal,
        external: acc.external,
        nofollow: acc.nofollow,
        byDomain: Object.entries(acc.hosts).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 10),
        sources,
        menuLinks,
        redirects,
        scannedAt: new Date()
    };
    seoLinkCache.set(site, { at: Date.now(), data });
    return data;
}

async function keywordStats(site) {
    const [[products], tagPages, tagPagesWithSeo, searchTotal, search30d, searchMatched] = await Promise.all([
        WebProduct.aggregate([
            { $match: saleableFilter(site) },
            {
                $project: {
                    kw: { $ifNull: ['$customData.seoKeywords', []] },
                    hasTitle: { $gt: [{ $strLenCP: { $ifNull: ['$customData.seoTitle', ''] } }, 0] },
                    hasDesc: { $gt: [{ $strLenCP: { $ifNull: ['$customData.seoDescription', ''] } }, 0] },
                    hasUrl: { $gt: [{ $strLenCP: { $ifNull: ['$customData.seoUrl', ''] } }, 0] }
                }
            },
            {
                $group: {
                    _id: null,
                    saleable: { $sum: 1 },
                    withKeywords: { $sum: { $cond: [{ $gt: [{ $size: '$kw' }, 0] }, 1, 0] } },
                    withTitle: { $sum: { $cond: ['$hasTitle', 1, 0] } },
                    withDescription: { $sum: { $cond: ['$hasDesc', 1, 0] } },
                    withUrl: { $sum: { $cond: ['$hasUrl', 1, 0] } },
                    keywords: { $push: '$kw' }
                }
            }
        ]),
        WebTag.countDocuments({ site, isActive: { $ne: false } }),
        WebTag.countDocuments({ site, isActive: { $ne: false }, seoTitle: { $nin: [null, ''] } }),
        FrondSearchTerm.countDocuments({ isActive: { $ne: false } }),
        FrondSearchTerm.countDocuments({ isActive: { $ne: false }, lastSearched: { $gte: daysAgo(30) } }),
        FrondSearchTerm.countDocuments({ isActive: { $ne: false }, isMatched: true })
    ]);

    const distinct = new Set();
    for (const arr of (products?.keywords || [])) {
        for (const k of (arr || [])) { const v = String(k || '').trim().toLowerCase(); if (v) distinct.add(v); }
    }

    return {
        products: {
            saleable: products?.saleable || 0,
            withKeywords: products?.withKeywords || 0,
            distinctKeywords: distinct.size,
            withSeoTitle: products?.withTitle || 0,
            withSeoDescription: products?.withDescription || 0,
            withSeoUrl: products?.withUrl || 0
        },
        tagPages: { total: tagPages, withSeoTitle: tagPagesWithSeo },
        searchTerms: { total: searchTotal, last30d: search30d, matched: searchMatched }
    };
}

const SERVICE_ACCOUNT_FILE = path.join(__dirname, '../../../config/alastik-service-account.json');

async function searchConsoleStats(site, start, end) {
    const domain = (SITES[site]?.domains || []).find(d => !d.startsWith('www.') && !d.startsWith('dev.') && !d.startsWith('demo.')) || '';
    const setup = {
        serviceAccount: (() => { try { return require(SERVICE_ACCOUNT_FILE).client_email || ''; } catch (e) { return ''; } })(),
        steps: [
            'Google Cloud Console > APIs & Services > "Google Search Console API"yi etkinleştirin',
            `Search Console > ${domain} mülkü > Ayarlar > Kullanıcılar ve izinler > servis hesabını "Tam" yetkiyle ekleyin`
        ]
    };
    try {
        const { google } = require('googleapis');
        const auth = new google.auth.GoogleAuth({ keyFile: SERVICE_ACCOUNT_FILE, scopes: ['https://www.googleapis.com/auth/webmasters.readonly'] });
        const sc = google.searchconsole({ version: 'v1', auth });
        const fmt = (d) => d.toISOString().slice(0, 10);
        const endDate = new Date(Math.min(end.getTime(), Date.now() - 2 * DAY_MS));
        const body = { startDate: fmt(start), endDate: fmt(endDate), rowLimit: 10 };
        const candidates = [`sc-domain:${domain}`, `https://${domain}/`, `https://www.${domain}/`];
        let lastErr = null;
        for (const siteUrl of candidates) {
            try {
                const [totals, queries, pages] = await Promise.all([
                    sc.searchanalytics.query({ siteUrl, requestBody: { ...body, rowLimit: 1 } }, { timeout: 8000 }),
                    sc.searchanalytics.query({ siteUrl, requestBody: { ...body, dimensions: ['query'] } }, { timeout: 8000 }),
                    sc.searchanalytics.query({ siteUrl, requestBody: { ...body, dimensions: ['page'] } }, { timeout: 8000 })
                ]);
                const t = totals.data.rows?.[0] || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
                const row = (r) => ({ label: r.keys[0], clicks: r.clicks, impressions: r.impressions, ctr: Math.round(r.ctr * 1000) / 10, position: Math.round(r.position * 10) / 10 });
                return {
                    available: true,
                    property: siteUrl,
                    range: { start: body.startDate, end: body.endDate },
                    totals: { clicks: t.clicks, impressions: t.impressions, ctr: Math.round(t.ctr * 1000) / 10, position: Math.round(t.position * 10) / 10 },
                    topQueries: (queries.data.rows || []).map(row),
                    topPages: (pages.data.rows || []).map(row)
                };
            } catch (e) {
                lastErr = e;
            }
        }
        throw lastErr || new Error('Mülk bulunamadı');
    } catch (e) {
        const msg = String(e?.message || e).slice(0, 220);
        return { available: false, reason: msg, setup };
    }
}

router.get('/seo', async (req, res) => {
    try {
        const site = req.site;
        const period = resolvePeriod(req.query);
        if (!period) {
            return res.status(400).json({ success: false, message: 'Geçersiz dönem. period=today|week|month|last_month|year veya custom&from=YYYY-MM-DD&to=YYYY-MM-DD' });
        }
        const { start, end, prevStart, prevEnd } = period;
        const g = GRANULARITY[period.granularity];
        const inPeriod = { createdAt: { $gte: start, $lt: end } };
        const inPrev = { createdAt: { $gte: prevStart, $lt: prevEnd } };

        const [[visitFacet], prevSessions, prevBounced, referrerRows, keywords, links, searchConsole, firstSession] = await Promise.all([
            Session.aggregate([
                { $match: sessionMatch(site, inPeriod) },
                {
                    $facet: {
                        totals: [
                            {
                                $group: {
                                    _id: null,
                                    sessions: { $sum: 1 },
                                    bounced: { $sum: { $cond: [{ $lte: [{ $ifNull: ['$activity.pageViews', 0] }, 1] }, 1, 0] } },
                                    pageViews: { $sum: { $ifNull: ['$activity.pageViews', 0] } },
                                    engaged: { $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: { $ifNull: ['$activity.actions', []] }, as: 'a', cond: { $in: ['$$a.type', ['cart_add', 'conversion']] } } } }, 0] }, 1, 0] } },
                                    returning: { $sum: { $cond: [{ $ne: ['$userId', null] }, 1, 0] } }
                                }
                            }
                        ],
                        series: [
                            { $group: { _id: { $dateToString: { format: g.format, date: '$createdAt', timezone: TZ } }, count: { $sum: 1 } } }
                        ],
                        devices: [{ $group: { _id: '$metadata.device', count: { $sum: 1 } } }, { $sort: { count: -1 } }]
                    }
                }
            ]),
            Session.countDocuments(sessionMatch(site, inPrev)),
            Session.countDocuments(sessionMatch(site, { ...inPrev, 'activity.pageViews': { $lte: 1 } })),
            Session.aggregate([
                { $match: sessionMatch(site, inPeriod) },
                { $group: { _id: { $ifNull: ['$metadata.referrer', ''] }, count: { $sum: 1 } } },
                { $sort: { count: -1 } }, { $limit: 400 }
            ]),
            keywordStats(site),
            scanSiteLinks(site),
            searchConsoleStats(site, start, end),
            Session.findOne({ site }).sort({ createdAt: 1 }).select('createdAt').lean()
        ]);

        const totals = visitFacet.totals[0] || { sessions: 0, bounced: 0, pageViews: 0, engaged: 0, returning: 0 };

        const referrers = {}; const landings = {};
        for (const r of referrerRows) {
            const raw = String(r._id || '');
            if (!raw) { referrers['Doğrudan / Yer imi'] = (referrers['Doğrudan / Yer imi'] || 0) + r.count; continue; }
            let host = ''; let pathName = '';
            try { const u = new URL(raw); host = u.hostname.toLowerCase(); pathName = u.pathname || '/'; } catch (e) { continue; }
            if (OWN_HOSTS.has(host)) {
                landings[pathName] = (landings[pathName] || 0) + r.count;
                referrers['Doğrudan / Yer imi'] = (referrers['Doğrudan / Yer imi'] || 0) + r.count;
            } else {
                referrers[host] = (referrers[host] || 0) + r.count;
            }
        }
        const toRows = (obj, limit = 10) => Object.entries(obj).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, limit);

        res.json({
            success: true,
            data: {
                period: { key: period.key, label: period.label, start, end, granularity: period.granularity, sessionsSince: firstSession?.createdAt || null },
                visitors: {
                    sessions: totals.sessions,
                    sessionsTrend: pctChange(totals.sessions, prevSessions),
                    bounced: totals.bounced,
                    bounceRate: totals.sessions ? Math.round((totals.bounced / totals.sessions) * 1000) / 10 : 0,
                    bounceRatePrev: prevSessions ? Math.round((prevBounced / prevSessions) * 1000) / 10 : 0,
                    exited: totals.sessions,
                    avgPageViews: totals.sessions ? Math.round((totals.pageViews / totals.sessions) * 10) / 10 : 0,
                    engaged: totals.engaged,
                    series: fillSeries(visitFacet.series, period, 'count'),
                    byDevice: visitFacet.devices.map(d => ({ label: DEVICE_LABELS[d._id] || 'Bilinmiyor', count: d.count })),
                    landingPages: toRows(landings),
                    sources: toRows(referrers)
                },
                keywords,
                links,
                searchConsole
            }
        });
    } catch (err) {
        console.error('Analytics seo hatası:', err);
        res.status(500).json({ success: false, message: 'SEO analiz verileri yüklenemedi' });
    }
});

module.exports = router;
