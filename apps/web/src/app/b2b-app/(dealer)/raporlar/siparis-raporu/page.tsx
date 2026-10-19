"use client";

import { useMemo, useState } from "react";
import { CsvDownload } from "@components/b2b-theme/csv-download";
import { DataSource } from "@components/b2b-theme/data-source";
import { STATUS_LABEL, formatKurus, formatDay } from "@components/b2b-theme/lib/format";
import { ORDERS } from "@components/b2b-theme/lib/sample-data";

type Satir = {
  anahtar: string;
  tarih: Date;
  orderNo: string;
  durum: string;
  productName: string;
  stockCode: string;
  marka: string;
  adet: number;
  birimFiyatKurus: number;
  satirToplamKurus: number;
};

export default function SiparisRaporuPage() {
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [getirildi, setGetirildi] = useState(false);

  const lines = useMemo<Satir[]>(() => {
    if (!getirildi) return [];
    return ORDERS.filter((s) => s.durum !== "CANCELLED")
      .filter((s) => {
        if (baslangic && s.createdAt < new Date(`${baslangic}T00:00:00Z`)) return false;
        if (bitis && s.createdAt > new Date(`${bitis}T23:59:59Z`)) return false;
        return true;
      })
      .flatMap((s) =>
        s.lines.map((k) => ({
          anahtar: k.id,
          tarih: s.createdAt,
          orderNo: s.no,
          durum: s.durum,
          productName: k.productName,
          stockCode: k.stockCode,
          marka: k.marka,
          adet: k.adet,
          birimFiyatKurus: k.birimFiyatKurus,
          satirToplamKurus: k.satirToplamKurus,
        })),
      )
      .sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
  }, [getirildi, baslangic, bitis]);

  const toplam = lines.reduce((t, s) => t + s.satirToplamKurus, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            Sipariş Raporu <span className="title-label">Platform Siparişleri</span>
          </h1>
          <p className="sub">
            Tarih aralığına göre sipariş detaylarınız — listeleyin ve CSV
            olarak indirin.
          </p>
        </div>
        {lines.length > 0 ? (
          <CsvDownload
            dosyaAdi="siparis-raporu.csv"
            basliklar={[
              "Tarih",
              "Sipariş No",
              "Durum",
              "Ürün",
              "Stok Kodu",
              "Marka",
              "Adet",
              "Birim Fiyat",
              "Satır Toplam",
            ]}
            lines={lines.map((s) => [
              formatDay(s.tarih),
              s.orderNo,
              STATUS_LABEL[s.durum] ?? s.durum,
              s.productName,
              s.stockCode,
              s.marka,
              s.adet,
              (s.birimFiyatKurus / 100).toFixed(2),
              (s.satirToplamKurus / 100).toFixed(2),
            ])}
          />
        ) : null}
      </div>

      <DataSource
        source="Örnek veri"
        ayrinti="lib/ornek-veri.ts → SIPARISLER + kalemler"
        dateField="sipariş oluşturma tarihi"
        cancelRule="iptal edilen siparişler tamamen dışlanır"
        tazelik="örnek veri"
        kapsamUyarisi={
          "Yalnızca bu panelden verilen siparişler sayılır. Telefon/e-posta " +
          "ile alınıp panele girilmemiş siparişler bu raporda görünmez."
        }
      />

      <div
        className="filterbar"
        style={{ alignItems: "flex-end", gap: "0.8rem", flexWrap: "wrap" }}
      >
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
        <button type="button" onClick={() => setGetirildi(true)}>
          🔍 Raporu Getir
        </button>
      </div>

      {!getirildi ? (
        <div
          className="alert"
          style={{
            background: "var(--brand-surface)",
            border: "1px solid var(--border)",
          }}
        >
          ℹ <strong>Rapor İçeriği:</strong> Seçtiğiniz tarih aralığındaki tüm
          siparişleriniz, ürün detayları ve fiyat bilgileri listelenecektir.
          Listelenen verileri CSV olarak indirebilirsiniz.
        </div>
      ) : (
        <>
          <p className="note" style={{ margin: "0.6rem 0" }}>
            {lines.length.toLocaleString("tr-TR")} kalem · Toplam{" "}
            <strong>{formatKurus(toplam)}</strong> (KDV dahil, iptaller hariç)
          </p>
          <div className="tablewrap">
            <table className="data">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Sipariş No</th>
                  <th>Durum</th>
                  <th>Ürün</th>
                  <th>Marka</th>
                  <th className="num">Adet</th>
                  <th className="num">Birim Fiyat</th>
                  <th className="num">Satır Toplam</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((s) => (
                  <tr key={s.anahtar}>
                    <td>{formatDay(s.tarih)}</td>
                    <td className="sku">{s.orderNo}</td>
                    <td>
                      <span className="badge info">
                        {STATUS_LABEL[s.durum] ?? s.durum}
                      </span>
                    </td>
                    <td>
                      {s.productName}
                      <div className="note">{s.stockCode}</div>
                    </td>
                    <td>{s.marka}</td>
                    <td className="num">{s.adet}</td>
                    <td className="num">{formatKurus(s.birimFiyatKurus)}</td>
                    <td className="num">
                      <strong>{formatKurus(s.satirToplamKurus)}</strong>
                    </td>
                  </tr>
                ))}
                {lines.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="note" style={{ padding: "2rem" }}>
                      Seçilen aralıkta sipariş yok.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
