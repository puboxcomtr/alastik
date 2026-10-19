const cron = require('node-cron');
const WebOrder = require('../../../models/web/order/WebOrder');

const TIMEZONE = 'Europe/Istanbul';
const SCAN_CRON = '*/5 * * * *';
const RETRY_DELAY_MS = 5 * 60 * 1000;
const RETRY_WINDOW_MS = 6 * 60 * 60 * 1000;
const MAX_RETRIES = 1;
const CHAIN_ERROR_PATTERN = 'Şirketler arası';

const isPrimaryInstance = () => !process.env.NODE_APP_INSTANCE || process.env.NODE_APP_INSTANCE === '0';

let running = false;

async function retryIncompleteChains() {
    if (running) return;
    running = true;
    try {
        const now = Date.now();
        const candidates = await WebOrder.find({
            'diaIntegration.status': 'synced',
            'diaIntegration.syncErrors': { $elemMatch: { $regex: CHAIN_ERROR_PATTERN } },
            $or: [
                { 'diaIntegration.diaOutgoingDispatchKey': { $in: [null, ''] } },
                { 'diaIntegration.diaIncomingDispatchKey': { $in: [null, ''] } }
            ],
            'diaIntegration.chainRetryCount': { $not: { $gte: MAX_RETRIES } },
            status: { $nin: ['cancelled', 'returned'] },
            createdAt: { $gte: new Date(now - RETRY_WINDOW_MS), $lte: new Date(now - RETRY_DELAY_MS) }
        }).select('_id orderNumber').lean();

        if (!candidates.length) return;
        const { syncOrderToDia } = require('./DiaOrderService');
        for (const candidate of candidates) {
            const claimed = await WebOrder.findOneAndUpdate(
                { _id: candidate._id, 'diaIntegration.chainRetryCount': { $not: { $gte: MAX_RETRIES } } },
                { $inc: { 'diaIntegration.chainRetryCount': 1 }, $set: { 'diaIntegration.chainRetriedAt': new Date() } },
                { new: true }
            ).lean();
            if (!claimed) continue;
            try {
                const result = await syncOrderToDia(claimed);
                console.log('[DiaChainRetry] Yarım zincir tekrar denendi', { orderNumber: claimed.orderNumber, success: result?.success, message: result?.message });
            } catch (error) {
                console.error('[DiaChainRetry] Tekrar deneme hatası', { orderNumber: claimed.orderNumber, error: error.message });
            }
        }
    } catch (error) {
        console.error('[DiaChainRetry] Tarama hatası', { error: error.message });
    } finally {
        running = false;
    }
}

function start() {
    if (process.env.DIA_CHAIN_RETRY === 'false' || !isPrimaryInstance()) return;
    cron.schedule(SCAN_CRON, retryIncompleteChains, { timezone: TIMEZONE });
    console.log('[DiaChainRetry] Şirketler arası zincir tekrar deneme zamanlayıcısı başlatıldı');
}

module.exports = { start, retryIncompleteChains };
