const normalize = v => String(v || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase('tr-TR').replace(/ı/g, 'i');

function getPremiumRule(settings) {
    const no = Number(settings?.b2bPremium?.customCodeNo);
    if (!Number.isInteger(no) || no < 1) return null;
    return {
        codeColumn: `ozelkod${no}kod`,
        textColumn: `ozelkod${no}`,
        matchValue: normalize(settings?.b2bPremium?.matchValue)
    };
}

function resolvePremium(row, rule) {
    if (!rule) return { premium: false, code: '' };
    const code = String(row?.[rule.codeColumn] || '').trim();
    const text = String(row?.[rule.textColumn] || '').trim();
    if (!code && !text) return { premium: false, code: '' };
    if (!rule.matchValue) return { premium: true, code: code || text };
    const premium = normalize(code) === rule.matchValue || normalize(text).includes(rule.matchValue);
    return { premium, code: code || text };
}

module.exports = { getPremiumRule, resolvePremium };
