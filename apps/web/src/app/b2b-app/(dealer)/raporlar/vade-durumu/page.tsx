"use client";

import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { CsvDownload } from "@components/b2b-theme/csv-download";
import { SearchIcon, SpinnerIcon } from "@components/b2b-theme/icons";
import { Pagination } from "@components/b2b-theme/pagination";

const PER_PAGE = 30;

interface AgingItem {
  issueDate: string;
  dueDate: string;
  invoiceNo: string;
  totalKurus: number;
  paidKurus: number;
  remainingKurus: number;
}

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyTL = (kurus: number) => `${nf.format((kurus || 0) / 100)} TL`;

function gun(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

function dayCount(dueDate: string, today: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !/^\d{4}-\d{2}-\d{2}$/.test(today)) return null;
  const due = Date.parse(`${dueDate}T00:00:00Z`);
  const now = Date.parse(`${today}T00:00:00Z`);
  if (isNaN(due) || isNaN(now)) return null;
  return Math.round((due - now) / 86400000);
}

type SortKey = "issueDate" | "dueDate" | "invoiceNo" | "day" | "totalKurus" | "paidKurus" | "remainingKurus";

export default function VadeDurumuPage() {
  const [items, setItems] = useState<AgingItem[] | null>(null);
  const [today, setToday] = useState("");
  const [me, setMe] = useState<{ name: string; cariKodu: string } | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "dueDate", dir: "asc" });
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [q, sort]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setError(true); return; }
    const h = { Authorization: `Bearer ${token}`, "X-Site": "b2b" };
    fetch(API_ENDPOINTS.b2b.agingStatus(), { headers: h }).then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) { setItems(d.data.items || []); setToday(d.data.today || ""); }
        else setError(true);
      }).catch(() => setError(true));
    fetch(API_ENDPOINTS.b2b.me(), { headers: h }).then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setMe(d.data); }).catch(() => {});
  }, []);

  const rows = useMemo(() => {
    let list = items || [];
    const qq = q.trim().toLocaleLowerCase("tr");
    if (qq) list = list.filter((it) => (it.invoiceNo || "").toLocaleLowerCase("tr").includes(qq));
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      let av: string | number; let bv: string | number;
      if (key === "day") { av = dayCount(a.dueDate, today) ?? 0; bv = dayCount(b.dueDate, today) ?? 0; }
      else { av = a[key] as string | number; bv = b[key] as string | number; }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [items, q, sort, today]);

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key
      ? { key, dir: s.dir === "asc" ? "desc" : "asc" }
      : { key, dir: (key === "issueDate" || key === "dueDate" || key === "day") ? "asc" : "desc" }));
  const ok = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : " ↕");

  if (error) {
    return (<><div className="page-head"><div><h1>Vade Durumu</h1></div></div><p className="note">Vade durumu şu an yüklenemedi.</p></>);
  }
  if (!items) {
    return (<><div className="page-head"><div><h1>Vade Durumu</h1></div></div>
      <p className="note loading-row" style={{ padding: "1rem 0" }}><SpinnerIcon size={18} className="loading-brand" /> Vade durumu yükleniyor…</p></>);
  }

  const totalPages = Math.ceil(rows.length / PER_PAGE);
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vade Durumu</h1>
          {me ? <p className="sub">{me.name} {me.cariKodu ? `(${me.cariKodu})` : ""}</p> : null}
        </div>
        <div className="ekstre-actions">
          <CsvDownload
            dosyaAdi="vade-durumu.csv"
            basliklar={["Tarih", "Vade Tarihi", "Fatura No", "Gün Sayısı", "Toplam Tutar", "Ödenen Tutar", "Kalan Tutar"]}
            lines={rows.map((it) => {
              const g = dayCount(it.dueDate, today);
              return [
                gun(it.issueDate), gun(it.dueDate), it.invoiceNo, g === null ? "" : String(g),
                (it.totalKurus / 100).toFixed(2), (it.paidKurus / 100).toFixed(2), (it.remainingKurus / 100).toFixed(2),
              ];
            })}
          />
        </div>
      </div>

      <div className="ekstre-search">
        <SearchIcon size={16} />
        <input type="text" placeholder="Fatura no ile ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="tablewrap">
        <table className="data order-table aging-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => sortBy("issueDate")}>TARİH<span className="sarrow">{ok("issueDate")}</span></th>
              <th className="sortable" onClick={() => sortBy("dueDate")}>VADE TARİHİ<span className="sarrow">{ok("dueDate")}</span></th>
              <th className="sortable" onClick={() => sortBy("invoiceNo")}>FATURA NO<span className="sarrow">{ok("invoiceNo")}</span></th>
              <th className="sortable num" onClick={() => sortBy("day")}>GÜN SAYISI<span className="sarrow">{ok("day")}</span></th>
              <th className="sortable num" onClick={() => sortBy("totalKurus")}>TOPLAM TUTAR<span className="sarrow">{ok("totalKurus")}</span></th>
              <th className="sortable num" onClick={() => sortBy("paidKurus")}>ÖDENEN TUTAR<span className="sarrow">{ok("paidKurus")}</span></th>
              <th className="sortable num" onClick={() => sortBy("remainingKurus")}>KALAN TUTAR<span className="sarrow">{ok("remainingKurus")}</span></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((it, i) => {
              const g = dayCount(it.dueDate, today);
              const gecti = g !== null && g < 0;
              return (
                <tr key={`${it.invoiceNo}-${i}`} className={gecti ? "overdue-row" : ""}>
                  <td>{gun(it.issueDate)}</td>
                  <td>{gun(it.dueDate)}</td>
                  <td><span className="aging-inv">{it.invoiceNo || "—"}</span></td>
                  <td className="num"><span className={gecti ? "day-late" : "day-ok"}>{g === null ? "—" : g}</span></td>
                  <td className="num">{moneyTL(it.totalKurus)}</td>
                  <td className="num">{it.paidKurus > 0 ? <span className="tut-alacak">{moneyTL(it.paidKurus)}</span> : moneyTL(0)}</td>
                  <td className="num"><strong>{moneyTL(it.remainingKurus)}</strong></td>
                </tr>
              );
            })}
            {rows.length === 0 ? (
              <tr><td colSpan={7} className="note" style={{ padding: "2rem", textAlign: "center" }}>
                {items.length === 0 ? "Açık vadeniz bulunmuyor." : "Aramanıza uygun kayıt bulunamadı."}
              </td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={rows.length} perPage={PER_PAGE} />
    </>
  );
}
