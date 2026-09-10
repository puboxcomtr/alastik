"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CardIcon, OrdersIcon, UserIcon, WalletIcon } from "./icons";

/** Üst bardaki hesap menüsü: ayarlar, siparişler, ödeme, çıkış. */
export function HesapMenu({
  email,
  unvan,
}: {
  email: string;
  unvan: string;
}) {
  const [acik, setAcik] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!acik) return;
    function disaTiklama(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setAcik(false);
    }
    document.addEventListener("mousedown", disaTiklama);
    return () => document.removeEventListener("mousedown", disaTiklama);
  }, [acik]);

  return (
    <div className="hesap-wrap" ref={ref}>
      <button
        className="hesap-btn"
        onClick={() => setAcik((v) => !v)}
        aria-expanded={acik}
        aria-label="Hesabım"
        data-tip="Hesabım"
      >
        <UserIcon size={19} />
      </button>
      {acik ? (
        <div className="hesap-menu">
          <div className="kim">
            <strong>{unvan}</strong>
            <span>{email}</span>
          </div>
          <Link href="/cari" onClick={() => setAcik(false)}>
            <WalletIcon size={16} /> Cari Özet
          </Link>
          <Link href="/siparisler" onClick={() => setAcik(false)}>
            <OrdersIcon size={16} /> Siparişlerim
          </Link>
          <Link href="/odeme" onClick={() => setAcik(false)}>
            <CardIcon size={16} /> Ödeme Yap
          </Link>
          <Link href="/hesap/ayarlar" onClick={() => setAcik(false)}>
            <UserIcon size={16} /> Hesap Ayarları
          </Link>
          <a
            href="/giris"
            onClick={() => {
              setAcik(false);
              localStorage.removeItem("authToken");
              document.cookie = "authToken=; path=/; max-age=0";
            }}
          >
            Çıkış yap
          </a>
        </div>
      ) : null}
    </div>
  );
}
