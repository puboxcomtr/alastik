/**
 * DIA sipariş aktarımı otomatik tekrar denemesi — API sürecinde node-cron ile çalışır (interCompanyRetry kalıbı).
 * Sipariş anında DIA geç cevap verir (zaman aşımı) ya da oturum düşerse aktarım "başarısız"/"beklemede" kalır ve
 * sipariş gözden kaçar. Bu zamanlayıcı DIA'da olması gereken siparişleri (kartla ödenmiş; b2b'de ayrıca Cari/Havale) tarar:
 *  - Önce DIA'da fiş numarasıyla aranır (iki kez, ayrı oturumla — DIA zaman zaman boş liste döner). Varsa kayıt
 *    düzeltilir; zaman aşımında DIA siparişi yine de kaydetmiş olabilir, körlemesine göndermek mükerrer açar.
 *  - Yoksa syncOrderToDia ile yeniden gönderilir (o da göndermeden önce ayrıca kontrol eder).
 *  - RETRY_WINDOW_MS içinde aktarılamayan ya da kalıcı hata (ör. kart eşleşmedi) alan sipariş için sitenin
 *    sipariş yönetici adresine (panel: site ayarları → sipariş maili) tek seferlik uyarı maili gider.
 * PM2 cluster'da yalnız 0 numaralı örnek çalıştırır; DIA_TRANSFER_RETRY=false ile kapatılır.
 */
const cron = require('node-cron');
const WebOrder = require('../../../models/web/order/WebOrder');
const { SITES } = require('../../../config/sites');

const TIMEZONE = 'Europe/Istanbul';
// Her 5 dakikada bir tarama
const SCAN_CRON = '*/5 * * * *';
// Sipariş (ödemeli siparişte ödeme) bu süreden yeni ise ilk aktarım sürüyor olabilir — dokunulmaz
const FIRST_RETRY_DELAY_MS = 3 * 60 * 1000;
// Bu süre boyunca tekrar denenir; sonra uyarı maili gönderilir
const RETRY_WINDOW_MS = 60 * 60 * 1000;
// Bu süreden eski siparişlere bakılmaz (geçmişteki kayıtlar muhasebece elle işlenmiş olabilir)
const SCAN_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
// Tekrar denemeyle düzelmeyen hatalar (veri sorunu): denenmez, hemen uyarılır
const PERMANENT_ERROR_PATTERNS = ['eşleştirilemedi'];
// Fiş numarası aramasının ikinci denemesinden önceki bekleme
const EXISTS_RECHECK_DELAY_MS = 2000;
// Ödeme alınınca bile DIA'ya ELLE aktarılan yöntemler (havale, kapıda ödeme) — sitenin
// diaTransferUnpaidPaymentMethods listesinde (b2b) değillerse otomatik aktarılmaz
const MANUAL_TRANSFER_PAYMENT_METHODS = ['bank_transfer', 'cash_on_delivery'];
// Bekleme durumundaki siparişler (iptal, iade, ödeme yok) — DIA'da olmaları beklenmez
const EXCLUDED_ORDER_STATUSES = ['cancelled', 'returned', 'payment_failed', 'awaiting_payment'];

const isPrimaryInstance = () => !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';
const sleep = ms => new Promise(r => setTimeout(r, ms));

let running = false;

/** DIA'da olması gereken siparişler: ödenmiş ya da sitenin ödeme beklemeden aktardığı yöntemle verilmiş */
function eligibilityFilter() {
    const unpaidRules = Object.values(SITES)
        .filter(s => Array.isArray(s.diaTransferUnpaidPaymentMethods) && s.diaTransferUnpaidPaymentMethods.length)
        .map(s => ({ site: s.slug, 'payment.method': { $in: s.diaTransferUnpaidPaymentMethods } }));
    return { $or: [{ 'payment.status': 'paid', 'payment.method': { $nin: MANUAL_TRANSFER_PAYMENT_METHODS } }, ...unpaidRules] };
}

const lastError = order => String((order.diaIntegration?.syncErrors || []).slice(-1)[0] || '');
const isPermanentError = order => PERMANENT_ERROR_PATTERNS.some(p => lastError(order).includes(p));
const referenceTime = order => new Date(order.payment?.paidAt || order.createdAt).getTime();

/** Fiş numarasıyla DIA'da arar; boş dönerse yeni oturumla bir kez daha bakar. Bulunursa DIA anahtarı döner. */
async function findInDia(order) {
    const { DiaOrderService } = require('./DiaOrderService');
    const run = async () => {
        for (let attempt = 0; attempt < 2; attempt++) {
            const service = new DiaOrderService(order.site);
            await service.init();
            await service.login();
            const existing = await service.checkOrderExists(order.orderNumber);
            if (existing.exists) return existing.diaKey;
            if (attempt === 0) await sleep(EXISTS_RECHECK_DELAY_MS);
        }
        return null;
    };
    if (order.site === 'b2b') {
        const { withDiaLock, B2B_LOCK_KEY } = require('./diaLock');
        return withDiaLock(run, { label: 'b2b-order-transfer-check', key: B2B_LOCK_KEY, waitMs: 180000 });
    }
    return run();
}

