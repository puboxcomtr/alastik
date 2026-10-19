
const DAY_MS = 24 * 60 * 60 * 1000;
const GSC_LAG_DAYS = 2;

const PERIOD_LABELS = {
    yesterday: 'Bugün',
    '7d': 'Son 7 Gün',
    '30d': 'Son 30 Gün',
    '6m': 'Son 6 Ay',
    '1y': 'Son 1 Yıl',
    custom: 'Seçili Tarihler'
};

const PERIOD_DAYS = { yesterday: 1, '7d': 7, '30d': 30, '6m': 182, '1y': 365 };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const toDateString = (date) => date.toISOString().slice(0, 10);
const parseDate = (str) => new Date(`${str}T00:00:00Z`);
const addDays = (str, n) => toDateString(new Date(parseDate(str).getTime() + n * DAY_MS));
const isValidDate = (str) => DATE_RE.test(str || '') && !Number.isNaN(parseDate(str).getTime());

function resolveSeoPeriod(query = {}, latestDate = null) {
    const key = String(query.period || '30d');
    const today = toDateString(new Date());
    const last = isValidDate(latestDate) ? latestDate : addDays(today, -GSC_LAG_DAYS);

    let start;
    let end;

    if (key === 'custom') {
        const from = String(query.from || '');
        const to = String(query.to || '');
        if (!isValidDate(from) || !isValidDate(to) || to < from) return null;
        start = from;
        end = to;
    } else if (PERIOD_DAYS[key]) {
        end = last;
        start = addDays(last, -(PERIOD_DAYS[key] - 1));
    } else {
        return null;
    }

    const days = Math.round((parseDate(end) - parseDate(start)) / DAY_MS) + 1;
    const prevEnd = addDays(start, -1);
    const prevStart = addDays(prevEnd, -(days - 1));

    return {
        key,
        label: PERIOD_LABELS[key],
        start,
        end,
        prevStart,
        prevEnd,
        days,
        granularity: days > 92 ? 'month' : 'day',
        latestDate: last
    };
}

module.exports = { resolveSeoPeriod, PERIOD_LABELS, PERIOD_DAYS, GSC_LAG_DAYS, addDays, toDateString, isValidDate };
