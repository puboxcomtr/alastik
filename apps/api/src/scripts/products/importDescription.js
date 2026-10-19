const mongoose = require('mongoose');
const path = require('path');
const XLSX = require('xlsx');

async function importDescriptions() {
    try {
        const mongoUri = 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';
        await mongoose.connect(mongoUri);
        console.log('MongoDB bağlantısı başarılı\n');
        const WebProduct = require('../../models/web/catalog/WebProduct');

        const wb = XLSX.readFile(path.join(__dirname, '../../../public/urun/aciklama.xls'));
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        console.log(`Excel'den ${data.length} satır okundu\n`);

        let updated = 0;
        let notFound = 0;
        let alreadyFilled = 0;
        let errors = 0;

        for (const row of data) {
            const model = (row['Model            '] || '').trim();
            const content = (row['__EMPTY'] || '').trim();

            if (!model || !content) {
                errors++;
                continue;
            }

            try {
                const result = await WebProduct.updateMany(
                    {
                        'diaData.ozelkod5kodu': model,
                        $or: [
                            { 'customData.customDescription': null },
                            { 'customData.customDescription': '' },
                            { 'customData.customDescription': { $exists: false } }
                        ]
                    },
                    {
                        $set: {
                            'customData.customDescription': content
                        }
                    }
                );

                if (result.matchedCount > 0) {
                    updated += result.modifiedCount;
                    console.log(`✓ ${model}: ${result.modifiedCount} ürün güncellendi`);
                } else {
                    const filledCount = await WebProduct.countDocuments({
                        'diaData.ozelkod5kodu': model,
                        'customData.customDescription': { $ne: null, $exists: true }
                    });

                    if (filledCount > 0) {
                        alreadyFilled++;
                        console.log(`- ${model}: ${filledCount} ürün zaten dolu, atlandı`);
                    } else {
                        notFound++;
                        console.log(`✗ ${model}: eşleşen ürün bulunamadı`);
                    }
                }
            } catch (err) {
                errors++;
                console.error(`! ${model}: hata - ${err.message}`);
            }
        }

        console.log('\n=== SONUÇ ===');
        console.log(`Toplam satır: ${data.length}`);
        console.log(`Güncellenen ürün: ${updated}`);
        console.log(`Zaten dolu: ${alreadyFilled}`);
        console.log(`Eşleşmeyen model: ${notFound}`);
        console.log(`Hata: ${errors}`);

        await mongoose.connection.close();
        process.exit(0);

    } catch (error) {
        console.error('HATA:', error.message);
        if (mongoose.connection.readyState === 1) {
            await mongoose.connection.close();
        }
        process.exit(1);
    }
}

importDescriptions();