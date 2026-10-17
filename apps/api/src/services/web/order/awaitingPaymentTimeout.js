/**
 * Kartlı siparişlerde ödeme zaman aşımı — API sürecinde node-cron ile çalışır (interCompanyRetry kalıbı).
 * Kartlı sipariş oluşturulunca banka dönüşüne kadar "Ödeme Bekleniyor" (awaiting_payment) durumunda bekler.
 * Müşteri 3D sayfasını yarıda bırakırsa banka dönüşü hiç gelmez; belli süre sonra sipariş "Ödeme Başarısız" yapılır.
 * Geç gelen başarılı dönüş yine işlenir: ödeme dönüşleri siparişin önceki durumuna bakmadan "Onaylandı" yapar.
 * PM2 cluster'da yalnız 0 numaralı örnek çalıştırır; AWAITING_PAYMENT_TIMEOUT=false ile kapatılır.
 */
const cron = require('node-cron');
const WebOrder = require('../../../models/web/order/WebOrder');

const TIMEZONE = 'Europe/Istanbul';
// Her 5 dakikada bir tarama
const SCAN_CRON = '*/5 * * * *';
// Banka dönüşü bu süre içinde gelmezse ödeme başarısız sayılır
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
