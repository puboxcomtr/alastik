const ExcelJS = require('exceljs');

const PALETTE = {
    brand: 'FFE6CF17',
    brandSoft: 'FFFBF6D4',
    black: 'FF000000',
    dark: 'FF2B2B2B',
    muted: 'FF6B6B68',
    border: 'FFE1E5E9',
    zebra: 'FFF7F8FA',
    white: 'FFFFFFFF',
    debit: 'FFD92D20',
    debitSoft: 'FFFDECEC',
    credit: 'FF12833A',
    creditSoft: 'FFE8F5EC',
};

const MONEY_FORMAT = '#,##0.00 "₺";[Red]-#,##0.00 "₺"';
const DATE_FORMAT = 'dd.mm.yyyy';
const FONT = 'Calibri';

const COLUMNS = [
    { key: 'tarih', header: 'Tarih', width: 13 },
    { key: 'vade', header: 'Vade Tarihi', width: 13 },
    { key: 'fisno', header: 'Fiş No', width: 17 },
    { key: 'belgeNo', header: 'Fatura / İrsaliye No', width: 22 },
    { key: 'tur', header: 'İşlem', width: 30 },
    { key: 'aciklama', header: 'Açıklama', width: 44 },
    { key: 'borc', header: 'Borç', width: 16 },
    { key: 'alacak', header: 'Alacak', width: 16 },
    { key: 'bakiye', header: 'Bakiye', width: 18 },
];
const LAST_COL = COLUMNS.length;

const SORT_KEYS = ['tarih', 'vade', 'fisno', 'belgeNo', 'borc', 'alacak', 'bakiye'];

function toDate(iso) {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
    return m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null;
}

function selectRows(movements, { yil, q, sort, dir }) {
    let list = movements || [];
    if (yil) list = list.filter((m) => String(m.tarih || '').slice(0, 4) === yil);
    const qq = String(q || '').trim().toLocaleLowerCase('tr');
    if (qq) {
        list = list.filter((m) => ['fisno', 'belgeNo', 'aciklama', 'tur']
            .some((f) => String(m[f] || '').toLocaleLowerCase('tr').includes(qq)));
    }
    const key = SORT_KEYS.includes(sort) ? sort : 'tarih';
    const asc = dir === 'asc';
    return [...list].reverse().sort((a, b) => {
        const av = a[key] ?? ''; const bv = b[key] ?? '';
        if (av < bv) return asc ? -1 : 1;
        if (av > bv) return asc ? 1 : -1;
        return 0;
    });
}

const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const thinBorder = (argb) => ({ style: 'thin', color: { argb } });

