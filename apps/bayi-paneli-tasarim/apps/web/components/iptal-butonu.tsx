"use client";

import { useState } from "react";
import { CloseIcon } from "./icons";

/**
 * İptal / iptal talebi düğmesi.
 *
 * ŞABLON NOTU: burada gerçek bir iptal yapılmaz — arka uç yoktur. Düğme
 * yalnızca akışın tasarımını gösterir. Gerçek uygulamada `calistir` içinden
 * kendi iptal ucunuza istek atın (siparişin durumu, stok iadesi ve iptal
 * nedeni sunucuda tek işlemde ele alınmalıdır).
 */
export function IptalButonu({
  talep,
}: {
  /** true → onaylanmış sipariş için iptal TALEBİ; false → doğrudan iptal */
  talep: boolean;
}) {
  const [gonderildi, setGonderildi] = useState(false);

  function calistir() {
    const neden = window.prompt(talep ? "İptal talebi nedeni:" : "İptal nedeni:");
    if (!neden || neden.trim().length < 2) return;
    setGonderildi(true);
    window.alert(
      "Bu bir tasarım şablonudur — istek gönderilmedi.\n\n" +
        `Girilen neden: ${neden.trim()}`,
    );
  }

  return (
    <button className="danger-outline" onClick={calistir} disabled={gonderildi}>
      {talep ? (
        "İptal Talebi"
      ) : (
        <>
          <CloseIcon size={14} /> İptal
        </>
      )}
    </button>
  );
}
