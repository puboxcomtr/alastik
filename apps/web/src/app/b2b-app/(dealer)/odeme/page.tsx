import Link from "next/link";
import { AlertIcon } from "@components/b2b-theme/icons";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { DEALER, PENDING_ORDER_KURUS, ACCOUNT_SUMMARY } from "@components/b2b-theme/lib/sample-data";

/**
 * Ödeme Yap: cari durum özeti + ödeme kanalları. Online tahsilat (sanal POS)
 * bu şablonda yalnızca yer tutucudur.
 */
export default function OdemePage() {
  const overdue = ACCOUNT_SUMMARY.overdueKurus;

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
        <div className={`card${ACCOUNT_SUMMARY.balanceKurus > 0 ? " tinted-red" : ""}`}>
          <div className="label">Toplam Bakiye</div>
          <div className={`value${ACCOUNT_SUMMARY.balanceKurus > 0 ? " danger" : ""}`}>
            {formatKurus(ACCOUNT_SUMMARY.balanceKurus)}
          </div>
        </div>
        <div className={`card${overdue > 0 ? " tinted-red" : ""}`}>
          <div className="label">Vadesi Geçen</div>
          <div className={`value${overdue > 0 ? " danger" : ""}`}>
            {formatKurus(overdue)}
          </div>
        </div>
        <div className="card tinted-yellow">
          <div className="label">Bekleyen Sipariş Tutarı</div>
          <div className="value">{formatKurus(PENDING_ORDER_KURUS)}</div>
        </div>
        <div className="card">
          <div className="label">Ödeme Vadesi</div>
          <div className="value">{DEALER.paymentTermDays} gün</div>
        </div>
      </div>

      {overdue > 0 ? (
        <div className="alert error">
          <strong>Gecikmiş ödemeniz var.</strong> Vadesi geçen{" "}
          {formatKurus(overdue)} tutarındaki borcunuz için lütfen
          temsilcinizle iletişime geçin.
        </div>
      ) : null}

      <h2 className="section">Ödeme Kanalları</h2>
      <div className="cards">
        <div className="card">
          <div className="label">Havale / EFT</div>
          <p className="note" style={{ marginTop: "0.5rem" }}>
            Banka hesap bilgileri temsilciniz tarafından paylaşılır. Ödeme
            açıklamasına cari kodunuzu ({DEALER.accountCode}) yazmayı unutmayın.
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
