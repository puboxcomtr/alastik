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
export function CancelButton({
  talep,
}: {
  /** true → onaylanmış sipariş için iptal TALEBİ; false → doğrudan iptal */
  talep: boolean;
}) {
  const [submitted, setSubmitted] = useState(false);

  function calistir() {
    const neden = window.prompt(talep ? "İptal talebi nedeni:" : "İptal nedeni:");
    if (!neden || neden.trim().length < 2) return;
    setSubmitted(true);
    window.alert(
      "Bu bir tasarım şablonudur — istek gönderilmedi.\n\n" +
        `Girilen neden: ${neden.trim()}`,
    );
  }

  return (
    <button className="danger-outline" onClick={calistir} disabled={submitted}>
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
