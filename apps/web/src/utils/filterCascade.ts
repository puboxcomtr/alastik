import { getTireFilterOptions } from '@/src/services/filterService';

/**
 * URL'den aktif filtreleri toparla
 */
function extractActiveFilters(params: URLSearchParams): Record<string, string | undefined> {
    return {
        // Lastik
        genislik: params.get('genislik') || undefined,
        yanak: params.get('yanak') || undefined,
        jant: params.get('jant') || undefined,
        arac: params.get('arac') || undefined,
        marka: params.get('marka') || undefined,
        mevsim: params.get('mevsim') || undefined,
        oem: params.get('oem') || undefined,
        yukEndeksi: params.get('yukEndeksi') || undefined,
        hizEndeksi: params.get('hizEndeksi') || undefined,
        ozellik: params.get('ozellik') || undefined,
        uretim: params.get('uretim') || undefined,
        // Jant
        jantGenisligi: params.get('jantGenisligi') || undefined,
        jantCap: params.get('jantCap') || undefined,
        bijonSayisi: params.get('bijonSayisi') || undefined,
        bijon: params.get('bijon') || undefined,
        gobekCapi: params.get('gobekCapi') || undefined,
        et: params.get('et') || undefined,
        renk: params.get('renk') || undefined
    };
}

/**
 * Bir filtre değiştirildiğinde:
 * - URL'ye yeni filtreyi ekler/siler
 * - Backend'den cascading datası çeker
 * - Yeni seçim (justChanged) hariç, diğer filtrelerden listede olmayanları siler
 * - Temizlenmiş URLSearchParams döner
 */
export async function applyFilterWithCascade(
    currentParams: URLSearchParams,
    justChangedKey: string,
    newValue: string,
    context: { categorySlug?: string; tagSlug?: string; brandSlug?: string }
): Promise<URLSearchParams> {
    const params = new URLSearchParams(currentParams.toString());

    if (newValue === 'all' || !newValue) {
        params.delete(justChangedKey);
    } else {
        params.set(justChangedKey, newValue);
    }
    params.delete('page');

    const activeFilters = extractActiveFilters(params);

    try {
        const data = await getTireFilterOptions(
            context.categorySlug,
            context.tagSlug,
            context.brandSlug,
            activeFilters
        );

        if (data) {
            const checks: Array<{ k: string; list?: { value: string }[] }> = [
                // Lastik
                { k: 'genislik', list: data.widths },
                { k: 'yanak', list: data.aspects },
                { k: 'jant', list: data.rims },
                { k: 'arac', list: data.vehicleTypes },
                { k: 'marka', list: data.brands },
                { k: 'oem', list: data.oem },
                { k: 'yukEndeksi', list: data.loadIndex },
                { k: 'hizEndeksi', list: data.speedIndex },
                { k: 'uretim', list: data.productionYears },
                // Jant
                { k: 'jantGenisligi', list: data.jantGenislikleri },
                { k: 'jantCap', list: data.jantCaplari },
                { k: 'bijonSayisi', list: data.bijonSayilari },
                { k: 'bijon', list: data.bijonAraliklari },
                { k: 'gobekCapi', list: data.gobekCaplari },
                { k: 'et', list: data.etler },
                { k: 'renk', list: data.renkler }
            ];

            checks.forEach(({ k, list }) => {
                if (k === justChangedKey) return; // Kullanıcının az önceki seçimine dokunma
                const v = params.get(k);
                if (v && list && !list.some(o => String(o.value) === String(v))) {
                    params.delete(k);
                }
            });

            // Çoklu (virgüllü) filtreler için ayrı kontrol
            const checkMulti = (k: string, list?: { value: string }[]) => {
                if (k === justChangedKey) return;
                const v = params.get(k);
                if (!v || !list) return;
                const selected = v.split(',');
                const valid = selected.filter(s => list.some(o => o.value === s));
                if (valid.length !== selected.length) {
                    if (valid.length > 0) params.set(k, valid.join(','));
                    else params.delete(k);
                }
            };
            checkMulti('mevsim', data.seasons);
            checkMulti('ozellik', data.properties);
        }
    } catch (e) {
        console.error('Cascading cleanup hatası:', e);
    }

    return params;
}