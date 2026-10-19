const mongoose = require('mongoose');

const GRUPLAR = [
    { ad: 'keskin_lastik', desen: /^keskin_lastik(_lastikjantavm)?$/, minDakika: 60 }
];
const PAY_MS = 60 * 1000;
const SUPHE_ORANI = 0.5;
const SUPHE_ALT_SINIR = 50;

const kapali = () => process.env.XML_SAATLIK_TEK_ISTEK === 'false';
const col = () => mongoose.connection.db.collection('xmlfetchstate');

function grupOf(code) {
    if (kapali()) return null;
    const c = String(code || '');
    return GRUPLAR.find(g => g.desen.test(c)) || null;
}

async function aktifUyeler(grup, WebXml) {
    return WebXml.find({ code: grup.desen, isActive: true }).sort({ code: 1 });
}

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

async function supheliYanit(grup, code, yeniSayi, oncekiSayi) {
    const anahtar = `reddedilen.${code}`;
    if (oncekiSayi < SUPHE_ALT_SINIR || yeniSayi >= oncekiSayi * SUPHE_ORANI) {
        await col().updateOne({ _id: grup.ad }, { $unset: { [anahtar]: '' } }).catch(() => { });
        return null;
    }
    const d = await col().findOne({ _id: grup.ad });
    const onceki = d?.reddedilen?.[code];
    if (yeniSayi >= SUPHE_ALT_SINIR && onceki && Math.abs(yeniSayi - onceki) <= Math.max(5, onceki * 0.1)) {
        await col().updateOne({ _id: grup.ad }, { $unset: { [anahtar]: '' } });
        return null;
    }
    await col().updateOne({ _id: grup.ad }, { $set: { [anahtar]: yeniSayi } }, { upsert: true });
    return `Şüpheli yanıt: ${yeniSayi} ürün geldi (kayıtlı: ${oncekiSayi}). Limit/hata yanıtı olabilir; hiçbir ürün ve eşleştirme silinmedi, mevcut veri korunuyor.`;
}

module.exports = { GRUPLAR, grupOf, aktifUyeler, istekHakkiAl, supheliYanit };
