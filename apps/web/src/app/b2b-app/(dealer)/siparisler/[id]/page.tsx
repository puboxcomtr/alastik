import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon } from "@components/b2b-tema/icons";
import { OrderSteps } from "@components/b2b-tema/adimlar";
import { CancelButton } from "@components/b2b-tema/iptal-butonu";
import { STATUS_LABEL, formatKurus, formatTarih } from "@components/b2b-tema/lib/format";
import { ORDERS, findOrder } from "@components/b2b-tema/lib/ornek-veri";

/** Statik dışa aktarımda her sipariş için ayrı sayfa üretilir. */
export function generateStaticParams(): Array<{ id: string }> {
  return ORDERS.map((s) => ({ id: s.id }));
}

export default async function SiparisDetay({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const siparis = findOrder(id);
  if (!siparis) notFound();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            Sipariş {siparis.no}{" "}
            <span
              className={`badge ${
                siparis.durum === "CANCELLED"
                  ? "danger"
                  : siparis.durum === "DELIVERED"
                    ? "ok"
                    : "info"
              }`}
            >
              {STATUS_LABEL[siparis.durum]}
            </span>
          </h1>
          <p className="sub">
            <CalendarIcon size={13} /> {formatTarih(siparis.createdAt)}
          </p>
        </div>
        <Link className="btn-ghost" href="/siparisler">
          <ArrowLeftIcon size={15} /> Siparişlerim
        </Link>
      </div>

      <OrderSteps durum={siparis.durum} />

      {siparis.cancelRequestReason && siparis.durum !== "CANCELLED" ? (
        <div className="alert warn" style={{ marginTop: "1rem" }}>
          İptal talebiniz iletildi: &quot;{siparis.cancelRequestReason}&quot; —
          ekibimiz inceleyecek.
        </div>
      ) : null}
      {siparis.durum === "CANCELLED" ? (
        <div className="alert error" style={{ marginTop: "1rem" }}>
          Sipariş iptal edildi
          {siparis.cancelReason ? `: "${siparis.cancelReason}"` : "."}
        </div>
      ) : null}

      <h2 className="section">Kalemler</h2>
      <div className="tablewrap">
        <table className="data">
          <thead>
            <tr>
              <th>Ürün</th>
              <th>Depo</th>
              <th className="num">Adet</th>
              <th className="num">Liste Birim</th>
              <th className="num">İskonto</th>
              <th className="num">Birim Net</th>
              <th className="num">Matrah</th>
              <th className="num">KDV</th>
              <th className="num">Satır Toplam</th>
            </tr>
          </thead>
          <tbody>
            {siparis.lines.map((k) => (
              <tr key={k.id}>
                <td>
                  <div className="urun-adi">{k.productName}</div>
                  <div className="sku">
                    {k.marka} · {k.stockCode}
                    {k.ozelFiyat ? " · özel fiyat" : ""}
                  </div>
                </td>
                <td>
                  <span className="badge info">{k.warehouseName}</span>
                </td>
                <td className="num">{k.adet}</td>
                <td className="num">{formatKurus(k.listeBirimKurus)}</td>
                <td className="num">
                  {k.discountBps > 0
                    ? `%${(k.discountBps / 100).toLocaleString("tr-TR")}`
                    : k.kampanyaIndirimKurus > 0
                      ? formatKurus(k.kampanyaIndirimKurus)
                      : "—"}
                </td>
                <td className="num">{formatKurus(k.birimFiyatKurus)}</td>
                <td className="num">{formatKurus(k.matrahKurus)}</td>
                <td className="num">
                  {formatKurus(k.kdvKurus)}
                  <div className="fiyat-kdv">%{k.kdvBps / 100}</div>
                </td>
                <td className="num">
                  <strong>{formatKurus(k.satirToplamKurus)}</strong>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="totals">
        <div className="row">
          <span>Matrah</span>
          <span>{formatKurus(siparis.matrahToplamKurus)}</span>
        </div>
        <div className="row">
          <span>KDV</span>
          <span>{formatKurus(siparis.kdvToplamKurus)}</span>
        </div>
        <div className="row grand">
          <span>Genel Toplam</span>
          <span>{formatKurus(siparis.totalKurus)}</span>
        </div>
        <div className="row">
          <span>Ödeme</span>
          <span>
            {siparis.paymentType === "vadeli"
              ? `Vadeli · ${siparis.vadeGun} gün`
              : "Peşin"}
          </span>
        </div>
      </div>

      <div
        className="actions-row"
        style={{ justifyContent: "flex-end", marginTop: "1rem" }}
      >
        {siparis.durum === "SUBMITTED" ? <CancelButton talep={false} /> : null}
        {["CONFIRMED", "PREPARING", "SHIPPED"].includes(siparis.durum) &&
        !siparis.cancelRequestReason ? (
          <CancelButton talep={true} />
        ) : null}
      </div>
    </>
  );
}
