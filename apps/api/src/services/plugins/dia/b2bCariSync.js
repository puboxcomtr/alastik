/**
 * b2b cari bilgilerini DIA'dan Mongo'ya senkronlar (bakiye, borç/alacak, risk
 * limiti, segment/ozelkod2). Worker'da periyodik çalışır (diaLock içinde).
 *
 * Uçlar (/cari-ozet, /fiyat-orani, /odeme-yontemleri, sipariş segmenti) canlı
 * DIA yerine WebMember.diaCari'den okur — DIA tek-oturum çakışması ve gecikmesi
 * kullanıcıya yansımaz. 2135 bayi tek tek değil, ~100'lük chunk'larla toplu çekilir.
 */
const { DiaOrderService } = require('./DiaOrderService');
const WebMember = require('../../../models/web/user/WebMember');

const kurus = v => Math.round((parseFloat(v) || 0) * 100);

async function syncB2bCari(logger = console) {
    const members = await WebMember.find(
        { site: 'b2b', diaCustomerKey: { $exists: true, $ne: null } },
        { diaCustomerKey: 1, diaCustomerCode: 1 }
    ).lean();
    if (!members.length) return { total: 0, updated: 0, chunks: 0, bosChunk: 0 };

    const svc = new DiaOrderService('b2b');
    await svc.init().catch(() => {});
    await svc.login();
    const F = { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu };

    const CHUNK = 100;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let updated = 0, bosChunk = 0, chunks = 0;
    const matched = new Set();

    // Bir kart satırını ilgili üyeye yazar
    const writeRow = (ops, m, row) => {
        const borc = kurus(row.borc), alacak = kurus(row.alacak);
        const bakiye = kurus(row.bakiye) || (borc - alacak);
        matched.add(String(m._id));
        ops.push({ updateOne: { filter: { _id: m._id }, update: { $set: {
            'diaCari.bakiyeKurus': bakiye,
            'diaCari.borcKurus': borc,
            'diaCari.alacakKurus': alacak,
            'diaCari.riskLimitiKurus': kurus(row.risklimiti),
            'diaCari.segment': String(row.ozelkod2kod || '').trim(),
            'diaCari.syncedAt': new Date()
        } } } });
    };

    const cols = ['_key', 'carikartkodu', 'bakiye', 'borc', 'alacak', 'risklimiti', 'ozelkod2kod'];

    // Bir chunk'ı verilen alan (field: '_key' veya 'carikartkodu') ile çeker ve yazar
    async function processBatch(batch, field, valueOf) {
        const vals = batch.map(valueOf).filter(Boolean);
        if (!vals.length) return;
        chunks++;
        let rows = [];
        try {
            const r = await svc.sendRequest('/api/v3/scf/json', {
                scf_carikart_listele: {
                    ...F,
                    filters: [{ field, operator: 'IN', value: vals.join(',') }],
                    sorts: '',
                    params: { selectedcolumns: cols },
                    limit: vals.length, offset: 0
                }
            });
            rows = Array.isArray(r?.result) ? r.result : [];
        } catch (e) {
            try { svc.sessionId = null; await svc.login(); F.session_id = svc.sessionId; } catch (_) {}
        }
        if (!rows.length) { bosChunk++; await sleep(500); return; } // boş — eski veriyi koru
        const byVal = {};
        for (const row of rows) byVal[String(field === '_key' ? row._key : row.carikartkodu)] = row;
        const ops = [];
        for (const m of batch) {
            const row = byVal[String(valueOf(m))];
            if (row) writeRow(ops, m, row);
        }
        if (ops.length) {
            try { const res = await WebMember.bulkWrite(ops, { ordered: false }); updated += res.modifiedCount; }
            catch (e) { logger.warn?.('[b2bCariSync] bulkWrite hatası: ' + e.message); }
        }
        await sleep(250);
    }

    // 1) _key IN ile toplu (hızlı, çoğu cari)
    for (let i = 0; i < members.length; i += CHUNK) {
        await processBatch(members.slice(i, i + CHUNK), '_key', m => String(m.diaCustomerKey || ''));
    }

    // 2) _key ile eşleşmeyenleri carikartkodu ile dene (bazı carilerin _key'i listede dönmüyor)
    const kalanlar = members.filter(m => !matched.has(String(m._id)) && m.diaCustomerCode);
    for (let i = 0; i < kalanlar.length; i += CHUNK) {
        await processBatch(kalanlar.slice(i, i + CHUNK), 'carikartkodu', m => String(m.diaCustomerCode || ''));
    }

    return { total: members.length, updated, chunks, bosChunk, eslesen: matched.size };
}

module.exports = { syncB2bCari };
