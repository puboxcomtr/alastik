/**
 * b2b bayi sipariş listesi — carinin DIA SİPARİŞLERİ (scf_siparis_listele).
 * Panel dışından girilen siparişler de dahil (WebOrder yalnız panel siparişlerini
 * tutar). Son 3 dönem taranır (her yıl ayrı dönem). Cari _key sabittir.
 *
 * Alanlar: tarih, fisno (sipariş no), net (KDV dahil toplam), toplammiktar (adet),
 * onay (KABUL/RET → durum).
 */
const { DiaOrderService } = require('./DiaOrderService');

const num = (v) => parseFloat(v) || 0;

/** DIA isteği — hata/oturum düşmesinde re-login ile 3 kez dener. */
async function sendRetry(svc, body, attempts = 3) {
    const method = Object.keys(body)[0];
    let last;
    for (let i = 1; i <= attempts; i++) {
        try {
            body[method].session_id = svc.sessionId;
            const r = await svc.sendRequest('/api/v3/scf/json', body);
            if (r && r.code != null && String(r.code) !== '200') throw new Error('DIA code ' + r.code + ' ' + (r.msg || r.faultstring || ''));
            return r;
        } catch (e) {
            last = e;
            try { svc.sessionId = null; await svc.login(); } catch (_) { /* yut */ }
        }
    }
    throw last || new Error('DIA isteği başarısız');
}

async function fetchOrders(site, cariKey) {
    const svc = new DiaOrderService(site);
    await svc.init().catch(() => {});
    await svc.login();

    const currentDonem = svc.donemKodu || 1;
    const donemler = [];
    for (let d = currentDonem; d > currentDonem - 3 && d >= 1; d--) donemler.push(d);

    const LIMIT = 500;
    const rows = [];
    for (const donem of donemler) {
        let offset = 0, guard = 0;
        while (guard < 200) {
            guard++;
            let res = null, ok = false;
            for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
                try {
                    res = await svc.sendRequest('/api/v3/scf/json', {
                        scf_siparis_listele: {
                            session_id: svc.sessionId,
                            firma_kodu: svc.firmaKodu,
                            donem_kodu: donem,
                            filters: [{ field: '_key_scf_carikart', operator: '=', value: parseInt(cariKey) }],
                            sorts: 'tarih:desc',
                            params: { selectedcolumns: ['tarih', 'saat', 'fisno', 'belgeno', 'net', 'toplammiktar', 'onay', 'aciklama'] },
                            limit: LIMIT,
                            offset
                        }
                    });
                    if (res && res.code != null && String(res.code) !== '200') {
                        throw new Error('DIA code ' + res.code + ' ' + (res.msg || res.faultstring || ''));
                    }
                    ok = true;
                } catch (e) {
                    try { svc.sessionId = null; await svc.login(); } catch (_) { /* yut */ }
                }
            }
            if (!ok) break;
            const batch = Array.isArray(res?.result) ? res.result : [];
            for (const r of batch) rows.push(r);
            if (batch.length < LIMIT) break;
            offset += LIMIT;
        }
    }

    // Normalize + yeniden yeni→eski sırala
    const orders = rows.map((r) => ({
        orderNumber: String(r.fisno || r.belgeno || '').trim(),
        createdAt: `${String(r.tarih || '').slice(0, 10)}T${String(r.saat || '00:00:00').slice(0, 8)}`,
        totalKurus: Math.round(num(r.net) * 100),
        itemCount: Math.round(num(r.toplammiktar)),
        status: String(r.onay || '').toUpperCase() === 'KABUL' ? 'KABUL' : (String(r.onay || '').toUpperCase() === 'RET' ? 'RET' : ''),
        aciklama: String(r.aciklama || '').trim(),
        productText: ''
    }));
    orders.sort((a, b) => (a.createdAt < b.createdAt ? 1 : a.createdAt > b.createdAt ? -1 : 0));
    return orders;
}

/**
 * Tek DIA siparişinin detayı (fisno ile) — WebOrder'da yoksa (panel dışı sipariş)
 * detay sayfası için yedek. Başlık + kalemler döner (fatura/WebOrder biçimine yakın).
 */
async function fetchOrderDetail(site, orderNumber, cariKey) {
    const svc = new DiaOrderService(site);
    await svc.init().catch(() => {});
    await svc.login();
    const currentDonem = svc.donemKodu || 1;
    const donemler = [];
    for (let d = currentDonem; d > currentDonem - 3 && d >= 1; d--) donemler.push(d);

    // Cari filtresi ZORUNLU (başka carinin siparişi görülmesin)
    const filters = [{ field: 'fisno', operator: '=', value: String(orderNumber) }];
    if (cariKey) filters.push({ field: '_key_scf_carikart', operator: '=', value: parseInt(cariKey) });

    let header = null, orderKey = null, foundDonem = currentDonem;
    for (const donem of donemler) {
        const r = await sendRetry(svc, {
            scf_siparis_listele: {
                session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: donem,
                filters,
                params: { selectedcolumns: ['_key', 'tarih', 'saat', 'fisno', 'net', 'toplamara', 'toplamkdv', 'toplammiktar', 'onay', 'odemeplaniack'] },
                limit: 1, offset: 0
            }
        });
        const row = Array.isArray(r?.result) ? r.result[0] : null;
        if (row) { header = row; orderKey = parseInt(row._key); foundDonem = donem; break; }
    }
    if (!header) return null;

    // Kalemler — _key_kalemturu genişletilmiş stok kartı nesnesidir:
    //  ad = ekalan1/aciklama, kod = stokkartkodu; sonbirimfiyati = NET birim (KDV dahil),
    //  net satır = sonbirimfiyati × miktar (sipariş net toplamıyla tutar). birimfiyati = liste.
    let items = [];
    try {
        const g = await sendRetry(svc, {
            scf_siparis_getir: { session_id: svc.sessionId, firma_kodu: svc.firmaKodu, donem_kodu: foundDonem, key: orderKey }
        });
        const kalemler = g?.result?.m_kalemler || [];
        items = kalemler.map((k) => {
            const kt = (k._key_kalemturu && typeof k._key_kalemturu === 'object') ? k._key_kalemturu : {};
            const qty = Math.round(num(k.miktar));
            const netUnit = num(k.sonbirimfiyati) || num(k.birimfiyati);
            return {
                name: String(kt.aciklama || kt.ekalan1 || kt.ekalan2 || '').trim(),
                stockCode: String(kt.stokkartkodu || '').trim(),
                quantity: qty,
                listUnitPrice: num(k.birimfiyati),
                unitPrice: netUnit,
                totalPrice: Math.round(netUnit * qty * 100) / 100
            };
        });
    } catch (_) { /* kalem alınamazsa başlıkla devam */ }

    return {
        orderNumber: String(header.fisno || orderNumber),
        status: String(header.onay || '').toUpperCase(),
        createdAt: `${String(header.tarih || '').slice(0, 10)}T${String(header.saat || '00:00:00').slice(0, 8)}`,
        paymentMethod: '',
        paymentPlan: String(header.odemeplaniack || '').trim(),
        items,
        itemCount: Math.round(num(header.toplammiktar)),
        pricing: {
            subtotal: num(header.toplamara),
            vatAmount: num(header.toplamkdv),
            total: num(header.net)
        },
        source: 'dia'
    };
}

module.exports = { fetchOrders, fetchOrderDetail };
