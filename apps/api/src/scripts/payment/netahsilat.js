/**
 * Netahsilat SOAP API Test Script
 * Kullanım: node src/scripts/payment/netahsilat.js
 */

const soap = require('soap');

// Netahsilat SOAP Ayarları
const WSDL_URL = 'https://otopirpossv2.netahsilatservice.com/VendorPayment/VendorPaymentService.svc?wsdl';
const AUTH = {
    UserName: 'servis2@artvinticaret.com.tr',
    Password: 'ByAdmpws1526+'
};

// SOAP Client oluştur
async function createClient() {
    try {
        const client = await soap.createClientAsync(WSDL_URL);
        console.log('SOAP Client olusturuldu.\n');
        return client;
    } catch (error) {
        console.error('SOAP Client hatasi:', error.message);
        throw error;
    }
}

// 1. Tum POS Listesi
async function getVirtualPosList(client) {
    console.log('=== GetVirtualPosList ===');
    try {
        const [result] = await client.GetVirtualPosListAsync({
            authInfo: AUTH
        });
        console.log('Sonuc:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Hata:', error.message);
    }
}

// 2. BIN ile POS Listesi (ornek: 540668 - Mastercard)
async function getVirtualPosListByBin(client, binNumber = '540668') {
    console.log(`\n=== GetVirtualPosListBinNumber (BIN: ${binNumber}) ===`);
    try {
        const [result] = await client.GetVirtualPosListBinNumberAsync({
            authInfo: AUTH,
            binNumber: binNumber
        });
        console.log('Sonuc:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Hata:', error.message);
    }
}

// 3. BIN ile POS + Kart Bilgisi
async function getVirtualPosListWithBinInfo(client, binNumber = '540668') {
    console.log(`\n=== GetVirtualPosListWithBinInfo (BIN: ${binNumber}) ===`);
    try {
        const [result] = await client.GetVirtualPosListWithBinInfoAsync({
            authInfo: AUTH,
            binNumber: binNumber
        });
        console.log('Sonuc:', JSON.stringify(result, null, 2));
        return result;
    } catch (error) {
        console.error('Hata:', error.message);
    }
}

// 4. Mevcut metodlari listele
function listMethods(client) {
    console.log('\n=== Mevcut SOAP Metodlari ===');
    const description = client.describe();
    const service = Object.keys(description)[0];
    const port = Object.keys(description[service])[0];
    const methods = Object.keys(description[service][port]);
    methods.forEach(m => console.log(' -', m));
    console.log('');
}

// Ana fonksiyon
async function main() {
    console.log('Netahsilat SOAP API Test\n');
    console.log('WSDL:', WSDL_URL);
    console.log('User:', AUTH.UserName);
    console.log('-----------------------------------\n');

    try {
        const client = await createClient();

        // Metodlari listele
        listMethods(client);

        // POS listesini al
        await getVirtualPosList(client);

        // BIN ile test (opsiyonel)
        // await getVirtualPosListByBin(client, '540668');
        // await getVirtualPosListWithBinInfo(client, '540668');

    } catch (error) {
        console.error('Genel hata:', error.message);
    }
}

main();