/**
 * b2b bayi mailleri — panelde düzenlenebilen mail şablonlarıyla (site: b2b) gönderilir.
 *
 *  • Sipariş maili (siparis_sablonu): Cari Sipariş / havale siparişi oluşunca; kredi kartı siparişinde
 *    ödeme çekildikten sonra ve Ödeme Makbuzu (PDF) ekiyle.
 *  • Borç ödemesi maili (b2b_odeme_makbuzu): "Ödeme Yap" ile kart tahsilatı başarılı olunca, makbuz PDF ekiyle.
 *
 * Alıcı: ödemeyi / siparişi yapan carinin e-postası; yönetici kopyası site e-posta ayarlarından.
 * Mail hatası sipariş ya da ödeme akışını hiçbir zaman bozmaz; gönderilen kayıt mailSent ile işaretlenir.
 */
const WebOrder = require('../../../models/web/order/WebOrder');
const WebMember = require('../../../models/web/user/WebMember');
const B2bPayment = require('../../../models/web/user/B2bPayment');
const WebSettings = require('../../../models/web/settings/WebSettings');
const { sendTemplateMail } = require('../../plugins/mail/mailOrchestrator');
const { makbuzPdf, tahsilatMakbuzPdf } = require('./makbuzPdf');

const ORDER_TEMPLATE = 'siparis_sablonu';
const PAYMENT_RECEIPT_TEMPLATE = 'b2b_odeme_makbuzu';
const PDF_TYPE = 'application/pdf';

async function companyOf(site) {
    try {
        return (await WebSettings.getSettings(site))?.companyInfo || {};
    } catch (_) {
        return {};
    }
}

async function memberOf(memberId) {
    return memberId ? WebMember.findById(memberId).select('email firstName lastName diaCustomerCode').lean() : null;
}

/**
 * Sipariş maili. withReceipt: ödeme çekildi — makbuz PDF eklenir.
 * @param {string} orderId
 */
async function sendOrderMail(orderId, { withReceipt = false } = {}) {
    const order = await WebOrder.findById(orderId).lean();
    if (!order || order.payment?.mailSent) return;
    const member = await memberOf(order.memberId);
    const attachments = withReceipt
        ? [{ filename: `Odeme-Makbuzu-${order.orderNumber}.pdf`, content: await makbuzPdf(order, await companyOf(order.site)), contentType: PDF_TYPE }]
        : undefined;
    const result = await sendTemplateMail({
        templateKey: ORDER_TEMPLATE,
        context: { orderId: String(order._id) },
        to: member?.email,
        alsoSendToAdmin: true,
        adminPurpose: 'order',
        site: order.site,
        attachments
    });
    if (result.success) await WebOrder.updateOne({ _id: order._id }, { $set: { 'payment.mailSent': true } });
    console.log('[b2b-mail] Sipariş maili:', order.orderNumber, { bayi: result.customerSent, yonetici: result.adminSent, makbuz: withReceipt, hata: result.errors });
}

/** "Ödeme Yap" borç ödemesi makbuz maili. */
async function sendPaymentReceiptMail(paymentId) {
    const payment = await B2bPayment.findById(paymentId).lean();
    if (!payment || payment.status !== 'paid' || payment.mailSent) return;
    const member = await memberOf(payment.memberId);
    const payer = {
        name: `${member?.firstName || ''} ${member?.lastName || ''}`.replace(/ \.$/, '').trim(),
        cariKodu: payment.cariKodu || member?.diaCustomerCode || ''
    };
    const pdf = await tahsilatMakbuzPdf(payment, payer, await companyOf(payment.site));
    const result = await sendTemplateMail({
        templateKey: PAYMENT_RECEIPT_TEMPLATE,
        context: { paymentId: String(payment._id) },
        to: member?.email,
        alsoSendToAdmin: true,
        adminPurpose: 'payment',
        site: payment.site,
        attachments: [{ filename: `Odeme-Makbuzu-${payment.reference}.pdf`, content: pdf, contentType: PDF_TYPE }]
    });
    if (result.success) await B2bPayment.updateOne({ _id: payment._id }, { $set: { mailSent: true } });
    console.log('[b2b-mail] Ödeme makbuzu maili:', payment.reference, { bayi: result.customerSent, yonetici: result.adminSent, hata: result.errors });
}

/** Akışı bekletmeden gönderir; hata yalnız loglanır. */
function fireAndForget(promise, label) {
    Promise.resolve(promise).catch(err => console.error(`[b2b-mail] ${label} hatası:`, err.message));
}

module.exports = {
    queueOrderMail: (orderId, opts) => fireAndForget(sendOrderMail(orderId, opts), 'Sipariş maili'),
    queuePaymentReceiptMail: (paymentId) => fireAndForget(sendPaymentReceiptMail(paymentId), 'Ödeme makbuzu maili'),
    sendOrderMail,
    sendPaymentReceiptMail
};
