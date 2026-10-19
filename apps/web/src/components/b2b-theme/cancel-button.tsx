"use client";

import { useState } from "react";
import { CloseIcon } from "./icons";

export function CancelButton({
  talep,
}: {
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
