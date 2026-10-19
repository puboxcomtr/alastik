const { DiaOrderService } = require('./DiaOrderService');
const WebMember = require('../../../models/web/user/WebMember');
const B2bCariEkstre = require('../../../models/web/user/B2bCariEkstre');
const { computeStats, computeDueDates, computeAging, isSalesInvoice, SELECTED_COLUMNS } = require('./b2bInvoiceReport');
const { fetchMovements, computeEkstre } = require('./b2bCariEkstre');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function syncB2bFinance(logger = console, { memberId, onlyMissing } = {}) {
    const query = { site: 'b2b', diaCustomerKey: { $exists: true, $ne: null } };
    if (memberId) query._id = memberId;
    // Panelden cari çekiminde yalnız finansı hiç alınmamış (yeni) cariler; tamamı gece senkronunda.
    if (onlyMissing) query['diaCari.financeSyncedAt'] = { $exists: false };
    const members = await WebMember.find(
        query,
        { diaCustomerKey: 1, 'diaCari.bakiyeKurus': 1 }
    ).lean();
    if (!members.length) return { total: 0, updated: 0, chunks: 0, skipped: 0 };

    const svc = new DiaOrderService('b2b');
    await svc.init().catch(() => {});
    await svc.login();

    const currentDonem = svc.donemKodu || 1;
    const donemler = [];
    for (let d = currentDonem; d > currentDonem - 3 && d >= 1; d--) donemler.push(d);

    const CHUNK = 100;
    const LIMIT = 500;
    const cols = ['_key_scf_carikart', ...SELECTED_COLUMNS];
    let updated = 0, ekstreUpdated = 0, chunks = 0, skipped = 0, ekstreSkipped = 0;

    for (let i = 0; i < members.length; i += CHUNK) {
        const batch = members.slice(i, i + CHUNK);
        const keys = batch.map((m) => String(m.diaCustomerKey || '')).filter(Boolean);
        if (!keys.length) continue;
        chunks++;

        const rowsByCari = {};
        let chunkOk = true;
        for (const donem of donemler) {
            let offset = 0, guard = 0;
            while (guard < 200) {
                guard++;
                let res = null, ok = false;
                for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
                    try {
                        res = await svc.sendRequest('/api/v3/scf/json', {
                            scf_fatura_listele: {
                                session_id: svc.sessionId,
                                firma_kodu: svc.firmaKodu,
                                donem_kodu: donem,
                                filters: [{ field: '_key_scf_carikart', operator: 'IN', value: keys.join(',') }],
                                sorts: 'tarih:asc',
                                params: { selectedcolumns: cols },
                                limit: LIMIT,
                                offset
                            }
                        });
                        if (res && res.code != null && String(res.code) !== '200') {
                            throw new Error('DIA code ' + res.code + ' ' + (res.faultstring || res.msg || ''));
                        }
                        ok = true;
                    } catch (e) {
                        logger.warn?.(`[b2bFinanceSync] chunk#${chunks} dönem${donem} deneme${attempt} hata: ${e.message}`);
                        try { svc.sessionId = null; await svc.login(); } catch (_) {  }
                        await sleep(600);
                    }
                }
                if (!ok) { chunkOk = false; break; }
                const b = Array.isArray(res?.result) ? res.result : [];
                for (const row of b) {
                    if (!isSalesInvoice(row)) continue;
                    const k = String(row._key_scf_carikart);
                    (rowsByCari[k] = rowsByCari[k] || []).push(row);
                }
                if (b.length < LIMIT) break;
                offset += LIMIT;
            }
            if (!chunkOk) break;
        }

        if (!chunkOk) { skipped++; await sleep(500); continue; }

        const birYilOnce = new Date();
        birYilOnce.setFullYear(birYilOnce.getFullYear() - 1);
        const sinir = birYilOnce.toISOString().slice(0, 10);

        const ops = [];
        for (const m of batch) {
            const rows = rowsByCari[String(m.diaCustomerKey)] || [];
            const stats = computeStats(rows);
            const invoiceCount12m = new Set(
                rows.filter((r) => String(r.tarih || '').slice(0, 10) >= sinir)
                    .map((r) => `${String(r.tarih || '').slice(0, 10)}|${r.fisno || r.belgeno || ''}`)
            ).size;
            const openBalanceTL = typeof m.diaCari?.bakiyeKurus === 'number' ? m.diaCari.bakiyeKurus / 100 : undefined;
            const aging = computeAging(rows, openBalanceTL);
            const due = computeDueDates(rows, openBalanceTL);
            ops.push({ updateOne: { filter: { _id: m._id }, update: { $set: {
                'diaCari.purchaseStats': stats,
                'diaCari.invoiceCount12m': invoiceCount12m,
                'diaCari.dueItems': due.items,
                'diaCari.agingItems': aging.items,
                'diaCari.overdueKurus': Math.round((due.overdue || 0) * 100),
                'diaCari.financeSyncedAt': new Date()
            } } } });
        }
        if (ops.length) {
            try { const r = await WebMember.bulkWrite(ops, { ordered: false }); updated += r.modifiedCount; }
            catch (e) { logger.warn?.('[b2bFinanceSync] bulkWrite hatası: ' + e.message); }
        }

        const ekstreOps = [];
        for (const m of batch) {
            let raw;
            try {
                raw = await fetchMovements(svc, m.diaCustomerKey);
            } catch (e) {
                ekstreSkipped++;
                continue;
            }
            const openBalanceTL = typeof m.diaCari?.bakiyeKurus === 'number' ? m.diaCari.bakiyeKurus / 100 : undefined;
            const ekstre = computeEkstre(raw, openBalanceTL);
            ekstreOps.push({ updateOne: {
                filter: { memberId: m._id, site: 'b2b' },
                update: { $set: {
                    diaCustomerKey: String(m.diaCustomerKey),
                    movements: ekstre.movements,
                    summary: ekstre.summary,
                    syncedAt: new Date()
                } },
                upsert: true
            } });
            await sleep(120);
        }
        if (ekstreOps.length) {
            try { const er = await B2bCariEkstre.bulkWrite(ekstreOps, { ordered: false }); ekstreUpdated += (er.upsertedCount || 0) + (er.modifiedCount || 0); }
            catch (e) { logger.warn?.('[b2bFinanceSync] ekstre bulkWrite hatası: ' + e.message); }
        }

        await sleep(250);
    }

    return { total: members.length, updated, ekstreUpdated, ekstreSkipped, chunks, skipped, donemler };
}

module.exports = { syncB2bFinance };
