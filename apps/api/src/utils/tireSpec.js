
const ALL_SEASON_RE = /4\s*mevsim|4\s*season|all\s*season|4seasons|allseason|dört\s*mevsim/i;
const WINTER_RE = /kış|kis\b|winter|snow|kar\s*lastiği/i;

const TIRE_SIZE_RE = /(\d{3})\s*\/\s*(\d{2,3})\s*Z?R\s*(\d{2})\b/i;

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
