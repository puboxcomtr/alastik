import { ParolaFormu } from "@/components/parola-formu";
import { formatKurus } from "@/lib/format";
import { BAYI } from "@/lib/ornek-veri";

/**
 * Hesap Ayarları. Ünvan, cari kodu, kredi limiti ve iskonto salt okunur
 * gösterilir — bayi bunları değiştiremez.
 */
export default function HesapAyarlariPage() {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>Hesap Ayarları</h1>
          <p className="sub">
            Parolanızı buradan değiştirebilirsiniz. Ünvan, cari kodu ve limit
            bilgileri bizim tarafımızdan yönetilir.
          </p>
        </div>
      </div>

      <div className="card">
        <h3 className="kart-baslik">Hesap Bilgileri</h3>
        <dl className="bilgi-listesi">
          <div>
            <dt>Ünvan</dt>
            <dd>{BAYI.unvan}</dd>
          </div>
          <div>
            <dt>E-posta</dt>
            <dd>{BAYI.eposta}</dd>
          </div>
          <div>
            <dt>Cari Kodu</dt>
            <dd className="sku">{BAYI.cariKodu}</dd>
          </div>
          <div>
            <dt>Kredi Limiti</dt>
            <dd>{formatKurus(BAYI.krediLimitiKurus)}</dd>
          </div>
          <div>
            <dt>Ödeme Vadesi</dt>
            <dd>{BAYI.odemeVadeGun} gün</dd>
          </div>
          <div>
            <dt>Ticari İskonto</dt>
            <dd>%{(BAYI.iskontoBps / 100).toLocaleString("tr-TR")}</dd>
          </div>
        </dl>
        <p className="note">
          Bu bilgilerde değişiklik gerekiyorsa temsilcinizle görüşün.
        </p>
      </div>

      <div className="card">
        <h3 className="kart-baslik">Parola Değiştir</h3>
        <ParolaFormu sinif="banner-form" />
      </div>
    </>
  );
}
