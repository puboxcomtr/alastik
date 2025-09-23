const mongoose = require('mongoose');
const { runMigration } = require('../services/migrateToWebProduct');

async function testMigration() {
    try {
        console.log('MongoDB bağlantısı kontrol ediliyor...');

        const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin'; 

        if (!MONGODB_URI) {
            console.log('MongoDB URI tanımlanmamış');
            return;
        }

        await mongoose.connect(MONGODB_URI);
        console.log('MongoDB bağlantısı başarılı');

        // Migration çalıştır
        await runMigration();

    } catch (error) {
        console.error('Migration test hatası:', error);
    } finally {
        await mongoose.disconnect();
        console.log('MongoDB bağlantısı kapatıldı');
    }
}

testMigration();