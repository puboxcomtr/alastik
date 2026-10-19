
const crypto = require('crypto');
const axios = require('axios');
const FormData = require('form-data');

const config = {
    sx: '174508930|uhlJb77vPTZWFWKjrgzxZY+835onES/jaSCEWoKLCHhAK4Ne0DuoKHbPq1VWHrQWf8GTIS+cSV0/mwaUn5HOi5MPhZwBWZw3B/MlRZHGy15yO7uyrgCOkQASgBj7Ng3rCuJv4A==',
    merchantSecretKey: '_6GGpSsK2W2DzOdR7aEEA',

    baseUrl: 'https://paynkolay.nkolayislem.com.tr',

    testCard: {
        cardNumber: '4546711234567894',
        cardHolderName: 'Test Kullanıcı',
        month: '12',
        year: '2026',
        cvv: '001'
    }
};

function generateHash(params) {
    const hashString = [
        params.sx,
        params.clientRefCode,
        params.amount,
        params.successUrl,
        params.failUrl,
        params.rnd,
        params.customerKey || '',
        params.merchantSecretKey
    ].join('|');

    console.log('\n--- Hash Bilgileri ---');
    console.log('Hash string:', hashString);

    const hash = crypto.createHash('sha512').update(hashString).digest('base64');
    console.log('Hesaplanan hash:', hash);

    return hash;
}

function getCurrentRnd() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
}

async function testPayment() {
    console.log('========================================');
    console.log('  Nkolay (PayNkolay) API Ödeme Testi');
    console.log('========================================\n');

    const rnd = getCurrentRnd();
    const clientRefCode = `ALASTIK-TEST-${Date.now()}`;
    const amount = '1.00';
    const successUrl = 'https://alastik.com/api/payment/nkolay/success';
    const failUrl = 'https://alastik.com/api/payment/nkolay/fail';

    console.log('İstek Parametreleri:');
    console.log('  clientRefCode:', clientRefCode);
    console.log('  amount:', amount);
    console.log('  rnd:', rnd);
    console.log('  use3D: true');

    const hashDatav2 = generateHash({
        sx: config.sx,
        clientRefCode,
        amount,
        successUrl,
        failUrl,
        rnd,
        customerKey: '',
        merchantSecretKey: config.merchantSecretKey
    });

    const form = new FormData();
    form.append('sx', config.sx);
    form.append('clientRefCode', clientRefCode);
    form.append('successUrl', successUrl);
    form.append('failUrl', failUrl);
    form.append('amount', amount);
    form.append('installmentNo', '1');
    form.append('cardHolderName', config.testCard.cardHolderName);
    form.append('month', config.testCard.month);
    form.append('year', config.testCard.year);
    form.append('cvv', config.testCard.cvv);
    form.append('cardNumber', config.testCard.cardNumber);
    form.append('use3D', 'true');
    form.append('transactionType', 'SALES');
    form.append('rnd', rnd);
    form.append('hashDatav2', hashDatav2);
    form.append('environment', 'API');
    form.append('currencyNumber', '949');
    form.append('cardHolderIP', '85.105.100.1');

    const url = `${config.baseUrl}/Vpos/v1/Payment`;
    console.log('\nİstek URL:', url);

    try {
        const response = await axios.post(url, form, {
            headers: {
                ...form.getHeaders()
            },
            maxBodyLength: Infinity,
            timeout: 30000
        });

        console.log('\n--- YANIT ---');
        console.log('Status:', response.status);
        console.log('Data:', JSON.stringify(response.data, null, 2));

    } catch (error) {
        console.log('\n--- HATA ---');
        if (error.response) {
            console.log('Status:', error.response.status);
            console.log('Data:', JSON.stringify(error.response.data, null, 2));
            console.log('Headers:', JSON.stringify(error.response.headers, null, 2));
        } else {
            console.log('Hata mesajı:', error.message);
        }
    }
}

testPayment();