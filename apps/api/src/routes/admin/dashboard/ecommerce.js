const express = require('express');
const router = express.Router();
const WebOrder = require('../../../models/web/order/WebOrder');
const WebMember = require('../../../models/web/user/WebMember');
const Session = require('../../../models/Session');

const PAYMENT_METHOD_LABELS = {
    credit_card: 'Kredi Kartı',
    credit_card_3d: 'Kredi Kartı (3D Secure)',
    bank_transfer: 'Havale/EFT',
    cash_on_delivery: 'Kapıda Ödeme',
    netahsilat_installment: 'Kredi Kartı (Taksitli)'
};

const REVENUE_METHODS = ['credit_card', 'credit_card_3d', 'netahsilat_installment', 'bank_transfer'];

const revenueMatch = {
    'payment.status': 'paid',
    'payment.method': { $in: REVENUE_METHODS },
    status: { $ne: 'pending' }
};

const DEVICE_LABELS = {
    desktop: { title: 'Masaüstü', color: 'primary' },
    mobile: { title: 'Mobil', color: 'success' },
    tablet: { title: 'Tablet', color: 'warning' }
};

const pctChange = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
};

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);

router.get('/ecommerce', async (req, res) => {
    try {
        const site = req.site;
        const now = new Date();
        const startOfToday = new Date(new Date().setHours(0, 0, 0, 0));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const d14 = daysAgo(13);
        const d28 = daysAgo(28);
        const d30 = daysAgo(30);
        const d60 = daysAgo(60);

        const [orderStats] = await WebOrder.aggregate([
            { $match: { site, isActive: true } },
            {
                $facet: {
                    sales30: [
                        { $match: { ...revenueMatch, createdAt: { $gte: d30 } } },
                        { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } }
                    ],
                    salesPrev30: [
                        { $match: { ...revenueMatch, createdAt: { $gte: d60, $lt: d30 } } },
                        { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } }
                    ],
                    pendingCount: [
                        { $match: { status: 'pending', 'payment.status': 'paid' } },
                        { $count: 'count' }
                    ],
                    monthPaid: [
                        { $match: { ...revenueMatch, createdAt: { $gte: startOfMonth } } },
                        { $group: { _id: null, total: { $sum: '$pricing.total' }, count: { $sum: 1 } } }
                    ],
                    monthCancelled: [
                        { $match: { status: 'cancelled', createdAt: { $gte: startOfMonth } } },
                        { $count: 'count' }
                    ],
                    todayPaid: [
                        { $match: { ...revenueMatch, createdAt: { $gte: startOfToday } } },
                        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
                    ],
                    daily14: [
                        { $match: { ...revenueMatch, createdAt: { $gte: d14 } } },
                        {
                            $group: {
                                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Istanbul' } },
                                total: { $sum: '$pricing.total' }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    byMethod28: [
                        { $match: { ...revenueMatch, createdAt: { $gte: d28 } } },
                        {
                            $group: {
                                _id: { method: '$payment.method', bank: '$payment.bankTransfer.bankName' },
                                total: { $sum: '$pricing.total' }
                            }
                        },
                        { $sort: { total: -1 } }
                    ],
                    recentOrders: [
                        { $match: { 'payment.status': 'paid' } },
                        { $sort: { createdAt: -1 } },
                        { $limit: 8 },
                        {
                            $project: {
                                orderNumber: 1,
                                createdAt: 1,
                                customerEmail: 1,
                                isGuest: 1,
                                memberSnapshot: 1,
                                billingSnapshot: 1,
                                guestBillingAddress: 1,
                                'payment.method': 1,
                                'pricing.total': 1
                            }
                        }
                    ]
                }
            }
        ]);

        const sales30 = orderStats.sales30[0] || { total: 0, count: 0 };
        const salesPrev30 = orderStats.salesPrev30[0] || { total: 0, count: 0 };
        const monthPaid = orderStats.monthPaid[0] || { total: 0, count: 0 };

        const [newMembers, prevMembers] = await Promise.all([
            WebMember.countDocuments({ site, createdAt: { $gte: d30 } }),
            WebMember.countDocuments({ site, createdAt: { $gte: d60, $lt: d30 } })
        ]);

        const [visitStats] = await Session.aggregate([
            { $match: { site, createdAt: { $gte: d28 } } },
            {
                $facet: {
                    total: [{ $count: 'count' }],
                    daily8: [
                        { $match: { createdAt: { $gte: daysAgo(7) } } },
                        {
                            $group: {
                                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt', timezone: 'Europe/Istanbul' } },
                                count: { $sum: 1 }
                            }
                        },
                        { $sort: { _id: 1 } }
                    ],
                    byDevice: [
                        { $group: { _id: '$metadata.device', count: { $sum: 1 } } },
                        { $sort: { count: -1 } }
                    ]
                }
            }
        ]);

        const totalVisits = visitStats.total[0]?.count || 0;
        const deviceRows = (visitStats.byDevice || []).map(d => {
            const meta = DEVICE_LABELS[d._id] || { title: d._id || 'Bilinmiyor', color: 'error' };
            return {
                title: meta.title,
                color: meta.color,
                count: d.count,
                share: totalVisits ? Math.round((d.count / totalVisits) * 100) : 0
            };
        });

        const dailyMap = Object.fromEntries(orderStats.daily14.map(d => [d._id, d.total]));
        const dailySeries = [];
        for (let i = 13; i >= 0; i--) {
            const date = daysAgo(i);
            const key = date.toLocaleDateString('sv-SE', { timeZone: 'Europe/Istanbul' });
            dailySeries.push({
                date: key,
                label: date.toLocaleDateString('tr-TR', { weekday: 'short', timeZone: 'Europe/Istanbul' }),
                total: Math.round((dailyMap[key] || 0) * 100) / 100
            });
        }

        const paymentMethods = orderStats.byMethod28.map(m => {
            let title = PAYMENT_METHOD_LABELS[m._id.method] || m._id.method || 'Diğer';
            if (m._id.method === 'bank_transfer' && m._id.bank) {
                title = `Havale - ${m._id.bank}`;
            }
            return { title, amount: Math.round(m.total * 100) / 100 };
        });

        const recentOrders = orderStats.recentOrders.map(o => {
            const billing = o.billingSnapshot || o.guestBillingAddress || {};
            const member = o.memberSnapshot || {};
            const name = `${member.firstName || ''} ${member.lastName || ''}`.trim()
                || billing.fullName
                || billing.companyName
                || 'Müşteri';
            return {
                id: String(o._id),
                orderNumber: o.orderNumber,
                issuedDate: o.createdAt,
                name,
                contact: member.email || billing.email || o.customerEmail || '',
                total: Math.round((o.pricing?.total || 0) * 100) / 100,
                paymentMethod: PAYMENT_METHOD_LABELS[o.payment?.method] || o.payment?.method || '-'
            };
        });

        res.json({
            success: true,
            data: {
                cards: {
                    totalSales: {
                        value: Math.round(sales30.total * 100) / 100,
                        trend: pctChange(sales30.total, salesPrev30.total)
                    },
                    totalOrders: {
                        value: sales30.count,
                        trend: pctChange(sales30.count, salesPrev30.count)
                    },
                    pendingOrders: {
                        value: orderStats.pendingCount[0]?.count || 0
                    },
                    newMembers: {
                        value: newMembers,
                        trend: pctChange(newMembers, prevMembers)
                    }
                },
                profit: {
                    dailySeries,
                    monthTotal: Math.round(monthPaid.total * 100) / 100,
                    confirmedCount: monthPaid.count,
                    cancelledCount: orderStats.monthCancelled[0]?.count || 0,
                    todayTotal: Math.round((orderStats.todayPaid[0]?.total || 0) * 100) / 100
                },
                paymentMethods,
                visits: {
                    total: totalVisits,
                    daily: visitStats.daily8.map(d => d.count),
                    devices: deviceRows
                },
                recentOrders
            }
        });
    } catch (err) {
        console.error('Dashboard ecommerce hatası:', err);
        res.status(500).json({ success: false, message: 'Pano verileri yüklenemedi' });
    }
});

module.exports = router;
