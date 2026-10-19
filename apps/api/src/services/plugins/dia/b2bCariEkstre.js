const { DiaOrderService } = require('./DiaOrderService');

const num = (v) => Math.round((parseFloat(v) || 0) * 100) / 100;

async function fetchMovements(svc, cariKey) {
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
                        scf_carikart_hareket_listele: {
                            session_id: svc.sessionId,
                            firma_kodu: svc.firmaKodu,
                            donem_kodu: donem,
                            params: { _key: parseInt(cariKey) },
                            sorts: 'tarih:asc',
                            limit: LIMIT,
                            offset
                        }
                    });
                    if (res && res.code != null && String(res.code) !== '200') {
                        throw new Error('DIA code ' + res.code + ' ' + (res.msg || res.faultstring || ''));
                    }
                    ok = true;
                } catch (e) {
                    try { svc.sessionId = null; await svc.login(); } catch (_) {  }
                }
            }
            if (!ok) break;
            const b = Array.isArray(res?.result) ? res.result : [];
            for (const row of b) rows.push(row);
            if (b.length < LIMIT) break;
            offset += LIMIT;
        }
    }
    return rows;
}

function normalize(row) {
    const borc = num(row.borc);
    const alacak = num(row.alacak);
    return {
        tarih: String(row.tarih || '').slice(0, 10),
        tur: String(row.turuack || row.turu || '').trim(),
        aciklama: String(row.aciklama || row.satiraciklamasi || '').trim(),
        fisno: String(row.fisno || '').trim(),
        belgeNo: String(row.belgeno || row.belgeno2 || '').trim(),
        vade: String(row.vadetarihi || '').slice(0, 10),
        borc,
        alacak,
        odeme: alacak > 0 && borc === 0
    };
}

function computeEkstre(raw, currentBalanceTL) {
    const items = raw.map(normalize);

    items.sort((a, b) => (a.tarih < b.tarih ? -1 : a.tarih > b.tarih ? 1 : 0));

    const sumBorc = Math.round(items.reduce((s, x) => s + x.borc, 0) * 100) / 100;
    const sumAlacak = Math.round(items.reduce((s, x) => s + x.alacak, 0) * 100) / 100;
    const net = Math.round((sumBorc - sumAlacak) * 100) / 100;

    const endBalance = (typeof currentBalanceTL === 'number' && !isNaN(currentBalanceTL)) ? currentBalanceTL : net;
    let running = Math.round((endBalance - net) * 100) / 100;
    const opening = running;
    for (const it of items) {
        running = Math.round((running + it.borc - it.alacak) * 100) / 100;
        it.bakiye = running;
    }

    return {
        movements: items,
        summary: {
            count: items.length,
            openingKurus: Math.round(opening * 100),
            debitKurus: Math.round(sumBorc * 100),
            creditKurus: Math.round(sumAlacak * 100),
            balanceKurus: Math.round(endBalance * 100)
        }
    };
}

async function cariEkstre(site, cariKey, currentBalanceTL) {
    const svc = new DiaOrderService(site);
    await svc.init().catch(() => {});
    await svc.login();
    const raw = await fetchMovements(svc, cariKey);
    return computeEkstre(raw, currentBalanceTL);
}

module.exports = { cariEkstre, fetchMovements, computeEkstre };
