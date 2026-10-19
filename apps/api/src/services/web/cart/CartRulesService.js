
const MONTAGE_NAME_PATTERN = /lastik montaj/i;
const SERVICE_CATEGORY = 'Hizmetlerimiz';
const TIRE_TYPE_CODE = 'LASTİK';
const SECOND_HAND_CATEGORY = 'İkinci El';
const RIM_MAX_OPEN = 99;
const OWN_TIRE_MAX_QUANTITY = 8;

const parseRimRange = (name) => {
    const s = String(name || '');
    const between = s.match(/(\d{2})\s*(?:"|''|inç)?\s*(?:ile|-)\s*(\d{2})/i);
    if (between) return { min: Number(between[1]), max: Number(between[2]) };
    const over = s.match(/(\d{2})\s*(?:"|''|inç)?\s*ve\s*(?:üzeri|üstü)/i);
    if (over) return { min: Number(over[1]), max: RIM_MAX_OPEN };
    return null;
};

const isMontageServiceName = (name) => MONTAGE_NAME_PATTERN.test(String(name || ''));

const describeProduct = (product) => {
    const dia = product?.diaData || {};
    const name = dia.aciklama || '';
    const isService = (dia.m_kategoriler || []).some(k => k.kategori_aciklama_1 === SERVICE_CATEGORY);
    if (isService) {
        return isMontageServiceName(name)
            ? { itemType: 'montage', rimSize: null, rimRange: parseRimRange(name) }
            : { itemType: 'service', rimSize: null, rimRange: null };
    }
    const isSecondHand = (dia.m_kategoriler || []).some(k => String(k.kategori_aciklama_1 || '').startsWith(SECOND_HAND_CATEGORY));
    if (dia.ozelkod7kodu === TIRE_TYPE_CODE && !isSecondHand) {
        const rim = parseInt(String(dia.ozelkod4kodu || '').replace(/\D/g, ''), 10);
        return { itemType: 'tire', rimSize: Number.isFinite(rim) ? rim : null, rimRange: null };
    }
    return { itemType: 'product', rimSize: null, rimRange: null };
};

const inRange = (rim, range) => Boolean(range) && rim !== null && rim !== undefined && rim >= range.min && rim <= range.max;

const tireCountForRange = (items, range) =>
    items.filter(i => i.itemType === 'tire' && inRange(i.rimSize, range)).reduce((sum, i) => sum + (i.quantity || 0), 0);

const hasTires = (items) => items.some(i => i.itemType === 'tire');
const hasMontage = (items) => items.some(i => i.itemType === 'montage');

const tireRimList = (items) =>
    [...new Set(items.filter(i => i.itemType === 'tire' && i.rimSize !== null && i.rimSize !== undefined).map(i => i.rimSize))]
        .sort((a, b) => a - b).join(', ');

const validateAdd = (items, entry) => {
    if (entry.itemType !== 'montage' && entry.itemType !== 'service') return { quantity: entry.quantity };

    const otherPoint = items.find(i =>
        (i.itemType === 'montage' || i.itemType === 'service') && i.montagePointId && entry.montagePointId && i.montagePointId !== entry.montagePointId
    );
    if (otherPoint) return { error: 'Hizmetler tek bir montaj noktasından seçilebilir. Önce sepetteki hizmetleri kaldırın.' };

    if (entry.itemType === 'montage') {
        if (entry.ownTire) return { quantity: Math.max(1, Math.min(entry.quantity, OWN_TIRE_MAX_QUANTITY)) };
        if (!hasTires(items)) return { error: 'Montaj hizmeti yalnızca sıfır lastik ürünleriyle birlikte satın alınabilir.' };
        const count = tireCountForRange(items, entry.rimRange);
        if (count === 0) {
            return { error: `Bu montaj hizmeti sepetinizdeki lastiklere uygun değil (jant çapı: ${tireRimList(items)}). Lastiklerinize uygun montajı seçin.` };
        }
        return { quantity: Math.min(entry.quantity, count) };
    }

    if (!hasMontage(items)) return { error: 'Diğer hizmetleri seçebilmek için önce lastik montajı hizmeti ekleyin.' };
    return { quantity: entry.quantity };
};

const validateQuantity = (items, item, newQuantity) => {
    if (item.itemType === 'montage' && item.ownTire) {
        return newQuantity > OWN_TIRE_MAX_QUANTITY ? { error: `Montaj adedi en fazla ${OWN_TIRE_MAX_QUANTITY} olabilir.` } : {};
    }
    if (item.itemType === 'montage') {
        const cap = tireCountForRange(items, item.rimRange);
        if (cap > 0 && newQuantity > cap) {
            return { error: `Montaj adedi sepetinizdeki lastik adedini (${cap}) aşamaz.` };
        }
    }
    return {};
};

const reconcile = (items) => {
    const notes = [];
    let changed = false;
    let result = items.map(i => ({ ...i }));

    if (!hasTires(result) && result.some(i => i.itemType === 'montage' && !i.ownTire)) {
        result = result.filter(i => i.itemType !== 'montage' || i.ownTire);
        changed = true;
        notes.push('Sıfır lastik olmadığı için montaj hizmeti sepetten çıkarıldı');
    }

    for (const item of result) {
        if (item.itemType !== 'montage' || item.ownTire) continue;
        const count = tireCountForRange(result, item.rimRange);
        if (count > 0 && item.quantity > count) {
            item.quantity = count;
            changed = true;
            notes.push(`${item.productName} adedi lastik adedine (${count}) düşürüldü`);
        }
    }

    if (!hasMontage(result)) {
        const dropped = result.filter(i => i.itemType === 'service');
        if (dropped.length > 0) {
            result = result.filter(i => i.itemType !== 'service');
            changed = true;
            notes.push('Montaj hizmeti olmadığı için diğer hizmetler sepetten çıkarıldı');
        }
    }

    return { items: result, changed, notes };
};

module.exports = {
    MONTAGE_NAME_PATTERN,
    parseRimRange,
    isMontageServiceName,
    describeProduct,
    validateAdd,
    validateQuantity,
    reconcile,
    tireCountForRange,
    hasMontage,
    hasTires
};
