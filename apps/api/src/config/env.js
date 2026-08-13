/**
 * ORTAK ORTAM DEĞİŞKENİ YÜKLEYİCİSİ
 *
 * Sorun: server.js NODE_ENV'e göre .env.local / .env.production seçiyordu,
 * worker ise koşulsuz .env.production yüklüyordu. API sürecinde NODE_ENV
 * tanımlı olmadığı için iki süreç FARKLI dosyadan besleniyordu; bir dosyaya
 * eklenen ayar diğerine yansımıyordu. 8 Ağustos 2026'da .env.production'dan
 * MONGODB_URI düşünce worker iki gün boyunca çöküp durdu, API çalışmaya
 * devam ettiği için de fark edilmedi.
 *
 * Çözüm: her iki süreç de bu modülü kullanır. Seçilen dosya yüklendikten
 * sonra diğer dosya YEDEK olarak uygulanır — dotenv mevcut değerleri
 * ezmediği için seçilen dosya önceliğini korur, yalnızca eksik anahtarlar
 * tamamlanır. Yedekten gelen anahtarlar uyarı olarak yazılır ki sapma
 * sessizce sürmesin.
 */
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const API_KOK = path.resolve(__dirname, '../..');

const DOSYALAR = {
    production: path.join(API_KOK, '.env.production'),
    local: path.join(API_KOK, '.env.local')
};

let yuklendi = false;

/**
 * Ortam dosyalarını yükler. Birden fazla çağrılırsa ilk çağrı geçerlidir.
 * @returns {{ birincil: string, yedek: string|null, yedektenGelen: string[] }}
 */
function yukle() {
    if (yuklendi) return yuklendi;

    const uretim = process.env.NODE_ENV === 'production';
    const birincilYol = uretim ? DOSYALAR.production : DOSYALAR.local;
    const yedekYol = uretim ? DOSYALAR.local : DOSYALAR.production;

    if (fs.existsSync(birincilYol)) dotenv.config({ path: birincilYol });

    const yedektenGelen = [];

    // Yedek dosyadaki anahtarlardan yalnızca hâlâ tanımsız olanlar alınır
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
