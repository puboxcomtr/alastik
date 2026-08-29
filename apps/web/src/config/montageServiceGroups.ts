// Montaj noktası hizmet listesi sıralaması: eşleşen gruplar bu sırayla en üstte,
// eşleşmeyen hizmetler kendi sırasıyla en sonda gösterilir (gruplar arasına ayraç çizilir)
export const MONTAGE_SERVICE_GROUPS: { key: string; pattern: RegExp }[] = [
    { key: 'lastik-montaji', pattern: /lastik montaj/i },
    { key: 'rot-ayari', pattern: /rot\s*(\+|-)?\s*(balans\s*)?ayar/i },
    { key: 'jant-pres', pattern: /jant pres/i },
];

/** Hizmetleri gruplara böler; boş gruplar atlanır, son grup "diğer" hizmetlerdir */
export function groupMontageServices<T extends { name: string }>(services: T[]): T[][] {
    const groups: T[][] = MONTAGE_SERVICE_GROUPS.map(() => []);
    const rest: T[] = [];
    for (const service of services) {
        const idx = MONTAGE_SERVICE_GROUPS.findIndex(g => g.pattern.test(service.name));
        if (idx >= 0) groups[idx].push(service);
        else rest.push(service);
    }
    return [...groups, rest].filter(g => g.length > 0);
}
