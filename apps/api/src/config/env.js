const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const API_KOK = path.resolve(__dirname, '../..');

const DOSYALAR = {
    production: path.join(API_KOK, '.env.production'),
    local: path.join(API_KOK, '.env.local')
};

let yuklendi = false;

function yukle() {
    if (yuklendi) return yuklendi;

    const uretim = process.env.NODE_ENV === 'production';
    const birincilYol = uretim ? DOSYALAR.production : DOSYALAR.local;
    const yedekYol = uretim ? DOSYALAR.local : DOSYALAR.production;

    if (fs.existsSync(birincilYol)) dotenv.config({ path: birincilYol });

    const yedektenGelen = [];

    if (fs.existsSync(yedekYol)) {
        const yedek = dotenv.parse(fs.readFileSync(yedekYol));

        Object.entries(yedek).forEach(([anahtar, deger]) => {
            if (process.env[anahtar] === undefined) {
                process.env[anahtar] = deger;
                yedektenGelen.push(anahtar);
            }
        });
    }

    if (yedektenGelen.length) {
        console.warn(
            `[env] ${path.basename(birincilYol)} içinde bulunmayan ${yedektenGelen.length} ayar ` +
            `${path.basename(yedekYol)} dosyasından tamamlandı: ${yedektenGelen.join(', ')}`
        );
    }

    yuklendi = {
        birincil: birincilYol,
        yedek: fs.existsSync(yedekYol) ? yedekYol : null,
        yedektenGelen
    };

    return yuklendi;
}

module.exports = { yukle, DOSYALAR };
