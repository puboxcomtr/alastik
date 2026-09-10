"use client";

import { useMemo, useState } from "react";
import { CsvIndir } from "@components/b2b-tema/csv-indir";
import { VeriKaynagi } from "@components/b2b-tema/veri-kaynagi";
import { DURUM_ETIKET, formatKurus, gunFormat } from "@components/b2b-tema/lib/format";
import { SIPARISLER } from "@components/b2b-tema/lib/ornek-veri";

type Satir = {
  anahtar: string;
  tarih: Date;
  siparisNo: string;
  durum: string;
  urunAd: string;
  stokKodu: string;
  marka: string;
  adet: number;
  birimFiyatKurus: number;
  satirToplamKurus: number;
};

/**
 * Sipariş Raporu — sipariş kalemleri düzeyinde döküm.
 * İptal edilen siparişler tamamen dışlanır.
 */
export default function SiparisRaporuPage() {
  const [baslangic, setBaslangic] = useState("");
  const [bitis, setBitis] = useState("");
  const [getirildi, setGetirildi] = useState(false);

  const satirlar = useMemo<Satir[]>(() => {
    if (!getirildi) return [];
    return SIPARISLER.filter((s) => s.durum !== "CANCELLED")
      .filter((s) => {
        if (baslangic && s.createdAt < new Date(`${baslangic}T00:00:00Z`)) return false;
        if (bitis && s.createdAt > new Date(`${bitis}T23:59:59Z`)) return false;
        return true;
      })
      .flatMap((s) =>
        s.kalemler.map((k) => ({
          anahtar: k.id,
          tarih: s.createdAt,
          siparisNo: s.no,
          durum: s.durum,
          urunAd: k.urunAdi,
          stokKodu: k.stokKodu,
          marka: k.marka,
          adet: k.adet,
          birimFiyatKurus: k.birimFiyatKurus,
          satirToplamKurus: k.satirToplamKurus,
        })),
      )
      .sort((a, b) => b.tarih.getTime() - a.tarih.getTime());
  }, [getirildi, baslangic, bitis]);

  const toplam = satirlar.reduce((t, s) => t + s.satirToplamKurus, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            Sipariş Raporu <span className="baslik-etiket">Platform Siparişleri</span>
          </h1>
          <p className="sub">
            Tarih aralığına göre sipariş detaylarınız — listeleyin ve CSV
            olarak indirin.
          </p>
        </div>
        {satirlar.length > 0 ? (
          <CsvIndir
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
            satirlar={satirlar.map((s) => [
              gunFormat(s.tarih),
              s.siparisNo,
              DURUM_ETIKET[s.durum] ?? s.durum,
              s.urunAd,
              s.stokKodu,
              s.marka,
              s.adet,
              (s.birimFiyatKurus / 100).toFixed(2),
              (s.satirToplamKurus / 100).toFixed(2),
            ])}
          />
        ) : null}
      </div>

      <VeriKaynagi
        kaynak="Örnek veri"
        ayrinti="lib/ornek-veri.ts → SIPARISLER + kalemler"
        tarihAlani="sipariş oluşturma tarihi"
        iptalKurali="iptal edilen siparişler tamamen dışlanır"
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
            {satirlar.length.toLocaleString("tr-TR")} kalem · Toplam{" "}
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
                {satirlar.map((s) => (
                  <tr key={s.anahtar}>
                    <td>{gunFormat(s.tarih)}</td>
                    <td className="sku">{s.siparisNo}</td>
                    <td>
                      <span className="badge info">
                        {DURUM_ETIKET[s.durum] ?? s.durum}
                      </span>
                    </td>
                    <td>
                      {s.urunAd}
                      <div className="note">{s.stokKodu}</div>
                    </td>
                    <td>{s.marka}</td>
                    <td className="num">{s.adet}</td>
                    <td className="num">{formatKurus(s.birimFiyatKurus)}</td>
                    <td className="num">
                      <strong>{formatKurus(s.satirToplamKurus)}</strong>
                    </td>
                  </tr>
                ))}
                {satirlar.length === 0 ? (
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
