
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const SMART_SEASON_SITES = new Set(['alastik']);
const SEASON_WORD_RE = /(?:4|d[öo]rt)\s*mevsim|all\s*season|yazl[ıi]k|k[ıi][şs]l[ıi]k|(?<![\p{L}\d])yaz(?![\p{L}\d])|(?<![\p{L}\d])k[ıi][şs](?![\p{L}\d])/iu;

const detectSeasonWord = (site, text) => {
    if (!SMART_SEASON_SITES.has(site) || !text) return null;
    const lowered = String(text).toLocaleLowerCase('tr');
    const m = lowered.match(SEASON_WORD_RE);
    if (!m) return null;
    const w = m[0];
    const code = /mevsim|season/.test(w) ? '4 Mevsim' : w.startsWith('y') ? 'Yaz' : 'Kış';
    const rest = (lowered.slice(0, m.index) + ' ' + lowered.slice(m.index + w.length)).replace(/\s+/g, ' ').trim();
    return { code, word: w, rest };
};

function buildSearchQueryConditions(site, q) {
    const conditions = [];
    const text = String(q || '').trim();
    if (text.length < 2) return conditions;

    const cleaned = text.replace(/[\s\-]+/g, '').toLowerCase();
    const rawTireMatch = cleaned.match(/(\d{3})\/?(\d{2})r?(\d{2})/i);
    let tireMatch = null;
    if (rawTireMatch) {
        const w = parseInt(rawTireMatch[1]);
        const a = parseInt(rawTireMatch[2]);
        const d = parseInt(rawTireMatch[3]);
        if (w >= 125 && w <= 355 && a >= 25 && a <= 85 && d >= 12 && d <= 24) tireMatch = rawTireMatch;
    }
    const isStockCode = !tireMatch && /^\d{5,}(-[\w]+)*$/.test(text);

    if (isStockCode) {
        const rgx = new RegExp(escapeRegex(text), 'i');
        conditions.push({ $or: [{ 'diaData.stokkartkodu': rgx }, { 'diaData.anabarkod': rgx }] });
        return conditions;
    }

    const season = detectSeasonWord(site, text);
    const freeText = season ? season.rest : text;
    if (season) conditions.push({ 'diaData.ozelkod1kodu': season.code });

    const rakam = freeText.replace(/[^0-9]/g, '');
    if (rakam.length >= 3) {
        const esnek = new RegExp(rakam.split('').join('\\D*'), 'i');
        const rakamOr = [{ 'diaData.ozelkod3kodu': esnek }];
        if (rakam.length >= 7) {
            rakamOr.push({ 'diaData.stokkartkodu': esnek });
            rakamOr.push({ 'diaData.aciklama': esnek });
        }
        conditions.push({ $or: rakamOr });
    }

    const kelimeler = freeText.split(/\s+/).filter(wd => wd.length >= 2 && /[a-zçğıiöşü]/i.test(wd) && !/\d/.test(wd));
    for (const word of kelimeler) {
        const rgx = new RegExp(escapeRegex(word), 'i');
        conditions.push({ $or: [{ 'diaData.aciklama': rgx }, { 'diaData.marka': rgx }] });
    }

    if (rakam.length < 3 && kelimeler.length === 0) {
        const rgx = new RegExp(escapeRegex(freeText), 'i');
        conditions.push({ $or: [
            { 'diaData.aciklama': rgx },
            { 'diaData.marka': rgx },
            { 'diaData.stokkartkodu': rgx },
            { 'diaData.anabarkod': rgx }
        ] });
    }

    return conditions;
}

module.exports = { escapeRegex, detectSeasonWord, buildSearchQueryConditions };
