"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { API_ENDPOINTS } from "@src/config/api";
import { CalendarIcon, CardIcon, FileIcon, OrdersIcon, UserIcon, WalletIcon } from "./icons";
import { PremiumBadge } from "./premium-badge";
import { clearStoredCart } from "./cart-status";

export function AccountMenu() {
  const [open, setOpen] = useState(false);
  const [cari, setCari] = useState<{ unvan: string; email: string; cariKodu: string; premium: boolean } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = typeof window !== "undefined" ? localStorage.getItem("authToken") : null;
    if (!t) return;
    fetch(API_ENDPOINTS.b2b.me(), { headers: { Authorization: `Bearer ${t}`, "X-Site": "b2b" } })
      .then((r) => r.json())
      .then((res) => {
        if (res?.success && res.data) {
          setCari({ unvan: res.data.name || "", email: res.data.email || "", cariKodu: res.data.cariKodu || "", premium: res.data.premium === true });
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
            {cari?.premium ? <PremiumBadge /> : null}
          </div>
          <Link href="/cari" onClick={() => setOpen(false)}>
            <WalletIcon size={16} /> Cari Özet
          </Link>
          <Link href="/siparisler" onClick={() => setOpen(false)}>
            <OrdersIcon size={16} /> Siparişlerim
          </Link>
          <Link href="/odemelerim" onClick={() => setOpen(false)}>
            <WalletIcon size={16} /> Ödemelerim
          </Link>
          <Link href="/raporlar/cari-hareketler" onClick={() => setOpen(false)}>
            <FileIcon size={16} /> Cari Hesap Ekstresi
          </Link>
          <Link href="/raporlar/vade-durumu" onClick={() => setOpen(false)}>
            <CalendarIcon size={16} /> Vade Durumu
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
              if (localStorage.getItem("plasiyerToken")) {
                localStorage.removeItem("plasiyerToken");
                clearStoredCart();
              }
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
