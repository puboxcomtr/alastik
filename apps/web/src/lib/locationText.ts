// Konum sayfası metinleri (LastikJantAVM) — her il/ilçe/mahalle için gerçek veriden üretilir
// (montaj noktası sayısı, en yakın nokta/şube mesafesi, bölgede tercih edilen ebatlar).
// Türkçe ek uyumu hatası olmaması için yer adlarına ek getirilmez ("bölgesinde" gibi kalıplar kullanılır).
// Cümle kalıpları konum adına göre sabit ama konumdan konuma farklı seçilir. alastik.com için ayrı kalıplar yazılacak.
import { fmtKm, pick } from '@/src/lib/geo';

interface Ctx {
    seed: string;
    place: string;            // "Ankara", "Kartal", "Cevizli"
    parent?: string;          // "İstanbul", "Kartal / İstanbul"
    pointCount: number;       // bölgedeki (il/ilçe) montaj noktası sayısı
    nearestKm?: number;       // en yakın montaj noktası
    nearestPlace?: string;    // en yakın noktanın il/ilçesi
    branch?: { name: string; km: number };
    topSize?: string;
}

export function locationIntro(c: Ctx): string[] {
    const where = c.parent ? `${c.place} (${c.parent})` : c.place;
    const p1 = pick(c.seed, 'p1', [
        `${where} için lastik, jant ve kar ekipmanını LastikJantAVM’den online sipariş edip montajını size en yakın noktada yaptırabilirsiniz. Sipariş sırasında montaj noktasını seçtiğinizde ürünler doğrudan o noktaya gönderilir.`,
        `${where} bölgesinde lastik arıyorsanız stoktaki binlerce ürün arasından ebadınıza uygun olanı seçip montaj noktasına teslim alabilirsiniz. Lastikleri eve taşımanıza gerek kalmaz.`,
        `LastikJantAVM ile ${where} adresinize lastik siparişi verebilir ya da montajın yapılacağı noktayı seçerek ürünleri doğrudan servise gönderebilirsiniz.`
    ]);

    let p2: string;
    if (c.branch && c.branch.km <= 15) {
        p2 = pick(c.seed, 'p2b', [
            `${c.place} bölgesine en yakın şubemiz ${c.branch.name}; yaklaşık ${fmtKm(c.branch.km)} uzaklıkta. Montaj, mantar yama, rot balans ve lastik oteli gibi hizmetleri şubemizde alabilirsiniz.`,
            `${c.branch.name} şubemiz ${c.place} bölgesine yaklaşık ${fmtKm(c.branch.km)} mesafede. Lastik tamiri, balans ayarı ve mevsimlik lastik değişimi için doğrudan şubeye gelebilirsiniz.`
        ]);
    } else if (c.pointCount > 0) {
        p2 = pick(c.seed, 'p2p', [
            `${c.place} sınırlarında ${c.pointCount} anlaşmalı montaj noktamız bulunuyor. Aşağıdaki listeden noktaların hizmetlerini ve konumlarını inceleyebilirsiniz.`,
            `Bölgede ${c.pointCount} montaj noktasıyla çalışıyoruz; siparişinizi verirken bu noktalardan birini seçmeniz yeterli.`
        ]);
    } else if (c.nearestKm !== undefined) {
        p2 = pick(c.seed, 'p2n', [
            `${c.place} içinde henüz anlaşmalı montaj noktamız yok; en yakın nokta yaklaşık ${fmtKm(c.nearestKm)} uzaklıkta${c.nearestPlace ? ` (${c.nearestPlace})` : ''}. Dilerseniz lastikleri adresinize gönderip yerel bir servise taktırabilirsiniz.`,
            `En yakın montaj noktamız ${c.nearestPlace ? `${c.nearestPlace} bölgesinde, ` : ''}yaklaşık ${fmtKm(c.nearestKm)} mesafede. ${c.place} adresinize kargo ile teslimat da mümkün.`
        ]);
    } else {
        p2 = `${c.place} adresinize kargo ile teslimat yapıyoruz.`;
    }

    const p3 = c.topSize ? pick(c.seed, 'p3', [
        `Bu bölgeye gönderilen siparişlerde en çok tercih edilen ebat ${c.topSize}.`,
        `${c.place} siparişlerinde öne çıkan lastik ölçüsü ${c.topSize}.`
    ]) : '';

    return [p1, p2, p3].filter(Boolean);
}

// Kış lastiği bilgisi (Karayolları Trafik Yönetmeliği genel kuralı; il valilikleri farklı tarih belirleyebilir)
export function winterNote(seed: string, place: string): string {
    return pick(seed, 'kis', [
        `Ticari araçlarda kış lastiği 1 Aralık – 1 Nisan arasında zorunludur; ${place} için valilik farklı bir tarih belirlemişse o tarih geçerlidir. Binek araçlarda zorunluluk olmasa da hava 7°C’nin altına indiğinde kış lastiği önerilir.`,
        `Kış lastiği zorunluluğu ticari araçlar için 1 Aralık’ta başlar ve 1 Nisan’a kadar sürer (il valilikleri tarihleri değiştirebilir). ${place} bölgesinde soğuk günlerde binek araçlar için de kış ya da 4 mevsim lastik tercih etmek fren mesafesini kısaltır.`
    ]);
}
