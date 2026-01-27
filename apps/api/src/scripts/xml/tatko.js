const axios = require('axios');

axios.post('https://tatkoapi.tatko1927.com:28454/v6', {
    UserName: '120.34.20270',
    Password: 'Artlastik2561',
    CompanyCode: 'TATKOTEST',
    stokCode: ''
}, { 
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json'
    }
})
.then(res => {
    console.log('BASARILI!');
    console.log('Yanit:', JSON.stringify(res.data, null, 2));
})
.catch(err => {
    if (err.response) {
        console.log('HTTP', err.response.status);
        console.log('Yanit:', JSON.stringify(err.response.data, null, 2));
    } else {
        console.log('BAGLANTI HATASI:', err.message);
    }
});