async function buildEkstreExcel({ movements, summary, filter, member, company, generatedAt }) {
    const rows = selectRows(movements, filter);

    const wb = new ExcelJS.Workbook();
    wb.creator = company?.name || '';
    wb.created = new Date();
    const ws = wb.addWorksheet('Cari Ekstre', {
        views: [{ state: 'frozen', ySplit: 6, showGridLines: false }],
        pageSetup: { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.3, footer: 0.3 } },
        headerFooter: { oddFooter: '&L&8&"Calibri"Cari Hesap Ekstresi&R&8&"Calibri"Sayfa &P / &N' },
    });
    ws.columns = COLUMNS.map((c) => ({ key: c.key, width: c.width }));

    ws.mergeCells(1, 1, 1, LAST_COL);
    const title = ws.getCell(1, 1);
    title.value = company?.name ? `${company.name} — Cari Hesap Ekstresi` : 'Cari Hesap Ekstresi';
    title.font = { name: FONT, size: 16, bold: true, color: { argb: PALETTE.black } };
    title.fill = fill(PALETTE.brand);
    title.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(1).height = 34;

    ws.mergeCells(2, 1, 2, LAST_COL);
    const sub = ws.getCell(2, 1);
    sub.value = [company?.officialName, company?.phone, company?.website].filter(Boolean).join('   •   ');
    sub.font = { name: FONT, size: 9, color: { argb: PALETTE.muted } };
    sub.fill = fill(PALETTE.brandSoft);
    sub.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    ws.getRow(2).height = 18;

    const infoRows = [
        ['Cari', `${member?.name || ''}${member?.cariKodu ? ` (${member.cariKodu})` : ''}`, 'Dönem', filter.yil || 'Tüm Yıllar'],
        ['Kayıt Sayısı', rows.length, 'Oluşturma', (generatedAt ? new Date(generatedAt) : new Date()).toLocaleString('tr-TR', { timeZone: 'Europe/Istanbul' })],
    ];
    infoRows.forEach((info, i) => {
        const r = 3 + i;
        ws.mergeCells(r, 2, r, 6);
        ws.mergeCells(r, 8, r, LAST_COL);
        const set = (col, value, bold) => {
            const c = ws.getCell(r, col);
            c.value = value;
            c.font = { name: FONT, size: 10, bold, color: { argb: bold ? PALETTE.muted : PALETTE.dark } };
            c.alignment = { vertical: 'middle', horizontal: 'left', indent: bold ? 1 : 0 };
        };
        set(1, info[0], true); set(2, info[1], false); set(7, info[2], true); set(8, info[3], false);
        ws.getCell(r, 2).font = { name: FONT, size: 10, bold: i === 0, color: { argb: PALETTE.dark } };
        ws.getRow(r).height = 18;
    });
    ws.getRow(5).height = 8;

    const head = ws.getRow(6);
    COLUMNS.forEach((c, i) => {
        const cell = head.getCell(i + 1);
        cell.value = c.header.toLocaleUpperCase('tr');
        cell.font = { name: FONT, size: 10, bold: true, color: { argb: PALETTE.brand } };
        cell.fill = fill(PALETTE.black);
        cell.alignment = { vertical: 'middle', horizontal: ['borc', 'alacak', 'bakiye'].includes(c.key) ? 'right' : 'left', indent: 1 };
    });
    head.height = 24;

    let debitTotal = 0;
    let creditTotal = 0;
    rows.forEach((m, i) => {
        const row = ws.addRow({
            tarih: toDate(m.tarih),
            vade: toDate(m.vade),
            fisno: m.fisno || '',
            belgeNo: m.belgeNo || '',
            tur: m.tur || '',
            aciklama: m.aciklama || '',
            borc: m.borc > 0 ? m.borc : null,
            alacak: m.alacak > 0 ? m.alacak : null,
            bakiye: Number(m.bakiye) || 0,
        });
        debitTotal += m.borc > 0 ? m.borc : 0;
        creditTotal += m.alacak > 0 ? m.alacak : 0;
        const zebra = i % 2 === 1;
        const isCredit = m.alacak > 0;
        row.height = 19;
        row.eachCell({ includeEmpty: true }, (cell, col) => {
            const key = COLUMNS[col - 1].key;
            cell.font = { name: FONT, size: 10, color: { argb: PALETTE.dark } };
            cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1, wrapText: key === 'aciklama' };
            if (zebra) cell.fill = fill(PALETTE.zebra);
            cell.border = { bottom: thinBorder(PALETTE.border) };
            if (key === 'tarih' || key === 'vade') cell.numFmt = DATE_FORMAT;
            if (key === 'fisno' || key === 'belgeNo') cell.font = { ...cell.font, bold: true };
            if (key === 'tur') {
                cell.fill = fill(isCredit ? PALETTE.creditSoft : PALETTE.debitSoft);
                cell.font = { name: FONT, size: 9, bold: true, color: { argb: isCredit ? PALETTE.credit : PALETTE.debit } };
            }
            if (key === 'aciklama') cell.font = { name: FONT, size: 9, color: { argb: PALETTE.muted } };
            if (key === 'borc' || key === 'alacak' || key === 'bakiye') {
                cell.numFmt = MONEY_FORMAT;
                cell.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
            }
            if (key === 'borc') cell.font = { name: FONT, size: 10, bold: true, color: { argb: PALETTE.debit } };
            if (key === 'alacak') cell.font = { name: FONT, size: 10, bold: true, color: { argb: PALETTE.credit } };
            if (key === 'bakiye') cell.font = { name: FONT, size: 10, bold: true, color: { argb: PALETTE.black } };
        });
    });

    if (rows.length) {
        ws.autoFilter = { from: { row: 6, column: 1 }, to: { row: 6 + rows.length, column: LAST_COL } };
    }

    const totals = [
        ['Listelenen Borç Toplamı', debitTotal, PALETTE.debit, null],
        ['Listelenen Alacak Toplamı', creditTotal, PALETTE.credit, null],
        ['Genel Bakiye', (Number(summary?.balanceKurus) || 0) / 100, PALETTE.black, PALETTE.brand],
    ];
    ws.addRow([]);
    totals.forEach(([label, value, color, bg]) => {
        const row = ws.addRow([]);
        const r = row.number;
        ws.mergeCells(r, 6, r, 8);
        const l = ws.getCell(r, 6);
        const v = ws.getCell(r, LAST_COL);
        l.value = label;
        l.font = { name: FONT, size: 10, bold: true, color: { argb: bg ? PALETTE.black : PALETTE.muted } };
        l.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
        v.value = value;
        v.numFmt = MONEY_FORMAT;
        v.font = { name: FONT, size: bg ? 12 : 11, bold: true, color: { argb: color } };
        v.alignment = { vertical: 'middle', horizontal: 'right', indent: 1 };
        [l, ws.getCell(r, 7), ws.getCell(r, 8), v].forEach((c) => {
            c.fill = fill(bg || PALETTE.zebra);
            c.border = { top: thinBorder(PALETTE.border), bottom: thinBorder(PALETTE.border) };
        });
        row.height = bg ? 24 : 20;
    });

    return Buffer.from(await wb.xlsx.writeBuffer());
}

module.exports = { buildEkstreExcel, selectRows };
