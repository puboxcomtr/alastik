const axios = require('axios');

async function test() {
    const allProducts = [];
    let pageNumber = 1;
    let totalPages = 1;

    do {
        const res = await axios.get('https://api.lastikistan.com/api/v1/partner/products', {
            timeout: 120000,
            headers: {
                'LSTK-IST': 'lstk_neZtg87R3arFjMvvhNk7kOh7iB3DV6Rr8JpcQhMSTng',
                'Content-Type': 'application/json'
            },
            params: { pageNumber, pageSize: 100 }
        });

        const data = res.data;
        allProducts.push(...(data.products || []));
        totalPages = data.totalPages;
        pageNumber++;
    } while (pageNumber <= totalPages);

    console.log(`Toplam çekilen: ${allProducts.length}`);

    const found = allProducts.filter(p => JSON.stringify(p).includes('3634800'));
    console.log(`\n=== 3634800 içeren ${found.length} ürün ===`);
    found.forEach(p => console.log(JSON.stringify(p, null, 2)));
}

test().catch(err => {
    console.error('HATA:', err.message);
    if (err.response) console.error('Status:', err.response.status);
});
