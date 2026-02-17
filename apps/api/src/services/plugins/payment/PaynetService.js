/**
 * Paynet Ödeme Servisi
 * Tek çekim ödemeler için kullanılır
 */

const axios = require('axios');

const PAYNET_API_URL = process.env.PAYNET_API_URL || 'https://api.paynet.com.tr';
const PAYNET_SECRET_KEY = process.env.PAYNET_SECRET_KEY;
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://alastik.com';

class PaynetService {

    /**
     * API isteği gönder
     */
    static async request(endpoint, data) {
        try {
            const response = await axios.post(`${PAYNET_API_URL}${endpoint}`, data, {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Basic ${Buffer.from(PAYNET_SECRET_KEY + ':').toString('base64')}`
                },
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            console.error('Paynet API Hatası:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * 3D Ödeme Başlat
     * @param {Object} params - Ödeme parametreleri
     */
    static async initiate3DPayment(params) {
        const {
            orderNumber,
            amount,
            cardNumber,
            cardHolderName,
            expMonth,
            expYear,
            cvc,
            email,
            phone
        } = params;

        // Tutar formatı: Paynet virgül ile ondalık ayırıcı istiyor
        const formattedAmount = amount.toFixed(2).replace('.', ',');

        const requestData = {
            amount: formattedAmount,
            reference_no: orderNumber,
            return_url: `${process.env.API_BASE_URL || 'https://api.alastik.com'}/api/web/payments/paynet/3d-callback`,
            domain: 'alastik.com',
            card_holder: cardHolderName,
            pan: cardNumber,
            month: parseInt(expMonth),
            year: parseInt(expYear),
            cvc: cvc,
            card_holder_mail: email || '',
            card_holder_phone: phone || ''
            // instalment gönderilmiyor = tek çekim
        };

        console.log('Paynet 3D Init Request:', {
            ...requestData,
            pan: cardNumber.substring(0, 6) + '******'
        });

        try {
            const result = await this.request('/v2/transaction/tds_initial', requestData);

            console.log('Paynet 3D Init Response:', {
                code: result.code,
                message: result.message,
                hasPostUrl: !!result.post_url
            });

            if (result.code === 0 && result.post_url) {
                return {
                    success: true,
                    postUrl: result.post_url,
                    tokenId: result.token_id,
                    sessionId: result.session_id
                };
            }

            return {
                success: false,
                message: result.message || 'Ödeme başlatılamadı',
                errorCode: result.code
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Paynet bağlantı hatası',
                errorCode: error.response?.data?.code || 'CONNECTION_ERROR'
            };
        }
    }

    /**
     * 3D Ödeme Tamamla
     * @param {string} sessionId - 3D session ID
     * @param {string} tokenId - Token ID
     */
    static async complete3DPayment(sessionId, tokenId) {
        const requestData = {
            session_id: sessionId,
            token_id: tokenId
        };

        console.log('Paynet 3D Charge Request:', requestData);

        try {
            const result = await this.request('/v2/transaction/tds_charge', requestData);

            console.log('Paynet 3D Charge Response:', {
                code: result.code,
                is_succeed: result.is_succeed,
                message: result.message
            });

            if (result.code === 0 && result.is_succeed) {
                return {
                    success: true,
                    transactionId: result.xact_id,
                    authCode: result.bank_authorization_code,
                    referenceNo: result.reference_no,
                    bankOrderId: result.bank_order_id,
                    maskedCardNo: result.card_no_masked,
                    amount: result.amount,
                    message: 'Ödeme başarılı'
                };
            }

            // Daha önce başarılı işlem varsa (code: 100)
            if (result.code === 100 && result.is_succeed) {
                return {
                    success: true,
                    transactionId: result.xact_id,
                    authCode: result.bank_authorization_code,
                    referenceNo: result.reference_no,
                    message: 'Önceki başarılı işlem'
                };
            }

            return {
                success: false,
                message: result.message || result.bank_error_message || 'Ödeme tamamlanamadı',
                errorCode: result.paynet_error_id || result.bank_error_id,
                bankErrorMessage: result.bank_error_message
            };
        } catch (error) {
            return {
                success: false,
                message: error.response?.data?.message || 'Paynet bağlantı hatası',
                errorCode: 'CONNECTION_ERROR'
            };
        }
    }
}

module.exports = PaynetService;