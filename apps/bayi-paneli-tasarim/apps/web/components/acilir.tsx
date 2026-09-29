"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon } from "./icons";

export type AcilirSecenek = { deger: string; etiket: string };

/**
 * Siteye ait açılır kutu — tarayıcının/işletim sisteminin kendi seçim menüsü
 * yerine kullanılır (macOS'un gri listesi tasarımla uyuşmuyor).
 *
 * Seçim `onSec` ile yukarı bildirilir; filtre durumunu kataloğun kendisi
 * tutar. Seçenek sayısı eşiği aşınca panelin içine arama kutusu gelir —
 * 280 ebat elle taranamaz.
 */
export function Acilir({
  baslik,
  secenekler,
  deger,
  onSec,
  aramaEsigi = 12,
}: {
  /** Boş seçimde görünen etiket: "Mevsim", "Marka" … */
  baslik: string;
  secenekler: AcilirSecenek[];
  deger?: string | undefined;
  onSec: (deger: string) => void;
  aramaEsigi?: number;
}) {
  const [acik, setAcik] = useState(false);
  const [arama, setArama] = useState("");
  const kutuRef = useRef<HTMLDivElement>(null);

  const secili = secenekler.find((s) => s.deger === deger);

  useEffect(() => {
    if (!acik) return;
    const disariTiklandi = (e: MouseEvent) => {
      if (!kutuRef.current?.contains(e.target as Node)) setAcik(false);
    };
    const tusaBasildi = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAcik(false);
    };
    document.addEventListener("mousedown", disariTiklandi);
    document.addEventListener("keydown", tusaBasildi);
    return () => {
      document.removeEventListener("mousedown", disariTiklandi);
      document.removeEventListener("keydown", tusaBasildi);
    };
  }, [acik]);

  function sec(yeniDeger: string) {
    setAcik(false);
    setArama("");
    onSec(yeniDeger);
  }

  // Panel içi arama da ayraca takılmasın: "2055" → "205/55R16" bulunmalı.
  const sadelestir = (m: string) =>
    m.toLocaleLowerCase("tr").replace(/[^a-z0-9şğüöçı]/gi, "");
  const aranan = sadelestir(arama);
  const suzulmus = aranan
    ? secenekler.filter((s) => sadelestir(s.etiket).includes(aranan))
    : secenekler;

  return (
    <div
      ref={kutuRef}
      className={`acilir${acik ? " acik" : ""}${secili ? " secili" : ""}`}
    >
      <button
        type="button"
        className="acilir-dugme"
        aria-label={baslik}
        aria-expanded={acik}
        aria-haspopup="listbox"
        onClick={() => setAcik((a) => !a)}
      >
        <span className="metin">{secili?.etiket ?? baslik}</span>
        <ChevronDownIcon size={15} className="ok" />
      </button>

      {acik ? (
        <div className="acilir-panel" role="listbox">
          {secenekler.length >= aramaEsigi ? (
            <input
              className="acilir-arama"
              type="text"
              placeholder={`${baslik} ara…`}
              value={arama}
              autoFocus
              onChange={(e) => setArama(e.target.value)}
            />
          ) : null}
          <div className="acilir-liste">
            <button
              type="button"
              className={`acilir-secenek${!deger ? " isaretli" : ""}`}
              onClick={() => sec("")}
            >
              Tümü
            </button>
            {suzulmus.map((s) => (
              <button
                key={s.deger}
                type="button"
                role="option"
                aria-selected={s.deger === deger}
                className={`acilir-secenek${s.deger === deger ? " isaretli" : ""}`}
                onClick={() => sec(s.deger)}
              >
                {s.etiket}
              </button>
            ))}
            {suzulmus.length === 0 ? (
              <p className="acilir-bos">Eşleşen seçenek yok.</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
