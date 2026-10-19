const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';

async function seedRimTags() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB baglantisi basarili');

        const db = mongoose.connection.db;

        const products = await db.collection('webproducts').find({
            'diaData.durum': 'A',
            'diaData.ozelkod7kodu': 'JANT',
            'diaData.ozelkod3kodu': { $exists: true, $ne: '' }
        }).project({
            _key: 1,
            'diaData.ozelkod3kodu': 1
        }).toArray();

        console.log(`Toplam ${products.length} jant urunu bulundu`);

        const pcdMap = new Map();

        for (const product of products) {
            const pcd = product.diaData?.ozelkod3kodu?.trim();

            if (!pcd) continue;

            if (!/^\d+[Xx]\d+(\.\d+)?$/.test(pcd)) continue;

            const pcdUpper = pcd.toUpperCase();

            if (!pcdMap.has(pcdUpper)) {
                pcdMap.set(pcdUpper, []);
            }

            pcdMap.get(pcdUpper).push(product._key);
        }

        console.log(`Toplam ${pcdMap.size} farkli PCD bulundu`);

        const webtagsCollection = db.collection('webtags');
        let inserted = 0;
        let updated = 0;

        for (const [pcd, productKeys] of pcdMap) {
            const urlPcd = pcd.toLowerCase().replace('x', '-').replace('.', '');
            const seoUrl = `${urlPcd}-jant-fiyatlari`;

            const tagData = {
                title: `${pcd} Jant Fiyatları`,
                description: '',
                seoTitle: `${pcd} Jant Fiyatları ve Modelleri`,
                seoDescription: `${pcd} jant secenekleri`,
                seoUrl: seoUrl,
                products: productKeys,
                productCount: productKeys.length,
                isActive: productKeys.length > 0,
                order: 999,
                type: 'rim_pcd',
                pcd: pcd,
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

        console.log('\n=== SONUC ===');
        console.log(`Toplam PCD: ${pcdMap.size}`);
        console.log(`Yeni eklenen: ${inserted}`);
        console.log(`Guncellenen: ${updated}`);

        const stats = await webtagsCollection.aggregate([
            { $match: { type: 'rim_pcd' } },
            {
                $group: {
                    _id: null,
                    count: { $sum: 1 },
                    totalProducts: { $sum: '$productCount' }
                }
            }
        ]).toArray();

        if (stats.length > 0) {
            console.log('\n=== ISTATISTIK ===');
            console.log(`Toplam etiket: ${stats[0].count}`);
            console.log(`Toplam urun: ${stats[0].totalProducts}`);
        }

        const topPcds = await webtagsCollection.find({ type: 'rim_pcd' })
            .sort({ productCount: -1 })
            .limit(10)
            .toArray();

        console.log('\n=== EN COK URUN OLAN PCDler ===');
        topPcds.forEach(tag => {
            console.log(`${tag.pcd}: ${tag.productCount} urun`);
        });

        await mongoose.disconnect();
        console.log('\nTamamlandi');

    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

seedRimTags();