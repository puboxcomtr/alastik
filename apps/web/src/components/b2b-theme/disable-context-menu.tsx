"use client";
// Bayi sitesinde sağ tık menüsü kapalıdır (giriş ekranı dahil tüm sayfalar).
import { useEffect } from "react";

export function DisableContextMenu() {
  useEffect(() => {
    const block = (e: MouseEvent) => e.preventDefault();
    document.addEventListener("contextmenu", block);
    return () => document.removeEventListener("contextmenu", block);
  }, []);
  return null;
}
