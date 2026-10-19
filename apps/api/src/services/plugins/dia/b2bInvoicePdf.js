const { DiaOrderService } = require('./DiaOrderService');
const { withDiaLock, B2B_LOCK_KEY } = require('./diaLock');

const SELECTED_COLUMNS = ['tarih', 'fisno', 'belgeno', 'belgeno2', 'efaturalinki', 'turuack'];
const PERIOD_SCAN_COUNT = 3;
const EBELGE_HOST = 'ebelge.dia.com.tr';
const PDF_TIMEOUT_MS = 30000;
const LOCK_WAIT_MS = 30000;

function periodsFor(currentPeriod, invoiceDate) {
    const all = [];
    for (let p = currentPeriod; p > currentPeriod - PERIOD_SCAN_COUNT && p >= 1; p--) all.push(p);
    const year = parseInt(String(invoiceDate || '').slice(0, 4), 10);
    if (!year) return all;
    const guess = currentPeriod - (new Date().getFullYear() - year);
    return all.includes(guess) ? [guess, ...all.filter((p) => p !== guess)] : all;
}

async function findInvoiceLink(site, cariKey, { fisno, belgeNo, tarih }) {
    return withDiaLock(async () => {
        const svc = new DiaOrderService(site);
        await svc.init().catch(() => {});
        await svc.login();

        for (const period of periodsFor(svc.donemKodu || 1, tarih)) {
            const res = await svc.sendRequest('/api/v3/scf/json', {
                scf_fatura_listele: {
                    session_id: svc.sessionId,
                    firma_kodu: svc.firmaKodu,
                    donem_kodu: period,
                    filters: [
                        { field: '_key_scf_carikart', operator: '=', value: parseInt(cariKey, 10) },
                        { field: 'fisno', operator: '=', value: fisno }
                    ],
                    params: { selectedcolumns: SELECTED_COLUMNS },
                    limit: 20,
                    offset: 0
                }
            });
            const rows = Array.isArray(res?.result) ? res.result : [];
            const row = rows.find((r) => belgeNo && [r.belgeno, r.belgeno2].includes(belgeNo)) || rows[0];
            if (row) return { link: String(row.efaturalinki || '').trim() || null, belgeNo: row.belgeno || belgeNo || fisno };
        }
        return null;
    }, { label: 'b2b-fatura-pdf', key: B2B_LOCK_KEY, waitMs: LOCK_WAIT_MS });
}

async function fetchInvoicePdf(link) {
    const url = new URL(`${link.replace(/\/+$/, '')}.pdf`);
    if (url.hostname !== EBELGE_HOST) throw new Error(`unexpected e-belge host: ${url.hostname}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(PDF_TIMEOUT_MS) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('pdf')) throw new Error(`e-belge PDF HTTP ${res.status} ${type}`);
    return Buffer.from(await res.arrayBuffer());
}

async function getInvoicePdf(site, cariKey, invoice) {
    const found = await findInvoiceLink(site, cariKey, invoice);
    if (!found) return { notFound: true };
    if (!found.link) return { noEbelge: true };
    const pdf = await fetchInvoicePdf(found.link);
    const safeName = String(found.belgeNo).replace(/[^A-Za-z0-9_-]/g, '');
    return { pdf, fileName: `Fatura-${safeName || 'belge'}.pdf` };
}

module.exports = { getInvoicePdf };
