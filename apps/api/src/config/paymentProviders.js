const PAYMENT_PROVIDERS = {
    credit_card: {
        netahsilat: {
            code: 'netahsilat',
            name: 'Netahsilat',
            logo: '/images/providers/netahsilat.png',
            description: 'Türkiye\'nin lider sanal pos sağlayıcısı',
            requiredFields: [
                {
                    key: 'username',
                    label: 'API Kullanıcı Adı',
                    type: 'text',
                    required: true,
                    placeholder: 'api_user',
                    help: 'NetTahsilat PirPos API kullanıcı adı'
                },
                {
                    key: 'password',
                    label: 'API Şifre',
                    type: 'password',
                    required: true,
                    help: 'NetTahsilat PirPos API şifresi'
                }
            ],
            settings: {
                supportedCurrency: ['TRY', 'USD', 'EUR'],
                supportedLanguages: ['tr', 'en'],
                has3DSecure: true,
                hasInstallment: true,
                maxInstallment: 12
            },
            modes: [
                { value: 'test', label: 'Test Modu', apiUrl: 'https://test.netahsilat.com/api' },
                { value: 'live', label: 'Canlı Mod', apiUrl: 'https://secure.netahsilat.com/api' }
            ]
        },
        nkolay: {
            code: 'nkolay',
            name: 'PayNkolay',
            logo: '/images/providers/nkolay.png',
            description: 'Tek çekim ve banka kartı ödemeleri',
            color: '#1a73e8',
            icon: '💳',
            requiredFields: [
                { key: 'sx', label: 'SX Token', type: 'password', required: true, help: 'Nkolay SX işlem token' },
                { key: 'sxCancel', label: 'SX Cancel Token', type: 'password', required: true, help: 'Nkolay iptal işlem token' },
                { key: 'sxList', label: 'SX List Token', type: 'password', required: true, help: 'Nkolay listeleme token' },
                { key: 'merchantSecretKey', label: 'Merchant Secret Key', type: 'password', required: true, help: 'Mağaza gizli anahtarı' },
                { key: 'baseUrl', label: 'API Base URL', type: 'text', required: true, placeholder: 'https://paynkolay.nkolayislem.com.tr' }
            ],
            settings: {
                supportedCurrency: ['TRY'],
                has3DSecure: true,
                hasInstallment: false,
                maxInstallment: 1
            },
            modes: [
                { value: 'live', label: 'Canlı Mod', apiUrl: 'https://paynkolay.nkolayislem.com.tr' }
            ]
        },
        paynet: {
            code: 'paynet',
            name: 'Paynet',
            logo: '/images/providers/paynet.png',
            description: 'Tek çekim kredi kartı ödemeleri (3D Secure)',
            color: '#00b2a9',
            icon: '💳',
            requiredFields: [
                { key: 'publishableKey', label: 'Publishable Key', type: 'text', required: true, placeholder: 'pbk_...', help: 'Frontend kart token için (pbk_ ile başlar)' },
                { key: 'secretKey', label: 'Secret Key', type: 'password', required: true, help: 'Sunucuda tahsilat için gizli anahtar (Basic Auth)' }
            ],
            settings: {
                supportedCurrency: ['TRY'],
                has3DSecure: true,
                hasInstallment: false,
                maxInstallment: 1
            },
            modes: [
                { value: 'test', label: 'Test Modu', apiUrl: 'https://api.dev.paynet.com.tr' },
                { value: 'live', label: 'Canlı Mod', apiUrl: 'https://api.paynet.com.tr' }
            ]
        }
    },

    bank_transfer: {
        akbank: {
            code: 'akbank',
            name: 'Akbank',
            logo: '/images/banks/akbank.png',
            description: 'Akbank Havale/EFT',
            requiredFields: [
                { key: 'accountName', label: 'Hesap Adı', type: 'text', required: true, placeholder: 'ALASTIK TİCARET A.Ş.' },
                { key: 'accountNumber', label: 'Hesap Numarası', type: 'text', required: false, placeholder: '1234567' },
                { key: 'branchName', label: 'Şube Adı', type: 'text', required: false, placeholder: 'Kadıköy Şubesi' },
                { key: 'branchCode', label: 'Şube Kodu', type: 'text', required: false, placeholder: '0123' },
                { key: 'iban', label: 'IBAN', type: 'text', required: true, placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
                { key: 'swift', label: 'SWIFT/BIC', type: 'text', required: false, placeholder: 'AKBKTRISXXX' }
            ],
            color: '#e30a17',
            icon: '🏦'
        },
        garanti: {
            code: 'garanti',
            name: 'Garanti BBVA',
            logo: '/images/banks/garanti.png',
            description: 'Garanti BBVA Havale/EFT',
            requiredFields: [
                { key: 'accountName', label: 'Hesap Adı', type: 'text', required: true, placeholder: 'ALASTIK TİCARET A.Ş.' },
                { key: 'accountNumber', label: 'Hesap Numarası', type: 'text', required: false, placeholder: '1234567' },
                { key: 'branchName', label: 'Şube Adı', type: 'text', required: false, placeholder: 'Bostancı Şubesi' },
                { key: 'branchCode', label: 'Şube Kodu', type: 'text', required: false, placeholder: '0456' },
                { key: 'iban', label: 'IBAN', type: 'text', required: true, placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
                { key: 'swift', label: 'SWIFT/BIC', type: 'text', required: false, placeholder: 'TGBATRISXXX' }
            ],
            color: '#00a650',
            icon: '🏦'
        },
        isbank: {
            code: 'isbank',
            name: 'Türkiye İş Bankası',
            logo: '/images/banks/isbank.png',
            description: 'İş Bankası Havale/EFT',
            requiredFields: [
                { key: 'accountName', label: 'Hesap Adı', type: 'text', required: true, placeholder: 'ALASTIK TİCARET A.Ş.' },
                { key: 'accountNumber', label: 'Hesap Numarası', type: 'text', required: false, placeholder: '1234567' },
                { key: 'branchName', label: 'Şube Adı', type: 'text', required: false, placeholder: 'Maltepe Şubesi' },
                { key: 'branchCode', label: 'Şube Kodu', type: 'text', required: false, placeholder: '0789' },
                { key: 'iban', label: 'IBAN', type: 'text', required: true, placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
                { key: 'swift', label: 'SWIFT/BIC', type: 'text', required: false, placeholder: 'ISBKTRISXXX' }
            ],
            color: '#004b93',
            icon: '🏦'
        },
        yapikredi: {
            code: 'yapikredi',
            name: 'Yapı Kredi',
            logo: '/images/banks/yapikredi.png',
            description: 'Yapı Kredi Havale/EFT',
            requiredFields: [
                { key: 'accountName', label: 'Hesap Adı', type: 'text', required: true, placeholder: 'ALASTIK TİCARET A.Ş.' },
                { key: 'accountNumber', label: 'Hesap Numarası', type: 'text', required: false, placeholder: '1234567' },
                { key: 'branchName', label: 'Şube Adı', type: 'text', required: false, placeholder: 'Kartal Şubesi' },
                { key: 'branchCode', label: 'Şube Kodu', type: 'text', required: false, placeholder: '0321' },
                { key: 'iban', label: 'IBAN', type: 'text', required: true, placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
                { key: 'swift', label: 'SWIFT/BIC', type: 'text', required: false, placeholder: 'YAPITRISXXX' }
            ],
            color: '#0055a5',
            icon: '🏦'
        },
        ziraat: {
            code: 'ziraat',
            name: 'Ziraat Bankası',
            logo: '/images/banks/ziraat.png',
            description: 'Ziraat Bankası Havale/EFT',
            requiredFields: [
                { key: 'accountName', label: 'Hesap Adı', type: 'text', required: true, placeholder: 'ALASTIK TİCARET A.Ş.' },
                { key: 'accountNumber', label: 'Hesap Numarası', type: 'text', required: false, placeholder: '1234567' },
                { key: 'branchName', label: 'Şube Adı', type: 'text', required: false, placeholder: 'Pendik Şubesi' },
                { key: 'branchCode', label: 'Şube Kodu', type: 'text', required: false, placeholder: '0654' },
                { key: 'iban', label: 'IBAN', type: 'text', required: true, placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
                { key: 'swift', label: 'SWIFT/BIC', type: 'text', required: false, placeholder: 'TCZBTR2AXXX' }
            ],
            color: '#d32027',
            icon: '🏦'
        },
        halkbank: {
            code: 'halkbank',
            name: 'Halk Bankası',
            logo: '/images/banks/halkbank.png',
            description: 'Halk Bankası Havale/EFT',
            requiredFields: [
                { key: 'accountName', label: 'Hesap Adı', type: 'text', required: true, placeholder: 'ALASTIK TİCARET A.Ş.' },
                { key: 'accountNumber', label: 'Hesap Numarası', type: 'text', required: false, placeholder: '1234567' },
                { key: 'branchName', label: 'Şube Adı', type: 'text', required: false, placeholder: 'Tuzla Şubesi' },
                { key: 'branchCode', label: 'Şube Kodu', type: 'text', required: false, placeholder: '0987' },
                { key: 'iban', label: 'IBAN', type: 'text', required: true, placeholder: 'TR00 0000 0000 0000 0000 0000 00' },
                { key: 'swift', label: 'SWIFT/BIC', type: 'text', required: false, placeholder: 'TRHBTR2AXXX' }
            ],
            color: '#00a650',
            icon: '🏦'
        }
    }
};
const getProviderTemplate = (type, providerCode) => {
    return PAYMENT_PROVIDERS[type]?.[providerCode] || null;
};

const getAllProvidersByType = (type) => {
    return PAYMENT_PROVIDERS[type] || {};
};

const getAllProviders = () => {
    return PAYMENT_PROVIDERS;
};

const validateProviderFields = (type, providerCode, data) => {
    const template = getProviderTemplate(type, providerCode);
    if (!template) {
        return { valid: false, message: 'Geçersiz provider' };
    }

    const missingFields = [];
    template.requiredFields.forEach(field => {
        if (field.required && !data[field.key]) {
            missingFields.push(field.label);
        }
    });

    if (missingFields.length > 0) {
        return {
            valid: false,
            message: 'Eksik alanlar: ' + missingFields.join(', '),
            fields: missingFields
        };
    }

    return { valid: true };
};

module.exports = {
    PAYMENT_PROVIDERS,
    getProviderTemplate,
    getAllProvidersByType,
    getAllProviders,
    validateProviderFields
};