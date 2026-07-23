/**
 * PayNkolay Ödeme Servisi
 * Tek çekim ve banka kartı ödemeleri için
 * 
 * Dosya: apps/api/src/services/plugins/payment/NkolayService.js
 */

const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');
const mongoose = require('mongoose');

class NkolayService {

    constructor() {
        this.credentials = null;
    }

    // ========== CREDENTIALS ==========

    async getCredentials() {
        if (this.credentials) return this.credentials;

        const PaymentMethod = mongoose.connection.collection('paymentmethods');
        const record = await PaymentMethod.findOne({
            provider: 'nkolay',
            isActive: true,
            isDeleted: { $ne: true }
        });

        if (!record) {
            throw new Error('[Nkolay] PaymentMethod kaydı bulunamadı');
        }

        this.credentials = {
            sx: record.apiCredentials.sx,
            sxCancel: record.apiCredentials.sxCancel,
            sxList: record.apiCredentials.sxList,
            merchantSecretKey: record.apiCredentials.merchantSecretKey,
            baseUrl: record.apiCredentials.baseUrl
        };

        console.log('[Nkolay] Credentials yüklendi, baseUrl:', this.credentials.baseUrl);
        return this.credentials;
    }

    // Credentials cache'ini temizle (credential güncellenirse)
    clearCredentials() {
        this.credentials = null;
    }

    // ========== HASH HESAPLAMA ==========

    generateHash(parts) {
        const hashString = parts.join('|');
        return crypto.createHash('sha512').update(hashString).digest('base64');
    }

    // Ödeme hash'i: sx|clientRefCode|amount|successUrl|failUrl|rnd|customerKey|merchantSecretKey
    generatePaymentHash({ sx, clientRefCode, amount, successUrl, failUrl, rnd, customerKey, merchantSecretKey }) {
        return this.generateHash([
            sx,
            clientRefCode,
            amount,
            successUrl,
            failUrl,
            rnd,
            customerKey || '',
            merchantSecretKey
        ]);
    }

    // İptal/İade hash'i: sx|referenceCode|type|amount|trxDate|merchantSecretKey
    generateCancelHash({ sx, referenceCode, type, amount, trxDate, merchantSecretKey }) {
        return this.generateHash([
            sx,
            referenceCode,
            type,
            amount,
            trxDate,
            merchantSecretKey
        ]);
    }

    // ========== YARDIMCI ==========

