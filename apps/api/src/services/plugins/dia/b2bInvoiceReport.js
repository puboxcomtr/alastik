const { DiaOrderService } = require('./DiaOrderService');

const rawCache = new Map();
const RAW_TTL_MS = 60 * 60 * 1000;

const SELECTED_COLUMNS = [
    'tarih', 'net', 'toplammiktar', 'ortalamavade', 'vadegun',
    'bekleyentutar', 'kapanmadurumu', 'iptal', 'fisno', 'belgeno', 'turuack', 'efaturatipkodu'
];

const round2 = (v) => Math.round((v || 0) * 100) / 100;

function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + (parseInt(days) || 0));
    return d.toISOString().slice(0, 10);
}

function isSalesInvoice(row) {
    if (String(row.iptal) === '1' || String(row.iptal).toLowerCase() === 'true') return false;
    const label = String(row.turuack || '').toLocaleLowerCase('tr-TR');
    if (/iade/.test(label)) return false;
    if (/alım|alınan/.test(label)) return false;
    if (/satış|verilen/.test(label)) return true;
    return !label.trim() && String(row.efaturatipkodu || '').toUpperCase() === 'SATIS';
}

async function fetchSalesInvoices(site, customerKey) {
    const cacheKey = `${site}:${customerKey}`;
    const cached = rawCache.get(cacheKey);
    if (cached) {
        if (cached.rows && Date.now() - cached.at < RAW_TTL_MS) return cached.rows;
        if (cached.promise) return cached.promise;
    }

    const promise = (async () => {
        const service = new DiaOrderService(site);
        await service.init().catch(() => {});
        await service.login();

        const currentDonem = service.donemKodu || 1;
        const donemler = [];
        for (let d = currentDonem; d > currentDonem - 3 && d >= 1; d--) donemler.push(d);

        const LIMIT = 500;
        const rows = [];
        for (const donem of donemler) {
            let offset = 0;
            let guard = 0;
            while (guard < 200) {
                guard++;
                const res = await service.sendRequest('/api/v3/scf/json', {
                    scf_fatura_listele: {
                        session_id: service.sessionId,
                        firma_kodu: service.firmaKodu,
                        donem_kodu: donem,
                        filters: [{ field: '_key_scf_carikart', operator: '=', value: parseInt(customerKey) }],
                        sorts: 'tarih:asc',
                        params: { selectedcolumns: SELECTED_COLUMNS },
                        limit: LIMIT,
                        offset
                    }
                });
                const batch = Array.isArray(res?.result) ? res.result : [];
                for (const row of batch) if (isSalesInvoice(row)) rows.push(row);
                if (batch.length < LIMIT) break;
                offset += LIMIT;
            }
        }
        return rows;
    })();

    rawCache.set(cacheKey, { promise });
    try {
        const rows = await promise;
        rawCache.set(cacheKey, { at: Date.now(), rows });
        return rows;
    } catch (err) {
        rawCache.delete(cacheKey);
        throw err;
    }
}

const emptyMonths = () => Array.from({ length: 12 }, () => 0);

function computeStats(rows, yearCount = 3) {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - (yearCount - 1);
    const years = [];
    for (let y = startYear; y <= currentYear; y++) years.push(y);

    const revenue = {};
    const quantity = {};
    years.forEach((y) => { revenue[y] = emptyMonths(); quantity[y] = emptyMonths(); });

    for (const row of rows) {
        const dateStr = String(row.tarih || '');
        const year = parseInt(dateStr.slice(0, 4));
        const monthIdx = parseInt(dateStr.slice(5, 7)) - 1;
        if (!(year in revenue) || monthIdx < 0 || monthIdx > 11) continue;
        revenue[year][monthIdx] += Math.round((parseFloat(row.net) || 0) * 100) / 100;
        quantity[year][monthIdx] += Math.round(parseFloat(row.toplammiktar) || 0);
    }

    const totals = {};
    years.forEach((y) => {
        revenue[y] = revenue[y].map((v) => Math.round(v * 100) / 100);
        totals[y] = {
            revenue: Math.round(revenue[y].reduce((a, b) => a + b, 0) * 100) / 100,
            quantity: quantity[y].reduce((a, b) => a + b, 0)
        };
    });

    return { revenue, quantity, totals, years };
}

function todayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function computeAging(rows, openBalanceTL) {
    const invoices = [];
    let totalNet = 0;
    for (const row of rows) {
        const net = round2(parseFloat(row.net) || 0);
        if (net <= 0) continue;
        let dueDate = String(row.ortalamavade || '').slice(0, 10);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) dueDate = addDays(String(row.tarih || ''), row.vadegun);
        invoices.push({
            issueDate: String(row.tarih || '').slice(0, 10),
            dueDate,
            net,
            invoiceNo: String(row.belgeno || row.fisno || '')
        });
        totalNet = round2(totalNet + net);
    }

    let openBalance = (typeof openBalanceTL === 'number' && !isNaN(openBalanceTL)) ? openBalanceTL : totalNet;
    if (openBalance < 0) openBalance = 0;
    if (openBalance > totalNet) openBalance = totalNet;

    invoices.sort((a, b) =>
        (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : (a.issueDate < b.issueDate ? -1 : a.issueDate > b.issueDate ? 1 : 0))
    );
    let covered = round2(totalNet - openBalance);

    const today = todayStr();
    const items = [];
    let overdue = 0;
    for (const inv of invoices) {
        let paid;
        if (covered >= inv.net) { paid = inv.net; covered = round2(covered - inv.net); }
        else { paid = covered; covered = 0; }
        const remaining = round2(inv.net - paid);
        if (remaining <= 0) continue;
        items.push({
            issueDate: inv.issueDate,
            dueDate: inv.dueDate,
            invoiceNo: inv.invoiceNo,
            totalKurus: Math.round(inv.net * 100),
            paidKurus: Math.round(paid * 100),
            remainingKurus: Math.round(remaining * 100)
        });
        if (/^\d{4}-\d{2}-\d{2}$/.test(inv.dueDate) && inv.dueDate < today) overdue = round2(overdue + remaining);
    }

    return {
        items,
        today,
        totalKurus: Math.round(totalNet * 100),
        openBalanceKurus: Math.round(openBalance * 100),
        overdueKurus: Math.round(overdue * 100)
    };
}

function computeDueDates(rows, openBalanceTL) {
    const aging = computeAging(rows, openBalanceTL);
    const items = aging.items
        .filter((it) => /^\d{4}-\d{2}-\d{2}$/.test(it.dueDate))
        .map((it) => ({ date: it.dueDate, amount: round2(it.remainingKurus / 100), invoiceNo: it.invoiceNo }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { items, today: aging.today, overdue: round2(aging.overdueKurus / 100) };
}

// Bakiye güncellemesinde (30 dk) kayıtlı açık kalemlere yeni bakiyeyi FIFO ile yeniden uygular;
// DIA'ya gitmeden vadesi geçen borcu tazeler. Bakiye arttıysa fark yeni faturadır, kalemler aynen kalır.
function reapplyBalance(agingItems, balanceKurus) {
    const open = (agingItems || [])
        .map((it) => ({
            issueDate: it.issueDate,
            dueDate: it.dueDate,
            invoiceNo: it.invoiceNo,
            totalKurus: it.totalKurus,
            paidKurus: it.paidKurus,
            remainingKurus: it.remainingKurus
        }))
        .sort((a, b) =>
            (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : (a.issueDate < b.issueDate ? -1 : a.issueDate > b.issueDate ? 1 : 0))
        );
    const openKurus = open.reduce((s, it) => s + it.remainingKurus, 0);
    let covered = openKurus - Math.max(0, balanceKurus || 0);

    const today = todayStr();
    const items = [];
    let overdueKurus = 0;
    for (const it of open) {
        if (covered > 0) {
            const paid = Math.min(covered, it.remainingKurus);
            covered -= paid;
            it.paidKurus += paid;
            it.remainingKurus -= paid;
        }
        if (it.remainingKurus <= 0) continue;
        items.push(it);
        if (/^\d{4}-\d{2}-\d{2}$/.test(it.dueDate) && it.dueDate < today) overdueKurus += it.remainingKurus;
    }

    const dueItems = items
        .filter((it) => /^\d{4}-\d{2}-\d{2}$/.test(it.dueDate))
        .map((it) => ({ date: it.dueDate, amount: round2(it.remainingKurus / 100), invoiceNo: it.invoiceNo }));
    return { agingItems: items, dueItems, overdueKurus };
}

async function invoiceStats(site, customerKey, yearCount = 3) {
    const rows = await fetchSalesInvoices(site, customerKey);
    return computeStats(rows, yearCount);
}

async function invoiceDueDates(site, customerKey, openBalanceTL) {
    const rows = await fetchSalesInvoices(site, customerKey);
    return computeDueDates(rows, openBalanceTL);
}

async function invoiceAging(site, customerKey, openBalanceTL) {
    const rows = await fetchSalesInvoices(site, customerKey);
    return computeAging(rows, openBalanceTL);
}

module.exports = {
    invoiceStats,
    invoiceDueDates,
    invoiceAging,
    computeStats,
    computeDueDates,
    computeAging,
    reapplyBalance,
    isSalesInvoice,
    SELECTED_COLUMNS
};
