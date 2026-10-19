
const toKurus = v => Math.round((Number(v) || 0) * 100);
const DAY_MS = 24 * 60 * 60 * 1000;
const daysBetween = (from, to) => Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS);
const isDate = v => /^\d{4}-\d{2}-\d{2}/.test(String(v || ''));

const lower = type => String(type || '').toLocaleLowerCase('tr-TR');
const isOpeningEntry = type => /açılış/.test(lower(type));
const isPurchaseEntry = type => /alım|alınan/.test(lower(type));
const isSaleInvoice = type => /satış|verilen/.test(lower(type)) && !/iade/.test(lower(type)) && !isPurchaseEntry(type);
const isSaleReturn = type => /satış\s*iade/.test(lower(type));

function todayIstanbul(now = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(now);
}

function buildSalesLedger(movements) {
    return (Array.isArray(movements) ? movements : [])
        .map((m, index) => {
            const type = String(m.tur || '').trim();
            const date = isDate(m.tarih) ? String(m.tarih).slice(0, 10) : '';
            return {
                index,
                type,
                date,
                due: isDate(m.vade) ? String(m.vade).slice(0, 10) : date,
                ref: String(m.belgeNo || '').trim() || String(m.fisno || '').trim(),
                debit: toKurus(m.borc),
                credit: toKurus(m.alacak)
            };
        })
        .filter(r => r.date && !isOpeningEntry(r.type) && !isPurchaseEntry(r.type))
        .map(r => ({
            ...r,
            debit: r.debit > 0 && isSaleInvoice(r.type) ? r.debit : 0,
            credit: r.credit,
            isPayment: r.credit > 0 && !isSaleReturn(r.type)
        }))
        .filter(r => r.debit > 0 || r.credit > 0)
        .sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.index - b.index));
}

function computePaymentPerformance({ movements, balanceKurus, now = new Date(), months = 12 }) {
    const today = todayIstanbul(now);
    const since = new Date(now);
    since.setMonth(since.getMonth() - months);
    const sinceDate = todayIstanbul(since);

    const empty = {
        today, sinceDate,
        overdueKurus: 0, upcomingKurus: 0, overdueItems: [], upcomingItems: [],
        onTimeKurus: null, lateKurus: null, onTimeRatio: null, onTimePayments: []
    };
    const rows = buildSalesLedger(movements);
    if (!rows.length) return { ...empty, onTimeKurus: 0, lateKurus: 0 };

    const debts = [];
    const credits = [];
    let onTimeKurus = 0;
    let lateKurus = 0;
    const onTimePayments = [];

    const settle = (amount, credit, debt) => {
        debt.remaining -= amount;
        if (!credit.isPayment || credit.date < sinceDate) return;
        if (credit.date > debt.due) { lateKurus += amount; return; }
        onTimeKurus += amount;
        const last = onTimePayments[onTimePayments.length - 1];
        if (last && last.paymentDate === credit.date && last.paymentType === credit.type && last.invoiceNo === debt.ref) {
            last.amountKurus += amount;
            return;
        }
        onTimePayments.push({
            paymentDate: credit.date,
            paymentType: credit.type,
            invoiceNo: debt.ref,
            invoiceDate: debt.date,
            dueDate: debt.due,
            amountKurus: amount
        });
    };

    const net = rows.reduce((s, r) => s + r.debit - r.credit, 0);
    const opening = Math.max(0, Math.max(0, Number(balanceKurus) || 0) - net);
    if (opening > 0) {
        debts.push({ ref: 'Devir', date: rows[0].date, due: rows[0].date, total: opening, remaining: opening });
    }

    for (const r of rows) {
        if (r.debit > 0) {
            const debt = { ref: r.ref, date: r.date, due: r.due, total: r.debit, remaining: r.debit };
            while (debt.remaining > 0 && credits.length) {
                const c = credits[0];
                const used = Math.min(debt.remaining, c.amount);
                settle(used, c, debt);
                c.amount -= used;
                if (c.amount <= 0) credits.shift();
            }
            if (debt.remaining > 0) debts.push(debt);
        }
        if (r.credit > 0) {
            const credit = { amount: r.credit, date: r.date, type: r.type, isPayment: r.isPayment };
            while (credit.amount > 0 && debts.length) {
                const d = debts[0];
                const used = Math.min(credit.amount, d.remaining);
                settle(used, credit, d);
                credit.amount -= used;
                if (d.remaining <= 0) debts.shift();
            }
            if (credit.amount > 0) credits.push(credit);
        }
    }

    const overdueItems = [];
    const upcomingItems = [];
    for (const d of debts) {
        if (d.remaining <= 0) continue;
        const row = {
            invoiceNo: d.ref,
            issueDate: d.date,
            dueDate: d.due,
            totalKurus: d.total,
            paidKurus: d.total - d.remaining,
            remainingKurus: d.remaining
        };
        if (d.due < today) overdueItems.push({ ...row, daysOverdue: daysBetween(d.due, today) });
        else upcomingItems.push({ ...row, daysLeft: daysBetween(today, d.due) });
    }
    const byDue = (a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : 0);
    overdueItems.sort(byDue);
    upcomingItems.sort(byDue);
    const sum = list => list.reduce((s, x) => s + x.remainingKurus, 0);

    onTimePayments.reverse();
    const total = onTimeKurus + lateKurus;
    return {
        today,
        sinceDate,
        overdueKurus: sum(overdueItems),
        upcomingKurus: sum(upcomingItems),
        overdueItems,
        upcomingItems,
        onTimeKurus,
        lateKurus,
        onTimeRatio: total ? Math.round((onTimeKurus / total) * 1000) / 10 : null,
        onTimePayments
    };
}

module.exports = { computePaymentPerformance };