async function markSynced(order, diaKey) {
    await WebOrder.updateOne({ _id: order._id }, {
        $set: { 'diaIntegration.status': 'synced', 'diaIntegration.diaOrderKey': String(diaKey), 'diaIntegration.syncedAt': new Date() },
        $push: { 'diaIntegration.syncErrors': `${new Date().toISOString()} — Otomatik kontrol: sipariş DIA'da mevcut (key ${diaKey}), kayıt düzeltildi` }
    });
}

/** Sitenin sipariş yönetici adresine aktarılamayan siparişlerin listesini gönderir */
async function sendAlert(site, orders) {
    const { getAdminMailAddress } = require('../mail/mailOrchestrator');
    const { sendMail } = require('../../web/mail/MailService');
    const to = await getAdminMailAddress('order', site);
    if (!to) {
        console.warn('[DiaTransferRetry] Uyarı maili için sipariş yönetici adresi tanımlı değil', { site });
        return false;
    }
    const tr = d => new Date(d).toLocaleString('tr-TR', { timeZone: TIMEZONE, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    const esc = v => String(v ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const rows = orders.map(o => `<tr><td>${esc(o.orderNumber)}</td><td>${tr(o.createdAt)}</td><td>${esc(o.customerName || o.billingSnapshot?.companyName || '')}</td>`
        + `<td style="text-align:right">${Number(o.pricing?.total || 0).toLocaleString('tr-TR', { minimumFractionDigits: 2 })} TL</td><td>${esc(lastError(o).replace(/^\S+ — /, '').slice(0, 180))}</td></tr>`).join('');
    const siteName = SITES[site]?.name || site;
    await sendMail({
        to,
        site,
        subject: `[DIA] ${siteName}: ${orders.length} sipariş DIA'ya aktarılamadı`,
        html: `<p>Aşağıdaki ${siteName} siparişleri otomatik denemelere rağmen DIA'ya aktarılamadı. Lütfen panelden kontrol edip elle aktarın.</p>`
            + '<table border="1" cellpadding="6" cellspacing="0" style="border-collapse:collapse;font-family:Arial,sans-serif;font-size:13px">'
            + '<tr><th>Sipariş</th><th>Tarih</th><th>Müşteri</th><th>Tutar</th><th>Son hata</th></tr>' + rows + '</table>'
    });
    return true;
}

async function retryFailedTransfers() {
    if (running) return;
    running = true;
    try {
        const now = Date.now();
        const candidates = await WebOrder.find({
            'diaIntegration.status': { $in: ['failed', 'pending'] },
            'diaIntegration.transferAlertSentAt': { $exists: false },
            status: { $nin: EXCLUDED_ORDER_STATUSES },
            createdAt: { $gte: new Date(now - SCAN_WINDOW_MS) },
            ...eligibilityFilter()
        }).lean();

        const alerts = {};
        const { syncOrderToDia } = require('./DiaOrderService');
        for (const order of candidates) {
            const age = now - referenceTime(order);
            if (age < FIRST_RETRY_DELAY_MS) continue;
            try {
                const diaKey = await findInDia(order);
                if (diaKey) {
                    await markSynced(order, diaKey);
                    console.log('[DiaTransferRetry] Sipariş DIA\'da mevcut, kayıt düzeltildi', { orderNumber: order.orderNumber, diaKey });
                    continue;
                }
                if (isPermanentError(order) || age > RETRY_WINDOW_MS) {
                    (alerts[order.site] = alerts[order.site] || []).push(order);
                    continue;
                }
                await WebOrder.updateOne({ _id: order._id }, {
                    $inc: { 'diaIntegration.transferRetryCount': 1 },
                    $set: { 'diaIntegration.transferRetriedAt': new Date() }
                });
                const fresh = await WebOrder.findById(order._id).lean();
                const result = await syncOrderToDia(fresh);
                console.log('[DiaTransferRetry] Aktarım tekrar denendi', { orderNumber: order.orderNumber, success: result?.success, message: result?.message });
            } catch (error) {
                console.error('[DiaTransferRetry] Tekrar deneme hatası', { orderNumber: order.orderNumber, error: error.message });
            }
        }

        for (const [site, orders] of Object.entries(alerts)) {
            try {
                if (await sendAlert(site, orders)) {
                    await WebOrder.updateMany({ _id: { $in: orders.map(o => o._id) } }, { $set: { 'diaIntegration.transferAlertSentAt': new Date() } });
                    console.log('[DiaTransferRetry] Aktarılamayan siparişler için uyarı maili gönderildi', { site, orders: orders.map(o => o.orderNumber) });
                }
            } catch (error) {
                console.error('[DiaTransferRetry] Uyarı maili gönderilemedi', { site, error: error.message });
            }
        }
    } catch (error) {
        console.error('[DiaTransferRetry] Tarama hatası', { error: error.message });
    } finally {
        running = false;
    }
}

function start() {
    if (process.env.DIA_TRANSFER_RETRY === 'false' || !isPrimaryInstance()) return;
    cron.schedule(SCAN_CRON, retryFailedTransfers, { timezone: TIMEZONE });
    console.log('[DiaTransferRetry] DIA sipariş aktarımı tekrar deneme zamanlayıcısı başlatıldı');
}

module.exports = { start, retryFailedTransfers };
