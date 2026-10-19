"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

export type BannerImage = {
  id: string;
  title: string;
  imageUrl: string;
  link: string | null;
};

const DONME_SURESI_MS = 6000;
const SURUKLEME_ESIGI_PX = 50;

export function BannerCarousel({ banners, aspectRatio, displayDuration }: { banners: BannerImage[]; aspectRatio?: number; displayDuration?: number }) {
  const donmeSuresi = displayDuration && displayDuration > 0 ? displayDuration : DONME_SURESI_MS;
  const [sira, setSira] = useState(0);
  const adet = banners.length;

  const baslangicX = useRef<number | null>(null);
  const sonMesafe = useRef(0);
  const [kaymaPx, setKaymaPx] = useState(0);
  const surukleniyor = baslangicX.current !== null;

  useEffect(() => {
    if (adet < 2 || surukleniyor) return;
    const zamanlayici = setInterval(
      () => setSira((s) => (s + 1) % adet),
      donmeSuresi,
    );
    return () => clearInterval(zamanlayici);
  }, [adet, surukleniyor, donmeSuresi]);

  if (adet === 0) return null;
  const aktif = banners[Math.min(sira, adet - 1)];
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
    setSira((s) => (fark < 0 ? (s + 1) % adet : (s - 1 + adet) % adet));
  };

  const oran = aspectRatio && aspectRatio > 0 ? aspectRatio : 1200 / 300;

  const slaytGorsel = (b: BannerImage) => {
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={b.imageUrl} alt={b.title} className="banner-image" draggable={false} />
    );
    if (!b.link) return img;
    return b.link.startsWith("/") ? (
      <Link href={b.link} draggable={false}>{img}</Link>
    ) : (
      <a href={b.link} target="_blank" rel="noopener noreferrer" draggable={false}>{img}</a>
    );
  };

  return (
    <section className="banner-area" aria-label="Duyurular">
      <div
        className="banner-frame"
        style={{
          aspectRatio: String(oran),
          cursor: adet > 1 ? (surukleniyor ? "grabbing" : "grab") : undefined,
          touchAction: "pan-y",
          userSelect: "none",
        }}
        onPointerDown={(e) => suruklemeBaslat(e.clientX)}
        onPointerMove={(e) => suruklemeIlerle(e.clientX)}
        onPointerUp={(e) => suruklemeBitir(e.clientX)}
        onPointerLeave={(e) => suruklemeBitir(e.clientX)}
        onClickCapture={(e) => {
          if (Math.abs(sonMesafe.current) > 8) {
            e.preventDefault();
            e.stopPropagation();
          }
        }}
      >
        <div
          className="banner-track"
          style={{
            transform: `translateX(calc(${-sira * 100}% + ${kaymaPx}px))`,
            transition: surukleniyor ? "none" : "transform 0.5s ease",
          }}
        >
          {banners.map((b) => (
            <div className="banner-slide" key={b.id}>
              {slaytGorsel(b)}
            </div>
          ))}
        </div>
      </div>

      {adet > 1 ? (
        <div className="banner-dots">
          {banners.map((b, i) => (
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
