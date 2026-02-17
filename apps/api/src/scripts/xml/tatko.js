const axios = require('axios');
const fs = require('fs');

axios.post('https://tatkoapi.tatko1927.com:28454/v6/api_1038/APIPortalStokArama', {
    UserName: 'ART.API',
    Password: 'm-VkE&*e*L;s),q4',
    CompanyCode: 'TATKOTEST',
    stokCode: ''
}, {
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' }
})
    .then(res => {
        const raw = res.data.Sonuc;
        const sonuclar = typeof raw === 'string' ? JSON.parse(raw) : raw;

        console.log('Toplam Ürün:', sonuclar.length);
        console.log('\nTüm Veriler:');
        console.log(JSON.stringify(sonuclar, null, 2));

        fs.writeFileSync('/tmp/tatko_stok.json', JSON.stringify(sonuclar, null, 2));
        console.log('\n/tmp/tatko_stok.json dosyasına kaydedildi.');
    })
    .catch(err => console.log('HATA:', err.message));