/**
 * b2b dealer invoice reports — derived from DIA SALES INVOICES (not orders).
 *
 *  - invoiceStats:    monthly REVENUE (net, VAT included) + PURCHASE QUANTITY
 *                     (toplammiktar) grouped by year/month.
 *  - invoiceDueDates: open (unpaid) sales invoices' due date + remaining amount
 *                     (for the calendar view).
 *
 * A single DIA fetch (scf_fatura_listele, paginated) is cached at module level,
 * so the chart and the calendar do not fetch the same dealer twice. Only sales
 * invoices are counted; cancelled and refund documents are excluded.
 *
 * NOTE: keys like `tarih`, `net`, `ortalamavade`, `bekleyentutar` are DIA API
 * field names and must stay as-is.
 */
const { DiaOrderService } = require('./DiaOrderService');

// Module-level cache for raw invoice rows (per site+customer, 1 hour).
const rawCache = new Map();
const RAW_TTL_MS = 60 * 60 * 1000;

const SELECTED_COLUMNS = [
    'tarih', 'net', 'toplammiktar', 'ortalamavade', 'vadegun',
    'bekleyentutar', 'kapanmadurumu', 'iptal', 'fisno', 'belgeno', 'turuack', 'efaturatipkodu'
];

const round2 = (v) => Math.round((v || 0) * 100) / 100;

/** "2026-07-24" + 29 days → "2026-08-22" (fallback due date when ortalamavade is empty). */
function addDays(dateStr, days) {
    const d = new Date(`${dateStr}T00:00:00`);
    if (isNaN(d.getTime())) return dateStr;
    d.setDate(d.getDate() + (parseInt(days) || 0));
    return d.toISOString().slice(0, 10);
}

/** Is this a sales invoice (not a cancellation/refund)? */
function isSalesInvoice(row) {
    if (String(row.iptal) === '1' || String(row.iptal).toLowerCase() === 'true') return false;
    const label = String(row.turuack || '');
    if (/iade/i.test(label)) return false;
    return /sat[ıi]ş/i.test(label) || String(row.efaturatipkodu || '').toUpperCase() === 'SATIS';
}

/**
 * Fetches all sales invoices of a customer from DIA (paginated) and caches them.
 * @returns {Promise<Array>} raw sales invoice rows
 */
