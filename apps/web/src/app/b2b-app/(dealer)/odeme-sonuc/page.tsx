"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckIcon, AlertIcon, WalletIcon, CardIcon } from "@components/b2b-theme/icons";

interface Sonuc {
  durum: "basarili" | "basarisiz";
  tutar?: string;
  ref?: string;
  mesaj?: string;
  banka?: string;
  paynet?: string;
  kod?: string;
}

const nf = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
function tutarTL(v?: string): string {
  const n = Number(v);
  return isFinite(n) ? `${nf.format(n)} TL` : "";
}

export default function OdemeSonucPage() {
  const [s, setS] = useState<Sonuc | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    setS({
      durum: q.get("durum") === "basarili" ? "basarili" : "basarisiz",
      tutar: q.get("tutar") || undefined,
      ref: q.get("ref") || undefined,
      mesaj: q.get("mesaj") || undefined,
      banka: q.get("banka") || undefined,
      paynet: q.get("paynet") || undefined,
      kod: q.get("kod") || undefined,
    });
  }, []);

  if (!s) return null;
  const ok = s.durum === "basarili";

  return (
    <div className="osonuc">
      <div className={`osonuc-card ${ok ? "ok" : "err"}`}>
        <div className={`osonuc-ico ${ok ? "ok" : "err"}`}>
          {ok ? <CheckIcon size={38} /> : <AlertIcon size={36} />}
        </div>

        {ok ? (
          <>
            <h1>Ödemeniz Alındı</h1>
            {s.tutar ? <div className="osonuc-amount">{tutarTL(s.tutar)}</div> : null}
            {s.ref ? <p className="osonuc-ref">İşlem No: <strong>{s.ref}</strong></p> : null}
            <p className="osonuc-note">
              Kredi kartı tek çekim ödemeniz başarıyla tahsil edildi. Muhasebe kaydına işlendikten
              sonra cari bakiyeniz kısa süre içinde güncellenir.
            </p>
          </>
        ) : (
          <>
            <h1>Ödeme Tamamlanamadı</h1>
            {s.tutar ? <div className="osonuc-amount err">{tutarTL(s.tutar)}</div> : null}
            <p className="osonuc-note">{s.mesaj || "Ödeme sırasında bir sorun oluştu. Tutarınız tahsil edilmedi."}</p>
            {s.banka ? <p className="osonuc-detail">Banka: {s.banka}</p> : null}
            {s.paynet ? <p className="osonuc-detail">Detay: {s.paynet}</p> : null}
            {s.kod ? <p className="osonuc-detail">Kod: {s.kod}</p> : null}
          </>
        )}

        <div className="osonuc-actions">
          {ok ? (
            <>
              <Link href="/cari" className="btn-pay osonuc-btn"><WalletIcon size={16} /> Cari Özet</Link>
              <Link href="/odeme" className="osonuc-link">Yeni Ödeme</Link>
            </>
          ) : (
            <>
              <Link href="/odeme" className="btn-pay osonuc-btn"><CardIcon size={16} /> Tekrar Dene</Link>
              <Link href="/cari" className="osonuc-link">Cari Özet</Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
