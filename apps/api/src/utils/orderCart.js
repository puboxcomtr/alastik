const WebCart = require('../models/web/cart/WebCart');
const { shouldClearCartOnPaymentResult } = require('../config/sites');

async function clearOrderCart(order, reason = '') {
    try {
        if (!order || !shouldClearCartOnPaymentResult(order.site)) return 0;
        const conditions = [];
        if (order.cartSessionId) conditions.push({ sessionId: order.cartSessionId });
        if (order.memberId) conditions.push({ userId: order.memberId });
        if (!conditions.length) return 0;
        const result = await WebCart.deleteMany({ $or: conditions });
        if (result.deletedCount) {
            console.log(`[orderCart] ${order.orderNumber} (${reason}): ${result.deletedCount} sepet silindi`);
        }
        return result.deletedCount || 0;
    } catch (error) {
        console.error(`[orderCart] ${order?.orderNumber} (${reason}) sepet silinemedi:`, error.message);
        return 0;
    }
}

module.exports = { clearOrderCart };
