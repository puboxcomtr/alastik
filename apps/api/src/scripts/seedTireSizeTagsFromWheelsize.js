// apps/api/src/scripts/seedTireSizeTagsFromWheelsize.js
const mongoose = require('mongoose');
require('dotenv').config();

const WheelSizeService = require('../services/plugins/wheelsize/WheelSizeService');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';

// Mevsim tipleri
const SEASONS = [
    { key: 'all', title: '', urlSuffix: '' },
    { key: 'summer', title: 'Yaz', urlSuffix: '-yaz' },
    { key: 'winter', title: 'Kış', urlSuffix: '-kis' },
    { key: 'all_season', title: '4 Mevsim', urlSuffix: '-4-mevsim' }
];

async function seedTireSizeTagsFromWheelsize() {
    try {
        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB bağlantısı başarılı');

        const db = mongoose.connection.db;
        const webtagsCollection = db.collection('webtags');

        // 1. Wheelsize API'den lastik ebat verilerini çek
        console.log('\nWheelsize API\'den veriler çekiliyor...');

        const [widths, aspectRatios, rimDiameters] = await Promise.all([
            WheelSizeService.getTireSectionWidths(),
            WheelSizeService.getTireAspectRatios(),
            WheelSizeService.getTireRimDiameters()
        ]);

        const widthValues = widths.map(w => w.value).sort((a, b) => a - b);
        const aspectValues = aspectRatios.map(a => a.value).sort((a, b) => a - b);
        const rimValues = rimDiameters.map(r => r.value).sort((a, b) => a - b);

        console.log(`Genişlikler (${widthValues.length}): ${widthValues.join(', ')}`);
        console.log(`Yanaklar (${aspectValues.length}): ${aspectValues.join(', ')}`);
        console.log(`Jant Çapları (${rimValues.length}): ${rimValues.join(', ')}`);

        const totalKombinasyon = widthValues.length * aspectValues.length * rimValues.length;
        const totalEtiket = totalKombinasyon * SEASONS.length;
        console.log(`\nToplam kombinasyon: ${totalKombinasyon}`);
        console.log(`Toplam etiket (x${SEASONS.length} mevsim): ${totalEtiket}`);

        // 2. Tüm kombinasyonları oluştur ve webtags'e aktar
        let inserted = 0;
        let skipped = 0;
        let processed = 0;

        for (const genislik of widthValues) {
            for (const yanak of aspectValues) {
                for (const jantCapi of rimValues) {
                    const ebatStr = `${genislik} ${yanak} R${jantCapi}`;

                    for (const season of SEASONS) {
                        const titlePrefix = season.title ? `${season.title} ` : '';
                        const seoUrl = `${genislik}-${yanak}-r${jantCapi}${season.urlSuffix}-lastik-fiyatlari`;

                        const tagData = {
                            title: `${ebatStr} ${titlePrefix}Lastik Fiyatları`.trim(),
                            description: '',
                            seoTitle: `${ebatStr} ${titlePrefix}Lastik Fiyatları ve Modelleri`.trim(),
                            seoDescription: `${ebatStr} ${titlePrefix}lastik seçenekleri`.trim().toLowerCase(),
                            seoUrl: seoUrl,
                            products: [],
                            productCount: 0,
                            isActive: true,
                            order: 999,
                            type: 'tire_size',
                            season: season.key,
                            updatedAt: new Date()
                        };

                        // Var olan etiketi atla
                        const exists = await webtagsCollection.findOne({ seoUrl: seoUrl }, { projection: { _id: 1 } });
                        if (exists) {
                            skipped++;
                            continue;
                        }

                        await webtagsCollection.insertOne({
                            ...tagData,
                            createdAt: new Date()
                        });
                        inserted++;
                    }

                    processed++;
                    if (processed % 500 === 0) {
                        console.log(`İlerleme: ${processed}/${totalKombinasyon} kombinasyon işlendi...`);
                    }
                }
            }
        }

        // 3. Sonuç istatistikleri
        console.log('\n=== SONUÇ ===');
        console.log(`Toplam kombinasyon: ${totalKombinasyon}`);
        console.log(`Toplam etiket: ${totalEtiket}`);
        console.log(`Yeni eklenen: ${inserted}`);
        console.log(`Atlanan (zaten var): ${skipped}`);

        // Mevsim bazlı istatistik
        const stats = await webtagsCollection.aggregate([
            { $match: { type: 'tire_size' } },
            { $group: { _id: '$season', count: { $sum: 1 } } },
            { $sort: { _id: 1 } }
        ]).toArray();

        console.log('\n=== MEVSİM BAZLI İSTATİSTİK ===');
        const seasonLabels = { all: 'Tümü', summer: 'Yaz', winter: 'Kış', all_season: '4 Mevsim' };
        stats.forEach(s => {
            console.log(`${seasonLabels[s._id] || s._id}: ${s.count} etiket`);
        });

        const totalInDb = await webtagsCollection.countDocuments({ type: 'tire_size' });
        console.log(`\nVeritabanındaki toplam tire_size etiket: ${totalInDb}`);

        await mongoose.disconnect();
        console.log('\nTamamlandı.');

    } catch (error) {
        console.error('Hata:', error);
        process.exit(1);
    }
}

seedTireSizeTagsFromWheelsize();