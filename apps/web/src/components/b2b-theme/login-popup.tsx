"use client";
import { useEffect, useState } from "react";
import { CloseIcon } from "./icons";

const SEEN_STORAGE_KEY = "b2b-login-popup-seen";

function todayKey() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function LoginPopup({ image }: { image: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const today = todayKey();
    try {
      if (localStorage.getItem(SEEN_STORAGE_KEY) === today) return;
      localStorage.setItem(SEEN_STORAGE_KEY, today);
    } catch {
    }
    setOpen(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open]);

  if (!open) return null;
  return (
    <div
      className="login-popup-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Duyuru"
      onClick={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
    >
      <div className="login-popup">
        <button type="button" className="login-popup-close" aria-label="Kapat" onClick={() => setOpen(false)}>
          <CloseIcon size={22} />
        </button>
        <img src={image} alt="Duyuru" />
      </div>
    </div>
  );
}
