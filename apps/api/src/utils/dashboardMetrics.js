const TZ = 'Europe/Istanbul';

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

const ORDER_ACTIVITY_GROUPS = {
    awaitingApproval: ['pending'],
    preparing: ['confirmed', 'processing'],
    shipped: ['shipped'],
    completed: ['delivered']
};

const DEVICE_LABELS = {
    desktop: 'Masaüstü',
    mobile: 'Mobil',
    tablet: 'Tablet'
};

const pctChange = (current, previous) => {
    if (!previous) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
};

const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

const dayKey = (date) => date.toLocaleDateString('sv-SE', { timeZone: TZ });

module.exports = {
    TZ,
    PAYMENT_METHOD_LABELS,
    REVENUE_METHODS,
    revenueMatch,
    ORDER_ACTIVITY_GROUPS,
    DEVICE_LABELS,
    pctChange,
    daysAgo,
    minutesAgo,
    round2,
    dayKey
};
