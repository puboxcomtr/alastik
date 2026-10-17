"use client";
// Vadesi geçen borcu olan bayi sepete ürün eklemeye ya da sipariş vermeye çalıştığında
// ekranın ortasında açılan uyarı. Metin sunucudan gelir (/me → cartClosedMessage).
import { useEffect } from "react";
import { AlertIcon, CloseIcon } from "./icons";
import { formatKurus } from "@components/b2b-theme/lib/format";

export function CartBlockedModal({
  message,
  overdueKurus,
  onClose,
}: {
  message: string;
  overdueKurus: number;
  onClose: () => void;
}) {
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <div
      className="cart-blocked-overlay"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cart-blocked-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="cart-blocked-modal">
        <button type="button" className="cart-blocked-close" aria-label="Kapat" onClick={onClose}>
          <CloseIcon size={16} />
        </button>
        <span className="cart-blocked-icon" aria-hidden="true">
          <AlertIcon size={28} />
        </span>
        <h2 id="cart-blocked-title">Vadesi Geçmiş Borcunuz Var</h2>
        {overdueKurus > 0 ? (
          <div className="cart-blocked-amount">
            <span>Vadesi Geçen Borç</span>
            <strong>{formatKurus(overdueKurus)}</strong>
          </div>
        ) : null}
        <p>{message}</p>
        <div className="cart-blocked-actions">
          <a className="btn-primary" href="/odeme">Ödeme Yap</a>
          <button type="button" className="ghost" onClick={onClose}>Kapat</button>
        </div>
      </div>
    </div>
  );
}
