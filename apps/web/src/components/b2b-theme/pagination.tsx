"use client";

// Basit istemci sayfalama bileşeni — 1 2 3 … penceresi + önceki/sonraki.
import { ArrowLeftIcon, ArrowRightIcon } from "./icons";

function pageList(page: number, total: number): (number | "...")[] {
  const delta = 2;
  const range: number[] = [];
  for (let i = Math.max(1, page - delta); i <= Math.min(total, page + delta); i++) range.push(i);
  const out: (number | "...")[] = [];
  if (range[0] > 1) { out.push(1); if (range[0] > 2) out.push("..."); }
  out.push(...range);
  const last = range[range.length - 1];
  if (last < total) { if (last < total - 1) out.push("..."); out.push(total); }
  return out;
}

export function Pagination({
  page, totalPages, onChange, totalCount, perPage,
}: {
  page: number;
  totalPages: number;
  onChange: (p: number) => void;
  totalCount?: number;
  perPage?: number;
}) {
  if (totalPages <= 1) return null;
  const go = (p: number) => { if (p >= 1 && p <= totalPages && p !== page) onChange(p); };

  return (
    <div className="pager">
      {typeof totalCount === "number" && perPage ? (
        <span className="pager-info">
          {(page - 1) * perPage + 1}–{Math.min(page * perPage, totalCount)} / {totalCount.toLocaleString("tr-TR")} kayıt
        </span>
      ) : null}
      <div className="pager-btns">
        <button type="button" className="pager-arrow" onClick={() => go(page - 1)} disabled={page === 1} aria-label="Önceki">
          <ArrowLeftIcon size={15} />
        </button>
        {pageList(page, totalPages).map((p, i) =>
          p === "..." ? (
            <span key={`d${i}`} className="pager-dots">…</span>
          ) : (
            <button key={p} type="button" className={`pager-num${p === page ? " active" : ""}`} onClick={() => go(p)}>
              {p}
            </button>
          )
        )}
        <button type="button" className="pager-arrow" onClick={() => go(page + 1)} disabled={page === totalPages} aria-label="Sonraki">
          <ArrowRightIcon size={15} />
        </button>
      </div>
    </div>
  );
}
