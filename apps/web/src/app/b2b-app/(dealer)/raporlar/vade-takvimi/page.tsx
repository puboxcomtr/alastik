"use client";

import { useState } from "react";
import { DataSource } from "@components/b2b-theme/data-source";
import { formatKurus, formatDate, formatDay } from "@components/b2b-theme/lib/format";
import { DEALER, TODAY, ACCOUNT_SUMMARY } from "@components/b2b-theme/lib/sample-data";

const AYLAR = [
  "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];
const GUNLER = ["PZT", "SAL", "ÇAR", "PER", "CUM", "CMT", "PAZ"];

/**
 * Vade Takvimi — açık faturaların aylık vade dağılımı.
 *
 * Gecikme hesabı gün başlangıcına göre yapılır; "vadesi bugün" olan fatura
 * gecikmiş sayılmaz.
 */
export default function VadeTakvimiPage() {
  const [yil, setYil] = useState(TODAY.getUTCFullYear());
  const [ay, setAy] = useState(TODAY.getUTCMonth());
  const [listeGorunumu, setListeGorunumu] = useState(false);

  const acikFaturalar = ACCOUNT_SUMMARY.invoices.filter((f) => f.kalanKurus > 0);

  // Vade tarihi olan açık faturalar gün bazında toplanır.
  const gunToplam = new Map<string, number>();
  for (const f of acikFaturalar) {
    if (!f.vadeTarihi) continue;
    const anahtar = f.vadeTarihi.toISOString().slice(0, 10);
    gunToplam.set(anahtar, (gunToplam.get(anahtar) ?? 0) + f.kalanKurus);
  }

  // Takvim ızgarası: pazartesi başlangıçlı haftalar.
  const ilkGun = new Date(Date.UTC(yil, ay, 1));
  const kacGun = new Date(Date.UTC(yil, ay + 1, 0)).getUTCDate();
  const baslangicKaydir = (ilkGun.getUTCDay() + 6) % 7; // Pzt=0
  const hucreler: Date[] = [];
  for (let i = 0; i < baslangicKaydir; i++) {
    hucreler.push(new Date(Date.UTC(yil, ay, i - baslangicKaydir + 1)));
  }
  for (let g = 1; g <= kacGun; g++) hucreler.push(new Date(Date.UTC(yil, ay, g)));
  while (hucreler.length % 7 !== 0) {
    const son = hucreler[hucreler.length - 1]!;
    hucreler.push(new Date(son.getTime() + 86_400_000));
  }
  const haftalar: Date[][] = [];
  for (let i = 0; i < hucreler.length; i += 7) {
    haftalar.push(hucreler.slice(i, i + 7));
  }

  function ayKaydir(fark: number): void {
    const yeni = new Date(Date.UTC(yil, ay + fark, 1));
    setYil(yeni.getUTCFullYear());
    setAy(yeni.getUTCMonth());
  }

  const bugunAnahtar = TODAY.toISOString().slice(0, 10);
  const acikToplam = acikFaturalar.reduce((t, f) => t + f.kalanKurus, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Vade Takvimi</h1>
          <p className="sub">
            Vadeli faturalarınızın aylık vade dağılımı ve açık/kapalı durum
            raporu.
          </p>
        </div>
      </div>

      <DataSource
        source="Örnek veri"
        ayrinti="lib/ornek-veri.ts → CARI_OZET.faturalar"
        dateField="vade tarihi"
        cancelRule="iptal edilmiş ve borç niteliğinde olmayan faturalar takvime GİRMEZ"
        tazelik={`${formatDate(DEALER.sonSenkronAt)} itibarıyla (örnek)`}
      />

      <div className="report-cards">
        <div className="report-card kirmizi">
          <div className="label">⚠ Geçmiş Vadeler</div>
          <div className="value">{formatKurus(ACCOUNT_SUMMARY.overdueKurus)}</div>
        </div>
        <div className="report-card">
          <div className="label">📅 Bu Ay Vadesi</div>
          <div className="value">{formatKurus(ACCOUNT_SUMMARY.buAyVadesiKurus)}</div>
        </div>
        <div className="report-card vurgulu">
          <div className="label">🗓 Gelecek 30 Gün</div>
          <div className="value">{formatKurus(ACCOUNT_SUMMARY.gelecek30GunKurus)}</div>
        </div>
        <div className="report-card">
          <div className="label">Σ Toplam Vadeli</div>
          <div className="value">{formatKurus(ACCOUNT_SUMMARY.totalTermKurus)}</div>
        </div>
      </div>

      <div className="actions-row" style={{ marginBottom: "0.9rem" }}>
        <button
          type="button"
          className={`feature-chip${!listeGorunumu ? " selected" : ""}`}
          onClick={() => setListeGorunumu(false)}
        >
          📅 Takvim Görünümü
        </button>
        <button
          type="button"
          className={`feature-chip${listeGorunumu ? " selected" : ""}`}
          onClick={() => setListeGorunumu(true)}
        >
          ☰ Açık Faturalar ({acikFaturalar.length})
        </button>
        <span className="chip">Açık toplam {formatKurus(acikToplam)}</span>
      </div>

      {listeGorunumu ? (
        <div className="tablewrap">
          <table className="data">
            <thead>
              <tr>
                <th>Belge No</th>
                <th>Belge Tarihi</th>
                <th>Vade Tarihi</th>
                <th>Gecikme</th>
                <th>Ödeme Planı</th>
                <th className="num">Fatura Tutarı</th>
                <th className="num">Kalan</th>
              </tr>
            </thead>
            <tbody>
              {acikFaturalar.map((f) => (
                <tr key={f.fisNo}>
                  <td className="sku">{f.fisNo}</td>
                  <td>{formatDay(f.tarih)}</td>
                  <td>{formatDay(f.vadeTarihi)}</td>
                  <td>
                    {f.gecikmeGun !== null && f.gecikmeGun > 0 ? (
                      <span className="badge danger">
                        {f.gecikmeGun} gün gecikti
                      </span>
                    ) : f.gecikmeGun !== null ? (
                      <span className="badge ok">{-f.gecikmeGun} gün kaldı</span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{f.paymentPlan ?? "—"}</td>
                  <td className="num">{formatKurus(f.netKurus)}</td>
                  <td className="num">
                    <strong>{formatKurus(f.kalanKurus)}</strong>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div
            className="page-head"
            style={{ marginBottom: "0.7rem", alignItems: "center" }}
          >
            <h2 style={{ fontSize: "1.25rem" }}>
              {AYLAR[ay]} {yil}
            </h2>
            <div className="actions-row">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setYil(TODAY.getUTCFullYear());
                  setAy(TODAY.getUTCMonth());
                }}
              >
                📅 Bugüne git
              </button>
              <button type="button" className="btn-ghost" onClick={() => ayKaydir(-1)}>
                ‹
              </button>
              <button type="button" className="btn-ghost" onClick={() => ayKaydir(1)}>
                ›
              </button>
            </div>
          </div>

          <div className="takvim">
            <div className="calendar-head">
              <span>HAFTA</span>
              {GUNLER.map((g) => (
                <span key={g}>{g}</span>
              ))}
            </div>
            {haftalar.map((hafta, i) => {
              const haftaToplam = hafta.reduce(
                (s, gun) => s + (gunToplam.get(gun.toISOString().slice(0, 10)) ?? 0),
                0,
              );
              return (
                <div className="calendar-week" key={i}>
                  <div className="week-total">
                    Toplam
                    <strong>
                      {haftaToplam > 0 ? formatKurus(haftaToplam) : "0 TL"}
                    </strong>
                  </div>
                  {hafta.map((gun) => {
                    const anahtar = gun.toISOString().slice(0, 10);
                    const tutar = gunToplam.get(anahtar);
                    const disAy = gun.getUTCMonth() !== ay;
                    return (
                      <div
                        key={anahtar}
                        className={[
                          "calendar-day",
                          disAy ? "dis" : "",
                          tutar ? "vadeli" : "",
                          anahtar === bugunAnahtar ? "bugun" : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                      >
                        {gun.getUTCDate()}
                        {tutar ? (
                          <div className="tutar">{formatKurus(tutar)}</div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
