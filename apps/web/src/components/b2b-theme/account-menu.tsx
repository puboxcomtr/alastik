"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { CardIcon, OrdersIcon, UserIcon, WalletIcon } from "./icons";

/** Üst bardaki hesap menüsü: oturumdaki cari bilgisi + ayarlar, siparişler, ödeme, çıkış. */
export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [cari, setCari] = useState<{ unvan: string; email: string; cariKodu: string } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  // Oturumdaki bayinin gerçek cari bilgisi (/me) çekilir.
  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!t) return;
    fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${t}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res.data) {
          setCari({ unvan: res.data.name || "", email: res.data.email || "", cariKodu: res.data.cariKodu || "" });
        }
      })
      .catch(() => {});
  }, []);

  const unvan = cari?.unvan || "Bayi";
  const email = cari?.email || "";

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
            <strong title={unvan}>{unvan}</strong>
            {email ? <span>{email}</span> : null}
            {cari?.cariKodu ? <span className="kim-cari">{cari.cariKodu}</span> : null}
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
