/**
 * Paynet Ödeme Servisi — Özelleştirilmiş Form (paynet-custom.js) modeli
 *
 * MODEL: Kart bilgisi TARAYICIDA paynet-custom.js ile token'lanır (Publishable
 * Key). Ham kart numarası/CVC bizim sunucumuza HİÇ gelmez → PCI güvenli,
 * "kart bilgileriniz saklanmaz". Sunucu yalnızca token ile tahsilat yapar.
 *
 * Yapılandırma env'den DEĞİL, panelden (PaymentMethod) okunur (site bazlı):
 *   apiCredentials.publishableKey  → frontend token
 *   apiCredentials.secretKey       → sunucu tahsilat (Basic Auth)
 *   creditCardSettings.mode/apiUrl → test/canlı uç
 *
 * Tahsilat: POST {apiUrl}/v1/transaction/charge
 *   Authorization: Basic {secretKey}   (Content-Type: application/json)
 */

const axios = require('axios');
const PaymentMethod = require('../../../models/admin/order/PaymentMethod');
const { PAYMENT_PROVIDERS } = require('../../../config/paymentProviders');

const PROVIDER = 'paynet';

// paynet-custom.js kaynağı moda göre (canlı / test)
const JS_SDK_URL = {
    live: 'https://pj.paynet.com.tr/public/js/paynet-custom.js',
    test: 'https://pts-pj.paynet.com.tr/public/js/paynet-custom.js'
};

function normalizeMode(mode) {
    return mode === 'live' ? 'live' : 'test';
}

// Tahsilat uç kök adresi: önce panel apiUrl, yoksa katalog moduna göre
function resolveApiUrl(doc) {
    const custom = doc?.creditCardSettings?.apiUrl;
    if (custom) return String(custom).replace(/\/+$/, '');
    const mode = normalizeMode(doc?.creditCardSettings?.mode);
    const modes = PAYMENT_PROVIDERS.credit_card?.[PROVIDER]?.modes || [];
    const found = modes.find(m => m.value === mode);
    return String(found?.apiUrl || 'https://api.paynet.com.tr').replace(/\/+$/, '');
}

class PaynetService {

    /** Aktif Paynet yapılandırmasını getirir (site bazlı) */
    static async getMethod(site) {
        return PaymentMethod.findOne({
            site,
            provider: PROVIDER,
            type: 'credit_card',
            isActive: true,
            isDeleted: { $ne: true }
        }).lean();
    }

    /**
     * Frontend için güvenli yapılandırma — secretKey ASLA dönmez.
     * @returns {Promise<{publishableKey, apiUrl, jsUrl, mode}|null>}
     */
    static async getPublicConfig(site) {
        const doc = await this.getMethod(site);
        if (!doc) return null;
        const publishableKey = doc.apiCredentials?.publishableKey;
        if (!publishableKey) return null;
        const mode = normalizeMode(doc.creditCardSettings?.mode);
        return {
            publishableKey,
            apiUrl: resolveApiUrl(doc),
            jsUrl: JS_SDK_URL[mode],
            mode
        };
    }

