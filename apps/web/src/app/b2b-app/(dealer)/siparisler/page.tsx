"use client";

// Siparişlerim — filtrelenebilir + sıralanabilir tablo (DIA siparişleri).
// Detay, invoice/proforma görünümünde modal popup olarak açılır.
import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { SpinnerIcon, ViewIcon, CloseIcon } from "@components/b2b-theme/icons";
import { Pagination } from "@components/b2b-theme/pagination";

const PER_PAGE = 30;

interface OrderRow {
  orderNumber: string;
  status: string;
  createdAt: string;
  totalKurus: number;
  itemCount: number;
  productText: string;
  /** Bayinin sepette yazdığı Sipariş Açıklaması (panel dışı siparişte boş) */
  orderNote?: string;
}
interface OrderItem { name: string; stockCode: string; quantity: number; unitPrice: number; listUnitPrice?: number; totalPrice: number; }
interface OrderDetail {
  orderNumber: string;
  status: string;
  createdAt: string;
  paymentPlan?: string;
  items?: OrderItem[];
  itemCount?: number;
  pricing?: { subtotal?: number; vatAmount?: number; total?: number };
}

const STATUS_LABEL: Record<string, string> = { KABUL: "Onaylandı", RET: "Reddedildi", "": "Bekliyor" };
const durumClass = (s: string) => (s === "KABUL" ? "ok" : s === "RET" ? "err" : "wait");

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const money = (k: number) => `${nf.format((k || 0) / 100)} TL`;
const moneyTL = (v: number) => `${nf.format(v || 0)} TL`;
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
function dateKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

type SortKey = "createdAt" | "orderNumber" | "status" | "itemCount" | "totalKurus";

