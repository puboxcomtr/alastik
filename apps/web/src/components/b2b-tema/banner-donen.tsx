"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type BannerGoruntu = {
  id: string;
  baslik: string;
  gorselUrl: string;
  link: string | null;
};

const DONME_SURESI_MS = 6000;
const SURUKLEME_ESIGI_PX = 50;

/**
 * Anasayfa banner alanı. Tek banner varsa sabit durur; birden fazlaysa
 * kendiliğinden döner, altta noktalarla gezinilir ve fare/parmakla sağa-sola
 * sürüklenerek kaydırılabilir. Bannerlar admin panelinden yönetilir.
 */
export function BannerDonen({ bannerlar }: { bannerlar: BannerGoruntu[] }) {
  const [sira, setSira] = useState(0);
  const adet = bannerlar.length;

  // Sürükleme takibi: basılan nokta + anlık kayma (görsel geri bildirim için)
  const baslangicX = useRef<number | null>(null);
  // Son sürükleme mesafesi: tıklama koruması için state yerine ref tutulur
  // (pointerup'ta state sıfırlanınca click olayı korumayı atlıyordu)
  const sonMesafe = useRef(0);
  const [kaymaPx, setKaymaPx] = useState(0);
  const surukleniyor = baslangicX.current !== null;

  useEffect(() => {
    if (adet < 2 || surukleniyor) return;
    const zamanlayici = setInterval(
      () => setSira((s) => (s + 1) % adet),
      DONME_SURESI_MS,
    );
    return () => clearInterval(zamanlayici);
  }, [adet, surukleniyor]);

  if (adet === 0) return null;
  const aktif = bannerlar[Math.min(sira, adet - 1)];
  if (!aktif) return null;

  const suruklemeBaslat = (x: number) => {
    if (adet < 2) return;
    baslangicX.current = x;
    sonMesafe.current = 0;
    setKaymaPx(0);
  };

  const suruklemeIlerle = (x: number) => {
    if (baslangicX.current === null) return;
    const fark = x - baslangicX.current;
    sonMesafe.current = fark;
    setKaymaPx(fark);
  };

  const suruklemeBitir = (x: number) => {
    if (baslangicX.current === null) return;
    const fark = x - baslangicX.current;
    baslangicX.current = null;
    setKaymaPx(0);
    if (Math.abs(fark) < SURUKLEME_ESIGI_PX) return;
    // Sola sürükleme → sonraki, sağa sürükleme → önceki
    setSira((s) => (fark < 0 ? (s + 1) % adet : (s - 1 + adet) % adet));
  };

  const gorsel = (
    // Dış adresten gelen banner görseli; optimize edilmeden gösterilir.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={aktif.gorselUrl}
      alt={aktif.baslik}
      className="banner-gorsel"
      draggable={false}
    />
  );

  return (
    <section className="banner-alani" aria-label="Duyurular">
      <div
        className="banner-cerceve"
        style={{
          cursor: adet > 1 ? (surukleniyor ? "grabbing" : "grab") : undefined,
          transform: kaymaPx ? `translateX(${kaymaPx * 0.25}px)` : undefined,
          transition: kaymaPx ? "none" : "transform 0.25s ease",
          touchAction: "pan-y",
          userSelect: "none",
        }}
        onPointerDown={(e) => suruklemeBaslat(e.clientX)}
        onPointerMove={(e) => suruklemeIlerle(e.clientX)}
        onPointerUp={(e) => suruklemeBitir(e.clientX)}
        onPointerLeave={(e) => suruklemeBitir(e.clientX)}
        onClickCapture={(e) => {
          // Sürükleme sonrası tıklama linki tetiklemesin (8px üstü hareket = sürükleme)
          if (Math.abs(sonMesafe.current) > 8) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        {aktif.link ? (
          aktif.link.startsWith("/") ? (
            <Link href={aktif.link} draggable={false}>{gorsel}</Link>
          ) : (
            <a href={aktif.link} target="_blank" rel="noopener noreferrer" draggable={false}>
              {gorsel}
            </a>
          )
        ) : (
          gorsel
        )}
      </div>

      {adet > 1 ? (
        <div className="banner-noktalar">
          {bannerlar.map((b, i) => (
            <button
              key={b.id}
              type="button"
              className={i === sira ? "aktif" : undefined}
              aria-label={`${i + 1}. duyuru`}
              aria-current={i === sira}
              onClick={() => setSira(i)}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
