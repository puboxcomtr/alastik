const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const sharp = require('sharp');

const uri = fs.readFileSync('.env.local', 'utf8').split('\n')
    .find(s => s.startsWith('MONGODB_URI=')).slice('MONGODB_URI='.length).trim();

const watermarkService = require('./src/services/media/WatermarkService');
const paths = require('./src/config/path');

const SITE = process.argv[2] || 'lastikjantavm';
const ES_ZAMANLI = 4;

sharp.concurrency(2);

(async () => {
    await mongoose.connect(uri);

    const ayar = await watermarkService.getAyarlar(SITE);

    if (!ayar.aktif || !ayar.gorsel) {
        console.log(`[${SITE}] filigran kapalı ya da görsel tanımsız — işlem yapılmadı`);
        await mongoose.disconnect();

        return;
    }

    console.log(`[${SITE}] ayarlar -> konum: ${ayar.konum} | açı: ${ayar.aci}° | genişlik: %${ayar.genislikYuzde} | opaklık: %${ayar.opaklikYuzde}`);

    const urunDizin = paths.getStaticPath('urun');
    const dosyalar = fs.readdirSync(urunDizin).filter(d => /\.(jpe?g|png|webp)$/i.test(d));

    console.log(`[${SITE}] ${dosyalar.length} görsel bulundu, üretim başlıyor...`);

    let sira = 0;
    let uretilen = 0;
    let atlanan = 0;
    let hatali = 0;

    const baslangic = Date.now();

    const isci = async () => {
        while (sira < dosyalar.length) {
            const index = sira++;
            const dosya = dosyalar[index];

            try {
                const sonuc = await watermarkService.filigranliDosya(SITE, `/urun/${dosya}`);

                if (sonuc) uretilen++;
                else atlanan++;
            } catch (error) {
                hatali++;

                if (hatali <= 10) console.log(`  hata: ${dosya} -> ${error.message}`);
            }

            const islenen = uretilen + atlanan + hatali;

            if (islenen % 1000 === 0) {
                const gecen = (Date.now() - baslangic) / 1000;
                const hiz = islenen / gecen;
                const kalan = Math.round((dosyalar.length - islenen) / hiz / 60);

                console.log(`  ${islenen}/${dosyalar.length} | üretilen: ${uretilen} | atlanan: ${atlanan} | hatalı: ${hatali} | ${hiz.toFixed(1)} görsel/sn | tahmini kalan: ${kalan} dk`);
            }
        }
    };

    await Promise.all(Array.from({ length: ES_ZAMANLI }, isci));

    const dakika = ((Date.now() - baslangic) / 60000).toFixed(1);

    console.log(`\n[${SITE}] TAMAMLANDI — üretilen: ${uretilen} | atlanan: ${atlanan} | hatalı: ${hatali} | süre: ${dakika} dk`);

    await mongoose.disconnect();
})().catch(err => {
    console.error('İşlem hatası:', err);
    process.exit(1);
});
