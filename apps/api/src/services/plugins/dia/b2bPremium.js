/**
 * b2b Premium cari ayrımı — DIA cari kartındaki bir özel koddan belirlenir.
 * Hangi özel kod ve hangi değer Premium sayılır: DiaSettings.b2bPremium (customCodeNo, matchValue).
 */
// Karşılaştırma için sadeleştirir: küçük harf + I/İ/ı/i tek harfe iner ("PREMIUM", "Premium", "PREMİUM" aynı sayılır)
const normalize = v => String(v || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');

/**
 * Ayarlardan Premium kuralını çıkarır.
 * @returns {{ codeColumn: string, textColumn: string, matchValue: string } | null} özel kod no geçersizse null
 */
function getPremiumRule(settings) {
    const no = Number(settings?.b2bPremium?.customCodeNo);
    if (!Number.isInteger(no) || no < 1) return null;
    return {
        codeColumn: `ozelkod${no}kod`,
        textColumn: `ozelkod${no}`,
        matchValue: normalize(settings?.b2bPremium?.matchValue)
    };
}

/**
 * DIA cari kartı satırına göre Premium bilgisini döndürür.
 * @returns {{ premium: boolean, code: string }}
 */
function resolvePremium(row, rule) {
    if (!rule) return { premium: false, code: '' };
    const code = String(row?.[rule.codeColumn] || '').trim();
    const text = String(row?.[rule.textColumn] || '').trim();
    if (!code && !text) return { premium: false, code: '' };
    // Değer tanımlı değilse özel kodu dolu olan her cari Premium'dur
    if (!rule.matchValue) return { premium: true, code: code || text };
    const premium = normalize(code) === rule.matchValue || normalize(text).includes(rule.matchValue);
    return { premium, code: code || text };
}

module.exports = { getPremiumRule, resolvePremium };
