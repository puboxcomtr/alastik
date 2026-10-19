"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCart } from "@components/b2b-theme/cart-status";
import { CheckIcon, AlertIcon, CartIcon, OrdersIcon } from "@components/b2b-theme/icons";
import { API_ENDPOINTS } from "@src/config/api";

async function makbuzIndir(siparisNo: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
  if (!token || !siparisNo) return;
  try {
    const r = await fetch(API_ENDPOINTS.b2b.makbuzPdf(siparisNo), {
      headers: { Authorization: `Bearer ${token}`, "X-Site": "b2b" },
    });
    if (!r.ok) return;
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Makbuz-${siparisNo}.pdf`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  } catch {
  }
}

type Sonuc = {
  durum: "basarili" | "basarisiz";
  siparis: string;
  tutar: string;
  kod: string;
  mesaj: string;
  banka: string;
  paynet: string;
};

export default function SiparisSonucPage() {
  const sepet = useCart();
  const router = useRouter();
  const [s, setS] = useState<Sonuc | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const q = new URLSearchParams(window.location.search);
    const durumParam = q.get("durum");

    if (!durumParam) {
      router.replace("/sepet");
      return;
    }

    const durum = durumParam === "basarili" ? "basarili" : "basarisiz";
    setS({
      durum,
      siparis: q.get("siparis") || "",
      tutar: q.get("tutar") || "",
      kod: q.get("kod") || "",
      mesaj: q.get("mesaj") || "",
      banka: q.get("banka") || "",
      paynet: q.get("paynet") || "",
    });

    try {
      sepet.clear();
    } catch {
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!s) return null;

  const basarili = s.durum === "basarili";
  const tutarText =
    s.tutar && !Number.isNaN(Number(s.tutar))
      ? `${Number(s.tutar).toLocaleString("tr-TR", { minimumFractionDigits: 2 })} ₺`
      : "";

  const detaylar: { etiket: string; deger: string }[] = [];
  if (s.siparis) detaylar.push({ etiket: "Sipariş No", deger: s.siparis });
  if (tutarText) detaylar.push({ etiket: "Tutar", deger: tutarText });
  if (s.banka) detaylar.push({ etiket: "Banka Mesajı", deger: s.banka });
  if (s.paynet) detaylar.push({ etiket: "Paynet Mesajı", deger: s.paynet });
  if (!s.banka && !s.paynet && s.mesaj) detaylar.push({ etiket: "Açıklama", deger: s.mesaj });
  if (s.kod) detaylar.push({ etiket: "Hata Kodu", deger: s.kod });

  return (
    <div className="odeme-sonuc">
      <div className={`os-card ${basarili ? "os-ok" : "os-fail"}`}>
        <div className="os-icon" aria-hidden>
          {basarili ? <CheckIcon size={34} /> : <AlertIcon size={34} />}
        </div>

        <h1 className="os-title">{basarili ? "Ödeme Başarılı" : "Sipariş Başarısız"}</h1>
        <p className="os-sub">
          {basarili
            ? "Ödemeniz alındı ve siparişiniz oluşturuldu."
            : "Ödemeniz alınamadı, kartınızdan ücret çekilmemiştir. İşlem aşağıdaki nedenle tamamlanamadı — dilerseniz yeni bir sipariş oluşturup tekrar deneyebilirsiniz."}
        </p>

        {basarili ? (
          <div className="os-basarili-ozet">
            {s.siparis && (
              <div className="os-row">
                <span>Sipariş No</span>
                <strong>{s.siparis}</strong>
              </div>
            )}
            {tutarText && (
              <div className="os-row">
                <span>Ödenen Tutar</span>
                <strong>{tutarText}</strong>
              </div>
            )}
          </div>
        ) : (
          <div className="os-detay">
            {detaylar.map((d) => (
              <div className="os-row" key={d.etiket}>
                <span>{d.etiket}</span>
                <strong>{d.deger}</strong>
              </div>
            ))}
          </div>
        )}

        <div className="os-actions">
          {basarili ? (
            <>
              {s.siparis ? (
                <button className="btn-primary" onClick={() => makbuzIndir(s.siparis)}>
                  Makbuz İndir (PDF)
                </button>
              ) : null}
              <Link className="btn-ghost" href="/siparisler">
                <OrdersIcon size={16} /> Siparişlerim
              </Link>
            </>
          ) : (
            <>
              <Link className="btn-primary" href="/">
                <CartIcon size={16} /> Yeni Sipariş
              </Link>
              <Link className="btn-ghost" href="/siparisler">
                Siparişlerim
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
