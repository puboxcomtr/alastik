import { CsvDownload } from "@components/b2b-theme/csv-download";
import { DataSource } from "@components/b2b-theme/data-source";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { PURCHASE_ROWS } from "@components/b2b-theme/lib/sample-data";

/**
 * Bayi Alım Adet Raporu — dönem bazlı alış özeti.
 * "Adet" ürün adedidir (sipariş satırı sayısı değil).
 */
export default function AlimAdetPage() {
  const totalTire = PURCHASE_ROWS.reduce((t, s) => t + s.tireQty, 0);
  const totalRim = PURCHASE_ROWS.reduce((t, s) => t + s.rimQty, 0);
  const toplamTutar = PURCHASE_ROWS.reduce((t, s) => t + s.tutarKurus, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            Bayi Alım Adet Raporu{" "}
            <span className="title-label">Platform Siparişleri</span>
          </h1>
          <p className="sub">
            Dönem bazlı alış özeti — toplam ürün adedi ve tutar.
          </p>
        </div>
        <CsvDownload
          dosyaAdi="alim-adet-raporu.csv"
          basliklar={["Dönem", "Lastik Adet", "Jant Adet", "Sipariş", "Tutar"]}
          lines={PURCHASE_ROWS.map((s) => [
            s.donem,
            s.tireQty,
            s.rimQty,
            s.orderQty,
            (s.tutarKurus / 100).toFixed(2),
          ])}
        />
      </div>

      <DataSource
        source="Örnek veri"
        ayrinti="lib/ornek-veri.ts → ALIM_ADETLERI"
        dateField="sipariş oluşturma tarihi"
        cancelRule="iptal edilen siparişler dışlanır; iade düşümü yok"
        tazelik="örnek veri"
        kapsamUyarisi={
          "Yalnızca bu panelden verilen siparişler sayılır; panel dışından " +
          "girilen alımlar bu adetlere DAHİL DEĞİLDİR."
        }
      />

      <div className="report-cards">
        <div className="report-card">
          <div className="label">Toplam Lastik</div>
          <div className="value">{totalTire.toLocaleString("tr-TR")}</div>
          <div className="note">adet</div>
        </div>
        <div className="report-card">
          <div className="label">Toplam Jant</div>
          <div className="value">{totalRim.toLocaleString("tr-TR")}</div>
          <div className="note">adet</div>
        </div>
        <div className="report-card vurgulu">
          <div className="label">Toplam Tutar (KDV dahil)</div>
          <div className="value">{formatKurus(toplamTutar)}</div>
        </div>
        <div className="report-card">
          <div className="label">Dönem</div>
          <div className="value">{PURCHASE_ROWS.length}</div>
          <div className="note">ay</div>
        </div>
      </div>

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>Dönem</th>
              <th className="num">Lastik Adet</th>
              <th className="num">Jant Adet</th>
              <th className="num">Sipariş Sayısı</th>
              <th className="num">Toplam Tutar</th>
            </tr>
          </thead>
          <tbody>
            {PURCHASE_ROWS.map((s) => (
              <tr key={s.donem}>
                <td>{s.donem}</td>
                <td className="num">
                  <strong>{s.tireQty}</strong>
                </td>
                <td className="num">{s.rimQty}</td>
                <td className="num">{s.orderQty}</td>
                <td className="num">{formatKurus(s.tutarKurus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
