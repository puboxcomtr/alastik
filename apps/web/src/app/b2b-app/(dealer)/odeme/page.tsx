import Link from "next/link";
import { AlertIcon } from "@components/b2b-tema/icons";
import { formatKurus } from "@components/b2b-tema/lib/format";
import { BAYI, BEKLEYEN_SIPARIS_KURUS, CARI_OZET } from "@components/b2b-tema/lib/ornek-veri";

/**
 * Ödeme Yap: cari durum özeti + ödeme kanalları. Online tahsilat (sanal POS)
 * bu şablonda yalnızca yer tutucudur.
 */
export default function OdemePage() {
  const vadesiGecen = CARI_OZET.vadesiGecenKurus;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Ödeme Yap</h1>
          <p className="sub">Cari borç durumunuz ve ödeme kanalları.</p>
        </div>
        <Link className="btn-ghost" href="/">
          Anasayfa
        </Link>
      </div>

      <div className="cards">
        <div className={`card${CARI_OZET.bakiyeKurus > 0 ? " tinted-red" : ""}`}>
          <div className="label">Toplam Bakiye</div>
          <div className={`value${CARI_OZET.bakiyeKurus > 0 ? " danger" : ""}`}>
            {formatKurus(CARI_OZET.bakiyeKurus)}
          </div>
        </div>
        <div className={`card${vadesiGecen > 0 ? " tinted-red" : ""}`}>
          <div className="label">Vadesi Geçen</div>
          <div className={`value${vadesiGecen > 0 ? " danger" : ""}`}>
            {formatKurus(vadesiGecen)}
          </div>
        </div>
        <div className="card tinted-yellow">
          <div className="label">Bekleyen Sipariş Tutarı</div>
          <div className="value">{formatKurus(BEKLEYEN_SIPARIS_KURUS)}</div>
        </div>
        <div className="card">
          <div className="label">Ödeme Vadesi</div>
          <div className="value">{BAYI.odemeVadeGun} gün</div>
        </div>
      </div>

      {vadesiGecen > 0 ? (
        <div className="alert error">
          <strong>Gecikmiş ödemeniz var.</strong> Vadesi geçen{" "}
          {formatKurus(vadesiGecen)} tutarındaki borcunuz için lütfen
          temsilcinizle iletişime geçin.
        </div>
      ) : null}

      <h2 className="section">Ödeme Kanalları</h2>
      <div className="cards">
        <div className="card">
          <div className="label">Havale / EFT</div>
          <p className="note" style={{ marginTop: "0.5rem" }}>
            Banka hesap bilgileri temsilciniz tarafından paylaşılır. Ödeme
            açıklamasına cari kodunuzu ({BAYI.cariKodu}) yazmayı unutmayın.
          </p>
        </div>
        <div className="card">
          <div className="label">Online Kredi Kartı</div>
          <p className="note" style={{ marginTop: "0.5rem" }}>
            Sanal POS ile online tahsilat ve taksit seçenekleri bir sonraki
            sürümde açılacaktır.
          </p>
          <button className="primary" disabled style={{ marginTop: "0.75rem" }}>
            Yakında
          </button>
        </div>
      </div>

      <p
        className="note"
        style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}
      >
        <AlertIcon size={16} />
        Ödemeniz bankaya geçtikten sonra muhasebe kaydı işlenir; bakiyeniz bir
        sonraki güncellemede yansır.
      </p>
    </>
  );
}
