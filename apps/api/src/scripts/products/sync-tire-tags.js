/**
 * Lastik etiket senkronizasyon scripti (CLI)
 *
 * Kullanım:
 *   node apps/api/src/scripts/products/sync-tire-tags.js --dry-run --limit=5
 *   node apps/api/src/scripts/products/sync-tire-tags.js --limit=100
 *   node apps/api/src/scripts/products/sync-tire-tags.js
 */

const mongoose = require('mongoose');
const TireTagSyncService = require('../../services/plugins/tag/TireTagSyncService');

const MONGO_URI = 'mongodb://alastik:34gm4191M.@217.195.202.170:27017/alastik_db?authSource=admin';

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const limitArg = args.find(a => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : 0;

async function main() {
    console.log('========================================');
    console.log('LASTİK ETİKET SENKRONİZASYON SCRIPTI');
    console.log('========================================');
    console.log(`Mod         : ${DRY_RUN ? 'DRY RUN (DB güncellenmeyecek)' : 'CANLI'}`);
    console.log(`Limit       : ${LIMIT > 0 ? LIMIT : 'Sınırsız'}`);
    console.log('========================================\n');

    await mongoose.connect(MONGO_URI);
    console.log('MongoDB bağlantısı kuruldu\n');

    const { stats } = await TireTagSyncService.sync({
        dryRun: DRY_RUN,
        limit: LIMIT,
        onProgress: ({ processed, total }) => {
            console.log(`İşlenen: ${processed}/${total}`);
        }
    });

    console.log('\n========================================');
    console.log('İŞLEM SONUÇLARI');
    console.log('========================================');
    console.log(`İşlenen ürün             : ${stats.processedProducts}`);
    console.log(`Ölçüsü olmayan (atlandı) : ${stats.skippedNoOlcu}`);
    console.log(`Ölçü formatı bozuk       : ${stats.skippedFormat}`);
    console.log(`Sadece ölçü match        : ${stats.matchedSizeOnly}`);
    console.log(`Ölçü+mevsim match        : ${stats.matchedSizeSeason}`);
    console.log(`Ölçü+marka+mevsim match  : ${stats.matchedBrandSizeSeason}`);
    console.log(`Hiç eşleşmeyen ürün      : ${stats.productsWithoutAnyMatch}`);
    console.log(`Eşleşen toplam etiket    : ${stats.tagsToUpdate}`);

    if (DRY_RUN) {
        console.log('\n[DRY RUN] DB güncellenmedi.');
    } else {
        console.log(`\nDB güncellendi: matched=${stats.dbMatched}, modified=${stats.dbModified}`);
    }

    await mongoose.disconnect();
    console.log('\nMongoDB bağlantısı kapatıldı.');
}

main().catch(err => {
    console.error('HATA:', err);
    mongoose.disconnect();
    process.exit(1);
});