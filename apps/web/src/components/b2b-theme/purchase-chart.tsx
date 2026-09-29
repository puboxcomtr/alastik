'use client';

// Homepage purchase chart — monthly REVENUE and PURCHASE QUANTITY from DIA sales
// invoices. Left chart = revenue (net, VAT included), right chart = quantity.
import { useState, useEffect } from 'react';
import { API_ENDPOINTS } from '@src/config/api';

// Ay etiketleri (kullanıcıya görünen metin Türkçe kalır).
const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

// Per-year line color (oldest → newest; current year is the most prominent).
const LINE_COLORS = ['#94a3b8', '#5c86a6', '#111827'];

interface PurchaseStats {
  revenue: Record<string, number[]>;
  quantity: Record<string, number[]>;
  totals: Record<string, { revenue: number; quantity: number }>;
  years: number[];
}

// TL format (revenue is already in TL, not kuruş).
const tlFull = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function formatTL(v: number): string {
  return `${tlFull.format(v)}₺`;
}
// Compact axis format: 210.500 → "211B", 1.2M → "1,2M".
function compactTL(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace('.', ',')}M`;
  if (v >= 1000) return `${Math.round(v / 1000)}B`;
  return String(Math.round(v));
}
// Rounds the axis top up to a clean value (for tidy labels).
function niceCeil(v: number): number {
  if (v <= 0) return 1;
  const exp = Math.floor(Math.log10(v));
  const base = Math.pow(10, exp);
  const n = v / base;
  const step = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
  return step * base;
}

interface Series {
  year: number;
  color: string;
  values: number[];
}

function LineChart({
  series,
  tickFormat,
  tooltipFormat,
}: {
  series: Series[];
  tickFormat: (v: number) => string;
  tooltipFormat: (v: number) => string;
}) {
  const W = 560;
  const H = 300;
  const padL = 48;
  const padR = 14;
  const padT = 14;
  const padB = 26;
  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const rawMax = Math.max(1, ...series.flatMap((s) => s.values));
  const max = niceCeil(rawMax);
  const TICKS = 4;

  const xAt = (i: number) => padL + (plotW * i) / 11;
  const yAt = (v: number) => padT + plotH - (plotH * v) / max;

  // Hovered point: series index (si) + month index (i). Also shown on tap.
  const [hover, setHover] = useState<{ si: number; i: number } | null>(null);

  const tooltip = (() => {
    if (!hover) return null;
    const s = series[hover.si];
    const v = s.values[hover.i];
    const px = xAt(hover.i);
    const py = yAt(v);
    const line1 = `${MONTHS[hover.i]} ${s.year}`;
    const line2 = tooltipFormat(v);
    const boxW = Math.max(line1.length, line2.length) * 7 + 18;
    const boxH = 38;
    const bx = Math.max(2, Math.min(px - boxW / 2, W - boxW - 2));
    const by = py - boxH - 10 < 2 ? py + 12 : py - boxH - 10;
    return (
      <g pointerEvents="none">
        <circle cx={px} cy={py} r={5} fill={s.color} stroke="var(--brand-surface)" strokeWidth={2} />
        <rect className="tip-box" x={bx} y={by} width={boxW} height={boxH} rx={6} />
        <text className="tip-title" x={bx + 9} y={by + 15}>{line1}</text>
        <text className="tip-value" x={bx + 9} y={by + 31}>{line2}</text>
      </g>
    );
  })();

  return (
    <svg className="chart-svg" viewBox={`0 0 ${W} ${H}`} role="img">
      {/* Horizontal grid + y-axis labels */}
      {Array.from({ length: TICKS + 1 }, (_, t) => {
        const val = (max * t) / TICKS;
        const y = yAt(val);
        return (
          <g key={t}>
            <line className="grid-line" x1={padL} y1={y} x2={W - padR} y2={y} />
            <text className="axis-label" x={padL - 6} y={y + 3} textAnchor="end">
              {tickFormat(val)}
            </text>
          </g>
        );
      })}

      {/* Month labels (x-axis) */}
      {MONTHS.map((m, i) => (
        <text key={m} className="axis-label" x={xAt(i)} y={H - 8} textAnchor="middle">
          {m}
        </text>
      ))}

      {/* Year lines + points */}
      {series.map((s) => {
        const points = s.values.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
        return (
          <g key={s.year}>
            <polyline className="series-line" stroke={s.color} points={points} />
            {s.values.map((v, i) => (
              <circle key={i} className="series-dot" cx={xAt(i)} cy={yAt(v)} r={3} fill={s.color} />
            ))}
          </g>
        );
      })}

      {/* Hover hit areas (invisible, wide) */}
      {series.map((s, si) =>
        s.values.map((v, i) => (
          <circle
            key={`hit-${si}-${i}`}
            cx={xAt(i)}
            cy={yAt(v)}
            r={10}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover({ si, i })}
            onMouseLeave={() => setHover(null)}
            onClick={() => setHover({ si, i })}
          />
        ))
      )}

      {tooltip}
    </svg>
  );
}

export function PurchaseChart() {
  const [stats, setStats] = useState<PurchaseStats | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError(true);
      return;
    }
    fetch(API_ENDPOINTS.b2b.purchaseStats(), { headers: { Authorization: `Bearer ${token}`, 'X-Site': 'b2b' } })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) setStats(d.data);
        else setError(true);
      })
      .catch(() => setError(true));
  }, []);

  if (error) return null;

  const loading = stats === null;
  const years = stats?.years ?? [];

  const revenueSeries: Series[] = years.map((y, i) => ({
    year: y,
    color: LINE_COLORS[i % LINE_COLORS.length],
    values: stats!.revenue[String(y)] ?? Array(12).fill(0),
  }));
  const quantitySeries: Series[] = years.map((y, i) => ({
    year: y,
    color: LINE_COLORS[i % LINE_COLORS.length],
    values: stats!.quantity[String(y)] ?? Array(12).fill(0),
  }));

  if (loading) {
    return <div className="chart-empty">Alım grafiği hazırlanıyor…</div>;
  }

  return (
    <div className="charts-grid">
      {/* LEFT: revenue */}
      <div className="chart-card">
        <h2>Ciro</h2>
        <p className="chart-note">Aylık toplam fatura tutarı (KDV dahil)</p>
        <LineChart series={revenueSeries} tickFormat={compactTL} tooltipFormat={formatTL} />
        <div className="chart-legend">
          {years.map((y, i) => (
            <span key={y} className="legend-item">
              <span className="legend-dot" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />
              <span className="legend-year">{y}</span>
              <span className="legend-total">{formatTL(stats!.totals[String(y)]?.revenue ?? 0)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* RIGHT: quantity */}
      <div className="chart-card">
        <h2>Alım Adet</h2>
        <p className="chart-note">Aylık toplam ürün adedi (lastik + jant)</p>
        <LineChart
          series={quantitySeries}
          tickFormat={(v) => String(Math.round(v))}
          tooltipFormat={(v) => `${Math.round(v).toLocaleString('tr-TR')} adet`}
        />
        <div className="chart-legend">
          {years.map((y, i) => (
            <span key={y} className="legend-item">
              <span className="legend-dot" style={{ background: LINE_COLORS[i % LINE_COLORS.length] }} />
              <span className="legend-year">{y}</span>
              <span className="legend-total">
                {(stats!.totals[String(y)]?.quantity ?? 0).toLocaleString('tr-TR')} adet
              </span>
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
