
const soap = require('soap');
const { redact } = require('../../../utils/logRedact');

const WSDL_URL = 'https://otopirpossv2.netahsilatservice.com/VendorPayment/VendorPaymentService.svc?wsdl';
const ENV_AUTH = {
    UserName: process.env.NETAHSILAT_USERNAME,
    Password: process.env.NETAHSILAT_PASSWORD
};

async function getAuth(site) {
    try {
        if (site) {
            const PaymentMethod = require('../../../models/admin/order/PaymentMethod');
            const doc = await PaymentMethod.findOne({
                site, provider: 'netahsilat', type: 'credit_card', isActive: true, isDeleted: { $ne: true }
            }).lean();
            const u = doc?.apiCredentials?.username;
            const p = doc?.apiCredentials?.password;
            if (u && p) return { UserName: String(u), Password: String(p) };
        }
    } catch (_) {  }
    return { UserName: ENV_AUTH.UserName, Password: ENV_AUTH.Password };
}

const assertAuth = (auth) => {
    if (!auth?.UserName || !auth?.Password) {
        throw new Error('Netahsilat kimlik bilgileri tanımlı değil (panel/env).');
    }
};

let soapClient = null;

class NetahsilatService {

    async getClient() {
        if (soapClient) return soapClient;
        try {
            soapClient = await soap.createClientAsync(WSDL_URL);
            console.log('[Netahsilat] SOAP client olusturuldu');
            return soapClient;
        } catch (error) {
            console.error('[Netahsilat] SOAP client hatasi:', error.message);
            throw error;
        }
    }

    async getPosByBin(binNumber, site) {
        try {
            const client = await this.getClient();
            const authInfo = await getAuth(site);
            assertAuth(authInfo);
            const [result] = await client.GetVirtualPosListWithBinInfoAsync({
                authInfo,
                binNumber: binNumber
            });

            const data = result?.GetVirtualPosListWithBinInfoResult;
            if (!data) return { success: false, message: 'Sonuc alinamadi' };

            const cardBin = data.CardBin || {};
            const cardType = cardBin.CardType || '';
            const isDebitCard = cardType.toLowerCase().includes('debit');
            const isCreditCard = cardType.toLowerCase().includes('credit') || !isDebitCard;

            const poses = data.VirtualPoses?.VirtualPos || [];
            const installments = [];

            if (isCreditCard && Array.isArray(poses)) {
                poses.forEach(pos => {
                    const rates = pos.ComissionRates?.ComissionRate || [];
                    const rateList = Array.isArray(rates) ? rates : [rates];

                    rateList.forEach(rate => {
                        if (rate.Instalment && rate.Instalment >= 1) {
                            if (!installments.find(i => i.installment === rate.Instalment)) {
                                installments.push({
                                    installment: rate.Instalment,
                                    vPosId: pos.VPosId,
                                    vPosName: pos.VPosName,
                                    commRate: rate.CommRate || 0
                                });
                            }
                        }
                    });
                });

                installments.sort((a, b) => a.installment - b.installment);
            }

            return {
                success: true,
                cardInfo: {
                    bin: cardBin.Bin || binNumber,
                    cardType: cardType,
                    isDebitCard: isDebitCard,
                    isCreditCard: isCreditCard,
                    brand: cardBin.CreditCardBrand || '',
                    cardName: cardBin.CreditCardName || '',
                    program: cardBin.CardProgram || '',
                    isBusinessCard: cardBin.IsBusinessCard || false
                },
                installments: installments,
                hasInstallment: installments.length > 0
            };
        } catch (error) {
            console.error('[Netahsilat] getPosByBin hatasi:', error.message);
            return { success: false, message: error.message };
        }
    }

    async getVirtualPosList(site) {
        try {
            const client = await this.getClient();
            const authInfo = await getAuth(site);
            assertAuth(authInfo);
            const [result] = await client.GetVirtualPosListAsync({ authInfo });
            const list = result?.GetVirtualPosListResult?.VirtualPos || [];
            const poses = (Array.isArray(list) ? list : [list]).map(pos => {
                const raw = pos.ComissionRates?.ComissionRate || [];
                const rates = (Array.isArray(raw) ? raw : [raw])
                    .filter(rate => Number(rate.Instalment) >= 1)
                    .map(rate => ({ installment: Number(rate.Instalment), commRate: Number(rate.CommRate) || 0 }))
                    .sort((a, b) => a.installment - b.installment);
                return { vPosId: pos.VPosId, name: String(pos.VPosName || '').trim(), rates };
            });
            return { success: true, poses };
        } catch (error) {
            console.error('[Netahsilat] getVirtualPosList hatasi:', error.message);
            return { success: false, message: error.message };
        }
    }

