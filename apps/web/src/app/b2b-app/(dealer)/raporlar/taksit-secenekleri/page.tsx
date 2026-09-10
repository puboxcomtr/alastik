import { VeriKaynagi } from "@components/b2b-tema/veri-kaynagi";
import { TAKSIT_SECENEKLERI } from "@components/b2b-tema/lib/ornek-veri";

const TAKSITLER = [2, 3, 4, 5, 6, 9, 12];

/**
 * Taksit Seçenekleri — bilgilendirme tablosu.
 *
 * POS sağlayıcısından canlı oran ÇEKİLMEZ. Komisyon oranı tutulmadığı için
 * gösterilmez; "✓" yalnızca "bu taksit yapılabiliyor" demektir. Tahmini
 * taksit tutarı da hesaplanmaz.
 */
export default function TaksitSecenekleriPage() {
  // Yalnızca tabloda gerçekten geçen taksit sayıları kolon olur.
  const kolonlar = TAKSITLER.filter((t) =>
    TAKSIT_SECENEKLERI.some((s) => s.taksitler.some((k) => k.adet === t)),
  );

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            Taksit Seçenekleri <span className="baslik-etiket">Bilgilendirme</span>
          </h1>
          <p className="sub">
            Kredi kartıyla yapılabilen taksit sayıları. Bu tablo ekibimiz
            tarafından elle güncellenir.
          </p>
        </div>
      </div>

      <VeriKaynagi
        kaynak="Örnek veri"
        ayrinti="lib/ornek-veri.ts → TAKSIT_SECENEKLERI"
        tarihAlani="—"
        iptalKurali="—"
        tazelik="örnek veri"
        kapsamUyarisi={
          "Bu bilgiler POS sağlayıcısından canlı alınmaz; elle girilen " +
          "bilgilendirme verisidir. KOMİSYON ORANI ve tahmini taksit tutarı " +
          "gösterilmez — geçerli oranlar için ödeme sırasında bankanızın " +
          "bildirdiği tutar esastır."
        }
      />

      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>Banka / Kart Tipi</th>
              {kolonlar.map((t) => (
                <th key={t} className="num">
                  {t} Taksit
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TAKSIT_SECENEKLERI.map((s) => (
              <tr key={s.banka}>
                <td>
                  <strong>{s.banka}</strong>
                </td>
                {kolonlar.map((t) => {
                  const taksit = s.taksitler.find((k) => k.adet === t);
                  return (
                    <td key={t} className="num">
                      {taksit ? (
                        <span className="taksit-var" title={taksit.aciklama}>
                          ✓
                        </span>
                      ) : (
                        <span className="note">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="note" style={{ marginTop: "0.6rem" }}>
        ✓ = o taksit sayısı yapılabiliyor. Komisyon/vade farkı bilgisi bu
        tabloda tutulmaz.
      </p>
    </>
  );
}
