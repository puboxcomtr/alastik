"use client";

// Cari Hesap Ekstresi — DIA hesap hareketleri (borç/alacak + yürüyen bakiye).
// Kaynak: /cari-ekstre (DB-öncelikli, gecelik senkron). Yıl filtresi + arama + Excel.
import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { openInvoicePdf, isInvoiceMovement, invoiceMovementKey } from "@components/b2b-theme/lib/invoice-pdf";
import { CloseIcon, FileIcon, SearchIcon, SpinnerIcon, ViewIcon } from "@components/b2b-theme/icons";
import { Pagination } from "@components/b2b-theme/pagination";
import { showToast } from "@components/b2b-theme/toast";

const PER_PAGE = 30;

interface Movement {
  tarih: string; vade: string; fisno: string; belgeNo?: string;
  tur: string; aciklama: string; borc: number; alacak: number; bakiye: number; odeme: boolean;
}
interface EkstreData {
  movements: Movement[];
  summary: { count: number; openingKurus: number; debitKurus: number; creditKurus: number; balanceKurus: number };
  generatedAt?: string | null;
}

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (v: number) => nf.format(v || 0);
const kurusTL = (k: number) => `${nf.format((k || 0) / 100)} TL`;
function formatDateTime(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleString("tr-TR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function gun(iso: string): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return iso;
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

// Fatura hareketleri (DIA türü "... (Fatura)") — resmi e-Fatura/e-Arşiv PDF'i görüntülenebilir
const isInvoice = (m: Movement) => isInvoiceMovement(m);
const movementKey = (m: Movement) => invoiceMovementKey(m);

type SortKey = "tarih" | "vade" | "fisno" | "belgeNo" | "borc" | "alacak" | "bakiye";

export default function CariEkstrePage() {
  const [data, setData] = useState<EkstreData | null>(null);
  const [me, setMe] = useState<{ name: string; cariKodu: string } | null>(null);
  const [error, setError] = useState(false);
  const [yil, setYil] = useState("");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" }>({ key: "tarih", dir: "desc" });
  const [page, setPage] = useState(1);
  // Detayı açılan hareket (Görüntüle)
  const [secili, setSecili] = useState<Movement | null>(null);
  // İndirilmekte olan faturanın anahtarı (buton spinner'ı)
  const [indirilen, setIndirilen] = useState<string | null>(null);
  // Excel (renkli .xlsx) hazırlanıyor mu
  const [excelHazirlaniyor, setExcelHazirlaniyor] = useState(false);

  async function excelIndir() {
    const token = localStorage.getItem("authToken");
    if (!token || excelHazirlaniyor) return;
    setExcelHazirlaniyor(true);
    try {
      const r = await fetch(API_ENDPOINTS.b2b.cariEkstreExcel({ yil, q, sort: sort.key, dir: sort.dir }), {
        headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" },
      });
      if (!r.ok) {
        const d = await r.json().catch(() => null);
        showToast(d?.message || "Excel dosyası şu an oluşturulamadı.", "bilgi");
        return;
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cari-ekstre-${yil || "tumu"}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      showToast("Excel dosyası şu an oluşturulamadı.", "bilgi");
    } finally {
      setExcelHazirlaniyor(false);
    }
  }

  // Fatura PDF'i yeni sekmede açılır (tarayıcının PDF görüntüleyicisinde; indirme oradan yapılabilir)
  async function faturaGoruntule(m: Movement) {
    if (indirilen) return;
    setIndirilen(movementKey(m));
    const hata = await openInvoicePdf(m);
    if (hata) showToast(hata, "bilgi");
    setIndirilen(null);
  }
  useEffect(() => { setPage(1); }, [yil, q, sort]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setError(true); return; }
    const h = { Authorization: `Bearer ${token}`, "X-Site": "b2b" };
    fetch(API_ENDPOINTS.b2b.cariEkstre(), { headers: h }).then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setData(d.data); else setError(true); }).catch(() => setError(true));
    fetch(API_ENDPOINTS.b2b.me(), { headers: h }).then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setMe(d.data); }).catch(() => {});
  }, []);

  const years = useMemo(() => {
    const s = new Set<string>();
    (data?.movements || []).forEach((m) => { const y = m.tarih.slice(0, 4); if (y) s.add(y); });
    return [...s].sort((a, b) => Number(b) - Number(a));
  }, [data]);

  // Varsayılan: en yeni yıl (2026); "Tüm Yıllar" seçeneği yok
  useEffect(() => { if (!yil && years.length) setYil(years[0]); }, [years]); // eslint-disable-line react-hooks/exhaustive-deps

  const rows = useMemo(() => {
    let list = data?.movements || [];
    if (yil) list = list.filter((m) => m.tarih.slice(0, 4) === yil);
    const qq = q.trim().toLocaleLowerCase("tr");
    if (qq) list = list.filter((m) =>
      (m.fisno || "").toLocaleLowerCase("tr").includes(qq) ||
      (m.belgeNo || "").toLocaleLowerCase("tr").includes(qq) ||
      (m.aciklama || "").toLocaleLowerCase("tr").includes(qq) ||
      (m.tur || "").toLocaleLowerCase("tr").includes(qq));
    const { key, dir } = sort;
    // Bakiye yürüyen olduğu için varsayılan tarih-desc dışında da satır bakiyesi doğru kalır
    return [...list].reverse().sort((a, b) => {
      const av = a[key] as string | number; const bv = b[key] as string | number;
      if (av < bv) return dir === "asc" ? -1 : 1;
      if (av > bv) return dir === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, yil, q, sort]);

  const sortBy = (key: SortKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === "asc" ? "desc" : "asc" } : { key, dir: (key === "tarih" || key === "vade") ? "desc" : "asc" }));
  const ok = (key: SortKey) => (sort.key === key ? (sort.dir === "asc" ? " ↑" : " ↓") : " ↕");

  if (error) {
    return (<><div className="page-head"><div><h1>Cari Hesap Ekstresi</h1></div></div><p className="note">Ekstre şu an yüklenemedi.</p></>);
  }
  if (!data) {
    return (<><div className="page-head"><div><h1>Cari Hesap Ekstresi</h1></div></div>
      <p className="note loading-row" style={{ padding: "1rem 0" }}><SpinnerIcon size={18} className="loading-brand" /> Ekstre yükleniyor…</p></>);
  }

  const totalPages = Math.ceil(rows.length / PER_PAGE);
  const pageRows = rows.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cari Hesap Ekstresi</h1>
          {me ? <p className="sub">{me.name} {me.cariKodu ? `(${me.cariKodu})` : ""}</p> : null}
        </div>
        <div className="ekstre-actions">
          <select className="mini" value={yil} onChange={(e) => setYil(e.target.value)}>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button className="btn-ghost excel-btn" type="button" onClick={excelIndir} disabled={excelHazirlaniyor}>
            {excelHazirlaniyor ? <SpinnerIcon size={16} className="loading-brand" /> : "⬇"} Excel İndir
          </button>
        </div>
      </div>

      <div className="ekstre-search">
        <SearchIcon size={16} />
        <input type="text" placeholder="Fiş no, açıklama veya ürün adı/kodu ile ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="tablewrap">
        <table className="data order-table ekstre-table">
          <thead>
            <tr>
              <th className="sortable" onClick={() => sortBy("tarih")}>TARİH<span className="sarrow">{ok("tarih")}</span></th>
              <th className="sortable" onClick={() => sortBy("vade")}>VADE TARİHİ<span className="sarrow">{ok("vade")}</span></th>
              <th className="sortable" onClick={() => sortBy("fisno")}>FİŞ NO<span className="sarrow">{ok("fisno")}</span></th>
              <th className="sortable" onClick={() => sortBy("belgeNo")}>FATURA/İRSALİYE NO<span className="sarrow">{ok("belgeNo")}</span></th>
              <th>İŞLEM</th>
              <th className="sortable num" onClick={() => sortBy("borc")}>BORÇ (₺)<span className="sarrow">{ok("borc")}</span></th>
              <th className="sortable num" onClick={() => sortBy("alacak")}>ALACAK (₺)<span className="sarrow">{ok("alacak")}</span></th>
              <th className="sortable num" onClick={() => sortBy("bakiye")}>BAKİYE (₺)<span className="sarrow">{ok("bakiye")}</span></th>
              <th>İŞLEMLER</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((m, i) => (
              <tr key={`${m.fisno}-${i}`}>
                <td>{gun(m.tarih)}</td>
                <td>{gun(m.vade)}</td>
                <td><span className="ekstre-no">{m.fisno || "—"}</span></td>
                <td><span className="ekstre-no">{m.belgeNo || "—"}</span></td>
                <td><span className={`islem-badge ${m.alacak > 0 ? "credit" : "debit"}`}>{m.tur || "—"}</span></td>
                <td className="num">{m.borc > 0 ? <span className="tut-borc">{num(m.borc)}</span> : "—"}</td>
                <td className="num">{m.alacak > 0 ? <span className="tut-alacak">{num(m.alacak)}</span> : "—"}</td>
                <td className="num"><strong>{num(m.bakiye)}</strong></td>
                <td>
                  <div className="ekstre-row-actions">
                    {isInvoice(m) ? (
                      <button type="button" className="order-action" disabled={!!indirilen} onClick={() => faturaGoruntule(m)}>
                        {indirilen === movementKey(m) ? <SpinnerIcon size={16} className="loading-brand" /> : <FileIcon size={16} />} Fatura Görüntüle
                      </button>
                    ) : null}
                    <button type="button" className="order-action" onClick={() => setSecili(m)}><ViewIcon size={16} /> Görüntüle</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={9} className="note" style={{ padding: "2rem", textAlign: "center" }}>Kayıt bulunamadı.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onChange={setPage} totalCount={rows.length} perPage={PER_PAGE} />

      {secili ? (
        <div className="inv-overlay" onClick={() => setSecili(null)}>
          <div className="inv-modal pay-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="inv-close" onClick={() => setSecili(null)} aria-label="Kapat"><CloseIcon size={18} /></button>
            <div className="inv-modal-title">Hareket Detayı</div>
            <div className="pay-block">
              <div><span>İşlem Tipi</span><strong>{secili.tur || "—"}</strong></div>
              <div><span>Fiş No</span><strong>{secili.fisno || "—"}</strong></div>
              <div><span>Fatura / İrsaliye No</span><strong>{secili.belgeNo || "—"}</strong></div>
              <div><span>Tarih</span><strong>{gun(secili.tarih)}</strong></div>
              <div><span>Vade Tarihi</span><strong>{gun(secili.vade)}</strong></div>
            </div>
            <div className="pay-block">
              <div><span>Borç</span><strong className="tut-borc">{secili.borc > 0 ? `${num(secili.borc)} TL` : "—"}</strong></div>
              <div><span>Alacak</span><strong className="tut-alacak">{secili.alacak > 0 ? `${num(secili.alacak)} TL` : "—"}</strong></div>
              <div><span>Bakiye</span><strong>{num(secili.bakiye)} TL</strong></div>
            </div>
            {secili.aciklama ? (
              <div className="pay-block">
                <div><span>Açıklama</span><strong>{secili.aciklama}</strong></div>
              </div>
            ) : null}
            {isInvoice(secili) ? (
              <div className="ekstre-modal-actions">
                <button type="button" className="primary" disabled={!!indirilen} onClick={() => faturaGoruntule(secili)}>
                  {indirilen === movementKey(secili) ? <SpinnerIcon size={16} /> : <FileIcon size={16} />} Fatura Görüntüle (PDF)
                </button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="ekstre-footer">
        {data.generatedAt ? (
          <div className="ekstre-notice">
            <span className="ekstre-notice-ico">ⓘ</span>
            <span>
              Bu ekstre <strong>{formatDateTime(data.generatedAt)}</strong> tarihinde oluşturulmuştur.
              Son hareketler ve bakiyeler bu tarihten sonra değişmiş olabilir.
            </span>
          </div>
        ) : <div />}
        <div className="ekstre-summary">
          <div className="es-row"><span>Dönem İçi Borç:</span><strong className="tut-borc">{kurusTL(data.summary.debitKurus)}</strong></div>
          <div className="es-row"><span>Dönem İçi Alacak:</span><strong className="tut-alacak">{kurusTL(data.summary.creditKurus)}</strong></div>
          <div className="es-row es-total"><span>Genel Bakiye:</span><strong>{kurusTL(data.summary.balanceKurus)}</strong></div>
        </div>
      </div>
    </>
  );
}
