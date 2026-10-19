const axios = require('axios');

async function test() {
    console.log('Tatko API bağlanıyor...');

    const res = await axios.post('https://tatkoapi.tatko1927.com:28454/v6/api_1038/APIPortalStokArama', {
        UserName: 'ART.API',
        Password: 'm-VkE&*e*L;s),q4',
        CompanyCode: 'TATKOTEST',
        stokCode: ''
    }, {
        timeout: 60000,
        headers: { 'Content-Type': 'application/json' }
    });

    const raw = res.data.Sonuc;
    const urunler = typeof raw === 'string' ? JSON.parse(raw) : raw;

    console.log('Toplam ürün:', urunler.length);

    const donusturulen = urunler.map(u => ({
        source: 'tatko',
        sourceProductId: u.stokkodu,
        rawData: u,
        mappedData: {
            stokKodu: u.stokkodu,
            urunAdi: u.desen?.trim(),
            marka: u.markaismi,
            hamFiyat: u.kdvdahilfiyat,
            stokAdeti: u.miktar,
            kategori: u.stokanagrup || '',
            uretimYili: u.dot,
            gorselUrl: u.desenresim,
            mevsim: u.mevsim
        }
    }));

    console.log('\nİlk 3 ürün dönüştürülmüş hali:');
    donusturulen.slice(0, 3).forEach((u, i) => {
        console.log(`\n[${i + 1}]`, JSON.stringify(u.mappedData, null, 2));
    });

    const dotBos = urunler.filter(u => !u.dot || u.dot === '0' || String(u.dot).trim() === '');
    console.log(`\nDot boş olan (filtrelenecek): ${dotBos.length}`);
    console.log(`Aktarılacak: ${urunler.length - dotBos.length}`);
}

test().catch(err => console.error('HATA:', err.message));