async function fetchSalesInvoices(site, customerKey) {
    const cacheKey = `${site}:${customerKey}`;
    const cached = rawCache.get(cacheKey);
    if (cached) {
        if (cached.rows && Date.now() - cached.at < RAW_TTL_MS) return cached.rows;
        if (cached.promise) return cached.promise; // uçuşta olan çağrıyı paylaş (çift DIA çekimini önler)
    }

    const promise = (async () => {
        const service = new DiaOrderService(site);
        await service.init().catch(() => {});
        await service.login();

        // DIA'da her yıl AYRI dönemdir (dönem 3 = 2026, 2 = 2025, 1 = 2024). Cari _key
        // dönemler arası SABİT; fatura kendi döneminde durur. Son 3 dönemi tarayıp
        // birleştiririz ki 2024/2025 ciro/adet de grafiğe gelsin.
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
        rawCache.delete(cacheKey); // hatayı cache'leme
        throw err;
    }
}

const emptyMonths = () => Array.from({ length: 12 }, () => 0);

/**
 * PURE: satır listesinden yıl/ay ciro (net) + adet (toplammiktar) hesaplar.
 * @returns {{revenue:Object, quantity:Object, totals:Object, years:number[]}}
 */
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

/** Bugünün tarihi (YYYY-MM-DD, yerel). */
function todayStr() {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/**
 * PURE: satır listesinden FATURA BAZLI vade durumu (yaşlandırma) hesaplar.
 *
 * DIA'da tahsilatlar çoğu zaman faturalara EŞLEŞTİRİLMEZ (eslenentutar=0), bu yüzden
 * fatura-seviyesi `bekleyentutar` gerçek borcu göstermez. Gerçek açık borç cari
 * bakiyesidir; FIFO ile (vadesi EN ERKEN fatura önce ödenmiş sayılır) her faturanın
 * ödenen/kalan tutarı bulunur. Yalnızca kalanı olan (açık) faturalar döner.
 *
 * @param {number} [openBalanceTL] Cari gerçek açık borcu (TL). Verilmezse tüm netler açık.
 * @returns {{items:Array<{issueDate:string,dueDate:string,invoiceNo:string,totalKurus:number,paidKurus:number,remainingKurus:number}>, today:string, totalKurus:number, openBalanceKurus:number, overdueKurus:number}}
 */
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

    // Gerçek açık borç: verilmişse cari bakiyesi, yoksa tüm netler açık sayılır.
    let openBalance = (typeof openBalanceTL === 'number' && !isNaN(openBalanceTL)) ? openBalanceTL : totalNet;
    if (openBalance < 0) openBalance = 0;
    if (openBalance > totalNet) openBalance = totalNet;

    // FIFO: vadesi en erken fatura önce kapanır; kalan borç vadesi en geç faturalara biner.
    invoices.sort((a, b) =>
        (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : (a.issueDate < b.issueDate ? -1 : a.issueDate > b.issueDate ? 1 : 0))
    );
    let covered = round2(totalNet - openBalance); // ödenmiş kabul edilen toplam tutar

    const today = todayStr();
    const items = [];
    let overdue = 0;
    for (const inv of invoices) {
        let paid;
        if (covered >= inv.net) { paid = inv.net; covered = round2(covered - inv.net); }
        else { paid = covered; covered = 0; }
        const remaining = round2(inv.net - paid);
        if (remaining <= 0) continue; // tamamı ödenmiş faturalar listelenmez
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

/**
 * PURE: açık (ödenmemiş) satış faturalarının vade tarihi + kalan tutarı (takvim için).
 * computeAging'den türetilir — böylece takvim, /cari-ozet overdue ve Vade Durumu
 * sayfası TEK kaynaktan (aynı FIFO) beslenir, tutarsızlık olmaz.
 * @returns {{items:Array<{date:string, amount:number, invoiceNo:string}>, today:string, overdue:number}}
 */
function computeDueDates(rows, openBalanceTL) {
    const aging = computeAging(rows, openBalanceTL);
    const items = aging.items
        .filter((it) => /^\d{4}-\d{2}-\d{2}$/.test(it.dueDate))
        .map((it) => ({ date: it.dueDate, amount: round2(it.remainingKurus / 100), invoiceNo: it.invoiceNo }))
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
    return { items, today: aging.today, overdue: round2(aging.overdueKurus / 100) };
}

/** Canlı: carinin faturalarını çeker + yıl/ay ciro-adet hesaplar. */
async function invoiceStats(site, customerKey, yearCount = 3) {
    const rows = await fetchSalesInvoices(site, customerKey);
    return computeStats(rows, yearCount);
}

/** Canlı: carinin faturalarını çeker + FIFO açık vade kalemlerini hesaplar. */
async function invoiceDueDates(site, customerKey, openBalanceTL) {
    const rows = await fetchSalesInvoices(site, customerKey);
    return computeDueDates(rows, openBalanceTL);
}

/** Canlı: carinin faturalarını çeker + fatura bazlı vade durumu (yaşlandırma) hesaplar. */
async function invoiceAging(site, customerKey, openBalanceTL) {
    const rows = await fetchSalesInvoices(site, customerKey);
    return computeAging(rows, openBalanceTL);
}

module.exports = {
    invoiceStats,
    invoiceDueDates,
    invoiceAging,
    // Bulk finans senkronu (b2bFinanceSync) için: saf hesap + satış filtresi
    computeStats,
    computeDueDates,
    computeAging,
    isSalesInvoice,
    SELECTED_COLUMNS
};