    async processPayment(params) {
        try {
            const client = await this.getClient();

            const {
                orderNumber,
                amount,
                installment,
                vPosId,
                cardNumber,
                cardHolderName,
                expMonth,
                expYear,
                cvc,
                email,
                returnUrl,
                customerName,
                site
            } = params;

            const cleanTurkish = (str) => String(str || '')
                .replace(/İ/g, 'I')
                .replace(/ı/g, 'i')
                .replace(/Ğ/g, 'G')
                .replace(/ğ/g, 'g')
                .replace(/Ü/g, 'U')
                .replace(/ü/g, 'u')
                .replace(/Ş/g, 'S')
                .replace(/ş/g, 's')
                .replace(/Ö/g, 'O')
                .replace(/ö/g, 'o')
                .replace(/Ç/g, 'C')
                .replace(/ç/g, 'c');

            const cleanCardHolderName = cleanTurkish(cardHolderName);

            const { SITES } = require('../../../config/sites');
            const siteLabel = (SITES[site]?.name || site || '').toLocaleUpperCase('tr-TR');
            const description = customerName
                ? cleanTurkish(`${orderNumber} ${customerName} ${siteLabel}`.replace(/\s+/g, ' ').trim())
                : `Siparis: ${orderNumber}`;

            const authInfo = await getAuth(site);
            assertAuth(authInfo);

            const request = {
                authInfo,
                parameters: {
                    Amount: parseFloat(amount),
                    BonusId: 1,
                    ClientReferenceCode: orderNumber,
                    CreditCard: {
                        CardHolderName: cleanCardHolderName,
                        CardNumber: cardNumber.replace(/\s/g, ''),
                        CvcNumber: cvc,
                        ExpMonth: parseInt(expMonth),
                        ExpYear: parseInt(expYear.length === 2 ? `20${expYear}` : expYear)
                    },
                    Description: description,
                    Email: email || 'musteri@alastik.com',
                    Installment: parseInt(installment),
                    ReturnUrl: returnUrl,
                    Use3d: true,
                    UseSafeKey: false,
                    VirtualPosId: parseInt(vPosId)
                }
            };

            console.log('[Netahsilat] ProcessPayment Request:', JSON.stringify(redact(request), null, 2));

            const [result] = await client.ProcessPaymentAsync(request);

            console.log('[Netahsilat] ProcessPayment Response:', JSON.stringify(redact(result), null, 2));

            const data = result?.ProcessPaymentResult;

            if (data?.TransactionStatusId === 4 && data?.ThreeDUrl) {
                return {
                    success: true,
                    threeDUrl: data.ThreeDUrl,
                    referenceCode: data.ReferenceCode,
                    transactionId: data.TransactionId,
                    clientReferenceCode: data.ClientReferenceCode
                };
            }

            if (data?.IsSuccess && data?.TransactionStatusId === 1) {
                return {
                    success: true,
                    referenceCode: data.ReferenceCode,
                    authCode: data.AuthCode,
                    transactionId: data.TransactionId
                };
            }

            return {
                success: false,
                message: data?.InternalMessage || data?.BankMessage || 'Odeme baslatma hatasi',
                errorCode: data?.BankErrorCode
            };
        } catch (error) {
            console.error('[Netahsilat] ProcessPayment hatasi:', error.message);
            return { success: false, message: error.message };
        }
    }

    async commitPayment(paymentGuid, site) {
        try {
            const client = await this.getClient();

            const authInfo = await getAuth(site);
            assertAuth(authInfo);

            const [result] = await client.CommitPaymentAsync({
                authInfo,
                parameters: {
                    PaymentGuid: paymentGuid
                }
            });

            console.log('[Netahsilat] CommitPayment Response:', JSON.stringify(redact(result), null, 2));

            const data = result?.CommitPaymentResult;

            if (data?.IsSuccess || data?.TransactionStatusId === 1) {
                return {
                    success: true,
                    referenceCode: data.ReferenceCode,
                    authCode: data.AuthCode,
                    transactionId: data.TransactionId
                };
            }

            return {
                success: false,
                message: data?.InternalMessage || data?.BankMessage || 'Odeme tamamlanamadi',
                bankErrorCode: data?.BankErrorCode
            };
        } catch (error) {
            console.error('[Netahsilat] CommitPayment hatasi:', error.message);
            return { success: false, message: error.message };
        }
    }

    async getTransaction(orderReference, site) {
        try {
            const client = await this.getClient();

            const authInfo = await getAuth(site);
            const [result] = await client.GetTransactionByClientOrderReferenceAsync({
                authInfo,
                clientReferenceCode: orderReference
            });

            const data = result?.GetTransactionByClientOrderReferenceResult;

            return {
                success: true,
                transaction: data
            };
        } catch (error) {
            console.error('[Netahsilat] getTransaction hatasi:', error.message);
            return { success: false, message: error.message };
        }
    }
}

module.exports = new NetahsilatService();