export default function SiparislerPage() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [error, setError] = useState(false);

  const [no, setNo] = useState("");
  const [urun, setUrun] = useState("");
  const [tarih, setTarih] = useState("");
  const [applied, setApplied] = useState({ no: "", urun: "", tarih: "" });
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "createdAt", dir: "desc" });
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [applied, sort]);

  // Modal
  const [modalNo, setModalNo] = useState<string | null>(null);
  const [detay, setDetay] = useState<OrderDetail | null>(null);
  const [detayErr, setDetayErr] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setError(true); return; }
    const h = { Authorization: `Bearer ${token}`, "X-Site": "b2b" };
    fetch(API_ENDPOINTS.b2b.siparislerim(), { headers: h }).then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setOrders(d.data.orders || []); else setError(true); }).catch(() => setError(true));
  }, []);

  // Modal açılınca detay çek
  useEffect(() => {
    if (!modalNo) { setDetay(null); setDetayErr(""); return; }
    const token = localStorage.getItem("authToken");
    setDetay(null); setDetayErr("");
    fetch(API_ENDPOINTS.b2b.siparisDetay(modalNo), { headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((d) => { if (d?.success && d.data?.order) setDetay(d.data.order); else setDetayErr(d?.message || "Sipariş bulunamadı."); })
      .catch(() => setDetayErr("Detay yüklenemedi."));
  }, [modalNo]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setModalNo(null); };
    if (modalNo) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [modalNo]);

  const rows = useMemo(() => {
    let list = orders || [];
    const q = applied.no.trim().toLocaleLowerCase("tr");
    const qu = applied.urun.trim().toLocaleLowerCase("tr");
    if (q) list = list.filter((o) => o.orderNumber.toLocaleLowerCase("tr").includes(q));
    if (qu) list = list.filter((o) => (o.productText || "").includes(qu));
    if (applied.tarih) list = list.filter((o) => dateKey(o.createdAt) === applied.tarih);
    const { key, dir } = sort;
    return [...list].sort((a, b) => {
      let av: string | number = a[key] as string | number;
      let bv: string | number = b[key] as string | number;
      if (key === "createdAt") { av = new Date(a.createdAt).getTime(); bv = new Date(b.createdAt).getTime(); }
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [orders, applied, sort]);

  const uygula = () => setApplied({ no, urun, tarih });
  const temizle = () => { setNo(""); setUrun(""); setTarih(""); setApplied({ no: "", urun: "", tarih: "" }); };
  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: key === "createdAt" ? "desc" : "asc" }));
  const ok = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : " ↕");

  if (error) {
    return (<><div className="page-head"><div><h1>Siparişlerim</h1></div></div><p className="note">Siparişleriniz şu an yüklenemedi.</p></>);
  }

  const p = detay?.pricing || {};
  const items = detay?.items || [];
  const totalPages = Math.ceil(rows.length / PER_PAGE);
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="page-head"><div><h1>Siparişlerim</h1></div></div>

      <form className="order-filter" onSubmit={(e) => { e.preventDefault(); uygula(); }}>
        <input type="text" placeholder="Sipariş No" value={no} onChange={(e) => setNo(e.target.value)} />
        <input type="text" placeholder="Ürün Adı / Kodu" value={urun} onChange={(e) => setUrun(e.target.value)} />
        <input type="date" placeholder="Tarih" value={tarih} onChange={(e) => setTarih(e.target.value)} />
        <button type="button" className="of-clear" onClick={temizle}>Temizle</button>
        <button type="submit" className="of-search">Ara</button>
      </form>

      {orders === null ? (
        <p className="note loading-row" style={{ padding: "1rem 0" }}>
          <SpinnerIcon size={18} className="loading-brand" /> Siparişler yükleniyor…
        </p>
      ) : (
        <div className="tablewrap">
          <table className="data order-table">
            <thead>
              <tr>
                <th className="sortable" onClick={() => sortBy("createdAt")}>TARİH<span className="sarrow">{ok("createdAt")}</span></th>
                <th className="sortable" onClick={() => sortBy("orderNumber")}>SİPARİŞ NO<span className="sarrow">{ok("orderNumber")}</span></th>
                <th className="sortable" onClick={() => sortBy("status")}>DURUM<span className="sarrow">{ok("status")}</span></th>
                <th>SİPARİŞ AÇIKLAMASI</th>
                <th className="sortable num" onClick={() => sortBy("itemCount")}>ADET<span className="sarrow">{ok("itemCount")}</span></th>
                <th className="sortable num" onClick={() => sortBy("totalKurus")}>TUTAR<span className="sarrow">{ok("totalKurus")}</span></th>
                <th>İŞLEM</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.map((o) => (
                <tr key={o.orderNumber}>
                  <td>{formatDate(o.createdAt)}</td>
                  <td><button type="button" className="order-no-link" onClick={() => setModalNo(o.orderNumber)}>{o.orderNumber}</button></td>
                  <td><span className={`durum-badge ${durumClass(o.status)}`}>{STATUS_LABEL[o.status] || o.status}</span></td>
                  <td className="order-note-cell" title={o.orderNote || undefined}><div className="order-note-text">{o.orderNote || "—"}</div></td>
                  <td className="num">{o.itemCount}</td>
                  <td className="num">{money(o.totalKurus)}</td>
                  <td>
                    <button type="button" className="order-action" onClick={() => setModalNo(o.orderNumber)}><ViewIcon size={16} /> Görüntüle</button>
                  </td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="note" style={{ padding: "2rem", textAlign: "center" }}>
                  {orders.length === 0 ? "Henüz siparişiniz bulunmuyor." : "Aramanıza uygun sipariş bulunamadı."}
                </td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      )}

      {orders !== null ? (
        <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={rows.length} perPage={PER_PAGE} />
      ) : null}

      {/* ── Invoice / proforma modal ── */}
      {modalNo ? (
        <div className="inv-overlay" onClick={() => setModalNo(null)}>
          <div className="inv-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="inv-close" onClick={() => setModalNo(null)} aria-label="Kapat"><CloseIcon size={18} /></button>

            {!detay && !detayErr ? (
              <p className="note loading-row" style={{ padding: "2rem" }}><SpinnerIcon size={18} className="loading-brand" /> Sipariş yükleniyor…</p>
            ) : detayErr ? (
              <p className="note" style={{ padding: "2rem" }}>{detayErr}</p>
            ) : detay ? (
              <div className="inv-sheet">
                <div className="inv-modal-title">Sipariş Detayları</div>
                <div className="inv-head">
                  <div className="inv-meta">
                    <div><span>Sipariş No</span><strong>{detay.orderNumber}</strong></div>
                    <div><span>Tarih</span><strong>{formatDate(detay.createdAt)}</strong></div>
                    <div><span>Durum</span><span className={`durum-badge ${durumClass(detay.status)}`}>{STATUS_LABEL[detay.status] || detay.status}</span></div>
                    {detay.paymentPlan ? <div><span>Ödeme Yöntemi</span><strong>{detay.paymentPlan}</strong></div> : null}
                  </div>
                </div>

                <table className="inv-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Ürün</th>
                      <th>Stok Kodu</th>
                      <th className="num">Adet</th>
                      <th className="num">Birim Fiyat</th>
                      <th className="num">Tutar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length > 0 ? items.map((it, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td className="inv-name">{it.name || "Ürün kalemi"}</td>
                        <td className="sku">{it.stockCode || "—"}</td>
                        <td className="num">{it.quantity}</td>
                        <td className="num">{moneyTL(it.unitPrice)}</td>
                        <td className="num"><strong>{moneyTL(it.totalPrice)}</strong></td>
                      </tr>
                    )) : (
                      <tr><td colSpan={6} className="note" style={{ padding: "1.2rem", textAlign: "center" }}>Kalem detayı bulunamadı.</td></tr>
                    )}
                  </tbody>
                </table>

                <div className="inv-totals">
                  <div><span>Ara Toplam (KDV hariç)</span><strong>{moneyTL(p.subtotal || 0)}</strong></div>
                  <div><span>KDV</span><strong>{moneyTL(p.vatAmount || 0)}</strong></div>
                  <div className="inv-grand"><span>Genel Toplam</span><strong>{moneyTL(p.total || 0)}</strong></div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </>
  );
}
