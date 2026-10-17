/**
 * b2b invoice PDF — the official e-Fatura / e-Arşiv copy of a dealer's invoice.
 *
 * DIA has no PDF method for invoices; instead `scf_fatura_listele` returns the
 * e-belge viewer link (`efaturalinki`, https://ebelge.dia.com.tr/...). The same
 * link with a `.pdf` suffix serves the official PDF. Only invoices sent as
 * e-belge have this link; paper invoices return nothing.
 *
 * The lookup is always filtered by the dealer's own cari key, so a dealer can
 * never reach another cari's invoice.
 *
 * NOTE: `fisno`, `belgeno`, `tarih`, `efaturalinki`, `_key_scf_carikart` are DIA
 * API field names and must stay as-is.
 */
const { DiaOrderService } = require('./DiaOrderService');
const { withDiaLock, B2B_LOCK_KEY } = require('./diaLock');

const SELECTED_COLUMNS = ['tarih', 'fisno', 'belgeno', 'belgeno2', 'efaturalinki', 'turuack'];
const PERIOD_SCAN_COUNT = 3;
const EBELGE_HOST = 'ebelge.dia.com.tr';
const PDF_TIMEOUT_MS = 30000;
const LOCK_WAIT_MS = 30000;

/** Periods to search: the invoice year's period first, then the rest (newest first). */
function periodsFor(currentPeriod, invoiceDate) {
    const all = [];
    for (let p = currentPeriod; p > currentPeriod - PERIOD_SCAN_COUNT && p >= 1; p--) all.push(p);
    const year = parseInt(String(invoiceDate || '').slice(0, 4), 10);
    if (!year) return all;
    const guess = currentPeriod - (new Date().getFullYear() - year);
    return all.includes(guess) ? [guess, ...all.filter((p) => p !== guess)] : all;
}

/** Finds the invoice's e-belge link in DIA (null when it is not an e-belge). */
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

/** Downloads the official PDF behind an e-belge link. */
async function fetchInvoicePdf(link) {
    const url = new URL(`${link.replace(/\/+$/, '')}.pdf`);
    if (url.hostname !== EBELGE_HOST) throw new Error(`unexpected e-belge host: ${url.hostname}`);
    const res = await fetch(url, { signal: AbortSignal.timeout(PDF_TIMEOUT_MS) });
    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.includes('pdf')) throw new Error(`e-belge PDF HTTP ${res.status} ${type}`);
    return Buffer.from(await res.arrayBuffer());
}

/**
 * @returns {Promise<{notFound?:true, noEbelge?:true, pdf?:Buffer, fileName?:string}>}
 */
async function getInvoicePdf(site, cariKey, invoice) {
    const found = await findInvoiceLink(site, cariKey, invoice);
    if (!found) return { notFound: true };
    if (!found.link) return { noEbelge: true };
    const pdf = await fetchInvoicePdf(found.link);
    const safeName = String(found.belgeNo).replace(/[^A-Za-z0-9_-]/g, '');
    return { pdf, fileName: `Fatura-${safeName || 'belge'}.pdf` };
}

module.exports = { getInvoicePdf };
