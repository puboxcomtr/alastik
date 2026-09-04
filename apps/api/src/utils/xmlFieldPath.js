/**
 * XML alan eşleştirme yollarını çözer — köşeli parantez içinde iki yazım desteklenir:
 *
 *  1) Dizin ile:   "STOK.DEPO[0].FIYATLAR.FIYAT[0]._"
 *  2) Koşul ile:   "STOK.DEPO[DEPOID=0].STOKMIKTAR"
 *
 * Koşullu yazım, listedeki sıraya değil alan değerine bakar. Tedarikçi aynı
 * içeriği farklı sırada gönderdiğinde dizinli yazım yanlış öğeyi okur; koşullu
 * yazım her zaman doğru öğeyi bulur (örn. ünver'in "Tüm Depolar" satırı).
 *
 * Tek öğeli listeler XML ayrıştırıcı tarafından düz nesneye indirgenebildiği için
 * koşullu arama nesneyi de tek elemanlı liste gibi değerlendirir.
 * (Route tarafındaki getNestedValue ile aynı ayrıştırma kuralı.)
 */
function getXmlFieldValue(obj, path) {
    if (!path) return null;

    const parts = String(path).match(/[^.\[\]]+/g) || [];
    let current = obj;

    for (const part of parts) {
        if (current === null || current === undefined) return null;

        const separatorIndex = part.indexOf('=');
        if (separatorIndex > 0) {
            const fieldName = part.slice(0, separatorIndex).trim();
            const fieldValue = part.slice(separatorIndex + 1).trim();
            const items = Array.isArray(current) ? current : [current];
            current = items.find(item =>
                item !== null &&
                typeof item === 'object' &&
                String(item[fieldName] ?? '').trim() === fieldValue
            );
            continue;
        }

        current = current[part];
    }

    return current === undefined ? null : current;
}

module.exports = { getXmlFieldValue };
