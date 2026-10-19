"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { API_ENDPOINTS } from "@src/config/api";

type OrderItem = {
  name?: string;
  stockCode?: string;
  quantity?: number;
  unitPrice?: number;
  totalPrice?: number;
  vatRate?: number;
};
type OrderData = {
  orderNumber?: string;
  createdAt?: string;
  customerName?: string;
  customerPhone?: string;
  items?: OrderItem[];
  pricing?: { subtotal?: number; vatAmount?: number; discountAmount?: number; total?: number };
  payment?: {
    method?: string;
    installment?: number;
    gateway?: string;
    authCode?: string;
    transactionId?: string;
    paidAt?: string;
    status?: string;
    cardInfo?: { lastFourDigits?: string; bankName?: string };
  };
  shippingSnapshot?: { fullName?: string; phone?: string; cityName?: string; districtName?: string; street?: string };
};
type Company = {
  name?: string;
  officialName?: string;
  authorizedPerson?: string;
  phone?: string;
  fax?: string;
  website?: string;
  city?: string;
  district?: string;
  address?: string;
};

const TL = (v?: number) =>
  `${Number(v || 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;

const tarih = (d?: string) =>
  d
    ? new Date(d).toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "-";

const odemeAdi = (p?: OrderData["payment"]) => {
  if (!p) return "-";
  if (p.gateway === "netahsilat" || (p.installment && p.installment > 1))
    return `Kredi Kartı — ${p.installment || 2} Taksit`;
  if (p.method === "credit_card") return "Kredi Kartı — Tek Çekim";
  if (p.method === "bank_transfer") return "Banka Havalesi/EFT";
  if (p.method === "cari") return "Cari Hesap";
  return p.method || "-";
};

export default function MakbuzPage({ params }: { params: Promise<{ no: string }> }) {
  const { no } = use(params);
  const [data, setData] = useState<{ order: OrderData; company: Company } | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!token) {
      setHata("Oturum bulunamadı, tekrar giriş yapın.");
      return;
    }
    fetch(API_ENDPOINTS.b2b.siparisDetay(no), {
      headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" },
    })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res.data) setData(res.data);
        else setHata(res?.message || "Sipariş bulunamadı.");
      })
      .catch(() => setHata("Makbuz yüklenemedi."));
  }, [no]);

  if (hata) {
    return (
      <div className="makbuz-wrap">
        <p className="note">{hata}</p>
        <Link className="btn-ghost" href="/siparisler">
          Siparişlerim
        </Link>
      </div>
    );
  }
  if (!data) return null;

  const { order: o, company: c } = data;
  const items = o.items || [];

  return (
    <div className="makbuz-wrap">
      <div className="makbuz-toolbar no-print">
        <Link className="btn-ghost" href="/siparisler">
          ← Siparişlerim
        </Link>
        <button className="btn-primary" onClick={() => window.print()}>
          PDF olarak kaydet / Yazdır
        </button>
      </div>

      <div className="makbuz" id="makbuz">
        <div className="mk-head">
          <div className="mk-satici">
            <div className="mk-firma">{c.name || "LastikJantAVM"}</div>
            <div className="mk-firma-resmi">{c.officialName || ""}</div>
            <div className="mk-firma-detay">
              {[c.district, c.city].filter(Boolean).join(" / ")}
              {c.address ? ` — ${c.address}` : ""}
            </div>
            <div className="mk-firma-detay">
              {c.phone ? `Tel: ${c.phone}` : ""} {c.website ? ` · ${c.website}` : ""}
            </div>
          </div>
          <div className="mk-baslik">
            <div className="mk-baslik-buyuk">ÖDEME MAKBUZU</div>
            <div className="mk-baslik-alt">Proforma</div>
          </div>
        </div>

        <div className="mk-meta">
          <div>
            <span>Sipariş No</span>
            <strong>{o.orderNumber}</strong>
          </div>
          <div>
            <span>Tarih</span>
            <strong>{tarih(o.payment?.paidAt || o.createdAt)}</strong>
          </div>
          <div>
            <span>Bayi</span>
            <strong>{o.customerName || "-"}</strong>
          </div>
          {o.customerPhone ? (
            <div>
              <span>Telefon</span>
              <strong>{o.customerPhone}</strong>
            </div>
          ) : null}
        </div>

        <table className="mk-tablo">
          <thead>
            <tr>
              <th>Ürün</th>
              <th className="sag">Adet</th>
              <th className="sag">Birim Fiyat</th>
              <th className="sag">Tutar</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i}>
                <td>
                  {it.name || it.stockCode}
                  {it.stockCode ? <span className="mk-kod"> ({it.stockCode})</span> : null}
                </td>
                <td className="sag">{it.quantity}</td>
                <td className="sag">{TL(it.unitPrice)}</td>
                <td className="sag">{TL(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mk-toplamlar">
          <div className="mk-row">
            <span>Ara Toplam (KDV hariç)</span>
            <span>{TL(o.pricing?.subtotal)}</span>
          </div>
          <div className="mk-row">
            <span>KDV</span>
            <span>{TL(o.pricing?.vatAmount)}</span>
          </div>
          <div className="mk-row mk-genel">
            <span>Genel Toplam</span>
            <span>{TL(o.pricing?.total)}</span>
          </div>
        </div>

        <div className="mk-odeme">
          <div className="mk-odeme-baslik">Ödeme Bilgileri</div>
          <div className="mk-odeme-grid">
            <div>
              <span>Ödeme Yöntemi</span>
              <strong>{odemeAdi(o.payment)}</strong>
            </div>
            <div>
              <span>Durum</span>
              <strong className="mk-paid">{o.payment?.status === "paid" ? "Ödendi" : o.payment?.status || "-"}</strong>
            </div>
            {o.payment?.cardInfo?.lastFourDigits ? (
              <div>
                <span>Kart</span>
                <strong>**** {o.payment.cardInfo.lastFourDigits}</strong>
              </div>
            ) : null}
            {o.payment?.authCode ? (
              <div>
                <span>Onay Kodu</span>
                <strong>{o.payment.authCode}</strong>
              </div>
            ) : null}
          </div>
        </div>

        <div className="mk-footer">
          Bu belge {c.name || "LastikJantAVM"} tarafından elektronik olarak oluşturulmuştur. Resmi fatura ayrıca
          düzenlenir.
        </div>
      </div>
    </div>
  );
}
