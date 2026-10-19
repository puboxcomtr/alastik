
const soap = require('soap');

const WSDL_URL = 'https://otopirpossv2.netahsilatservice.com/VendorPayment/VendorPaymentService.svc?wsdl';
const AUTH = {
    UserName: 'servis2@artvinticaret.com.tr',
    Password: 'ByAdmpws1526+'
};

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

function listMethods(client) {
    console.log('\n=== Mevcut SOAP Metodlari ===');
    const description = client.describe();
    const service = Object.keys(description)[0];
    const port = Object.keys(description[service])[0];
    const methods = Object.keys(description[service][port]);
    methods.forEach(m => console.log(' -', m));
    console.log('');
}

async function main() {
    console.log('Netahsilat SOAP API Test\n');
    console.log('WSDL:', WSDL_URL);
    console.log('User:', AUTH.UserName);
    console.log('-----------------------------------\n');

    try {
        const client = await createClient();

        listMethods(client);

        await getVirtualPosList(client);

    } catch (error) {
        console.error('Genel hata:', error.message);
    }
}

main();