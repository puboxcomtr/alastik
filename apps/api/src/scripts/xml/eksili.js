const axios = require('axios');

async function test() {
    console.log('Tüm sayfalar çekiliyor (pageSize=100)...');

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
        console.log(`Sayfa ${pageNumber}/${totalPages} → ${data.products?.length} ürün (toplam: ${allProducts.length}/${data.totalCount})`);
        pageNumber++;
    } while (pageNumber <= totalPages);

    console.log(`\nToplam çekilen: ${allProducts.length}`);
    const uniqueSkus = new Set(allProducts.map(p => p.sku));
    console.log(`Benzersiz SKU: ${uniqueSkus.size}`);
}

test().catch(err => {
    console.error('HATA:', err.message);
    if (err.response) console.error('Status:', err.response.status);
});