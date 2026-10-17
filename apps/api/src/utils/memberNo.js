/**
 * Üye/cari sıra numarası (WebMember.memberNo) — admin detay adresinde
 * /apps/user/view/<memberNo> olarak kullanılır. Numaralar SİTE BAZLIDIR
 * (her site 1'den başlar) ve `counters` koleksiyonundaki atomik sayaçtan alınır.
 */
const mongoose = require('mongoose');

const counterId = (site) => `memberNo:${site}`;

/**
 * Sayaçtan `count` adet ardışık numara ayırır, ilkini döner.
 * Sayaç ilk kez oluşuyorsa mevcut en büyük memberNo'dan başlar (çakışma olmaz).
 */
async function reserveMemberNos(site, count = 1) {
    const counters = mongoose.connection.db.collection('counters');
    const exists = await counters.findOne({ _id: counterId(site) }, { projection: { _id: 1 } });
    if (!exists) {
        const WebMember = mongoose.model('WebMember');
        const top = await WebMember.findOne({ site, memberNo: { $type: 'number' } })
            .sort({ memberNo: -1 }).select('memberNo').lean();
        await counters.updateOne(
            { _id: counterId(site) },
            { $setOnInsert: { seq: top?.memberNo || 0 } },
            { upsert: true }
        );
    }
    const res = await counters.findOneAndUpdate(
        { _id: counterId(site) },
        { $inc: { seq: count } },
        { returnDocument: 'after' }
    );
    const doc = res && res.value !== undefined ? res.value : res; // sürücü sürümüne göre
    return doc.seq - count + 1;
}

/**
 * Numarası olmayan üyelere kayıt sırasıyla (createdAt, _id) numara verir.
 * Toplu içe aktarma (upsert) gibi save hook'u çalışmayan yollarla gelenleri kapsar.
 * Eşzamanlı çağrıda çift numara oluşmaz (yalnız numarasızlar güncellenir; en kötü boşluk kalır).
 */
async function assignMissingMemberNos(site) {
    const WebMember = mongoose.model('WebMember');
    const exists = await WebMember.exists({ site, memberNo: { $exists: false } });
    if (!exists) return 0;

    // Eşzamanlı istekler (liste sayfası aynı anda birden çok çağrı yapar) aynı üyeler için
    // ayrı numara blokları ayırıp boşluk bırakmasın: DB kilidi — kilit doluysa bu çağrı atlar.
    const counters = mongoose.connection.db.collection('counters');
    const lockId = `memberNoLock:${site}`;
    const now = Date.now();
    try {
        await counters.updateOne(
            { _id: lockId, $or: [{ until: { $lt: now } }, { until: { $exists: false } }] },
            { $set: { until: now + 60000 } },
            { upsert: true }
        );
    } catch (e) {
        if (e.code === 11000) return 0; // başka bir istek numaralıyor
        throw e;
    }
    try {
        const missing = await WebMember.find({ site, memberNo: { $exists: false } })
            .sort({ createdAt: 1, _id: 1 }).select('_id').lean();
        if (!missing.length) return 0;
        const first = await reserveMemberNos(site, missing.length);
        const ops = missing.map((m, i) => ({
            updateOne: { filter: { _id: m._id, memberNo: { $exists: false } }, update: { $set: { memberNo: first + i } } }
        }));
        const r = await WebMember.bulkWrite(ops, { ordered: false });
        return r.modifiedCount;
    } finally {
        await counters.deleteOne({ _id: lockId });
    }
}

module.exports = { reserveMemberNos, assignMissingMemberNos };
