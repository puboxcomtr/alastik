const mongoose = require('mongoose');
const path = require('path');
const WheelSizeTireService = require('../../services/plugins/wheelsize/tire/WheelSizeTireService');

require('dotenv').config({ path: path.join(__dirname, '../../../.env.production') });

async function test() {
    try {
        console.log('\n=== WHEELSIZE TIRESVOTE SENKRONIZASYONU ===\n');

        console.log('1. MongoDB baglantisi kuruluyor...');
        const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
        await mongoose.connect(mongoUri);
        console.log('✓ MongoDB baglantisi basarili\n');

        const service = new WheelSizeTireService();

        console.log('2. WebProduct\'lar WheelSize desenleriyle eslestiriliyor...');
        const matchResults = await service.matchPatterns();
        console.log(`✓ Toplam Ürün: ${matchResults.stats.totalProducts}`);
        console.log(`✓ WheelSize Desen Sayısı: ${matchResults.stats.totalWheelsizePatterns}`);
        console.log(`✓ Eşleşen Ürün: ${matchResults.stats.matchedCount}`);
        console.log(`✓ Eşleşmeyen Ürün: ${matchResults.stats.unmatchedCount}`);
        console.log(`✓ WebWheelSize Collection'a Kaydedilen Pattern: ${matchResults.syncResult.totalPatterns}`);
        console.log(`  - Yeni Kayıt: ${matchResults.syncResult.saved}`);
        console.log(`  - Güncellenen: ${matchResults.syncResult.updated}\n`);

        console.log('3. Pattern rating\'leri, buy/not buy verileri ve materials çekiliyor...');
        console.log('   (Bu işlem uzun sürebilir - her pattern için API çağrısı yapılıyor)\n');
        await service.syncAllPatternRatings();
        console.log('✓ Tüm pattern verileri çekildi ve WebWheelSize güncellendi');
        console.log('✓ Article/Benchmark içerikleri blogs collection\'a kaydedildi\n');

        console.log('=== SENKRONIZASYON TAMAMLANDI ===\n');

        await mongoose.connection.close();
        console.log('MongoDB baglantisi kapatildi.');
        process.exit(0);

    } catch (error) {
        console.error('\n!!! HATA !!!');
        console.error('Mesaj:', error.message);
        console.error('Stack:', error.stack);

        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

test();