    getCurrentRnd() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');
        return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
    }

    // ========== ÖDEME İŞLEMİ (3D Secure) ==========

    async processPayment(params) {
        try {
            const creds = await this.getCredentials();

            const {
                orderNumber,
                amount,
                cardNumber,
                cardHolderName,
                expMonth,
                expYear,
                cvc,
                email,
                customerIP,
                successUrl,
                failUrl
            } = params;

            const rnd = this.getCurrentRnd();
            const clientRefCode = orderNumber;
            const formattedAmount = parseFloat(amount).toFixed(2);

            // Hash hesapla
            const hashDatav2 = this.generatePaymentHash({
                sx: creds.sx,
                clientRefCode,
                amount: formattedAmount,
                successUrl,
                failUrl,
                rnd,
                customerKey: '',
                merchantSecretKey: creds.merchantSecretKey
            });

            // Form data oluştur
            const form = new FormData();
            form.append('sx', creds.sx);
            form.append('clientRefCode', clientRefCode);
            form.append('successUrl', successUrl);
            form.append('failUrl', failUrl);
            form.append('amount', formattedAmount);
            form.append('installmentNo', '1'); // Tek çekim
            form.append('cardHolderName', cardHolderName);
            form.append('month', String(expMonth));
            form.append('year', String(expYear.length === 2 ? '20' + expYear : expYear));
            form.append('cvv', cvc);
            form.append('cardNumber', cardNumber.replace(/\s/g, ''));
            form.append('use3D', 'true');
            form.append('transactionType', 'SALES');
            form.append('rnd', rnd);
            form.append('hashDatav2', hashDatav2);
            form.append('environment', 'API');
            form.append('currencyNumber', '949'); // TL
            form.append('cardHolderIP', customerIP || '127.0.0.1');

            // Opsiyonel müşteri bilgileri
            if (email) form.append('email', email);

            const url = `${creds.baseUrl}/Vpos/v1/Payment`;

            console.log('[Nkolay] processPayment isteği:', {
                url,
                clientRefCode,
                amount: formattedAmount,
                cardNumber: cardNumber.substring(0, 6) + '******',
                rnd
            });

            const response = await axios.post(url, form, {
                headers: { ...form.getHeaders() },
                maxBodyLength: Infinity,
                timeout: 30000
            });

            const data = response.data;
            console.log('[Nkolay] processPayment yanıt:', {
                RESPONSE_CODE: data.RESPONSE_CODE,
                RESPONSE_DATA: data.RESPONSE_DATA,
                REFERENCE_CODE: data.REFERENCE_CODE,
                hasHTML: !!data.BANK_REQUEST_MESSAGE
            });

            // RESPONSE_CODE: 2 = 3D hazırlık başarılı, HTML dönüyor
            if (data.RESPONSE_CODE === 2 && data.BANK_REQUEST_MESSAGE) {
                return {
                    success: true,
                    threeDHtml: data.BANK_REQUEST_MESSAGE,
                    referenceCode: data.REFERENCE_CODE,
                    sessionId: data.sessionId
                };
            }

            // RESPONSE_CODE: 1 = 3D'siz direkt başarılı (tek çekim non-3D durumunda)
            if (data.RESPONSE_CODE === 1 || data.RESPONSE_CODE === 2) {
                return {
                    success: true,
                    referenceCode: data.REFERENCE_CODE,
                    authCode: data.AUTH_CODE,
                    directSuccess: true
                };
            }

            // Hata
            return {
                success: false,
                message: data.RESPONSE_DATA || data.ERROR_MESSAGE || 'Ödeme başlatılamadı',
                errorCode: data.ERROR_CODE || data.BANK_ERROR_CODE,
                responseCode: data.RESPONSE_CODE
            };

        } catch (error) {
            console.error('[Nkolay] processPayment hatası:', error.message);
            return { success: false, message: error.message };
        }
    }

    // ========== ÖDEME TAMAMLAMA ==========

    async completePayment(referenceCode) {
        try {
            const creds = await this.getCredentials();

            const form = new FormData();
            form.append('sx', creds.sx);
            form.append('referenceCode', referenceCode);

            const url = `${creds.baseUrl}/Vpos/v1/CompletePayment`;

            console.log('[Nkolay] completePayment isteği:', { referenceCode });

            const response = await axios.post(url, form, {
                headers: { ...form.getHeaders() },
                maxBodyLength: Infinity,
                timeout: 30000
            });

            const data = response.data;
            console.log('[Nkolay] completePayment yanıt:', data);

            if (data.RESPONSE_CODE === 1 || data.RESPONSE_CODE === 2) {
                return {
                    success: true,
                    referenceCode: data.REFERENCE_CODE,
                    authCode: data.AUTH_CODE
                };
            }

            return {
                success: false,
                message: data.RESPONSE_DATA || data.ERROR_MESSAGE || 'Ödeme tamamlanamadı',
                responseCode: data.RESPONSE_CODE
            };

        } catch (error) {
            console.error('[Nkolay] completePayment hatası:', error.message);
            return { success: false, message: error.message };
        }
    }

    // ========== İŞLEM DURUMU SORGULAMA (PaymentList) ==========
    // clientRefCode (orderNumber) ile Nkolay'dan gerçek işlem durumunu sorgular.
    // Callback gelmese bile ödeme durumunu doğrular.
    // Hash: sx + startDate + endDate + clientRefCode + secretkey -> sha1 -> base64
    async checkPaymentStatus({ clientRefCode, startDate, endDate }) {
        try {
            const creds = await this.getCredentials();

            if (!creds.sxList) {
                return { success: false, message: '[Nkolay] sxList credential tanimli degil' };
            }

            const formatDate = (d) => {
                const dd = String(d.getDate()).padStart(2, '0');
                const mm = String(d.getMonth() + 1).padStart(2, '0');
                const yyyy = d.getFullYear();
                return `${dd}.${mm}.${yyyy}`;
            };

            const sDate = startDate || formatDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
            const eDate = endDate || formatDate(new Date());

            const hashStr = creds.sxList + sDate + eDate + (clientRefCode || '') + creds.merchantSecretKey;
            const hashData = crypto.createHash('sha1').update(hashStr).digest('base64');

            const form = new FormData();
            form.append('sx', creds.sxList);
            form.append('startDate', sDate);
            form.append('endDate', eDate);
            form.append('clientRefCode', clientRefCode || '');
            form.append('hashData', hashData);

            const url = `${creds.baseUrl}/Vpos/Payment/PaymentList`;

            console.log('[Nkolay] checkPaymentStatus istegi:', { clientRefCode, sDate, eDate });

            const response = await axios.post(url, form, {
                headers: { ...form.getHeaders() },
                maxBodyLength: Infinity,
                timeout: 30000
            });

            const data = response.data;
            console.log('[Nkolay] checkPaymentStatus yanit:', JSON.stringify(data).substring(0, 800));

            // LIST icinden clientRefCode eslesen kaydi bul
            const list = (data && data.result && Array.isArray(data.result.LIST)) ? data.result.LIST : [];
            const match = list.find(t => t.CLIENT_REFERENCE_CODE === clientRefCode);

            if (!match) {
                return { success: true, found: false, status: null, raw: data };
            }

            return {
                success: true,
                found: true,
                status: match.STATUS,                         // SUCCESS | ERROR | NEW
                isPaid: match.STATUS === 'SUCCESS',
                referenceCode: match.REFERENCE_CODE,
                authCode: match.AUTH_CODE,
                transactionAmount: match.TRANSACTION_AMOUNT,
                transactionType: match.TRANSACTION_TYPE,
                trxDate: match.TRX_DATE,
                cardBankName: match.CARD_BANK_NAME,
                raw: match
            };

        } catch (error) {
            console.error('[Nkolay] checkPaymentStatus hatasi:', error.message);
            return { success: false, message: error.message };
        }
    }

    // ========== İPTAL ==========

    async cancelPayment({ referenceCode, amount, trxDate }) {
        try {
            const creds = await this.getCredentials();
            const formattedAmount = parseFloat(amount).toFixed(2);

            const hashDatav2 = this.generateCancelHash({
                sx: creds.sxCancel,
                referenceCode,
                type: 'cancel',
                amount: formattedAmount,
                trxDate,
                merchantSecretKey: creds.merchantSecretKey
            });

            const form = new FormData();
            form.append('sx', creds.sxCancel);
            form.append('referenceCode', referenceCode);
            form.append('type', 'cancel');
            form.append('amount', formattedAmount);
            form.append('trxDate', trxDate);
            form.append('hashDatav2', hashDatav2);

            const url = `${creds.baseUrl}/Vpos/v1/CancelRefundPayment`;

            console.log('[Nkolay] cancelPayment isteği:', { referenceCode, amount: formattedAmount, trxDate });

            const response = await axios.post(url, form, {
                headers: { ...form.getHeaders() },
                maxBodyLength: Infinity,
                timeout: 30000
            });

            const data = response.data;
            console.log('[Nkolay] cancelPayment yanıt:', data);

            return {
                success: data.RESPONSE_CODE === 1,
                message: data.RESPONSE_DATA || data.ERROR_MESSAGE,
                referenceCode: data.REFERENCE_CODE
            };

        } catch (error) {
            console.error('[Nkolay] cancelPayment hatası:', error.message);
            return { success: false, message: error.message };
        }
    }

    // ========== İADE ==========

    async refundPayment({ referenceCode, amount, trxDate }) {
        try {
            const creds = await this.getCredentials();
            const formattedAmount = parseFloat(amount).toFixed(2);

            const hashDatav2 = this.generateCancelHash({
                sx: creds.sxCancel,
                referenceCode,
                type: 'refund',
                amount: formattedAmount,
                trxDate,
                merchantSecretKey: creds.merchantSecretKey
            });

            const form = new FormData();
            form.append('sx', creds.sxCancel);
            form.append('referenceCode', referenceCode);
            form.append('type', 'refund');
            form.append('amount', formattedAmount);
            form.append('trxDate', trxDate);
            form.append('hashDatav2', hashDatav2);

            const url = `${creds.baseUrl}/Vpos/v1/CancelRefundPayment`;

            console.log('[Nkolay] refundPayment isteği:', { referenceCode, amount: formattedAmount, trxDate });

            const response = await axios.post(url, form, {
                headers: { ...form.getHeaders() },
                maxBodyLength: Infinity,
                timeout: 30000
            });

            const data = response.data;
            console.log('[Nkolay] refundPayment yanıt:', data);

            return {
                success: data.RESPONSE_CODE === 1,
                message: data.RESPONSE_DATA || data.ERROR_MESSAGE,
                referenceCode: data.REFERENCE_CODE
            };

        } catch (error) {
            console.error('[Nkolay] refundPayment hatası:', error.message);
            return { success: false, message: error.message };
        }
    }
}

module.exports = new NkolayService();