"use client";

import { useEffect, useMemo, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { CsvDownload } from "@components/b2b-theme/csv-download";
import { SpinnerIcon } from "@components/b2b-theme/icons";

interface Payment {
  tarih: string;
  tur: string;
  aciklama: string;
  fisno: string;
  alacak: number;
}
interface OdemeData {
  payments: Payment[];
  totalKurus: number;
  count: number;
}

const tl = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const formatTL = (v: number) => `${tl.format(v)}₺`;

export default function OdemelerPage() {
  const [data, setData] = useState<OdemeData | null>(null);
  const [error, setError] = useState(false);
  const [yil, setYil] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) { setError(true); return; }
    fetch(API_ENDPOINTS.b2b.odemeler(), { headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((d) => { if (d?.success && d.data) setData(d.data); else setError(true); })
      .catch(() => setError(true));
  }, []);

  const years = useMemo(() => {
    const s = new Set<string>();
    (data?.payments || []).forEach((p) => { const y = p.tarih.slice(0, 4); if (y) s.add(y); });
    return [...s].sort((a, b) => Number(b) - Number(a));
  }, [data]);

  const rows = useMemo(() => {
    const list = (data?.payments || []).filter((p) => !yil || p.tarih.slice(0, 4) === yil);
    return [...list].reverse();
  }, [data, yil]);

  const shownTotal = useMemo(() => rows.reduce((s, p) => s + p.alacak, 0), [rows]);

  if (error) {
    return (
      <>
        <div className="page-head"><div><h1>Ödemeler</h1></div></div>
        <p className="note">Ödemeler şu an yüklenemedi. Lütfen daha sonra tekrar deneyiniz.</p>
      </>
    );
  }
  if (!data) {
    return (
      <>
        <div className="page-head"><div><h1>Ödemeler</h1></div></div>
        <p className="note loading-row" style={{ padding: "1rem 0" }}>
          <SpinnerIcon size={18} className="loading-brand" /> Ödemeler yükleniyor…
        </p>
      </>
    );
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ödemeler</h1>
          <p className="sub">Hesabınıza işlenen tahsilat ve alacak hareketleri.</p>
        </div>
        <CsvDownload
          dosyaAdi={`odemeler-${yil || "tumu"}.csv`}
          basliklar={["Tarih", "İşlem Tipi", "Belge No", "Açıklama", "Tutar"]}
          lines={rows.map((p) => [p.tarih, p.tur, p.fisno, p.aciklama, p.alacak.toFixed(2)])}
        />
      </div>

      <div className="report-cards">
        <div className="report-card yesil">
          <div className="label">Toplam Ödeme (tümü)</div>
          <div className="value">{formatTL(data.totalKurus / 100)}</div>
          <div className="note">{data.count.toLocaleString("tr-TR")} kayıt</div>
        </div>
        <div className="report-card vurgulu">
          <div className="label">Gösterilen Toplam</div>
          <div className="value">{formatTL(shownTotal)}</div>
          <div className="note">{yil ? `${yil} yılı` : "tüm dönemler"}</div>
        </div>
      </div>

      <div className="filterbar" style={{ alignItems: "flex-end", gap: "0.8rem", flexWrap: "wrap" }}>
        <div>
          <label htmlFor="yil" style={{ display: "block", fontSize: "0.8rem", fontWeight: 650 }}>Yıl</label>
          <select id="yil" className="mini" value={yil} onChange={(e) => setYil(e.target.value)}>
            <option value="">Tümü</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <span className="chip">{rows.length.toLocaleString("tr-TR")} kayıt gösteriliyor</span>
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>Tarih</th>
              <th>İşlem Tipi</th>
              <th>Belge No</th>
              <th>Açıklama</th>
              <th className="num">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p, i) => (
              <tr key={`${p.fisno}-${i}`}>
                <td>{p.tarih}</td>
                <td>{p.tur}</td>
                <td className="sku">{p.fisno || "—"}</td>
                <td>{p.aciklama || "—"}</td>
                <td className="num">
                  <strong style={{ color: "var(--success-text)" }}>{formatTL(p.alacak)}</strong>
                </td>
              </tr>
            ))}
            {rows.length === 0 ? (
              <tr><td colSpan={5} className="note" style={{ padding: "2rem" }}>Seçilen aralıkta ödeme yok.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
