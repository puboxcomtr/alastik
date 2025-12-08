// apps/api/src/scripts/seedTireSizeTags.js
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';

// Mevsim tipleri
const SEASONS = [
    { key: 'all', title: '', urlSuffix: '', ozelkod: null },
    { key: 'yaz', title: 'Yaz', urlSuffix: '-yaz', ozelkod: 'YAZ' },
    { key: 'kis', title: 'Kış', urlSuffix: '-kis', ozelkod: 'KIŞ' },
    { key: '4mevsim', title: '4 Mevsim', urlSuffix: '-4-mevsim', ozelkod: '4 MEVSİM' }
];

async function seedTireSizeTags() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB baglantisi basarili');

        const db = mongoose.connection.db;

        // 1. webproducts collection'indan urunleri cek (sadece LASTİK olanlar)
        const products = await db.collection('webproducts').find({
            'diaData.durum': 'A',
            'diaData.ozelkod7kodu': 'LASTİK',
            'diaData.m_urunOzellikleri': { $exists: true, $ne: [] }
        }).project({
            _key: 1,
            'diaData.m_urunOzellikleri': 1,
            'diaData.ozelkod1kodu': 1
        }).toArray();

        console.log(`Toplam ${products.length} urun bulundu`);

        // Ebat + Mevsim bazinda gruplama
        const ebatMap = new Map();

        for (const product of products) {
            const urunOzellikleri = product.diaData?.m_urunOzellikleri || [];
            const mevsim = product.diaData?.ozelkod1kodu || 'DIGER';

            let genislik = null;
            let yanak = null;
            let jantCapi = null;

            for (const ozellik of urunOzellikleri) {
                if (ozellik.ozellikadi === 'Genişlik') genislik = ozellik.detayaciklama;
                else if (ozellik.ozellikadi === 'Yanak') yanak = ozellik.detayaciklama;
                else if (ozellik.ozellikadi === 'Jant Çapı') jantCapi = ozellik.detayaciklama;
            }

            // Gecerlilik kontrolu
            if (!genislik || !yanak || !jantCapi) continue;
            if (!/^\d{3}$/.test(genislik)) continue;
            if (!/^\d{2}$/.test(yanak)) continue;
            if (!/^R\d+/.test(jantCapi)) continue;

            const ebatKey = `${genislik} ${yanak} ${jantCapi}`;

            // Her ebat icin map olustur
            if (!ebatMap.has(ebatKey)) {
                ebatMap.set(ebatKey, {
                    genislik, yanak, jantCapi,
                    all: [],
                    yaz: [],
                    kis: [],
                    '4mevsim': []
                });
            }

            const ebatData = ebatMap.get(ebatKey);
            ebatData.all.push(product._key);

            if (mevsim === 'YAZ') ebatData.yaz.push(product._key);
            else if (mevsim === 'KIŞ') ebatData.kis.push(product._key);
            else if (mevsim === '4 MEVSİM') ebatData['4mevsim'].push(product._key);
        }

        console.log(`Toplam ${ebatMap.size} gecerli ebat bulundu`);

        // 2. Her ebat ve mevsim icin webtags olustur
        const webtagsCollection = db.collection('webtags');
        let inserted = 0;
        let updated = 0;

        for (const [ebatStr, data] of ebatMap) {
            const { genislik, yanak, jantCapi } = data;

            for (const season of SEASONS) {
                const productKeys = data[season.key];

                // Urun yoksa isActive: false olacak ama etiket yine de olusacak

                const titlePrefix = season.title ? `${season.title} ` : '';
                const seoUrl = `${genislik}-${yanak}-${jantCapi.toLowerCase()}${season.urlSuffix}-lastik-fiyatlari`;

                const tagData = {
                    title: `${ebatStr} ${titlePrefix}Lastik Fiyatları`.trim(),
                    description: '',
                    seoTitle: `${ebatStr} ${titlePrefix}Lastik Fiyatları ve Modelleri`.trim(),
                    seoDescription: `${ebatStr} ${titlePrefix}lastik secenekleri`.trim().toLowerCase(),
                    seoUrl: seoUrl,
                    products: productKeys,
                    productCount: productKeys.length,
                    isActive: productKeys.length > 0,
                    order: 999,
                    type: 'tire_size',
                    season: season.key,
                    updatedAt: new Date()
                };

                const result = await webtagsCollection.updateOne(
                    { seoUrl: seoUrl },
                    {
                        $set: tagData,
                        $setOnInsert: { createdAt: new Date() }
                    },
                    { upsert: true }
                );

                if (result.upsertedCount > 0) inserted++;
                else if (result.modifiedCount > 0) updated++;
            }
        }

        console.log('\n=== SONUC ===');
        console.log(`Toplam ebat: ${ebatMap.size}`);
        console.log(`Toplam etiket (ebat x 4 mevsim): ${ebatMap.size * 4}`);
        console.log(`Yeni eklenen: ${inserted}`);
        console.log(`Guncellenen: ${updated}`);

        // Istatistikler
        const stats = await webtagsCollection.aggregate([
            { $match: { type: 'tire_size' } },
            { $group: { _id: '$season', count: { $sum: 1 }, totalProducts: { $sum: '$productCount' } } },
            { $sort: { _id: 1 } }
        ]).toArray();

        console.log('\n=== MEVSIM BAZLI ISTATISTIK ===');
        stats.forEach(s => {
            const seasonName = s._id === 'all' ? 'Tumu' : s._id === 'yaz' ? 'Yaz' : s._id === 'kis' ? 'Kis' : '4 Mevsim';
            console.log(`${seasonName}: ${s.count} etiket, ${s.totalProducts} urun`);
        });

        await mongoose.disconnect();
        console.log('\nTamamlandi');

    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

seedTireSizeTags();