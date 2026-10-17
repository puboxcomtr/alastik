/**
 * Sipariş → sepet temizliği.
 *
 * Sepeti eskiden yalnız müşterinin tarayıcısı siliyordu; kartlı ödemede bankadan dönüşte bu adım
 * çalışmadığı için sipariş vermiş müşteri panelde "aktif sepet" olarak kalıyordu. Artık ödeme sonucu
 * (başarılı ya da başarısız) kesinleştiği anda sepet sunucuda silinir — vitrin sepeti de panel listesi de boşalır.
 * Site tanımında clearCartOnPaymentResult açık değilse hiçbir şey yapmaz.
 */
const WebCart = require('../models/web/cart/WebCart');
const { shouldClearCartOnPaymentResult } = require('../config/sites');

/**
 * Siparişin geldiği sepeti (oturum) ve üyenin diğer sepetlerini siler. Hata fırlatmaz:
 * sepet silinemese de ödeme akışı etkilenmemelidir.
 * @param {object} order WebOrder (site, cartSessionId, memberId, orderNumber)
 * @param {string} reason log etiketi (ör. 'nkolay-success')
 * @returns {Promise<number>} silinen sepet sayısı
 */
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
