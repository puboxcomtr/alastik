/**
 * Sepet kuralları — montaj hizmetleri
 *
 * - Lastik sepetteyse montaj hizmeti lastiğin jant çapına uygun olmalı (hizmet adındaki aralık:
 *   13" ile 16" / 17" ile 18" / 19" ve Üzeri) ve adedi o çaptaki lastik adedine EŞİTLENİR.
 * - Lastik yoksa montaj adedi serbesttir (müşteri kendi lastiğini getirir).
 * - Diğer hizmetler (rot, jant pres, sibop…) ancak sepette montaj varken eklenebilir;
 *   montaj çıkarılırsa diğer hizmetler de sepetten düşer.
 * - Hizmetler tek bir montaj noktasından seçilebilir.
 */

const MONTAGE_NAME_PATTERN = /lastik montaj/i;
const SERVICE_CATEGORY = 'Hizmetlerimiz';
const TIRE_TYPE_CODE = 'LASTİK';
const RIM_MAX_OPEN = 99;

/** "13\" ile 16\" Arası …" → {min:13,max:16}; "19\" ve Üzeri …" → {min:19,max:99}; yoksa null */
const parseRimRange = (name) => {
    const s = String(name || '');
    const between = s.match(/(\d{2})\s*(?:"|''|inç)?\s*(?:ile|-)\s*(\d{2})/i);
    if (between) return { min: Number(between[1]), max: Number(between[2]) };
    const over = s.match(/(\d{2})\s*(?:"|''|inç)?\s*ve\s*(?:üzeri|üstü)/i);
    if (over) return { min: Number(over[1]), max: RIM_MAX_OPEN };
    return null;
};

const isMontageServiceName = (name) => MONTAGE_NAME_PATTERN.test(String(name || ''));

/** Ürün kartından sepet kalemi türünü çıkarır: tire | montage | service | product */
const describeProduct = (product) => {
    const dia = product?.diaData || {};
    const name = dia.aciklama || '';
    const isService = (dia.m_kategoriler || []).some(k => k.kategori_aciklama_1 === SERVICE_CATEGORY);
    if (isService) {
        return isMontageServiceName(name)
            ? { itemType: 'montage', rimSize: null, rimRange: parseRimRange(name) }
            : { itemType: 'service', rimSize: null, rimRange: null };
    }
    if (dia.ozelkod7kodu === TIRE_TYPE_CODE) {
        const rim = parseInt(String(dia.ozelkod4kodu || '').replace(/\D/g, ''), 10);
        return { itemType: 'tire', rimSize: Number.isFinite(rim) ? rim : null, rimRange: null };
    }
    return { itemType: 'product', rimSize: null, rimRange: null };
};

const inRange = (rim, range) => Boolean(range) && rim !== null && rim !== undefined && rim >= range.min && rim <= range.max;

/** Belirtilen çap aralığındaki lastik adedi toplamı */
const tireCountForRange = (items, range) =>
    items.filter(i => i.itemType === 'tire' && inRange(i.rimSize, range)).reduce((sum, i) => sum + (i.quantity || 0), 0);

const hasTires = (items) => items.some(i => i.itemType === 'tire');
const hasMontage = (items) => items.some(i => i.itemType === 'montage');

/** Sepetteki lastik çaplarını "16, 17" gibi listeler (uyarı metni için) */
const tireRimList = (items) =>
    [...new Set(items.filter(i => i.itemType === 'tire' && i.rimSize !== null && i.rimSize !== undefined).map(i => i.rimSize))]
        .sort((a, b) => a - b).join(', ');

/**
 * Sepete eklenecek kalemi doğrular. Dönüş: { error } veya { quantity } (montajda lastik adedine zorlanır)
 * @param items mevcut sepet kalemleri (düz nesneler)
 * @param entry { itemType, rimRange, montagePointId, quantity }
 */
const validateAdd = (items, entry) => {
    if (entry.itemType !== 'montage' && entry.itemType !== 'service') return { quantity: entry.quantity };

    const otherPoint = items.find(i =>
        (i.itemType === 'montage' || i.itemType === 'service') && i.montagePointId && entry.montagePointId && i.montagePointId !== entry.montagePointId
    );
    if (otherPoint) return { error: 'Hizmetler tek bir montaj noktasından seçilebilir. Önce sepetteki hizmetleri kaldırın.' };

    if (entry.itemType === 'montage') {
        if (!hasTires(items)) return { quantity: entry.quantity };
        const count = tireCountForRange(items, entry.rimRange);
        if (count === 0) {
            return { error: `Bu montaj hizmeti sepetinizdeki lastiklere uygun değil (jant çapı: ${tireRimList(items)}). Lastiklerinize uygun montajı seçin.` };
        }
        return { quantity: count };
    }

    // Diğer hizmet: önce montaj gerekli
    if (!hasMontage(items)) return { error: 'Diğer hizmetleri seçebilmek için önce lastik montajı hizmeti ekleyin.' };
    return { quantity: entry.quantity };
};

/** Adet güncellemesini doğrular: lastikli sepette montaj adedi elle değiştirilemez */
const validateQuantity = (items, item) => {
    if (item.itemType === 'montage' && tireCountForRange(items, item.rimRange) > 0) {
        return { error: 'Montaj adedi sepetinizdeki lastik adedine göre otomatik belirlenir.' };
    }
    return {};
};

/**
 * Sepeti kurallarla tutarlı hâle getirir (ekleme/güncelleme/silme sonrası ve her okumada):
 * montaj adedi lastik adedine eşitlenir, montajsız kalan diğer hizmetler düşer.
 * Dönüş: { items, changed, notes }
 */
const reconcile = (items) => {
    const notes = [];
    let changed = false;
    let result = items.map(i => ({ ...i }));

    for (const item of result) {
        if (item.itemType !== 'montage') continue;
        const count = tireCountForRange(result, item.rimRange);
        if (count > 0 && item.quantity !== count) {
            item.quantity = count;
            changed = true;
            notes.push(`${item.productName} adedi lastik adedine (${count}) eşitlendi`);
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
