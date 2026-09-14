"use client";

import { useMemo, useState } from "react";
import { CsvDownload } from "@components/b2b-theme/csv-download";
import { DataSource } from "@components/b2b-theme/data-source";
import { formatKurus, formatDate, formatDay } from "@components/b2b-theme/lib/format";
import { DEALER, TODAY, ACCOUNT_LEDGER, ACCOUNT_SUMMARY } from "@components/b2b-theme/lib/sample-data";

const BU_YIL = TODAY.getFullYear();
const YILLAR = [BU_YIL, BU_YIL - 1, BU_YIL - 2];

/**
 * Cari Hareketler.
 *
 * Resmi cari toplamları ile ekranda listelenen satırların kontrol toplamı
 * AYRI kartlarda gösterilir; tek toplamda birleştirilmez. Yürüyen bakiye
 * yalnızca ikisi örtüşürse yayınlanır — örtüşmüyorsa tahmini bakiye
 * üretmek yerine gizlenir ve nedeni yazılır.
 */
export default function CariHareketlerPage() {
  const [yil, setYil] = useState(String(BU_YIL));
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");

  const ledgerRows = useMemo(() => {
    return ACCOUNT_LEDGER.filter((h) => {
      if (yil && h.tarih.getFullYear() !== Number(yil)) return false;
      if (baslangic && h.tarih < new Date(`${baslangic}T00:00:00Z`)) return false;
      if (bitis && h.tarih > new Date(`${bitis}T23:59:59Z`)) return false;
      return true;
    }).sort((a, b) => a.tarih.getTime() - b.tarih.getTime());
  }, [yil, baslangic, bitis]);

  // İptaller listelenir ama TOPLAMLARA katılmaz.
  const gecerliler = ledgerRows.filter((h) => !h.iptal);
  const kontrolBorc = gecerliler.reduce((t, h) => t + h.borcKurus, 0);
  const kontrolAlacak = gecerliler.reduce((t, h) => t + h.alacakKurus, 0);

  /**
   * Bu şablonda listelenen satırlar bilinçli olarak resmi toplamın tamamını
   * kapsamaz (açılış devri ve kasadan geçmeyen ödemeler yok) — mutabakatın
   * tutmadığı durumun tasarımı da görünsün diye.
   */
  const borcFark = Math.abs(ACCOUNT_SUMMARY.borcToplamKurus - kontrolBorc);
  const alacakFark = Math.abs(ACCOUNT_SUMMARY.alacakToplamKurus - kontrolAlacak);
  const balanceVisible = borcFark <= 1 && alacakFark <= 1;
  const borclu = ACCOUNT_SUMMARY.balanceKurus > 0;

  let yuruyen = 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Cari Hareketler</h1>
          <p className="sub">Hesap hareketlerinizi ve bakiyenizi görüntüleyin.</p>
        </div>
        <CsvDownload
          dosyaAdi={`cari-hareketler-${yil || "tumu"}.csv`}
          basliklar={[
            "Belge Tarihi",
            "Vade Tarihi",
            "Belge No",
            "İşlem Tipi",
            "Borç",
            "Alacak",
            "İptal",
          ]}
          lines={ledgerRows.map((h) => [
            formatDay(h.tarih),
            formatDay(h.vadeTarihi),
            h.belgeNo,
            h.txnType,
            (h.borcKurus / 100).toFixed(2),
            (h.alacakKurus / 100).toFixed(2),
            h.iptal ? "evet" : "hayır",
          ])}
        />
      </div>

      <DataSource
        source="Örnek veri"
        ayrinti="lib/ornek-veri.ts → CARI_HAREKETLER (satırlar) · CARI_OZET (özet kartlar)"
        dateField="belge tarihi"
        cancelRule="iptaller listelenir, rozetle işaretlenir, TOPLAMLARA katılmaz"
        tazelik={`örnek veri · ${formatDate(DEALER.sonSenkronAt)} anlık görüntüsü`}
        kapsamUyarisi={
          "Bu ekran bir tasarım şablonudur; satırlar gerçek muhasebe kaydı " +
          "değildir. Gerçek veriye bağlanırken kasadan geçmeyen ödemeler " +
          "(havale, çek/senet, mahsup) ve açılış devri gibi eksik kalabilecek " +
          "kalemler kullanıcıya burada açıkça yazılmalıdır."
        }
      />

      <h2 className="section">Resmi Cari Toplamları</h2>
      <div className="report-cards">
        <div className="report-card kirmizi">
          <div className="label">↙ Toplam Borç</div>
          <div className="value">{formatKurus(ACCOUNT_SUMMARY.borcToplamKurus)}</div>
          <div className="note">cari kart rakamı</div>
        </div>
        <div className="report-card yesil">
          <div className="label">↗ Toplam Alacak</div>
          <div className="value">{formatKurus(ACCOUNT_SUMMARY.alacakToplamKurus)}</div>
          <div className="note">cari kart rakamı</div>
        </div>
        <div className={`report-card${borclu ? " kirmizi" : " yesil"}`}>
          <div className="label">💳 Net Bakiye (geçerli)</div>
          <div className="value">
            {formatKurus(Math.abs(ACCOUNT_SUMMARY.balanceKurus))}
            <span style={{ fontSize: "0.8rem", fontWeight: 600, marginLeft: 6 }}>
              {borclu ? "Borçlu" : "Alacaklı"}
            </span>
          </div>
          <div className="note">cari kart rakamı</div>
        </div>
      </div>

      <h2 className="section">
        Bu Ekranda Listelenen Hareketlerin Kontrol Toplamı
      </h2>
      <div className="report-cards">
        <div className="report-card">
          <div className="label">Listelenen borç</div>
          <div className="value">{formatKurus(kontrolBorc)}</div>
          {borcFark > 1 ? (
            <div className="note" style={{ color: "var(--danger)" }}>
              resmi rakamdan {formatKurus(borcFark)} farklı
            </div>
          ) : (
            <div className="note">resmi rakamla örtüşüyor</div>
          )}
        </div>
        <div className="report-card">
          <div className="label">Listelenen alacak</div>
          <div className="value">{formatKurus(kontrolAlacak)}</div>
          {alacakFark > 1 ? (
            <div className="note" style={{ color: "var(--danger)" }}>
              resmi rakamdan {formatKurus(alacakFark)} farklı
            </div>
          ) : (
            <div className="note">resmi rakamla örtüşüyor</div>
          )}
        </div>
        <div className="report-card">
          <div className="label">Mutabakat</div>
          <div className="value">
            {balanceVisible ? "✓ Tutuyor" : "✕ Tutmuyor"}
          </div>
          <div className="note">
            {balanceVisible
              ? "yürüyen bakiye yayınlandı"
              : "yürüyen bakiye gizlendi"}
          </div>
        </div>
      </div>

      <div
        className="filterbar"
        style={{ alignItems: "flex-end", gap: "0.8rem", flexWrap: "wrap" }}
      >
        <div>
          <label htmlFor="yil" style={{ display: "block", fontSize: "0.8rem", fontWeight: 650 }}>
            Yıl
          </label>
          <select
            id="yil"
            className="mini"
            value={yil}
            onChange={(e) => setYil(e.target.value)}
          >
            {YILLAR.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="baslangic" style={{ display: "block", fontSize: "0.8rem", fontWeight: 650 }}>
            Başlangıç Tarihi
          </label>
          <input
            id="baslangic"
            type="date"
            value={baslangic}
            onChange={(e) => setBaslangic(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="bitis" style={{ display: "block", fontSize: "0.8rem", fontWeight: 650 }}>
            Bitiş Tarihi
          </label>
          <input
            id="bitis"
            type="date"
            value={bitis}
            onChange={(e) => setBitis(e.target.value)}
          />
        </div>
        <button
          type="button"
          className="clear"
          onClick={() => {
            setYil(String(BU_YIL));
            setBaslangic("");
            setBitis("");
          }}
        >
          ✕
        </button>
        <span className="chip">
          {ledgerRows.length.toLocaleString("tr-TR")} kayıt gösteriliyor
        </span>
      </div>

      {!balanceVisible ? (
        <div className="alert warn">
          <strong>Yürüyen bakiye gösterilemiyor.</strong> Listelenen satırların
          toplamı resmi cari rakamıyla örtüşmüyor; tahmini bir bakiye
          üretilmedi.
        </div>
      ) : null}

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>Belge Tarihi</th>
              <th>Vade Tarihi</th>
              <th>Belge No</th>
              <th>İşlem Tipi</th>
              <th className="num">Borç</th>
              <th className="num">Alacak</th>
              {balanceVisible ? <th className="num">Bakiye</th> : null}
            </tr>
          </thead>
          <tbody>
            {ledgerRows.map((h, i) => {
              if (!h.iptal) yuruyen += h.borcKurus - h.alacakKurus;
              return (
                <tr
                  key={`${h.belgeNo}-${i}`}
                  style={h.iptal ? { opacity: 0.5 } : undefined}
                >
                  <td>{formatDay(h.tarih)}</td>
                  <td>{formatDay(h.vadeTarihi)}</td>
                  <td className="sku">
                    {h.belgeNo}
                    {h.iptal ? (
                      <span className="badge danger" style={{ marginLeft: 6 }}>
                        iptal
                      </span>
                    ) : null}
                  </td>
                  <td>
                    {h.txnType}
                    <div className="note">
                      {h.source === "fatura" ? "fatura" : "kasa işlemi"}
                    </div>
                    {h.aciklama ? <div className="note">{h.aciklama}</div> : null}
                  </td>
                  <td className="num">
                    {h.borcKurus > 0 ? (
                      <strong style={{ color: "var(--danger)" }}>
                        {formatKurus(h.borcKurus)}
                      </strong>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="num">
                    {h.alacakKurus > 0 ? (
                      <strong style={{ color: "var(--success-text)" }}>
                        {formatKurus(h.alacakKurus)}
                      </strong>
                    ) : (
                      "—"
                    )}
                  </td>
                  {balanceVisible ? (
                    <td className="num">{h.iptal ? "—" : formatKurus(yuruyen)}</td>
                  ) : null}
                </tr>
              );
            })}
            {ledgerRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="note" style={{ padding: "2rem" }}>
                  Seçilen aralıkta hareket yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
