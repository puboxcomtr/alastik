
const mongoose = require('mongoose');
const path = require('path');
const WheelSizeTireService = require('../services/plugins/wheelsize/tire/WheelSizeTireService');

// .env dosyasını doğru konumdan yükle
require('dotenv').config({ path: path.join(__dirname, '../../.env.production') });

async function test() {
    try {
        console.log('MongoDB baglantisi kuruluyor...');

        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        if (!mongoUri) {
            throw new Error('.env.production dosyasinda MONGODB_URI bulunamadi!');
        }

        await mongoose.connect(mongoUri);
        console.log('Baglanti basarili!\n');

        const service = new WheelSizeTireService();
        const results = await service.matchPatterns();

        console.log('\n--- SONUÇLAR ---');
        console.log(`Toplam Ürün: ${results.stats.totalProducts}`);
        console.log(`Eşleşen: ${results.stats.matchedCount}`);
        console.log(`Eşleşmeyen: ${results.stats.unmatchedCount}`);
        console.log(`\nWebWheelSize Sync:`);
        console.log(`- Toplam Pattern: ${results.syncResult.totalPatterns}`);
        console.log(`- Yeni Kayıt: ${results.syncResult.saved}`);
        console.log(`- Güncellenen: ${results.syncResult.updated}`);
        console.log('\nRating\'ler çekiliyor...');
        await service.syncAllPatternRatings();
        console.log('Tüm rating\'ler çekildi!');



        await mongoose.connection.close();
        console.log('Baglanti kapatildi.');
        process.exit(0);

    } catch (error) {
        console.error('HATA:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

test();