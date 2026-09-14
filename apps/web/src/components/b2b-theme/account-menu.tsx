"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CardIcon, OrdersIcon, UserIcon, WalletIcon } from "./icons";

/** Üst bardaki hesap menüsü: ayarlar, siparişler, ödeme, çıkış. */
export function AccountMenu({
  email,
  unvan,
}: {
  email: string;
  unvan: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function disaTiklama(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", disaTiklama);
    return () => document.removeEventListener("mousedown", disaTiklama);
  }, [open]);

  return (
    <div className="account-wrap" ref={ref}>
      <button
        className="account-btn"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-label="Hesabım"
        data-tip="Hesabım"
      >
        <UserIcon size={19} />
      </button>
      {open ? (
        <div className="account-menu">
          <div className="kim">
            <strong>{unvan}</strong>
            <span>{email}</span>
          </div>
          <Link href="/cari" onClick={() => setOpen(false)}>
            <WalletIcon size={16} /> Cari Özet
          </Link>
          <Link href="/siparisler" onClick={() => setOpen(false)}>
            <OrdersIcon size={16} /> Siparişlerim
          </Link>
          <Link href="/odeme" onClick={() => setOpen(false)}>
            <CardIcon size={16} /> Ödeme Yap
          </Link>
          <Link href="/hesap/ayarlar" onClick={() => setOpen(false)}>
            <UserIcon size={16} /> Hesap Ayarları
          </Link>
          <a
            href="/giris"
            onClick={() => {
              setOpen(false);
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
