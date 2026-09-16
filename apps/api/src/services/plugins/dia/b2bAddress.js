/**
 * b2b cari adresleri — DIA'dan Mongo'ya (WebMember.diaCari.addresses).
 * /adresler bu alandan okur (anında); worker günlük tam sync yapar; /adres
 * eklenince ilgili cari tazelenir. Adresler DIA'da cari başına ayrı çağrı
 * gerektirir (IN toplu çekmiyor), bu yüzden tam sync günde bir kez çalışır.
 */
const { DiaOrderService } = require('./DiaOrderService');
const WebMember = require('../../../models/web/user/WebMember');

/** DIA adres kaydını arayüz biçimine çevirir (fatura/ana → "Adres"). */
function mapDiaAddresses(list) {
    return (Array.isArray(list) ? list : []).map((a, i) => {
        const rawBaslik = String(a.adresadi || '').trim();
        const varsayilan = !rawBaslik || String(a.anaadres) === '1' || /fatura/i.test(rawBaslik);
        return {
            id: String(a._key || i),
            baslik: varsayilan ? 'Adres' : rawBaslik,
            teslimat: a.adrestipi === 'T',
            ana: String(a.anaadres) === '1',
            adres: [a.adres1, a.adres2].filter(x => x && String(x).trim()).join(' ').trim(),
            il: a._key_sis_sehirler?.sehiradi || a.sehir || a.sehiradi || '',
            ilce: a.ilce || '',
            telefon: a.ceptel || ''
        };
    });
}

/** Tek carinin adreslerini DIA'dan çeker (arayüz biçiminde). */
async function fetchCariAddresses(svc, F, cariKey) {
    const r = await svc.sendRequest('/api/v3/scf/json', {
        scf_carikart_adresleri_listele: {
            ...F,
            filters: [{ field: '_key_scf_carikart', operator: '=', value: parseInt(cariKey) }],
            limit: 50, offset: 0
        }
    });
    return mapDiaAddresses(Array.isArray(r?.result) ? r.result : []);
}

/** Tek carinin adreslerini çekip Mongo'ya (WebMember.diaCari.addresses) yazar. */
async function refreshMemberAddresses(site, memberId, cariKey) {
    const svc = new DiaOrderService(site);
    await svc.init().catch(() => {});
    await svc.login();
    const F = { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu };
    const addresses = await fetchCariAddresses(svc, F, cariKey);
    if (addresses.length) {
        await WebMember.updateOne({ _id: memberId }, { $set: { 'diaCari.addresses': addresses, 'diaCari.addressesSyncedAt': new Date() } });
    }
    return addresses;
}

/**
 * Tüm b2b carilerinin adreslerini DIA'dan Mongo'ya senkronlar (cari başına 1
 * çağrı). Günlük çalışır; boş dönen (yetki/çakışma) cariler atlanır (eski
 * adresler korunur). Yeni b2b DIA kullanıcısı (ws_ART_B2B) ile.
 */
async function syncB2bAddresses(logger = console) {
    const members = await WebMember.find(
        { site: 'b2b', diaCustomerKey: { $exists: true, $ne: null } },
        { diaCustomerKey: 1 }
    ).lean();
    if (!members.length) return { total: 0, updated: 0, bos: 0 };

    const svc = new DiaOrderService('b2b');
    await svc.init().catch(() => {});
    await svc.login();
    let F = { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: svc.donemKodu };

    const sleep = ms => new Promise(r => setTimeout(r, ms));
    let updated = 0, bos = 0;
    const CHUNK = 200;
    let ops = [];
    for (let i = 0; i < members.length; i++) {
        const m = members[i];
        try {
            const addresses = await fetchCariAddresses(svc, F, m.diaCustomerKey);
            if (addresses.length) {
                ops.push({ updateOne: { filter: { _id: m._id }, update: { $set: {
                    'diaCari.addresses': addresses, 'diaCari.addressesSyncedAt': new Date()
                } } } });
            } else {
                bos++; // boş — eski adresi koru
            }
        } catch (e) {
            try { svc.sessionId = null; await svc.login(); F.session_id = svc.sessionId; } catch (_) {}
            bos++;
        }
        if (ops.length >= CHUNK) {
            try { const r = await WebMember.bulkWrite(ops, { ordered: false }); updated += r.modifiedCount; } catch (e) {}
            ops = [];
        }
        await sleep(60); // DIA'yı boğmayalım
    }
    if (ops.length) {
        try { const r = await WebMember.bulkWrite(ops, { ordered: false }); updated += r.modifiedCount; } catch (e) {}
    }
    logger.info?.('[b2bAddress] tam adres sync', { total: members.length, updated, bos });
    return { total: members.length, updated, bos };
}

module.exports = { mapDiaAddresses, fetchCariAddresses, refreshMemberAddresses, syncB2bAddresses };
