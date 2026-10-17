/**
 * Cari limiti — carinin DIA risk limitine (Toplam Limit) göre vadeli (Cari Sipariş) alım hakkı.
 *
 * Kalan limit = Toplam Limit − bakiye − platformdaki bekleyen siparişler (bayi panelindeki "Kalan Limit" ile aynı hesap).
 * Vadeli alım KAPALI olan cari yeni Cari Sipariş veremez. Kapalı sayılan durumlar:
 *   • limit tanımlı değil (Toplam Limit 0)  → reason 'no_limit'
 *   • limit aşıldı (kalan limit ≤ 0)        → reason 'exceeded'
 *   • vadesi geçen borç eşiğe ulaştı        → reason 'overdue' (limit nedeni yoksa; eşik DiaSettings.b2bOverdue)
 *
 * Sipariş KAPALI (orderingClosed): limit tanımlı değilse, kalan limit bittiyse ya da vadesi geçen borç varsa cari HİÇBİR
 * ödeme yöntemiyle (kredi kartı / havale dahil) sipariş veremez.
 * Sepet KAPALI (cartClosed): vadesi geçen borcu olan cari sepete ürün de ekleyemez; borç ödeme (Ödeme Yap) açık kalır.
 * Limiti olan caride her ödeme yönteminde sipariş tutarı kalan limiti aşamaz (borç ödendikçe limit açılır).
 */
const mongoose = require('mongoose');
const WebOrder = require('../../../models/web/order/WebOrder');
const { overdueBlocked } = require('./financialDiscounts');

// Vadeli (cari hesaba borç yazan) ödeme yöntemi — diaCampaignPricing.PAYMENT_METHODS anahtarı
const CREDIT_PAYMENT_METHOD = 'cari';
// Limitten düşülen, henüz sonuçlanmamış platform siparişleri
const PENDING_ORDER_STATUSES = ['pending', 'confirmed', 'processing'];
// Vadeli alımın kapalı olma nedenleri (ön yüz uyarı metnini buna göre seçer)
const CREDIT_CLOSED_REASONS = { NO_LIMIT: 'no_limit', EXCEEDED: 'exceeded', OVERDUE: 'overdue' };

/** Carinin platformdaki bekleyen siparişlerinin toplamı (kuruş) */
async function pendingOrderKurusOf(site, memberId) {
    const rows = await WebOrder.aggregate([
        { $match: { site, memberId: new mongoose.Types.ObjectId(String(memberId)), isActive: true, status: { $in: PENDING_ORDER_STATUSES } } },
        { $group: { _id: null, total: { $sum: '$pricing.total' } } }
    ]);
    return Math.round((rows[0]?.total || 0) * 100);
}

/**
 * @param {object} member WebMember (diaCari.riskLimitiKurus, diaCari.bakiyeKurus)
 * @returns {Promise<{ hasLimit: boolean, totalLimitKurus: number, balanceKurus: number, pendingOrderKurus: number, remainingLimitKurus: number, exceeded: boolean, closed: boolean, reason: string|null, orderingClosed: boolean, orderingClosedReason: string|null, cartClosed: boolean }>}
 */
async function getCreditStatus(site, member) {
    const totalLimitKurus = Math.round(Number(member?.diaCari?.riskLimitiKurus) || 0);
    const balanceKurus = Math.round(Number(member?.diaCari?.bakiyeKurus) || 0);
    const pendingOrderKurus = member?._id ? await pendingOrderKurusOf(site, member._id) : 0;
    const remainingLimitKurus = totalLimitKurus - balanceKurus - pendingOrderKurus;
    const hasLimit = totalLimitKurus > 0;
    const exceeded = hasLimit && remainingLimitKurus <= 0;
    // Vadesi geçen borcu yaptırım eşiğine ulaşan cari sipariş veremez (limit nedeni varsa o gösterilir; borç uyarısı ayrıca çıkar)
    const overdue = await overdueBlocked(site, member);
    const reason = !hasLimit ? CREDIT_CLOSED_REASONS.NO_LIMIT
        : exceeded ? CREDIT_CLOSED_REASONS.EXCEEDED
            : overdue ? CREDIT_CLOSED_REASONS.OVERDUE : null;
    // Limit yoksa, bittiyse ya da vadesi geçen borç varsa hiçbir yöntemle sipariş verilemez (neden önceliği vadeli alımla aynı)
    const orderingClosedReason = reason;
    return {
        hasLimit, totalLimitKurus, balanceKurus, pendingOrderKurus, remainingLimitKurus, exceeded, closed: reason !== null, reason,
        orderingClosed: orderingClosedReason !== null, orderingClosedReason,
        // Vadesi geçen borçta sepete ürün eklemek de kapalıdır
        cartClosed: overdue
    };
}

/** Vadeli alımı kapalı cariye gösterilen neden metni */
const CREDIT_CLOSED_MESSAGES = {
    [CREDIT_CLOSED_REASONS.NO_LIMIT]: 'Cari limitiniz tanımlı olmadığı için Cari Sipariş verilemez. Kredi kartı veya havale ile ödeme yapabilirsiniz.',
    [CREDIT_CLOSED_REASONS.EXCEEDED]: 'Cari limitiniz aşıldığı için Cari Sipariş verilemez. Kredi kartı veya havale ile ödeme yapabilirsiniz.',
    [CREDIT_CLOSED_REASONS.OVERDUE]: 'Vadesi geçmiş borcunuz bulunduğu için Cari Sipariş verilemez.'
};

/** Sipariş tamamen kapalı olan cariye gösterilen neden metni */
const ORDERING_CLOSED_MESSAGES = {
    [CREDIT_CLOSED_REASONS.NO_LIMIT]: 'Cari limitiniz tanımlı olmadığı için sipariş veremezsiniz. Limit tanımı için satış temsilcinizle iletişime geçin.',
    [CREDIT_CLOSED_REASONS.EXCEEDED]: 'Cari limitiniz dolduğu için sipariş veremezsiniz. Ödeme yaparak limitinizi açabilirsiniz.',
    [CREDIT_CLOSED_REASONS.OVERDUE]: 'Vadesi geçmiş borcunuz bulunduğu için sipariş veremezsiniz. Borcunuzu ödedikten sonra alışverişe devam edebilirsiniz.'
};

/** Vadesi geçen borcu olan cari sepete ürün eklemeye ya da sipariş vermeye çalıştığında gösterilen uyarı */
const CART_CLOSED_MESSAGE = 'Vadesi geçmiş borcunuz bulunduğu için sepete ürün ekleyemez ve sipariş veremezsiniz. Borcunuzu ödedikten sonra alışverişe devam edebilirsiniz.';

/** Sepet tutarı kalan limiti aştığında (her ödeme yönteminde) */
const CREDIT_LIMIT_INSUFFICIENT_MESSAGE = 'Sipariş tutarı kalan cari limitinizi aşıyor. Sepet tutarını azaltın ya da ödeme yaparak limitinizi açın.';

module.exports = { CREDIT_PAYMENT_METHOD, PENDING_ORDER_STATUSES, CREDIT_CLOSED_REASONS, CREDIT_CLOSED_MESSAGES, ORDERING_CLOSED_MESSAGES, CART_CLOSED_MESSAGE, CREDIT_LIMIT_INSUFFICIENT_MESSAGE, pendingOrderKurusOf, getCreditStatus };
