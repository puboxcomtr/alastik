const path = require('path');
const TranslateService = require('../services/plugins/translate/TranslateService');

require('dotenv').config({ path: path.join(__dirname, '../../.env.production') });

async function test() {
    try {
        console.log('TranslateService test basliyor...\n');

        const translator = new TranslateService();

        // Test 1: Tek metin
        console.log('Test 1: Tek metin');
        const single = await translator.translateText('Dry Performance');
        console.log(`"Dry Performance" -> "${single}"\n`);

        // Test 2: Toplu çeviri
        console.log('Test 2: Toplu çeviri');
        const batch = await translator.translateBatch([
            'Wet Performance',
            'Handling',
            'Comfort',
            'Price/Quality',
            'Treadwear'
        ]);
        console.log('Sonuçlar:');
        batch.forEach((tr, i) => console.log(`${i + 1}. ${tr}`));

        console.log('\nTest basarili!');
        process.exit(0);

    } catch (error) {
        console.error('HATA:', error.message);
        process.exit(1);
    }
}

test();