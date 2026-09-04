/**
 * Ürün adından mevsim ve jant çapı türetir (sipariş kalemi ad snapshot'ı üzerinden).
 *
 * DiaStock'ta mevsim/çap yapısal alan değildir; vitrin arama uçları (server.js
 * /api/lastik/ebat-arama) bunu açıklama metninden regex ile türetir. Burada aynı
 * anahtar kelimeler kullanılır ki panel ile vitrin aynı ürünü aynı mevsime saysın.
 *
 * Örnekler:
 *   "Hankook Winter i'cept RS3 W462 185/65R15 88T"  -> { kind:'lastik', season:'kis',   rimInch:15 }
 *   "Pirelli Cinturato P7 245/50R19 105W XL"          -> { kind:'lastik', season:'yaz',   rimInch:19 }
 *   "Goodyear Vector 4Seasons 205/55R16 91V"          -> { kind:'lastik', season:'4mevsim', rimInch:16 }
 *   "LJA-GX389-01 6.0x15 4x98 ET40 58.6 Silver Jant"  -> { kind:'jant',   season:null,  rimInch:15 }
 *   "İzeltaş 4'lü Bijon Anahtarı"                      -> { kind:null,     season:null,  rimInch:null }
 */

const ALL_SEASON_RE = /4\s*mevsim|4\s*season|all\s*season|4seasons|allseason|dört\s*mevsim/i;
const WINTER_RE = /kış|kis\b|winter|snow|kar\s*lastiği/i;

// Lastik ebadı: 175/65R14, 255/45 ZR19, 205/55 R 16
const TIRE_SIZE_RE = /(\d{3})\s*\/\s*(\d{2,3})\s*Z?R\s*(\d{2})\b/i;

// Jant ölçüsü: 6.0x15, 7,5x17, 8x18  (genişlik 4-13, çap 12-24; 4x98 gibi PCD değerleri elenir)
const RIM_SIZE_RE = /\b(\d{1,2}(?:[.,]\d)?)\s*[xX]\s*(\d{2})\b/g;

const SEASON_LABELS = {
    yaz: 'Yaz',
    kis: 'Kış',
    '4mevsim': '4 Mevsim'
};

function detectSeason(name) {
    if (ALL_SEASON_RE.test(name)) return '4mevsim';
    if (WINTER_RE.test(name)) return 'kis';
    return 'yaz';
}

function parseTireSpec(rawName) {
    const name = String(rawName || '');
    if (!name) return { kind: null, season: null, rimInch: null };

    const tire = name.match(TIRE_SIZE_RE);
    if (tire) {
        const rim = parseInt(tire[3], 10);
        return {
            kind: 'lastik',
            season: detectSeason(name),
            rimInch: rim >= 12 && rim <= 24 ? rim : null
        };
    }

    RIM_SIZE_RE.lastIndex = 0;
    let m;
    while ((m = RIM_SIZE_RE.exec(name)) !== null) {
        const width = parseFloat(m[1].replace(',', '.'));
        const rim = parseInt(m[2], 10);
        if (width >= 4 && width <= 13 && rim >= 12 && rim <= 24) {
            return { kind: 'jant', season: null, rimInch: rim };
        }
    }

    return { kind: null, season: null, rimInch: null };
}

module.exports = { parseTireSpec, SEASON_LABELS };
