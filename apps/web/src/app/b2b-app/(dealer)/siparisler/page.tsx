import Link from "next/link";
import { CalendarIcon } from "@components/b2b-theme/icons";
import { OrderSteps } from "@components/b2b-theme/steps";
import { CancelButton } from "@components/b2b-theme/cancel-button";
import { STATUS_LABEL, formatKurus, formatDate } from "@components/b2b-theme/lib/format";
import { ORDERS } from "@components/b2b-theme/lib/sample-data";

export default function SiparislerPage() {
  const istatistik = {
    toplam: ORDERS.length,
    bekleyen: ORDERS.filter((s) => s.durum === "SUBMITTED").length,
    processing: ORDERS.filter((s) =>
      ["CONFIRMED", "PREPARING", "SHIPPED"].includes(s.durum),
    ).length,
    teslim: ORDERS.filter((s) => s.durum === "DELIVERED").length,
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Siparişlerim</h1>
          <p className="sub">Sipariş geçmişinizi takip edin</p>
        </div>
        <Link className="btn-primary" href="/lastik">
          Yeni Sipariş
        </Link>
      </div>

      <div className="cards">
        <div className="card">
          <div className="label">Toplam</div>
          <div className="value">{istatistik.toplam}</div>
        </div>
        <div className="card tinted-yellow">
          <div className="label">Bekleyen</div>
          <div className="value">{istatistik.bekleyen}</div>
        </div>
        <div className="card">
          <div className="label">İşlemde</div>
          <div className="value">{istatistik.processing}</div>
        </div>
        <div className="card tinted-green">
          <div className="label">Teslim</div>
          <div className="value ok">{istatistik.teslim}</div>
        </div>
      </div>

      {ORDERS.map((s) => {
        const totalQty = s.lines.reduce((t, k) => t + k.adet, 0);
        return (
          <div className="order-card" key={s.id}>
            <div className="head">
              <div>
                <span className="no">{s.no}</span>{" "}
                <span
                  className={`badge ${
                    s.durum === "CANCELLED"
                      ? "danger"
                      : s.durum === "DELIVERED"
                        ? "ok"
                        : "info"
                  }`}
                >
                  {STATUS_LABEL[s.durum]}
                </span>
                {s.erpSiparisNo ? (
                  <span className="badge gray"> ERP: {s.erpSiparisNo}</span>
                ) : null}
                {s.cancelRequestReason && s.durum !== "CANCELLED" ? (
                  <span className="badge warn">İptal talebi iletildi</span>
                ) : null}
                <div className="tarih">
                  <CalendarIcon size={13} /> {formatDate(s.createdAt)}
                </div>
              </div>
            </div>

            <OrderSteps durum={s.durum} />

            <div className="items-box">
              <div className="row">
                <strong>{s.lines.length} kalem ürün</strong> · Toplam{" "}
                {totalQty} adet
              </div>
              {s.lines.slice(0, 3).map((k) => (
                <div className="row" key={k.id}>
                  {k.productName} ×{k.adet}{" "}
                  <span className="badge info">{k.warehouseName}</span>
                </div>
              ))}
              {s.lines.length > 3 ? (
                <div className="row note">
                  +{s.lines.length - 3} kalem daha
                </div>
              ) : null}
            </div>

            <div className="foot">
              <div>
                <div className="tutar">{formatKurus(s.totalKurus)}</div>
                <div className="odeme">
                  {s.paymentType === "vadeli"
                    ? `Vadeli · ${s.vadeGun} gün`
                    : "Peşin"}
                </div>
              </div>
              <div className="actions">
                {s.durum === "SUBMITTED" ? <CancelButton talep={false} /> : null}
                {["CONFIRMED", "PREPARING", "SHIPPED"].includes(s.durum) &&
                !s.cancelRequestReason ? (
                  <CancelButton talep={true} />
                ) : null}
                <Link className="btn-primary" href={`/siparisler/${s.id}`}>
                  Detay
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </>
  );
}
