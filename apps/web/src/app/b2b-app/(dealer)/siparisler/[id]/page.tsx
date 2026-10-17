"use client";

// Sipariş Detayı — bayinin siparişi (WebOrder, bizim DB). /siparis/:orderNumber.
import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { API_ENDPOINTS } from "@src/config/api";
import { formatKurus } from "@components/b2b-theme/lib/format";
import { ArrowLeftIcon, CalendarIcon, SpinnerIcon } from "@components/b2b-theme/icons";

interface OrderItem { name: string; stockCode: string; quantity: number; unitPrice: number; totalPrice: number; }
interface Order {
  orderNumber: string;
  status: string;
  createdAt: string;
  paymentMethod?: string;
  source?: string;
  itemCount?: number;
  items?: OrderItem[];
  pricing?: { subtotal?: number; vatAmount?: number; shippingCost?: number; discountAmount?: number; total?: number };
  shipping?: { address?: string; city?: string; district?: string; method?: string };
  diaIntegration?: { diaOrderNumber?: string; status?: string };
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Onay Bekliyor", confirmed: "Onaylandı", processing: "Hazırlanıyor", shipped: "Kargoda",
  delivered: "Teslim Edildi", cancelled: "İptal", returned: "İade", awaiting_payment: "Ödeme Bekleniyor", payment_failed: "Ödeme Başarısız",
  KABUL: "Onaylandı", RET: "Reddedildi",
};
const badgeClass = (s: string) =>
  ["cancelled", "returned", "payment_failed", "RET"].includes(s) ? "danger" : (s === "delivered" || s === "KABUL") ? "ok" : "info";
const PAYMENT_LABEL: Record<string, string> = {
  havale: "Havale/EFT", paynet: "Kredi Kartı", netahsilat: "Kredi Kartı (Taksit)", nkolay: "Kredi Kartı",
};
const tl0 = (v: number) => (v || 0).toFixed(2);
function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("tr-TR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default function SiparisDetay() {
  const params = useParams<{ id: string }>();
  const id = params?.id ? decodeURIComponent(params.id as string) : "";
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    const token = localStorage.getItem("authToken");
    if (!token) { setError("Oturum bulunamadı."); return; }
    fetch(API_ENDPOINTS.b2b.siparisDetay(id), { headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((d) => { if (d?.success && d.data?.order) setOrder(d.data.order); else setError(d?.message || "Sipariş bulunamadı."); })
      .catch(() => setError("Sipariş yüklenemedi."));
  }, [id]);

  if (error) {
    return (
      <>
        <div className="page-head">
          <div><h1>Sipariş</h1></div>
          <Link className="btn-ghost" href="/siparisler"><ArrowLeftIcon size={15} /> Siparişlerim</Link>
        </div>
        <p className="note">{error}</p>
      </>
    );
  }
  if (!order) {
    return (
      <>
        <div className="page-head"><div><h1>Sipariş</h1></div></div>
        <p className="note loading-row" style={{ padding: "1rem 0" }}>
          <SpinnerIcon size={18} className="loading-brand" /> Yükleniyor…
        </p>
      </>
    );
  }

  const p = order.pricing || {};
  const items = order.items || [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Sipariş {order.orderNumber}{" "}
            <span className={`badge ${badgeClass(order.status)}`}>{STATUS_LABEL[order.status] || order.status}</span>
          </h1>
          <p className="sub"><CalendarIcon size={13} /> {formatDate(order.createdAt)}</p>
        </div>
        <Link className="btn-ghost" href="/siparisler"><ArrowLeftIcon size={15} /> Siparişlerim</Link>
      </div>

      {order.source === "dia" || items.length === 0 ? (
        <div className="card">
          <div className="label">Toplam Ürün</div>
          <div className="value">{order.itemCount ?? items.reduce((s, it) => s + (it.quantity || 0), 0)} adet</div>
          <div className="note">Bu sipariş DIA kayıtlarından gelmektedir; kalem bazlı fiyat detayı panelde gösterilmez. Toplam tutarlar aşağıdadır.</div>
        </div>
      ) : (
        <div className="tablewrap">
          <table className="data">
            <thead>
              <tr>
                <th>Ürün</th>
                <th>Stok Kodu</th>
                <th className="num">Adet</th>
                <th className="num">Birim Fiyat</th>
                <th className="num">Tutar</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, i) => (
                <tr key={i}>
                  <td>{it.name || "Ürün kalemi"}</td>
                  <td className="sku">{it.stockCode || "—"}</td>
                  <td className="num">{it.quantity}</td>
                  <td className="num">{formatKurus(Math.round((it.unitPrice || 0) * 100))}</td>
                  <td className="num"><strong>{formatKurus(Math.round((it.totalPrice || 0) * 100))}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="cards" style={{ marginTop: "1rem" }}>
        <div className="card">
          <div className="label">Ödeme Yöntemi</div>
          <div className="value" style={{ fontSize: "1rem" }}>{PAYMENT_LABEL[order.paymentMethod || ""] || order.paymentMethod || "—"}</div>
          {order.diaIntegration?.diaOrderNumber ? <div className="note">ERP: {order.diaIntegration.diaOrderNumber}</div> : null}
        </div>
        <div className="card">
          <div className="label">Ara Toplam</div>
          <div className="value" style={{ fontSize: "1rem" }}>{formatKurus(Math.round((p.subtotal || 0) * 100))}</div>
          {p.discountAmount ? <div className="note">İndirim: {formatKurus(Math.round(p.discountAmount * 100))}</div> : null}
          {p.shippingCost ? <div className="note">Kargo: {formatKurus(Math.round(p.shippingCost * 100))}</div> : null}
          {p.vatAmount ? <div className="note">KDV: {formatKurus(Math.round(p.vatAmount * 100))}</div> : null}
        </div>
        <div className="card tinted-yellow">
          <div className="label">Genel Toplam</div>
          <div className="value">{formatKurus(Math.round((p.total || 0) * 100))}</div>
        </div>
      </div>

      {order.shipping?.address ? (
        <>
          <h2 className="section">Teslimat</h2>
          <p className="note">
            {order.shipping.address}
            {order.shipping.district ? `, ${order.shipping.district}` : ""}
            {order.shipping.city ? ` / ${order.shipping.city}` : ""}
          </p>
        </>
      ) : null}
    </>
  );
}
