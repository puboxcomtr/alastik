"use client";

// Ödemelerim — bayinin hesabına işlenen tahsilat/ödeme hareketleri (ekstre alacak).
// Kaynak: /odemeler (cari ekstredeki alacak kalemleri, DB-öncelikli). Kalem fatura ise (ör. iade faturası) PDF'i görüntülenebilir.
import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { SpinnerIcon, CloseIcon, ViewIcon, FileIcon } from "@components/b2b-theme/icons";
import { showToast } from "@components/b2b-theme/toast";
import { openInvoicePdf, isInvoiceMovement, invoiceMovementKey } from "@components/b2b-theme/lib/invoice-pdf";
import { Pagination } from "@components/b2b-theme/pagination";

const PER_PAGE = 30;

interface Payment {
  tarih: string;
  tur: string;
  aciklama: string;
  fisno: string;
  belgeNo?: string;
  alacak: number;
}

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const moneyTL = (v: number) => `${nf.format(v || 0)} TL`;
function formatDay(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });
}

type SortKey = "tarih" | "fisno" | "alacak";

export default function OdemelerimPage() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState(false);

  const [no, setNo] = useState("");
  const [tarih, setTarih] = useState("");
  const [applied, setApplied] = useState({ no: "", tarih: "" });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "tarih", dir: "desc" });
  const [secili, setSecili] = useState<Payment | null>(null);
  // PDF'i açılmakta olan faturanın anahtarı (düğme bekleme göstergesi)
  const [acilan, setAcilan] = useState<string | null>(null);

  async function faturaGoruntule(p: Payment) {
    if (acilan) return;
    setAcilan(invoiceMovementKey(p));
    const hata = await openInvoicePdf(p);
    if (hata) showToast(hata, "bilgi");
    setAcilan(null);
  }
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [applied, sort]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setSecili(null); };
    if (secili) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [secili]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setError(true); return; }
    fetch(API_ENDPOINTS.b2b.odemeler(), { headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setPayments(d.data.payments || []); else setError(true); })
      .catch(() => setError(true));
  }, []);

  const rows = useMemo(() => {
    let list = payments || [];
    const q = applied.no.trim().toLocaleLowerCase("tr");
    if (q) list = list.filter((p) => (p.fisno || "").toLocaleLowerCase("tr").includes(q));
    if (applied.tarih) list = list.filter((p) => p.tarih === applied.tarih);
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      const av = a[key] as string | number;
      const bv = b[key] as string | number;
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [payments, applied, sort]);

  const uygula = () => setApplied({ no, tarih });
  const temizle = () => { setNo(""); setTarih(""); setApplied({ no: "", tarih: "" }); };
  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "tarih" ? "desc" : "asc" }));
  const ok = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : " ↕");

  if (error) {
    return (<><div className="page-head"><div><h1>Ödemelerim</h1></div></div><p className="note">Ödemeleriniz şu an yüklenemedi.</p></>);
  }

  const totalPages = Math.ceil(rows.length / PER_PAGE);
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="page-head"><div><h1>Ödemelerim</h1></div></div>

      <form className="order-filter" onSubmit={(e) => { e.preventDefault(); uygula(); }}>
        <input type="text" placeholder="Ödeme No" value={no} onChange={(e) => setNo(e.target.value)} />
        <input type="date" placeholder="Tarih" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        <button type="button" className="of-clear" onClick={temizle}>Temizle</button>
        <button type="submit" className="of-search">Ara</button>
      </form>

      {payments === null ? (
        <p className="note loading-row" style={{ padding: "1rem 0" }}>
          <SpinnerIcon size={18} className="loading-brand" /> Ödemeler yükleniyor…
        </p>
      ) : (
        <div className="tablewrap">
          <table className="data order-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => sortBy("tarih")}>TARİH<span className="sarrow">{ok("tarih")}</span></th>
                <th className="sortable" onClick={() => sortBy("fisno")}>ÖDEME NO<span className="sarrow">{ok("fisno")}</span></th>
                <th>DURUM</th>
                <th className="sortable num" onClick={() => sortBy("alacak")}>TUTAR<span className="sarrow">{ok("alacak")}</span></th>
                <th>İŞLEM</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((p, i) => (
                <tr key={`${p.fisno}-${i}`}>
                  <td>{formatDay(p.tarih)}</td>
                  <td><button type="button" className="order-no-link" onClick={() => setSecili(p)}>{p.fisno || "—"}</button></td>
                  <td><span className="durum-badge ok">Tamamlandı</span></td>
                  <td className="num"><strong>{moneyTL(p.alacak)}</strong></td>
                  <td>
                    <div className="ekstre-row-actions">
                      {isInvoiceMovement(p) ? (
                        <button type="button" className="order-action" disabled={!!acilan} onClick={() => faturaGoruntule(p)}>
                          {acilan === invoiceMovementKey(p) ? <SpinnerIcon size={16} className="loading-brand" /> : <FileIcon size={16} />} Fatura Görüntüle
                        </button>
                      ) : null}
                      <button type="button" className="order-action" onClick={() => setSecili(p)}><ViewIcon size={16} /> Görüntüle</button>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={5} className="note" style={{ padding: "2rem", textAlign: "center" }}>
                  {payments.length === 0 ? "Henüz ödemeniz bulunmuyor." : "Aramanıza uygun ödeme bulunamadı."}
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {payments !== null ? (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={rows.length} perPage={PER_PAGE} />
      ) : null}

      {secili ? (
        <div className="inv-overlay" onClick={() => setSecili(null)}>
          <div className="inv-modal pay-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="inv-close" onClick={() => setSecili(null)} aria-label="Kapat"><CloseIcon size={18} /></button>
            <div className="inv-modal-title">Ödeme Ekstresi</div>
            <div className="pay-block">
              <div><span>İşlem Tipi</span><strong>{secili.tur || "—"}</strong></div>
              <div><span>Ödeme No</span><strong>{secili.fisno || "—"}</strong></div>
              <div><span>Ödeme Tarihi</span><strong>{formatDay(secili.tarih)}</strong></div>
              <div><span>Durum</span><span className="durum-badge ok">Tamamlandı</span></div>
              <div><span>Ödeme Tutarı</span><strong className="pay-amount">{moneyTL(secili.alacak)}</strong></div>
            </div>
            {secili.aciklama ? (
              <div className="pay-block">
                <div><span>Açıklama</span><strong>{secili.aciklama}</strong></div>
              </div>
            ) : null}
            {isInvoiceMovement(secili) ? (
              <div className="ekstre-modal-actions">
                <button type="button" className="primary" disabled={!!acilan} onClick={() => faturaGoruntule(secili)}>
                  {acilan === invoiceMovementKey(secili) ? <SpinnerIcon size={16} /> : <FileIcon size={16} />} Fatura Görüntüle (PDF)
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
