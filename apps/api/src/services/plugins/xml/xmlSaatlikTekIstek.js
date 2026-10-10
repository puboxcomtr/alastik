// Saatte TEK istek hakkı veren XML tedarikçileri (şimdilik yalnızca Keskin Lastik).
//
// Sorun: Keskin 60 dakikada 1 istek kabul ediyor. Aynı adres iki site kaydında (keskin_lastik,
// keskin_lastik_lastikjantavm) tanımlı olduğundan ikinci istek "limit" yanıtı alıyor, bu yanıt "1 ürün"
// sayılıp o kaydın tüm ürünleri (ve eşleştirmeleri) siliniyordu.
//
// Çözüm (yalnızca aşağıdaki gruplara uygulanır; diğer tedarikçilerin akışı değişmez):
//   1) Tek istek: gruptaki ilk aktif kayıt ("çekici") tedarikçiye istek atar; diğer kayıtlar istek atmaz,
//      çekicinin kaydedilmiş verisini kullanır.
//   2) İstek kilidi: son istekten en az 60 dk (+1 dk pay) geçmeden hiçbir yoldan istek atılmaz.
//   3) Silme koruması: gelen ürün sayısı bir öncekinin yarısından azsa yanıt şüpheli sayılır; hiçbir
//      ürün/eşleştirme silinmez. Aynı düşük sayı art arda iki kez gelirse gerçek kabul edilir.
// Acil kapatma: XML_SAATLIK_TEK_ISTEK=false → bu dosya devre dışı, eski davranış.
const mongoose = require('mongoose');

const GRUPLAR = [
    { ad: 'keskin_lastik', desen: /^keskin_lastik(_lastikjantavm)?$/, minDakika: 60 }
];
const PAY_MS = 60 * 1000;          // tedarikçi saatiyle fark için 1 dk pay
const SUPHE_ORANI = 0.5;           // önceki sayının yarısından az → şüpheli
const SUPHE_ALT_SINIR = 50;        // önceki kayıt bu sayıdan azsa koruma uygulanmaz (ilk kurulum)

const kapali = () => process.env.XML_SAATLIK_TEK_ISTEK === 'false';
const col = () => mongoose.connection.db.collection('xmlfetchstate');

function grupOf(code) {
    if (kapali()) return null;
    const c = String(code || '');
    return GRUPLAR.find(g => g.desen.test(c)) || null;
}

// Grubun aktif kayıtları, kod sırasıyla; ilki "çekici"dir
async function aktifUyeler(grup, WebXml) {
    return WebXml.find({ code: grup.desen, isActive: true }).sort({ code: 1 });
}

// İstek hakkını atomik olarak alır (çok süreçli çalışmada iki süreç aynı anda alamaz)
async function istekHakkiAl(grup) {
    const simdi = new Date();
    const esik = new Date(simdi.getTime() - (grup.minDakika * 60 * 1000 + PAY_MS));
    const r = await col().updateOne({ _id: grup.ad, $or: [{ lastRequestAt: { $lte: esik } }, { lastRequestAt: null }] }, { $set: { lastRequestAt: simdi } });
    if (r.matchedCount === 1) return { izin: true };
    try {
        await col().insertOne({ _id: grup.ad, lastRequestAt: simdi });
        return { izin: true };
    } catch (e) {
        if (e && e.code !== 11000) throw e;
        const d = await col().findOne({ _id: grup.ad });
        const gecen = d?.lastRequestAt ? (simdi - new Date(d.lastRequestAt)) / 60000 : 0;
        const kalanDk = Math.max(1, Math.ceil(grup.minDakika + PAY_MS / 60000 - gecen));
        return { izin: false, kalanDk, sonIstek: d?.lastRequestAt || null };
    }
}

// Şüpheli (limit/hata) yanıt kontrolü. Şüpheliyse açıklama metni döner, değilse null.
async function supheliYanit(grup, code, yeniSayi, oncekiSayi) {
    const anahtar = `reddedilen.${code}`;
    if (oncekiSayi < SUPHE_ALT_SINIR || yeniSayi >= oncekiSayi * SUPHE_ORANI) {
        await col().updateOne({ _id: grup.ad }, { $unset: { [anahtar]: '' } }).catch(() => { });
        return null;
    }
    const d = await col().findOne({ _id: grup.ad });
    const onceki = d?.reddedilen?.[code];
    // Aynı düşük sayı art arda ikinci kez geldiyse (±%10) gerçek kabul edilir
    if (yeniSayi >= SUPHE_ALT_SINIR && onceki && Math.abs(yeniSayi - onceki) <= Math.max(5, onceki * 0.1)) {
        await col().updateOne({ _id: grup.ad }, { $unset: { [anahtar]: '' } });
        return null;
    }
    await col().updateOne({ _id: grup.ad }, { $set: { [anahtar]: yeniSayi } }, { upsert: true });
    return `Şüpheli yanıt: ${yeniSayi} ürün geldi (kayıtlı: ${oncekiSayi}). Limit/hata yanıtı olabilir; hiçbir ürün ve eşleştirme silinmedi, mevcut veri korunuyor.`;
}

module.exports = { GRUPLAR, grupOf, aktifUyeler, istekHakkiAl, supheliYanit };
