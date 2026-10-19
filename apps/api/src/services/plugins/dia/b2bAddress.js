const { DiaOrderService } = require('./DiaOrderService');
const WebMember = require('../../../models/web/user/WebMember');

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

async function addDiaDeliveryAddress(svc, cariKey, { baslik, adSoyad, adres, adresDetay, il, ilce, telefon, postaKodu } = {}) {
    const adresKart = {
        _key_scf_carikart: parseInt(cariKey),
        _key_dag_bolge: 0,
        _key_sis_ulkeler: 0,
        _key_sis_vergidairesi: 0,
        _key_sis_sehirler: il ? { sehiradi: String(il).toLocaleUpperCase('tr-TR') } : 0,
        adres1: String(adres || '').trim(),
        adres2: String(adresDetay || '').trim(),
        adresadi: (baslik && String(baslik).trim()) || 'Teslimat Adresi',
        adrestipi: 'T',
        anaadres: '0',
        bolge: '',
        unvan: String(adSoyad || '').trim(),
        ceptel: telefon ? svc.normalizePhone(telefon) : '',
        telefon1: '',
        telefon2: '',
        fax: '',
        ilce: String(ilce || '').toLocaleUpperCase('tr-TR'),
        sehir: '',
        postakodu: String(postaKodu || '').trim(),
        ulke: 'TÜRKİYE',
        ulkeno: '',
        tckimlikno: '',
        verginumarasi: '',
        kayitturu: 'SHS',
        yabanciuyruklu: 'H',
        koordinat_latitude: '0',
        koordinat_longitude: '0'
    };
    return svc.sendRequest('/api/v3/scf/json', {
        scf_carikart_adresleri_ekle: {
            session_id: svc.sessionId,
            firma_kodu: svc.firmaKodu,
            donem_kodu: svc.donemKodu,
            kart: adresKart
        }
    });
}

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

async function syncB2bAddresses(logger = console) {
    const members = await WebMember.find(
        { site: 'b2b', diaCustomerKey: { $exists: true, $ne: null }, 'diaCari.addresses.0': { $exists: false } },
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
                bos++;
            }
        } catch (e) {
            try { svc.sessionId = null; await svc.login(); F.session_id = svc.sessionId; } catch (_) {}
            bos++;
        }
        if (ops.length >= CHUNK) {
            try { const r = await WebMember.bulkWrite(ops, { ordered: false }); updated += r.modifiedCount; } catch (e) {}
            ops = [];
        }
        await sleep(60);
    }
    if (ops.length) {
        try { const r = await WebMember.bulkWrite(ops, { ordered: false }); updated += r.modifiedCount; } catch (e) {}
    }
    logger.info?.('[b2bAddress] tam adres sync', { total: members.length, updated, bos });
    return { total: members.length, updated, bos };
}

module.exports = { mapDiaAddresses, fetchCariAddresses, addDiaDeliveryAddress, refreshMemberAddresses, syncB2bAddresses };
