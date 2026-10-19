const mongoose = require('mongoose');
const WebOrder = require('../../../models/web/order/WebOrder');
const { overdueBlocked } = require('./financialDiscounts');

const CREDIT_PAYMENT_METHOD = 'cari';
const PENDING_ORDER_STATUSES = ['pending', 'confirmed', 'processing'];
const CREDIT_CLOSED_REASONS = { NO_LIMIT: 'no_limit', EXCEEDED: 'exceeded', OVERDUE: 'overdue' };

async function pendingOrderKurusOf(site, memberId) {
    const rows = await WebOrder.aggregate([
        { $match: { site, memberId: new mongoose.Types.ObjectId(String(memberId)), isActive: true, status: { $in: PENDING_ORDER_STATUSES } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]);
    return Math.round((rows[0]?.total || 0) * 100);
}

async function getCreditStatus(site, member) {
    const totalLimitKurus = Math.round(Number(member?.diaCari?.riskLimitiKurus) || 0);
    const balanceKurus = Math.round(Number(member?.diaCari?.bakiyeKurus) || 0);
    const pendingOrderKurus = member?._id ? await pendingOrderKurusOf(site, member._id) : 0;
    const remainingLimitKurus = totalLimitKurus - balanceKurus - pendingOrderKurus;
    const hasLimit = totalLimitKurus > 0;
    const exceeded = hasLimit && remainingLimitKurus <= 0;
    const overdue = await overdueBlocked(site, member);
    const reason = !hasLimit ? CREDIT_CLOSED_REASONS.NO_LIMIT
        : exceeded ? CREDIT_CLOSED_REASONS.EXCEEDED
            : overdue ? CREDIT_CLOSED_REASONS.OVERDUE : null;
    const orderingClosedReason = reason;
    return {
        hasLimit, totalLimitKurus, balanceKurus, pendingOrderKurus, remainingLimitKurus, exceeded, closed: reason !== null, reason,
        orderingClosed: orderingClosedReason !== null, orderingClosedReason,
        cartClosed: overdue
    };
}

const CREDIT_CLOSED_MESSAGES = {
    [CREDIT_CLOSED_REASONS.NO_LIMIT]: 'Cari limitiniz tanımlı olmadığı için Cari Sipariş verilemez. Kredi kartı veya havale ile ödeme yapabilirsiniz.',
    [CREDIT_CLOSED_REASONS.EXCEEDED]: 'Cari limitiniz aşıldığı için Cari Sipariş verilemez. Kredi kartı veya havale ile ödeme yapabilirsiniz.',
    [CREDIT_CLOSED_REASONS.OVERDUE]: 'Vadesi geçmiş borcunuz bulunduğu için Cari Sipariş verilemez.'
};

const ORDERING_CLOSED_MESSAGES = {
    [CREDIT_CLOSED_REASONS.NO_LIMIT]: 'Cari limitiniz tanımlı olmadığı için sipariş veremezsiniz. Limit tanımı için satış temsilcinizle iletişime geçin.',
    [CREDIT_CLOSED_REASONS.EXCEEDED]: 'Cari limitiniz dolduğu için sipariş veremezsiniz. Ödeme yaparak limitinizi açabilirsiniz.',
    [CREDIT_CLOSED_REASONS.OVERDUE]: 'Vadesi geçmiş borcunuz bulunduğu için sipariş veremezsiniz. Borcunuzu ödedikten sonra alışverişe devam edebilirsiniz.'
};

const CART_CLOSED_MESSAGE = 'Vadesi geçmiş borcunuz bulunduğu için sepete ürün ekleyemez ve sipariş veremezsiniz. Borcunuzu ödedikten sonra alışverişe devam edebilirsiniz.';

const CREDIT_LIMIT_INSUFFICIENT_MESSAGE = 'Sipariş tutarı kalan cari limitinizi aşıyor. Sepet tutarını azaltın ya da ödeme yaparak limitinizi açın.';

module.exports = { CREDIT_PAYMENT_METHOD, PENDING_ORDER_STATUSES, CREDIT_CLOSED_REASONS, CREDIT_CLOSED_MESSAGES, ORDERING_CLOSED_MESSAGES, CART_CLOSED_MESSAGE, CREDIT_LIMIT_INSUFFICIENT_MESSAGE, pendingOrderKurusOf, getCreditStatus };
