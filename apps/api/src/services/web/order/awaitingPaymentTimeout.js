const cron = require('node-cron');
const WebOrder = require('../../../models/web/order/WebOrder');

const TIMEZONE = 'Europe/Istanbul';
const SCAN_CRON = '*/5 * * * *';
const TIMEOUT_MS = 30 * 60 * 1000;

const isPrimaryInstance = () => !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

let running = false;

async function expireAwaitingPayments() {
    if (running) return;
    running = true;
    try {
        const result = await WebOrder.updateMany(
            {
                status: 'awaiting_payment',
                'payment.status': 'pending',
                createdAt: { $lte: new Date(Date.now() - TIMEOUT_MS) }
            },
            { $set: { status: 'payment_failed' } }
        );
        if (result.modifiedCount) {
            console.log('[AwaitingPaymentTimeout] Banka dönüşü gelmeyen siparişler "Ödeme Başarısız" yapıldı', { count: result.modifiedCount });
        }
    } catch (error) {
        console.error('[AwaitingPaymentTimeout] Tarama hatası', { error: error.message });
    } finally {
        running = false;
    }
}

function start() {
    if (process.env.AWAITING_PAYMENT_TIMEOUT === 'false' || !isPrimaryInstance()) return;
    cron.schedule(SCAN_CRON, expireAwaitingPayments, { timezone: TIMEZONE });
    console.log('[AwaitingPaymentTimeout] Ödeme zaman aşımı zamanlayıcısı başlatıldı');
}

module.exports = { start, expireAwaitingPayments };