    /**
     * Taksit oranları — POST {apiUrl}/v1/ratio/Get.
     * BIN (kartın ilk 6 hanesi) verilirse yalnız o kartın bankası döner; boşsa
     * hesapta tanımlı tüm bankalar. amount KURUŞ (integer). ratio_code GÖNDERİLMEZ.
     * Tam kart numarası bu servise GELMEZ, yalnız BIN.
     * @param {Object} p
     * @param {string} p.site
     * @param {number} p.amount  Tutar (KURUŞ)
     * @param {string} [p.bin]   Kartın ilk 6 hanesi
     * @returns {Promise<{success:boolean, banks:Array, message?:string}>}
     */
    static async getRatios({ site, amount, bin }) {
        const doc = await this.getMethod(site);
        if (!doc) return { success: false, banks: [], message: 'Paynet yapılandırması bulunamadı.' };
        const secretKey = doc.apiCredentials?.secretKey;
        if (!secretKey) return { success: false, banks: [], message: 'Paynet gizli anahtarı tanımlı değil.' };
        const apiUrl = resolveApiUrl(doc);

        const body = { amount: String(Math.round(Number(amount) || 0)) };
        if (bin) body.bin = String(bin);

        try {
            const resp = await axios.post(`${apiUrl}/v1/ratio/Get`, body, {
                headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${secretKey}` },
                timeout: 20000
            });
            const r = resp.data || {};
            const codeOk = r.code === 0 || r.code === '0';
            const rawBanks = Array.isArray(r.data) ? r.data : [];
            if (!codeOk || rawBanks.length === 0) {
                return { success: false, banks: [], message: r.paynet_error_message || r.message || 'Taksit seçenekleri alınamadı.' };
            }
            const banks = rawBanks.map((bank) => ({
                bankName: bank.bank_name || '',
                bankLogo: bank.bank_logo || '',
                cardType: bank.card_type || '',
                options: (Array.isArray(bank.ratio) ? bank.ratio : [])
                    .map((o) => ({
                        instalment: Number(o.instalment ?? 0),
                        desc: String(o.desc ?? ''),
                        instalmentAmount: Number(o.instalment_amount ?? 0),
                        totalAmount: Number(o.total_amount ?? 0),
                        commission: Number(o.commision ?? o.commission ?? 0),
                        // Özelleştirilmiş formun installmentKey'i için olası anahtar alanları
                        key: o.instalment_key ?? o.key ?? o.ratio_code ?? undefined
                    }))
                    .sort((a, b) => a.instalment - b.instalment)
            }));
            return { success: true, banks };
        } catch (error) {
            console.error('Paynet ratio hatası:', error.response?.data || error.message);
            return { success: false, banks: [], message: 'Taksit seçenekleri alınamadı.' };
        }
    }

    /**
     * Token ile tahsilat (Özelleştirilmiş Form → charge).
     * @param {Object} p
     * @param {string} p.site
     * @param {string} p.sessionId  paynet-custom.js'ten gelen session_id
     * @param {string} p.tokenId    paynet-custom.js'ten gelen token_id
     * @param {number} p.amount     Tutar (formdaki tutarla AYNI olmalı)
     * @param {string} [p.referenceNo] Mükerrer koruması / eşleştirme
     * @param {number} [p.installments] Taksit (1 veya boş = tek çekim)
     * @param {boolean} [p.tdsRequired=true] 3D Secure zorunlu mu
     */
    static async charge({ site, sessionId, tokenId, amount, referenceNo, installments, tdsRequired = true }) {
        const doc = await this.getMethod(site);
        if (!doc) {
            return { success: false, message: 'Paynet yapılandırması bulunamadı.', errorCode: 'NO_CONFIG' };
        }
        const secretKey = doc.apiCredentials?.secretKey;
        if (!secretKey) {
            return { success: false, message: 'Paynet gizli anahtarı tanımlı değil.', errorCode: 'NO_SECRET' };
        }
        if (!sessionId || !tokenId) {
            return { success: false, message: 'Ödeme oturumu (session/token) eksik.', errorCode: 'NO_TOKEN' };
        }

        const apiUrl = resolveApiUrl(doc);
        const taksitli = Number(installments) > 1;

        const body = {
            session_id: sessionId,
            token_id: tokenId,
            amount: String(amount),          // KURUŞ — SDK token'ı data-amount×100 ile eşleşir
            transaction_type: '1',           // 1 = Satış
            add_comission_amount: false,
            ratio_code: '',
            // "installments" izin verilen taksit listesidir ve tarayıcıdaki oturumla (data-installments, boş) AYNI olmalıdır;
            // seçilen taksit sayısı token'ın içindeki taksit anahtarından gelir. Sayı gönderilirse Paynet
            // "Taksitler (installments) parametresi uyuşmuyor" hatası verir.
            installments: '',
            no_instalment: !taksitli,
            tds_required: !!tdsRequired,
            reference_no: referenceNo ? String(referenceNo) : ''
        };

        // Not: body'de kart verisi YOKTUR (yalnız session/token/tutar) — loglanması güvenli.
        console.log('[Paynet] charge isteği:', { url: `${apiUrl}/v1/transaction/charge`, ...body });

        try {
            const resp = await axios.post(`${apiUrl}/v1/transaction/charge`, body, {
                headers: {
                    'Content-Type': 'application/json',
                    // Paynet secret_key doğrudan Basic token olarak kullanılır
                    'Authorization': `Basic ${secretKey}`
                },
                timeout: 30000
            });
            const r = resp.data || {};
            console.log('[Paynet] charge yanıtı:', {
                is_succeed: r.is_succeed, code: r.code, message: r.message,
                amount: r.amount, xact_id: r.xact_id,
                paynet_error_message: r.paynet_error_message, bank_error_message: r.bank_error_message
            });
            const ok = r.is_succeed === true || r.is_succeed === 'true';
            if (ok) {
                return {
                    success: true,
                    transactionId: r.xact_id || r.id,
                    authCode: r.authorization_code,
                    maskedCardNo: r.card_no_masked,
                    bankName: r.bank_name,
                    amount: r.amount,
                    referenceNo: r.reference_no,
                    installment: r.instalment
                };
            }
            return {
                success: false,
                message: r.bank_error_message || r.paynet_error_message || r.message || 'Ödeme tamamlanamadı.',
                bankMessage: r.bank_error_message || '',
                paynetMessage: r.paynet_error_message || '',
                errorCode: r.paynet_error_id || r.bank_error_id || r.code || 'DECLINED'
            };
        } catch (error) {
            console.error('Paynet charge hatası:', error.response?.data || error.message);
            return {
                success: false,
                message: error.response?.data?.message || 'Paynet bağlantı hatası.',
                errorCode: 'CONNECTION_ERROR'
            };
        }
    }
}

module.exports = PaynetService;
