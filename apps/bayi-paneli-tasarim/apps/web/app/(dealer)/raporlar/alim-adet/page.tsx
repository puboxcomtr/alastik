import { CsvIndir } from "@/components/csv-indir";
import { VeriKaynagi } from "@/components/veri-kaynagi";
import { formatKurus } from "@/lib/format";
import { ALIM_ADETLERI } from "@/lib/ornek-veri";

/**
 * Bayi Alım Adet Raporu — dönem bazlı alış özeti.
 * "Adet" ürün adedidir (sipariş satırı sayısı değil).
 */
export default function AlimAdetPage() {
  const toplamLastik = ALIM_ADETLERI.reduce((t, s) => t + s.lastikAdet, 0);
  const toplamJant = ALIM_ADETLERI.reduce((t, s) => t + s.jantAdet, 0);
  const toplamTutar = ALIM_ADETLERI.reduce((t, s) => t + s.tutarKurus, 0);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            Bayi Alım Adet Raporu{" "}
            <span className="baslik-etiket">Platform Siparişleri</span>
          </h1>
          <p className="sub">
            Dönem bazlı alış özeti — toplam ürün adedi ve tutar.
          </p>
        </div>
        <CsvIndir
          dosyaAdi="alim-adet-raporu.csv"
          basliklar={["Dönem", "Lastik Adet", "Jant Adet", "Sipariş", "Tutar"]}
          satirlar={ALIM_ADETLERI.map((s) => [
            s.donem,
            s.lastikAdet,
            s.jantAdet,
            s.siparisAdet,
            (s.tutarKurus / 100).toFixed(2),
          ])}
        />
      </div>

      <VeriKaynagi
        kaynak="Örnek veri"
        ayrinti="lib/ornek-veri.ts → ALIM_ADETLERI"
        tarihAlani="sipariş oluşturma tarihi"
        iptalKurali="iptal edilen siparişler dışlanır; iade düşümü yok"
        tazelik="örnek veri"
        kapsamUyarisi={
          "Yalnızca bu panelden verilen siparişler sayılır; panel dışından " +
          "girilen alımlar bu adetlere DAHİL DEĞİLDİR."
        }
      />

      <div className="rapor-kartlar">
        <div className="rapor-kart">
          <div className="etiket">Toplam Lastik</div>
          <div className="deger">{toplamLastik.toLocaleString("tr-TR")}</div>
          <div className="note">adet</div>
        </div>
        <div className="rapor-kart">
          <div className="etiket">Toplam Jant</div>
          <div className="deger">{toplamJant.toLocaleString("tr-TR")}</div>
          <div className="note">adet</div>
        </div>
        <div className="rapor-kart vurgulu">
          <div className="etiket">Toplam Tutar (KDV dahil)</div>
          <div className="deger">{formatKurus(toplamTutar)}</div>
        </div>
        <div className="rapor-kart">
          <div className="etiket">Dönem</div>
          <div className="deger">{ALIM_ADETLERI.length}</div>
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
            {ALIM_ADETLERI.map((s) => (
              <tr key={s.donem}>
                <td>{s.donem}</td>
                <td className="num">
                  <strong>{s.lastikAdet}</strong>
                </td>
                <td className="num">{s.jantAdet}</td>
                <td className="num">{s.siparisAdet}</td>
                <td className="num">{formatKurus(s.tutarKurus)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
