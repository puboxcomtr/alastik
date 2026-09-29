'use client';

// Gelecek Vadeler — dealer's open sales INVOICES due-date calendar (monthly view).
// Source: DIA sales invoices (ortalamavade + bekleyentutar). Overdue = red,
// upcoming = brand highlight. Left column shows weekly total, right panel shows
// the selected day's invoices.
import { useState, useEffect, useMemo } from 'react';
import { API_ENDPOINTS } from '@src/config/api';
import { ArrowLeftIcon, ArrowRightIcon, CalendarIcon } from './icons';

interface DueItem {
  date: string; // YYYY-MM-DD
  amount: number; // TL
  invoiceNo: string;
}

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const WEEKDAY_SHORT = ['PZT', 'SAL', 'ÇAR', 'PER', 'CUM', 'CMT', 'PAZ'];
const WEEKDAY_LONG = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

const tl2 = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const tl0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 });
const formatFull = (v: number) => `${tl2.format(v)} TL`;
const formatShort = (v: number) => `${tl0.format(v)} ₺`;

/** Local date parts → YYYY-MM-DD (no timezone shift). */
function dateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** 6-week (Monday-first) day grid for a month. */
function buildWeeks(year: number, month: number): Date[][] {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday = 0
  const weeks: Date[][] = [];
  const cursor = new Date(year, month, 1 - startOffset);
  for (let w = 0; w < 6; w++) {
    const days: Date[] = [];
    for (let d = 0; d < 7; d++) {
      days.push(new Date(cursor));
      cursor.setDate(cursor.getDate() + 1);
    }
    weeks.push(days);
  }
  return weeks;
}

export function DueCalendar() {
  const [items, setItems] = useState<DueItem[] | null>(null);
  const [today, setToday] = useState<string>('');
  const [error, setError] = useState(false);
  const [view, setView] = useState<{ year: number; month: number }>(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError(true);
      return;
    }
    fetch(API_ENDPOINTS.b2b.dueDates(), { headers: { Authorization: `Bearer ${token}`, 'X-Site': 'b2b' } })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) {
          setItems(d.data.items || []);
          setToday(d.data.today || dateKey(new Date()));
          setSelected(d.data.today || dateKey(new Date()));
        } else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  // date → { total, entries }
  const dayMap = useMemo(() => {
    const map = new Map<string, { total: number; entries: DueItem[] }>();
    (items || []).forEach((it) => {
      const e = map.get(it.date) || { total: 0, entries: [] };
      e.total = Math.round((e.total + it.amount) * 100) / 100;
      e.entries.push(it);
      map.set(it.date, e);
    });
    return map;
  }, [items]);

  if (error) return null;

  const loading = items === null;
  if (loading) {
    return (
      <section className="due-section">
        <h2 className="due-heading">Gelecek Vadeler</h2>
        <div className="chart-empty">Vade takvimi hazırlanıyor…</div>
      </section>
    );
  }

  const weeks = buildWeeks(view.year, view.month);
  const monthPrefix = `${view.year}-${String(view.month + 1).padStart(2, '0')}`;
  const monthItems = (items || []).filter((it) => it.date.startsWith(monthPrefix));
  const monthTotal = monthItems.reduce((a, b) => a + b.amount, 0);

  const goToMonth = (delta: number) => {
    const d = new Date(view.year, view.month + delta, 1);
    setView({ year: d.getFullYear(), month: d.getMonth() });
  };
  const goToToday = () => {
    const n = new Date();
    setView({ year: n.getFullYear(), month: n.getMonth() });
    if (today) setSelected(today);
  };

  const selectedEntry = selected ? dayMap.get(selected) : undefined;
  const selectedDate = selected ? new Date(`${selected}T00:00:00`) : null;
  const selectedWeekday = selectedDate ? WEEKDAY_LONG[(selectedDate.getDay() + 6) % 7] : '';

  return (
    <section className="due-section">
      <h2 className="due-heading">Gelecek Vadeler</h2>

      <div className="due-card">
        {/* Left: calendar */}
        <div className="due-cal">
          <div className="due-cal-head">
            <div>
              <div className="due-month">{MONTH_NAMES[view.month]} {view.year}</div>
              <div className="due-month-sub">
                Bu ay {formatFull(monthTotal)} · {monthItems.length} fatura
              </div>
            </div>
            <div className="due-nav">
              <button type="button" className="due-today" onClick={goToToday}>Bugün</button>
              <button type="button" className="due-arrow" onClick={() => goToMonth(-1)} aria-label="Önceki ay">
                <ArrowLeftIcon size={16} />
              </button>
              <button type="button" className="due-arrow" onClick={() => goToMonth(1)} aria-label="Sonraki ay">
                <ArrowRightIcon size={16} />
              </button>
            </div>
          </div>

          <table className="due-grid">
            <thead>
              <tr>
                <th className="due-wk">HAFTA</th>
                {WEEKDAY_SHORT.map((w) => (
                  <th key={w}>{w}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeks.map((days, wi) => {
                const weekTotal = days.reduce((a, d) => a + (dayMap.get(dateKey(d))?.total || 0), 0);
                return (
                  <tr key={wi}>
                    <td className="due-wk">
                      <span className="due-wk-label">TOPLAM</span>
                      <span className="due-wk-val">{weekTotal > 0 ? formatShort(weekTotal) : '—'}</span>
                    </td>
                    {days.map((d) => {
                      const k = dateKey(d);
                      const entry = dayMap.get(k);
                      const inMonth = d.getMonth() === view.month;
                      const isToday = k === today;
                      const isSelected = k === selected;
                      const overdue = today && k < today;
                      const cls = [
                        'due-day',
                        inMonth ? '' : 'muted',
                        isToday ? 'today' : '',
                        isSelected ? 'selected' : '',
                      ].filter(Boolean).join(' ');
                      return (
                        <td key={k} className={cls} onClick={() => setSelected(k)}>
                          <span className="due-daynum">{d.getDate()}</span>
                          {entry ? (
                            <span className={`due-badge ${overdue ? 'overdue' : 'upcoming'}`}>
                              {formatShort(entry.total)}
                            </span>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Right: selected day detail */}
        <aside className="due-detail">
          <div className="due-detail-head">
            <span className="due-detail-title">
              <CalendarIcon size={15} />
              {selectedDate ? `${selectedDate.getDate()} ${MONTH_NAMES[selectedDate.getMonth()]} · ${selectedWeekday}` : 'Gün seçiniz'}
            </span>
            <span className="due-detail-count">{selectedEntry?.entries.length || 0} fatura</span>
          </div>

          <div className="due-detail-body">
            {selectedEntry && selectedEntry.entries.length > 0 ? (
              <ul className="due-list">
                {selectedEntry.entries.map((it, i) => (
                  <li key={`${it.invoiceNo}-${i}`}>
                    <span className="due-list-no">Fatura #{it.invoiceNo}</span>
                    <span className="due-list-amt">{formatFull(it.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="due-empty">
                <CalendarIcon size={28} />
                <p>Bu güne ait fatura bulunmuyor.</p>
              </div>
            )}
          </div>

          <div className="due-detail-foot">
            <span>Toplam</span>
            <strong>{formatFull(selectedEntry?.total || 0)}</strong>
          </div>
        </aside>
      </div>
    </section>
  );
}
